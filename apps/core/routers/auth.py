from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
import shutil
import os
import tempfile
import logging

from dependencies import get_auth_context, JWT_SECRET, ADMIN_PIN, get_processor
from schemas import LoginRequest, LoginResponse, SwitchTenantRequest
from database_supabase import get_client

router = APIRouter()
logger = logging.getLogger(__name__)

# Role-based redirect mapping
ROLE_REDIRECTS = {
    "superadmin": "/superadmin",
    "admin": "/admin",
    "employee": "/admin/capture"
}

@router.post("/api/auth/login", response_model=LoginResponse)
async def unified_login(req: LoginRequest):
    """
    Multi-tenant login with email/password via Supabase Auth.
    Returns JWT with role, org context, redirect path, and available orgs for multi-studio owners.
    """
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
        
        # 3. Check for multiple organizations (multi-studio owner)
        available_orgs = []
        if role in ["admin", "superadmin"]:
            try:
                orgs_result = client.table("profile_organizations").select(
                    "org_id, role, is_primary, organizations(name, slug)"
                ).eq("user_id", str(user_id)).execute()
                
                if orgs_result.data and len(orgs_result.data) > 0:
                    for po in orgs_result.data:
                        org_info = po.get("organizations", {})
                        available_orgs.append({
                            "id": po["org_id"],
                            "name": org_info.get("name", "Unknown"),
                            "slug": org_info.get("slug", ""),
                            "role": po.get("role", "admin"),
                            "is_primary": po.get("is_primary", False)
                        })
            except Exception as e:
                # Table might not exist yet, that's okay
                logger.debug(f"profile_organizations lookup: {e}")
        
        # 4. Build custom JWT with full context
        token = jwt.encode({
            "sub": str(user_id),
            "email": user_email,
            "role": role,
            "org_id": str(org_id) if org_id else None,
            "org_slug": org_slug,
            "org_name": org_name,
            "display_name": profile.get("display_name"),
            "multi_org": len(available_orgs) > 1,  # Flag for frontend
            "exp": datetime.now(timezone.utc) + timedelta(days=7)
        }, JWT_SECRET, algorithm="HS256")
        
        # 5. Determine redirect
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
                "org_name": org_name,
                "available_orgs": available_orgs if available_orgs else None
            }
        )
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        return LoginResponse(success=False, error="Authentication failed")

@router.post("/api/superadmin/switch-tenant")
async def switch_tenant(
    req: SwitchTenantRequest,
    auth: dict = Depends(get_auth_context)
):
    """
    SuperAdmin only: Switch context to a specific tenant.
    Returns a new short-lived JWT scoped to the target organization with 'admin' role.
    """
    # 1. Verify SuperAdmin
    if auth.get("role") != "superadmin":
        raise HTTPException(status_code=403, detail="Only SuperAdmins can switch context")
    
    try:
        client = get_client()
        
        # 2. Verify Target Org Exists (and get slug/name)
        org_res = client.table("organizations").select("*").eq("id", req.target_org_id).single().execute()
        
        if not org_res.data:
            raise HTTPException(status_code=404, detail="Target organization not found")
        
        org = org_res.data
        
        # 3. Mint new Token (Admin Role, Target Org Context)
        # We perform a "sudo" login effectively
        new_token = jwt.encode({
            "sub": auth.get("user_id"), # Keep original user ID for audit
            "email": "superadmin-sudo", # Marker
            "role": "admin",            # Downgrade to Admin for safety/compat
            "org_id": org["id"],
            "org_slug": org["slug"],
            "org_name": org["name"],
            "display_name": "SuperAdmin (Sudo)",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1) # Short expiry
        }, JWT_SECRET, algorithm="HS256")
        
        return {
            "success": True,
            "token": new_token,
            "redirect": "/admin"
        }
        
    except Exception as e:
        logger.error(f"Switch token error: {e}")
        raise HTTPException(status_code=500, detail="Failed to switch context")

@router.post("/api/admin/login", response_model=LoginResponse)
async def legacy_admin_login(req: LoginRequest):
    """
    Legacy PIN-based login for backward compatibility.
    Redirects to /api/auth/login for email/password.
    """
    
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

@router.post("/api/auth/face-login")
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
