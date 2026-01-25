import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Import routers
from routers import auth, profile, photos, admin, superadmin, owner
# Import dependencies to trigger lazy loading if needed, and for lifespan
from dependencies import get_processor

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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
    version="0.3.0",
    description="Intelligent Photo Retrieval API with Multi-Tenant Support",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(photos.router)
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(admin.router)
app.include_router(superadmin.router)
app.include_router(owner.router)

@app.get("/")
async def root():
    return {"message": "Welcome to Aura Core API (Supabase Edition)", "status": "running"}

@app.get("/health")
async def health():
    # Check if processor is loaded
    processor = get_processor()
    return {"status": "ok", "processor_loaded": processor is not None}
