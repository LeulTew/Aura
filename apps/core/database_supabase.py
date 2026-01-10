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


def store_embedding(
    source_path: str,
    embedding: List[float],
    photo_date: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[str]:
    """
    Store a face embedding in Supabase.
    
    Args:
        source_path: Path to the original image
        embedding: 512D face embedding vector
        photo_date: YYYY-MM-DD format date string
        metadata: Additional metadata (EXIF, etc.)
    
    Returns:
        UUID of the inserted record, or None on failure
    """
    try:
        client = get_client()
        
        data = {
            "path": source_path,
            "embedding": embedding,
            "photo_date": photo_date,
            "metadata": metadata or {}
        }
        
        result = client.table("photos").insert(data).execute()
        
        if result.data:
            record_id = result.data[0]["id"]
            logger.info(f"Stored embedding for {source_path} with id {record_id}")
            return record_id
        
        return None
        
    except Exception as e:
        logger.error(f"Failed to store embedding: {e}")
        return None


def search_similar(
    query_embedding: List[float],
    threshold: float = 0.6,
    limit: int = 100
) -> List[Dict[str, Any]]:
    """
    Search for similar faces using cosine similarity.
    
    Args:
        query_embedding: 512D face embedding to match
        threshold: Minimum similarity score (0-1)
        limit: Maximum results to return
    
    Returns:
        List of matches with id, path, metadata, similarity
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
        logger.info(f"Found {len(matches)} matches above threshold {threshold}")
        return matches
        
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
