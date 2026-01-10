import os
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tempfile
import shutil
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lazy imports to avoid loading TF/LanceDB at module level
processor = None

def get_processor():
    global processor
    if processor is None:
        from processor import FaceProcessor
        processor = FaceProcessor()
    return processor

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown event handler."""
    # Initialize processor on startup
    logger.info("Initializing FaceProcessor on startup...")
    get_processor()
    logger.info("FaceProcessor ready!")
    yield
    # Cleanup on shutdown
    logger.info("Shutting down...")

app = FastAPI(
    title="Aura Core",
    version="0.2.0",
    description="Intelligent Photo Retrieval API with LanceDB",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class EmbeddingResponse(BaseModel):
    success: bool
    embedding: Optional[List[float]] = None
    dimensions: Optional[int] = None
    error: Optional[str] = None

class ScanResult(BaseModel):
    path: str
    embedding: List[float]

class ScanDirectoryResponse(BaseModel):
    success: bool
    results: List[ScanResult] = []
    total_processed: int = 0
    total_stored: int = 0
    error: Optional[str] = None

class SearchMatch(BaseModel):
    id: str
    source_path: str
    distance: float
    photo_date: str
    created_at: str

class SearchResponse(BaseModel):
    success: bool
    matches: List[SearchMatch] = []
    error: Optional[str] = None

class DBStatsResponse(BaseModel):
    total_faces: int
    table_exists: bool


# Endpoints
@app.get("/")
async def root():
    return {"message": "Welcome to Aura Core API (Supabase Edition)", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "ok", "processor_loaded": processor is not None}

@app.get("/api/db/stats", response_model=DBStatsResponse)
async def db_stats():
    """Get database statistics."""
    from database_supabase import get_stats
    stats = get_stats()
    return DBStatsResponse(**stats)

@app.post("/api/embed", response_model=EmbeddingResponse)
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

@app.post("/api/scan", response_model=ScanDirectoryResponse)
async def scan_directory(
    directory_path: str,
    persist: bool = Query(default=True, description="Store results in Supabase")
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
        if persist and results:
            from database_supabase import store_embeddings
            
            # Prepare records for Supabase
            db_records = []
            for r in results:
                db_records.append({
                    "path": r["path"],
                    "embedding": r["embedding"],
                    "photo_date": r.get("photo_date"),
                    "metadata": {"source": "scan"}
                })
            
            stored_count = store_embeddings(db_records)
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

@app.post("/api/search", response_model=SearchResponse)
async def search_faces(
    file: UploadFile = File(...),
    limit: int = Query(default=100, ge=1, le=500, description="Max results to return"),
    min_similarity: float = Query(default=0.6, ge=0, le=1, description="Minimum similarity threshold (0-1)")
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
        from database_supabase import search_similar
        
        # We pass min_similarity directly as threshold
        matches = search_similar(query_embedding, threshold=min_similarity, limit=limit)
        
        # Convert to response model
        search_matches = []
        for m in matches:
             search_matches.append(SearchMatch(
                 id=m["id"],
                 source_path=m["source_path"],
                 distance=m["distance"],
                 photo_date=m.get("photo_date", "Unknown"),
                 created_at=m.get("created_at", "Unknown") # Supabase might not return created_at in search unless updated
             ))
        
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

@app.get("/api/image")
async def get_image(
    path: str = Query(..., description="Full path to image file"),
    w: Optional[int] = Query(None, description="Target width for resizing"),
    h: Optional[int] = Query(None, description="Target height for resizing")
):
    """
    Serve an image file from the filesystem.
    Supports on-the-fly resizing for thumbnails.
    """
    from fastapi.responses import FileResponse, Response
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

# Admin & QR Endpoints

class LoginRequest(BaseModel):
    pin: str

class LoginResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    error: Optional[str] = None

class FolderItem(BaseModel):
    name: str
    path: str
    type: str  # "dir" or "file"
    count: Optional[int] = None

class FolderResponse(BaseModel):
    path: str
    parent: Optional[str]
    items: List[FolderItem]

class BundleRequest(BaseModel):
    name: str
    photo_ids: List[str]

class BundleResponse(BaseModel):
    id: str
    url: str

ADMIN_PIN = "1234" # TODO: Move to env var
JWT_SECRET = "aura_secret_key" # Keep simple for MVP
BUNDLE_FILE = "data/bundles.json"

@app.post("/api/admin/login", response_model=LoginResponse)
async def admin_login(req: LoginRequest):
    if req.pin == ADMIN_PIN:
        import jwt
        from datetime import datetime, timedelta, timezone
        token = jwt.encode({
            "role": "admin",
            "exp": datetime.now(timezone.utc) + timedelta(days=1)
        }, JWT_SECRET, algorithm="HS256")
        return LoginResponse(success=True, token=token)
    return LoginResponse(success=False, error="Invalid PIN")

@app.get("/api/admin/folders", response_model=FolderResponse)
async def list_folders(path: str = Query(default="/")):
    if not os.path.exists(path) or not os.path.isdir(path):
        raise HTTPException(status_code=404, detail="Path not found")
    
    items = []
    try:
        valid_exts = {".jpg", ".jpeg", ".png", ".webp"}
        with os.scandir(path) as it:
            for entry in it:
                if entry.name.startswith("."): continue
                
                if entry.is_dir():
                    items.append(FolderItem(name=entry.name, path=entry.path, type="dir"))
                elif entry.is_file() and os.path.splitext(entry.name)[1].lower() in valid_exts:
                    items.append(FolderItem(name=entry.name, path=entry.path, type="file"))
        
        items.sort(key=lambda x: (x.type != "dir", x.name.lower()))
        parent = os.path.dirname(path) if path != "/" else None
        return FolderResponse(path=path, parent=parent, items=items)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")

@app.post("/api/bundles", response_model=BundleResponse)
async def create_bundle(req: BundleRequest):
    import json
    import uuid
    from datetime import datetime
    
    try:
        bundle_id = str(uuid.uuid4())[:8]
        bundle_data = {
            "id": bundle_id,
            "name": req.name,
            "photo_ids": req.photo_ids,
            "created_at": str(datetime.now())
        }
        
        os.makedirs(os.path.dirname(BUNDLE_FILE), exist_ok=True)
        bundles = {}
        if os.path.exists(BUNDLE_FILE):
            try:
                with open(BUNDLE_FILE, "r") as f:
                    bundles = json.load(f)
            except: pass
        
        bundles[bundle_id] = bundle_data
        
        with open(BUNDLE_FILE, "w") as f:
            json.dump(bundles, f, indent=2)
            
        return BundleResponse(id=bundle_id, url=f"/gallery/{bundle_id}")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bundles/{bundle_id}")
async def get_bundle(bundle_id: str):
    import json
    
    if not os.path.exists(BUNDLE_FILE):
         raise HTTPException(status_code=404, detail="Bundle not found")
         
    try:
        with open(BUNDLE_FILE, "r") as f:
            bundles = json.load(f)
            
        if bundle_id not in bundles:
            raise HTTPException(status_code=404, detail="Bundle not found")
            
        bundle = bundles[bundle_id]
        
        # Return photo paths directly for now (client will request image blobs)
        # TODO: Enhance with database metadata if needed
        enriched_photos = [{"path": p, "photo_date": "Unknown"} for p in bundle.get("photo_ids", [])]
        bundle["photos"] = enriched_photos
        
        return bundle
    except Exception as e:
        logger.error(f"Error reading bundle: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/api/qr")
async def generate_qr(url: str):
    import qrcode
    from io import BytesIO
    from fastapi.responses import Response
    
    img = qrcode.make(url)
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Response(content=buf.getvalue(), media_type="image/png")

# Authentication
@app.post("/api/auth/face-login")
async def face_login(file: UploadFile = File(...)):
    """
    Login by face. Returns JWT if face matches an authorized user.
    """
    # Verify file is image
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Invalid file type")

    # Save to temp
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        fp = get_processor()
        embedding = fp.get_embedding(tmp_path)
        
        if not embedding:
             return {"success": False, "error": "No face detected"}

        from database_supabase import search_similar
        # Strict threshold for login
        matches = search_similar(embedding, threshold=0.75, limit=1)
        
        if matches:
            # Match found! Issue token.
            import jwt
            from datetime import datetime, timedelta, timezone
            
            token = jwt.encode({
                "role": "user",
                "face_id": matches[0]["id"],
                "exp": datetime.now(timezone.utc) + timedelta(hours=24)
            }, JWT_SECRET, algorithm="HS256")
            
            return {"success": True, "token": token, "match": matches[0]}
        
        return {"success": False, "error": "Face not recognized"}

    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)
