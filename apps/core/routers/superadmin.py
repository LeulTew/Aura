"""
SuperAdmin Router - Platform Management Endpoints

These endpoints are ONLY accessible to users with role='superadmin'.
They power the Platform Control dashboard at /superadmin.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import logging

from dependencies import get_auth_context
from database_supabase import get_client

router = APIRouter(prefix="/api/superadmin", tags=["SuperAdmin"])
logger = logging.getLogger(__name__)


# --- Request/Response Models ---

class CreateTenantRequest(BaseModel):
    name: str
    slug: str
    plan: str = "free"
    storage_limit_gb: int = 5


class TenantResponse(BaseModel):
    id: str
    name: str
    slug: str
    plan: str
    storage_limit_gb: int
    storage_used_bytes: int
    is_active: bool
    created_at: str


class PlatformStats(BaseModel):
    total_tenants: int
    active_tenants: int
    total_photos: int
    total_storage_gb: float


# --- Helper: Verify SuperAdmin ---

def require_superadmin(auth: dict = Depends(get_auth_context)):
    """Dependency to ensure only superadmins can access these endpoints."""
    if auth.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="SuperAdmin access required")
    return auth


# --- Endpoints ---

@router.get("/stats")
async def get_platform_stats(auth: dict = Depends(require_superadmin)):
    """Get aggregated platform statistics."""
    try:
        client = get_client()
        
        # Count organizations
        orgs_result = client.table("organizations").select("id, is_active, storage_used_bytes").execute()
        orgs = orgs_result.data or []
        
        total_tenants = len(orgs)
        active_tenants = sum(1 for o in orgs if o.get("is_active"))
        total_storage_bytes = sum(o.get("storage_used_bytes", 0) for o in orgs)
        
        # Count photos
        photos_result = client.table("photos").select("id", count="exact").execute()
        total_photos = photos_result.count or 0
        
        return {
            "data": {
                "total_tenants": total_tenants,
                "active_tenants": active_tenants,
                "total_photos": total_photos,
                "total_storage_gb": round(total_storage_bytes / (1024**3), 2)
            }
        }
    except Exception as e:
        logger.error(f"Stats error: {e}")
        return {"error": str(e)}


@router.get("/organizations")
async def list_organizations(auth: dict = Depends(require_superadmin)):
    """List all organizations on the platform."""
    try:
        client = get_client()
        result = client.table("organizations").select("*").order("created_at", desc=True).execute()
        return {"data": result.data or []}
    except Exception as e:
        logger.error(f"Org list error: {e}")
        return {"error": str(e)}


@router.post("/create-tenant")
async def create_tenant(
    req: CreateTenantRequest,
    auth: dict = Depends(require_superadmin)
):
    """Create a new tenant organization."""
    try:
        client = get_client()
        
        # Check slug uniqueness
        existing = client.table("organizations").select("id").eq("slug", req.slug).execute()
        if existing.data:
            return {"success": False, "error": "Slug already exists"}
        
        # Create organization
        result = client.table("organizations").insert({
            "name": req.name,
            "slug": req.slug,
            "plan": req.plan,
            "storage_limit_gb": req.storage_limit_gb,
            "is_active": True
        }).execute()
        
        if not result.data:
            return {"success": False, "error": "Failed to create organization"}
        
        return {"success": True, "data": result.data[0]}
        
    except Exception as e:
        logger.error(f"Create tenant error: {e}")
        return {"success": False, "error": str(e)}


@router.get("/logs")
async def get_platform_logs(
    limit: int = 50,
    auth: dict = Depends(require_superadmin)
):
    """Get recent usage logs across all tenants."""
    try:
        client = get_client()
        result = client.table("usage_logs").select(
            "*, organizations(name)"
        ).order("created_at", desc=True).limit(limit).execute()
        
        return {"data": result.data or []}
    except Exception as e:
        logger.error(f"Logs error: {e}")
        return {"error": str(e)}


@router.get("/users")
async def list_all_users(auth: dict = Depends(require_superadmin)):
    """List all users across the platform."""
    try:
        client = get_client()
        result = client.table("profiles").select(
            "id, email, display_name, role, org_id, organizations(name)"
        ).order("created_at", desc=True).execute()
        
        return {"data": result.data or []}
    except Exception as e:
        logger.error(f"Users list error: {e}")
        return {"error": str(e)}
