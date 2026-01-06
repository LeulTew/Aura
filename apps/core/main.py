import os
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tempfile
import shutil
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Lazy import to avoid loading TF at module level
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
    version="0.1.0",
    description="Intelligent Photo Retrieval API",
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
    error: Optional[str] = None

# Endpoints
@app.get("/")
async def root():
    return {"message": "Welcome to Aura Core API", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "ok", "processor_loaded": processor is not None}

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
async def scan_directory(directory_path: str):
    """
    Scan a directory for faces and return embeddings.
    """
    if not os.path.exists(directory_path):
        raise HTTPException(status_code=404, detail=f"Directory not found: {directory_path}")
    
    if not os.path.isdir(directory_path):
        raise HTTPException(status_code=400, detail="Path is not a directory")
    
    try:
        fp = get_processor()
        results = fp.scan_directory(directory_path)
        
        return ScanDirectoryResponse(
            success=True,
            results=[ScanResult(path=r["path"], embedding=r["embedding"]) for r in results],
            total_processed=len(results)
        )
    
    except Exception as e:
        logger.error(f"Error scanning directory: {e}")
        return ScanDirectoryResponse(
            success=False,
            error=str(e)
        )
