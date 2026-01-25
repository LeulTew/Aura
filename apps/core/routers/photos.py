from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Form, Response
from fastapi.responses import FileResponse
from typing import Optional, List
import os
import tempfile
import shutil
import logging
import json
import time
from datetime import datetime

# Lazy imports for heavy ML libraries will be handled inside functions or via dependencies
# to maintain fast startup if that was the original intent. 
# However, standard practice is top-level unless strictly optimizing cold start.
# We will use top-level for standard libs and get_processor for the heavy model.

from dependencies import get_auth_context, get_processor
from schemas import (
    MatchResponse, EmbeddingResponse, ScanDirectoryResponse, ScanResult,
    SearchResponse, SearchMatch
)

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/api/match/mine", response_model=MatchResponse)
async def match_mine(
    user_id: str = Query(..., description="The Supabase Auth User ID"),
    auth: dict = Depends(get_auth_context)
):
    """
    Triggers face matching for the current user against all indexed photos.
    This is usually called post-registration or post-face-login.
    """
    from database_supabase import get_user_embedding, search_similar, add_photo_matches
    
    try:
        # 1. Get user embedding
        embedding = get_user_embedding(user_id)
        if not embedding:
            return MatchResponse(success=False, error="User embedding not found. Please scan face first.")

        # 2. Search for similar faces (Scoped to Org)
        # Threshold can be overridden by env var
        threshold = float(os.getenv("MATCH_THRESHOLD", 0.6))
        matches = search_similar(embedding, threshold=threshold, limit=500, org_id=auth.get("org_id"))
        
        if not matches:
            return MatchResponse(success=True, count=0)

        # 3. Prepare records for junction table
        match_records = [
            {
                "photo_id": m["id"],
                "user_id": user_id,
                "similarity": m["similarity"]
            }
            for m in matches
        ]
        
        # 4. Batch insert/upsert matches
        stored_count = add_photo_matches(match_records)
        
        return MatchResponse(success=True, count=stored_count)

    except Exception as e:
        logger.error(f"Error in match_mine: {e}")
        return MatchResponse(success=False, error=str(e))


