from typing import List, Optional
from pydantic import BaseModel

# --- Common/Response Models ---

class EmbeddingResponse(BaseModel):
    success: bool
    embedding: Optional[List[float]] = None
    dimensions: Optional[int] = None
    error: Optional[str] = None

class ScanResult(BaseModel):
    path: str
    embedding: List[float]
    photo_date: Optional[str] = None

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

# --- Auth/Admin Models ---

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

class SwitchTenantRequest(BaseModel):
    target_org_id: str

class InviteRequest(BaseModel):
    email: str
    role: str = "employee"

class ProfileUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None

# --- Bundle/Folder Models ---

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
