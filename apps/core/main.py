import os
from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import tempfile
import shutil
import logging
import jwt
from datetime import datetime, timedelta, timezone

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


class MatchResponse(BaseModel):
    success: bool
    count: int = 0
    error: Optional[str] = None

# Auth Dependency
from fastapi import Header

def get_auth_context(authorization: str = Header(None)):
    """Extract role and org_id from JWT."""
    if not authorization:
        return {"role": "guest", "org_id": None}
    
    try:
        token = authorization.replace("Bearer ", "")
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return {
            "user_id": payload.get("sub"),
            "role": payload.get("role"),
            "org_id": payload.get("org_id"),
            "org_slug": payload.get("org_slug")
        }
    except Exception as e:
        logger.warning(f"Auth error: {e}")
        return {"role": "guest", "org_id": None}

# ... existing endpoints ...

@app.post("/api/match/mine", response_model=MatchResponse)
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

@app.post("/api/index-photo")
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
    import json
    import time
    import numpy as np
    import cv2
    from datetime import datetime
    
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


@app.post("/api/scan", response_model=ScanDirectoryResponse)
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
            from database_supabase import store_embeddings, log_usage
            
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
                from database_supabase import update_storage_stats
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

@app.post("/api/search", response_model=SearchResponse)
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
        from database_supabase import search_similar
        
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
                 created_at=m.get("created_at", "Unknown") # Supabase might not return created_at in search unless updated
             ))
        
        if auth.get("org_id"):
            from database_supabase import log_usage
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

# Admin & Auth Endpoints