@router.post("/api/embed", response_model=EmbeddingResponse)
async def embed_face(file: UploadFile = File(...)):
    """
    Upload an image and get the face embedding.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename or ".png")[1]) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
    
    try:
        fp = get_processor()
        embedding = fp.get_embedding(tmp_path)
        
        if embedding is None:
            return EmbeddingResponse(
                success=False,
                error="No face detected in the image"
            )
        
        return EmbeddingResponse(
            success=True,
            embedding=embedding,
            dimensions=len(embedding)
        )
    
    except Exception as e:
        logger.error(f"Error processing image: {e}")
        return EmbeddingResponse(
            success=False,
            error=str(e)
        )
    finally:
        # Cleanup temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.post("/api/index-photo")
async def index_photo(
    file: UploadFile = File(...),
    path: str = Form(...),
    metadata: str = Form("{}"), # JSON string
    auth: dict = Depends(get_auth_context)
):
    """
    Index a photo that was uploaded to Supabase Storage by the client.
    The client sends a Thumbnail (small file) + the Storage Path of the Full Res.
    """
    import numpy as np
    import cv2
    
    try:
        meta_dict = json.loads(metadata)
    except:
        meta_dict = {}

    start = time.time()
    
    # 1. Read the thumbnail directly from memory
    contents = await file.read()
    
    try:
        # 2. Decode image for embedding (OpenCV)
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        # 3. Get Embedding (FaceProcessor)
        fp = get_processor()
        embedding = fp.get_embedding_from_image(img)
        
        if embedding:
            # 4. Store in DB
            # We store the 'path' provided by client (which points to Full Res in Supabase)
            # Use 'created_at' from metadata or default to now
            photo_date = meta_dict.get("created_at") or datetime.now().isoformat()
            
            # We need to use store_embedding from database_supabase
            from database_supabase import store_embedding, log_usage
            
            # Get file size if possible (streaming file to temp might be needed for real size)
            # For now use content length or actual read bytes
            file_size = len(contents)
            
            record_id = store_embedding(
                source_path=path, # Points to Full Res location
                embedding=embedding,
                photo_date=photo_date,
                metadata=meta_dict,
                org_id=auth.get("org_id"),
                size_bytes=file_size
            )
            
            # Log usage for SuperAdmin dashboard
            if auth.get("org_id"):
                log_usage(
                    org_id=auth["org_id"],
                    user_id=auth.get("user_id"),
                    action="upload",
                    bytes_processed=file_size,
                    metadata={"path": path}
                )
            
            duration = time.time() - start
            return {
                "status": "indexed",
                "id": record_id,
                "duration": duration,
                "faces_found": 1
            }
        else:
            # No face detected
            return {"status": "skipped", "reason": "no_face_detected"}
            
    except Exception as e:
        logger.error(f"Error indexing photo: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/scan", response_model=ScanDirectoryResponse)
async def scan_directory(
    directory_path: str,
    persist: bool = Query(default=True, description="Store results in Supabase"),
    auth: dict = Depends(get_auth_context)
):
    """
    Scan a directory for faces and return/store embeddings.
    """
    if not os.path.exists(directory_path):
        raise HTTPException(status_code=404, detail=f"Directory not found: {directory_path}")
    
    if not os.path.isdir(directory_path):
        raise HTTPException(status_code=400, detail="Path is not a directory")
    
    try:
        fp = get_processor()
        results = fp.scan_directory(directory_path)
        
        stored_count = 0
        total_size = 0
        if persist and results:
            from database_supabase import store_embeddings, log_usage, update_storage_stats
            
            # Prepare records for Supabase
            db_records = []
            for r in results:
                # Approximate size or check file size
                try:
                    size = os.path.getsize(r["path"])
                except:
                    size = 0
                
                total_size += size
                
                db_records.append({
                    "path": r["path"],
                    "embedding": r["embedding"],
                    "photo_date": r.get("photo_date"),
                    "metadata": {"source": "scan"},
                    "org_id": auth.get("org_id"),
                    "size_bytes": size
                })
            
            stored_count = store_embeddings(db_records)
            
            # Update organization storage stats if org_id is present
            if auth.get("org_id") and total_size > 0:
                update_storage_stats(auth["org_id"], total_size)
                
                log_usage(
                    org_id=auth["org_id"],
                    user_id=auth.get("user_id"),
                    action="scan_ingest",
                    bytes_processed=total_size,
                    metadata={"directory": directory_path, "count": len(results)}
                )
            
            logger.info(f"Stored {stored_count} face records in Supabase")
        
        return ScanDirectoryResponse(
            success=True,
            results=[ScanResult(path=r["path"], embedding=r["embedding"]) for r in results],
            total_processed=len(results),
            total_stored=stored_count
        )
    
    except Exception as e:
        logger.error(f"Error scanning directory: {e}")
        return ScanDirectoryResponse(
            success=False,
            error=str(e)
        )


@router.post("/api/search", response_model=SearchResponse)
async def search_faces(
    file: UploadFile = File(...),
    limit: int = Query(default=100, ge=1, le=500, description="Max results to return"),
    min_similarity: float = Query(default=0.6, ge=0, le=1, description="Minimum similarity threshold (0-1)"),
    auth: dict = Depends(get_auth_context)
):
    """
    Upload a selfie to find matching faces in the database.
    """
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # Save to temp file
    with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename or ".png")[1]) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name
    
    try:
        # Get embedding from uploaded image
        fp = get_processor()
        query_embedding = fp.get_embedding(tmp_path)
        
        if query_embedding is None:
            return SearchResponse(
                success=False,
                error="No face detected in the uploaded image"
            )
        
        # Search Supabase
        from database_supabase import search_similar, log_usage
        
        # We pass min_similarity directly as threshold
        matches = search_similar(
            query_embedding, 
            threshold=min_similarity, 
            limit=limit,
            org_id=auth.get("org_id")
        )
        
        # Convert to response model
        search_matches = []
        for m in matches:
             search_matches.append(SearchMatch(
                 id=m["id"],
                 source_path=m["source_path"],
                 distance=m["distance"],
                 photo_date=m.get("photo_date", "Unknown"),
                 created_at=m.get("created_at", "Unknown")
             ))
        
        if auth.get("org_id"):
            log_usage(
                org_id=auth["org_id"],
                user_id=auth.get("user_id"),
                action="search",
                metadata={"limit": limit, "threshold": min_similarity}
            )
            
        return SearchResponse(
            success=True,
            matches=search_matches
        )
    
    except Exception as e:
        logger.error(f"Error searching faces: {e}")
        return SearchResponse(
            success=False,
            error=str(e)
        )
    finally:
        # Cleanup temp file
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.get("/api/image")
async def get_image(
    path: str = Query(..., description="Full path to image file"),
    w: Optional[int] = Query(None, description="Target width for resizing"),
    h: Optional[int] = Query(None, description="Target height for resizing")
):
    """
    Serve an image file from the filesystem.
    Supports on-the-fly resizing for thumbnails.
    """
    from PIL import Image
    import io
    
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    if not os.path.isfile(path):
        raise HTTPException(status_code=400, detail="Path is not a file")
    
    # If no resizing needed, return file directly
    if not w and not h:
        return FileResponse(path)
    
    # Resize logic
    try:
        with Image.open(path) as img:
            if img.mode in ('RGBA', 'P'):
                img = img.convert('RGB')
            
            original_w, original_h = img.size
            if w and not h:
                ratio = w / original_w
                new_size = (w, int(original_h * ratio))
            elif h and not w:
                ratio = h / original_h
                new_size = (int(original_w * ratio), h)
            else:
                new_size = (w, h)
                
            img = img.resize(new_size, Image.Resampling.LANCZOS)
            
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=85)
            buf.seek(0)
            
            return Response(content=buf.getvalue(), media_type="image/jpeg")
            
    except Exception as e:
        logger.error(f"Error resizing image: {e}")
        return FileResponse(path)
