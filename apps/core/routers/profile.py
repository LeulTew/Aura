from fastapi import APIRouter, Depends, HTTPException
import logging

from dependencies import get_auth_context
from schemas import ProfileUpdateRequest
from database_supabase import get_client, log_usage

router = APIRouter()
logger = logging.getLogger(__name__)

@router.put("/api/profile")
async def update_profile(
    req: ProfileUpdateRequest,
    auth: dict = Depends(get_auth_context)
):
    """
    Update the current user's profile (display_name, avatar_url).
    """
    user_id = auth.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    client = get_client()
    
    # Build update dict with only provided fields
    update_data = {}
    if req.display_name is not None:
        update_data["display_name"] = req.display_name
    if req.avatar_url is not None:
        update_data["avatar_url"] = req.avatar_url
    
    if not update_data:
        return {"success": True, "message": "No changes provided"}
    
    try:
        result = client.table("profiles").update(update_data).eq("id", user_id).execute()
        
        log_usage(
            org_id=auth.get("org_id"),
            user_id=user_id,
            action="update_profile",
            metadata={"fields": list(update_data.keys())}
        )
        
        return {"success": True, "message": "Profile updated", "updated": update_data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/logout-sessions")
async def logout_all_sessions(
    auth: dict = Depends(get_auth_context)
):
    """
    Sign out the user from all other sessions/devices.
    Uses Supabase Auth Admin API.
    """
    user_id = auth.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    client = get_client()
    
    try:
        # Supabase Admin API: Sign out user from all sessions
        # This invalidates all refresh tokens for the user
        client.auth.admin.sign_out(user_id)
        
        log_usage(
            org_id=auth.get("org_id"),
            user_id=user_id,
            action="logout_all_sessions",
            metadata={"triggered_by": "security_settings"}
        )
        
        return {
            "success": True, 
            "message": "All sessions invalidated. Current session will require re-login."
        }
    except Exception as e:
        logger.error(f"Failed to logout sessions: {e}")
        raise HTTPException(status_code=500, detail=str(e))