class LoginRequest(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    pin: Optional[str] = None  # Legacy support

class LoginResponse(BaseModel):
    success: bool
    token: Optional[str] = None
    redirect: Optional[str] = None
    user: Optional[dict] = None
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

ADMIN_PIN = os.environ.get("ADMIN_PIN", "1234")  # Legacy fallback
JWT_SECRET = os.environ.get("JWT_SECRET", "aura_secret_key")
BUNDLE_FILE = "data/bundles.json"

# Role-based redirect mapping
ROLE_REDIRECTS = {
    "superadmin": "/superadmin",
    "admin": "/admin",
    "employee": "/admin/capture"
}

@app.post("/api/auth/login", response_model=LoginResponse)
async def unified_login(req: LoginRequest):
    """
    Multi-tenant login with email/password via Supabase Auth.
    Returns JWT with role, org context, and redirect path.
    """
    import jwt
    from datetime import datetime, timedelta, timezone
    from database_supabase import get_client
    
    try:
        client = get_client()
        
        if not req.email or not req.password:
            return LoginResponse(success=False, error="Email and password required")
        
        # 1. Authenticate with Supabase Auth
        auth_response = client.auth.sign_in_with_password({
            "email": req.email,
            "password": req.password
        })
        
        if not auth_response.user:
            return LoginResponse(success=False, error="Invalid credentials")
        
        user_id = auth_response.user.id
        user_email = auth_response.user.email
        
        # 2. Fetch profile with role and org
        profile_result = client.table("profiles").select("*, organizations(slug, name)").eq("id", user_id).single().execute()
        
        if not profile_result.data:
            return LoginResponse(success=False, error="Profile not found. Contact administrator.")
        
        profile = profile_result.data
        role = profile.get("role", "employee")
        org_id = profile.get("org_id")
        org_data = profile.get("organizations")
        org_slug = org_data.get("slug") if org_data else None
        org_name = org_data.get("name") if org_data else None
        
        # 3. Build custom JWT with full context
        token = jwt.encode({
            "sub": str(user_id),
            "email": user_email,
            "role": role,
            "org_id": str(org_id) if org_id else None,
            "org_slug": org_slug,
            "org_name": org_name,
            "display_name": profile.get("display_name"),
            "exp": datetime.now(timezone.utc) + timedelta(days=7)
        }, JWT_SECRET, algorithm="HS256")
        
        # 4. Determine redirect
        redirect_path = ROLE_REDIRECTS.get(role, "/admin")
        
        return LoginResponse(
            success=True,
            token=token,
            redirect=redirect_path,
            user={
                "id": str(user_id),
                "email": user_email,
                "role": role,
                "display_name": profile.get("display_name"),
                "org_name": org_name
            }
        )
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        return LoginResponse(success=False, error="Authentication failed")


@app.post("/api/admin/login", response_model=LoginResponse)
async def legacy_admin_login(req: LoginRequest):
    """
    Legacy PIN-based login for backward compatibility.
    Redirects to /api/auth/login for email/password.
    """
    import jwt
    from datetime import datetime, timedelta, timezone
    from database_supabase import get_client
    
    # If email/password provided, use new auth
    if req.email and req.password:
        return await unified_login(req)
    
    # Legacy PIN auth
    if req.pin == ADMIN_PIN:
        client = get_client()
        
        # Check for any superadmin profile
        result = client.table("profiles").select("*").eq("role", "superadmin").limit(1).execute()
        
        if result.data and len(result.data) > 0:
            profile = result.data[0]
            role = profile.get("role", "admin")
            org_id = profile.get("org_id")
        else:
            role = "admin"
            org_id = None
        
        token = jwt.encode({
            "role": role,
            "org_id": str(org_id) if org_id else None,
            "exp": datetime.now(timezone.utc) + timedelta(days=7)
        }, JWT_SECRET, algorithm="HS256")
        
        return LoginResponse(
            success=True,
            token=token,
            redirect=ROLE_REDIRECTS.get(role, "/admin")
        )
    
    return LoginResponse(success=False, error="Invalid credentials")


@app.get("/api/admin/folders", response_model=FolderResponse)
async def list_folders(
    path: str = Query(default="/"),
    auth: dict = Depends(get_auth_context)
):
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
        
        if auth.get("org_id"):
            from database_supabase import log_usage
            log_usage(
                org_id=auth["org_id"],
                user_id=auth.get("user_id"),
                action="browse",
                metadata={"path": path}
            )
            
        return FolderResponse(path=path, parent=parent, items=items)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")

@app.post("/api/bundles", response_model=BundleResponse)
async def create_bundle(
    req: BundleRequest,
    auth: dict = Depends(get_auth_context)
):
    """Create a photo bundle in Supabase (Phase 5)."""
    from database_supabase import get_client, log_usage
    
    try:
        client = get_client()
        
        # 1. Insert into Supabase
        bundle_record = {
            "name": req.name,
            "photo_ids": req.photo_ids,
            "org_id": auth.get("org_id"),
            "created_by": auth.get("user_id")
        }
        
        result = client.table("bundles").insert(bundle_record).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create bundle in database")
            
        bundle_id = result.data[0]["id"]
        
        # 2. Log usage
        if auth.get("org_id"):
            log_usage(
                org_id=auth["org_id"],
                user_id=auth.get("user_id"),
                action="bundle_create",
                metadata={"name": req.name, "photo_count": len(req.photo_ids)}
            )
            
        return BundleResponse(id=str(bundle_id), url=f"/gallery/{bundle_id}")
    except Exception as e:
        logger.error(f"Error creating bundle: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/bundles/{bundle_id}")
async def get_bundle(bundle_id: str):
    """Retrieve a bundle and its photos from Supabase (Phase 5)."""
    from database_supabase import get_client, get_signed_url
    
    try:
        client = get_client()
        # 1. Fetch bundle metadata
        result = client.table("bundles").select("*, profiles(display_name)").eq("id", bundle_id).execute()
        
        if not result.data or len(result.data) == 0:
            raise HTTPException(status_code=404, detail="Bundle not found")
            
        bundle = result.data[0]
        photo_ids = bundle.get("photo_ids", [])
        
        # 2. Fetch photos in this bundle
        if photo_ids:
            photos_result = client.table("photos").select("id, path, photo_date, metadata").in_("id", photo_ids).execute()
            photos = photos_result.data or []
            
            # 3. Generate signed URLs
            for p in photos:
                p["url"] = get_signed_url(p["path"])
        else:
            photos = []
            
        return {
            "success": True,
            "bundle": {
                "id": str(bundle["id"]),
                "name": bundle["name"],
                "created_at": bundle["created_at"],
                "created_by": bundle.get("profiles", {}).get("display_name") if bundle.get("profiles") else "System",
                "photos": photos
            }
        }
    except Exception as e:
        logger.error(f"Error fetching bundle {bundle_id}: {e}")
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
    # ... implementation ...
    pass  # Placeholder as we are injecting before this

class InviteRequest(BaseModel):
    email: str
    role: str = "employee"

@app.post("/api/invite")
async def invite_user(
    req: InviteRequest,
    auth: dict = Depends(get_auth_context)
):
    """
    Invite a new user to the organization via email.
    Uses Supabase Auth Admin API to send an invite link.
    """
    from database_supabase import get_client, log_usage
    
    # 1. Check Permissions
    requestor_role = auth.get("role")
    org_id = auth.get("org_id")
    
    if requestor_role not in ["admin", "superadmin"]:
        raise HTTPException(status_code=403, detail="Only admins can invite users")
        
    if not org_id:
        raise HTTPException(status_code=400, detail="Organization context required")
        
    client = get_client()
    
    try:
        # 2. Send Supabase Invite
        # This requires the SERVER key (service_role) initialized in get_client()
        invite_res = client.auth.admin.invite_user_by_email(
            req.email,
            options={
                "data": {
                    "org_id": org_id,
                    "role": req.role,
                    "invited_by": auth.get("user_id")
                }
                # "redirectTo": "https://aura-pro.com/setup-password" # Optional
            }
        )
        
        if not invite_res.user:
             raise HTTPException(status_code=500, detail="Failed to create auth user")
             
        new_user_id = invite_res.user.id
        
        # 3. Ensure Profile Exists & Has Correct Role/Org
        # Even if a trigger exists, we force update to be safe
        profile_data = {
            "id": new_user_id,
            "email": req.email,
            "role": req.role,
            "org_id": org_id,
            "display_name": req.email.split("@")[0]
        }
        
        # Upsert profile
        client.table("profiles").upsert(profile_data).execute()
        
        # 4. Log Usage
        log_usage(
            org_id=org_id,
            user_id=auth.get("user_id"),
            action="invite_user",
            metadata={"invited_email": req.email, "role": req.role}
        )
        
        return {"success": True, "message": f"Invitation sent to {req.email}", "user_id": new_user_id}
        
    except Exception as e:
        logger.error(f"Invite error: {e}")
        # Build friendly error message
        msg = str(e)
        if "unique" in msg.lower():
            msg = "User already exists"
        raise HTTPException(status_code=400, detail=msg)

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
