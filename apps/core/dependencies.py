import os
import logging
import jwt
from fastapi import Header
from typing import Optional, Dict, Any

# Setup Logging
logger = logging.getLogger(__name__)

# Constants
JWT_SECRET = os.environ.get("JWT_SECRET", "aura_secret_key")
ADMIN_PIN = os.environ.get("ADMIN_PIN", "1234")

# Global Processor State
processor = None

def get_processor():
    """Lazy load the FaceProcessor instance."""
    global processor
    if processor is None:
        from processor import FaceProcessor
        logger.info("Initializing FaceProcessor...")
        processor = FaceProcessor()
    return processor

def get_auth_context(authorization: str = Header(None)) -> Dict[str, Any]:
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
            "org_slug": payload.get("org_slug"),
             "org_name": payload.get("org_name")
        }
    except Exception as e:
        logger.warning(f"Auth error: {e}")
        return {"role": "guest", "org_id": None}


def require_active_subscription(authorization: str = Header(None)) -> Dict[str, Any]:
    """
    Dependency that enforces an active subscription for write operations.
    Raises HTTPException if subscription is past_due or canceled.
    
    Use this as a dependency for endpoints that should be blocked for
    organizations with billing issues (e.g., uploads, batch processing).
    """
    from fastapi import HTTPException
    from database_supabase import get_client
    
    auth = get_auth_context(authorization)
    org_id = auth.get("org_id")
    
    # Superadmins and guests bypass subscription check
    if auth.get("role") == "superadmin" or not org_id:
        return auth
    
    try:
        client = get_client()
        result = client.table("organizations").select(
            "subscription_status"
        ).eq("id", org_id).single().execute()
        
        if result.data:
            status = result.data.get("subscription_status", "none")
            
            if status in ("past_due", "canceled"):
                logger.warning(f"Blocked action for org {org_id}: subscription {status}")
                raise HTTPException(
                    status_code=402,  # Payment Required
                    detail=f"Subscription is {status}. Please update your payment method."
                )
    except HTTPException:
        raise  # Re-raise our own exception
    except Exception as e:
        logger.error(f"Subscription check failed: {e}")
        # Fail open - don't block if check fails
        pass
    
    return auth

