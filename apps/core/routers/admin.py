from fastapi import APIRouter, Depends, HTTPException, Query, Response
from typing import List, Optional
import os
import logging
import tempfile
import shutil
import qrcode
from io import BytesIO

from dependencies import get_auth_context
from schemas import (
    DBStatsResponse, FolderResponse, FolderItem,
    BundleRequest, BundleResponse, InviteRequest
)
from database_supabase import get_client, log_usage, get_signed_url, get_stats

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/api/db/stats", response_model=DBStatsResponse)
async def db_stats():
    """Get database statistics."""
    stats = get_stats()
    return DBStatsResponse(**stats)

@router.get("/api/admin/folders", response_model=FolderResponse)
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
            log_usage(
                org_id=auth["org_id"],
                user_id=auth.get("user_id"),
                action="browse",
                metadata={"path": path}
            )
            
        return FolderResponse(path=path, parent=parent, items=items)
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")

@router.post("/api/bundles", response_model=BundleResponse)
async def create_bundle(
    req: BundleRequest,
    auth: dict = Depends(get_auth_context)
):
    """Create a photo bundle in Supabase (Phase 5)."""
    
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

@router.get("/api/bundles/{bundle_id}")
async def get_bundle(bundle_id: str):
    """Retrieve a bundle and its photos from Supabase (Phase 5)."""
    
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

@router.get("/api/qr")
async def generate_qr(url: str):
    img = qrcode.make(url)
    buf = BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return Response(content=buf.getvalue(), media_type="image/png")


@router.post("/api/invite")
async def invite_user(
    req: InviteRequest,
    auth: dict = Depends(get_auth_context)
):
    """
    Invite a new user to the organization via email.
    Uses Supabase Auth Admin API to send an invite link.
    """
    
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
