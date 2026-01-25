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
