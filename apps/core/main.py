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
    return {"message": "Welcome to Aura Core API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "ok", "processor_loaded": processor is not None}

@app.get("/api/db/stats", response_model=DBStatsResponse)
async def db_stats():
    """Get database statistics."""
    from database import get_stats
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
    persist: bool = Query(default=True, description="Store results in LanceDB")
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
            from database import add_faces
            
            # Prepare records with image blobs
            db_records = []
            for r in results:
                # Read the original image as bytes for blob storage
                with open(r["path"], "rb") as f:
                    image_bytes = f.read()
                
                db_records.append({
                    "vector": r["embedding"],
                    "image_blob": image_bytes,
                    "source_path": r["path"]
                })
            
            stored_count = add_faces(db_records)
            logger.info(f"Stored {stored_count} face records in LanceDB")
        
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
    limit: int = Query(default=5, ge=1, le=50, description="Max results to return")
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
        
        # Search database
        from database import search_similar
        matches = search_similar(query_embedding, limit=limit)
        
        return SearchResponse(
            success=True,
            matches=[SearchMatch(**m) for m in matches]
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
async def get_image(path: str = Query(..., description="Full path to image file")):
    """
    Serve an image file from the filesystem.
    Used by the gallery to display matched photos.
    """
    from fastapi.responses import FileResponse
    
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Image not found")
    
    if not os.path.isfile(path):
        raise HTTPException(status_code=400, detail="Path is not a file")
    
    # Determine content type
    ext = os.path.splitext(path)[1].lower()
    content_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif"
    }
    content_type = content_types.get(ext, "application/octet-stream")
    
    return FileResponse(path, media_type=content_type)

