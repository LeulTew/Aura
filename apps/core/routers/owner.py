"""
Owner Router - Multi-Studio Business Owner Endpoints

These endpoints are for admins who own/manage multiple studios.
They can switch between their organizations and view aggregated stats.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import jwt
from datetime import datetime, timedelta, timezone
import logging

from dependencies import get_auth_context, JWT_SECRET
from database_supabase import get_client

router = APIRouter(prefix="/api/owner", tags=["Owner"])
logger = logging.getLogger(__name__)


class OrgSummary(BaseModel):
    org_id: str
    org_name: str
    org_slug: str
    role: str
    is_primary: bool


class SwitchOrgRequest(BaseModel):
    org_id: str


@router.get("/organizations")
async def get_my_organizations(auth: dict = Depends(get_auth_context)):
    """
    Get all organizations the current user has access to.
    Returns list of orgs with their roles.
    """
    user_id = auth.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        client = get_client()
        
        # Use the helper function we created in the migration
        result = client.rpc("get_user_organizations", {"p_user_id": user_id}).execute()
        
        orgs = result.data or []
        
        # If no junction table entries, fall back to profiles.org_id
        if not orgs:
            profile = client.table("profiles").select(
                "org_id, role, organizations(name, slug)"
            ).eq("id", user_id).single().execute()
            
            if profile.data and profile.data.get("org_id"):
                org_data = profile.data.get("organizations", {})
                orgs = [{
                    "org_id": profile.data["org_id"],
                    "org_name": org_data.get("name", "Unknown"),
                    "org_slug": org_data.get("slug", ""),
                    "role": profile.data.get("role", "employee"),
                    "is_primary": True
                }]
        
        return {"success": True, "organizations": orgs}
        
    except Exception as e:
        logger.error(f"Get orgs error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch organizations")


@router.post("/switch-org")
async def switch_organization(
    req: SwitchOrgRequest,
    auth: dict = Depends(get_auth_context)
):
    """
    Switch the current user's active organization.
    Returns a new JWT scoped to the target org.
    Only works if the user has access to that org.
    """
    user_id = auth.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        client = get_client()
        
        # 1. Verify user has access to target org
        access_check = client.table("profile_organizations").select(
            "role"
        ).eq("user_id", user_id).eq("org_id", req.org_id).execute()
        
        if not access_check.data:
            # Fallback: Check profiles.org_id for single-org users
            profile_check = client.table("profiles").select(
                "org_id, role"
            ).eq("id", user_id).eq("org_id", req.org_id).execute()
            
            if not profile_check.data:
                raise HTTPException(status_code=403, detail="No access to this organization")
            
            role = profile_check.data[0].get("role", "employee")
        else:
            role = access_check.data[0].get("role", "admin")
        
        # 2. Get org details
        org_result = client.table("organizations").select("*").eq("id", req.org_id).single().execute()
        if not org_result.data:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        org = org_result.data
        
        # 3. Update profiles.org_id to new org (for quick context)
        client.table("profiles").update({"org_id": req.org_id}).eq("id", user_id).execute()
        
        # 4. Get user profile for token
        profile = client.table("profiles").select("email, display_name").eq("id", user_id).single().execute()
        profile_data = profile.data or {}
        
        # 5. Mint new token with target org context
        new_token = jwt.encode({
            "sub": user_id,
            "email": profile_data.get("email", ""),
            "role": role,  # Keep their actual role in this org
            "org_id": org["id"],
            "org_slug": org["slug"],
            "org_name": org["name"],
            "display_name": profile_data.get("display_name", ""),
            "exp": datetime.now(timezone.utc) + timedelta(days=7)
        }, JWT_SECRET, algorithm="HS256")
        
        return {
            "success": True,
            "token": new_token,
            "organization": {
                "id": org["id"],
                "name": org["name"],
                "slug": org["slug"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Switch org error: {e}")
        raise HTTPException(status_code=500, detail="Failed to switch organization")


@router.get("/stats")
async def get_owner_stats(auth: dict = Depends(get_auth_context)):
    """
    Get aggregated stats across all organizations the owner manages.
    """
    user_id = auth.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        client = get_client()
        
        # Get all orgs this user has admin access to
        orgs_result = client.table("profile_organizations").select(
            "org_id"
        ).eq("user_id", user_id).eq("role", "admin").execute()
        
        org_ids = [o["org_id"] for o in (orgs_result.data or [])]
        
        # Fallback for single-org admins
        if not org_ids and auth.get("role") == "admin" and auth.get("org_id"):
            org_ids = [auth.get("org_id")]
        
        if not org_ids:
            return {
                "success": True,
                "stats": {
                    "total_studios": 0,
                    "total_photos": 0,
                    "total_employees": 0,
                    "total_storage_gb": 0.0
                }
            }
        
        # Aggregate stats
        orgs_data = client.table("organizations").select(
            "id, storage_used_bytes"
        ).in_("id", org_ids).execute()
        
        photos_count = 0
        employees_count = 0
        total_storage = 0
        
        for org in (orgs_data.data or []):
            total_storage += org.get("storage_used_bytes", 0)
            
            # Count photos per org
            photos_res = client.table("photos").select("id", count="exact").eq("org_id", org["id"]).execute()
            photos_count += photos_res.count or 0
            
            # Count employees per org
            emp_res = client.table("profile_organizations").select("id", count="exact").eq("org_id", org["id"]).execute()
            employees_count += emp_res.count or 0
        
        return {
            "success": True,
            "stats": {
                "total_studios": len(org_ids),
                "total_photos": photos_count,
                "total_employees": employees_count,
                "total_storage_gb": round(total_storage / (1024**3), 2)
            }
        }
        
    except Exception as e:
        logger.error(f"Owner stats error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch stats")
