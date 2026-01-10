"""
Supabase Database Adapter for Aura Pro.
Replaces local LanceDB with cloud-native Postgres + pgvector.
"""
import os
import logging
from typing import List, Dict, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)

# Lazy client initialization
_client = None


def get_client():
    """Get or create singleton Supabase client."""
    global _client
    if _client is None:
        from supabase import create_client
        
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        
        if not url or not key:
            raise ValueError(
                "Missing SUPABASE_URL or SUPABASE_KEY environment variables. "
                "Please set them in apps/core/.env"
            )
        
        _client = create_client(url, key)
        logger.info("Supabase client initialized")
    
    return _client


def store_embeddings(records: List[Dict[str, Any]]) -> int:
    """
    Store multiple face embeddings in Supabase.
    
    Args:
        records: List of dicts with keys: path, embedding, photo_date, metadata
        
    Returns:
        Number of records stored
    """
    try:
        client = get_client()
        
        # Supabase insert supports list of dicts
        result = client.table("photos").insert(records).execute()
        
        count = len(result.data) if result.data else 0
        logger.info(f"Stored {count} embeddings in Supabase")
        return count
        
    except Exception as e:
        logger.error(f"Failed to store embeddings: {e}")
        return 0


def search_similar(
    query_embedding: List[float],
    threshold: float = 0.6,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """
    Search for similar faces using cosine similarity.
    
    Args:
        query_embedding: 512D face embedding to match
        threshold: Minimum similarity score (0-1). Note: Logic is flipped vs LanceDB distance.
        limit: Maximum results to return
    
    Returns:
        List of matches with keys: id, source_path, distance, photo_date, similarity
    """
    try:
        client = get_client()
        
        result = client.rpc(
            "match_faces",
            {
                "query_embedding": query_embedding,
                "match_threshold": threshold,
                "match_count": limit
            }
        ).execute()
        
        matches = result.data or []
        
        # Normalize keys to match old interface where possible
        normalized = []
        for m in matches:
            sim = m.get("similarity", 0)
            normalized.append({
                "id": m["id"],
                "source_path": m["path"],
                "photo_date": m.get("photo_date"),
                "similarity": sim,
                "distance": 1.0 - sim, # Approx conversion for backward compat
                "metadata": m.get("metadata")
            })
            
        logger.info(f"Found {len(normalized)} matches above similarity {threshold}")
        return normalized
        
    except Exception as e:
        logger.error(f"Search failed: {e}")
        return []


def get_signed_url(path: str, expires_in: int = 3600) -> Optional[str]:
    """
    Generate a short-lived signed URL for an image.
    
    Args:
        path: Storage path (bucket/file)
        expires_in: URL validity in seconds (default 1 hour)
    
    Returns:
        Signed URL string, or None on failure
    """
    try:
        client = get_client()
        
        # Assume photos are stored in 'photos' bucket
        bucket = "photos"
        file_path = path.lstrip("/")
        
        result = client.storage.from_(bucket).create_signed_url(
            file_path, expires_in
        )
        
        return result.get("signedURL") or result.get("signedUrl")
        
    except Exception as e:
        logger.error(f"Failed to generate signed URL for {path}: {e}")
        return None


def get_stats() -> Dict[str, Any]:
    """Get database statistics."""
    try:
        client = get_client()
        
        result = client.rpc("get_db_stats", {}).execute()
        
        if result.data:
            return {
                "total_faces": result.data[0]["total_faces"],
                "table_exists": result.data[0]["table_exists"]
            }
        
        return {"total_faces": 0, "table_exists": False}
        
    except Exception as e:
        logger.error(f"Failed to get stats: {e}")
        return {"total_faces": 0, "table_exists": False}


def get_user_embedding(user_id: str) -> Optional[List[float]]:
    """Fetch the reference face embedding for a specific user."""
    try:
        client = get_client()
        res = client.table("users").select("embedding").eq("id", user_id).execute()
        if res.data and len(res.data) > 0:
            return res.data[0]["embedding"]
        return None
    except Exception as e:
        logger.error(f"Error fetching user embedding for {user_id}: {e}")
        return None


def add_photo_matches(matches: List[Dict[str, Any]]) -> int:
    """
    Batch insert photo matches into the junction table.
    matches: List of {photo_id, user_id, similarity}
    """
    if not matches:
        return 0
    try:
        client = get_client()
        # Use upsert to avoid errors on re-matching
        result = client.table("photo_matches").upsert(matches).execute()
        return len(result.data) if result.data else 0
    except Exception as e:
        logger.error(f"Error adding photo matches: {e}")
        return 0


# ============================================================================
# LEGACY LANCEDB IMPLEMENTATION (For Reference)
# ============================================================================
# The original database.py used LanceDB for local vector storage.
# Key differences:
# - LanceDB stored data in ./data/lancedb directory
# - Used pyarrow for schema definition
# - No authentication or cloud persistence
# 
# If you need to revert to local storage, use database.py instead.
# ============================================================================
