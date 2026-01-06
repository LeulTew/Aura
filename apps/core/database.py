"""
LanceDB Database Module for Aura.
Provides face embedding storage and vector similarity search.
"""

import os
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

import lancedb
from lancedb.pydantic import LanceModel, Vector
from pydantic import Field


# Schema for face records
class FaceRecord(LanceModel):
    """Schema for storing face embeddings with associated data."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vector: Vector(512)  # GhostFaceNet produces 512D embeddings
    image_blob: bytes  # Face crop stored as JPEG bytes
    source_path: str  # Original image file path
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())


# Database path (relative to apps/core)
DB_PATH = os.path.join(os.path.dirname(__file__), "data", "faces.lance")
TABLE_NAME = "gallery"

_db = None


def get_db() -> lancedb.DBConnection:
    """Get or create the LanceDB connection."""
    global _db
    if _db is None:
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        _db = lancedb.connect(DB_PATH)
    return _db


def get_or_create_table():
    """Get or create the faces table."""
    db = get_db()
    if TABLE_NAME in db.table_names():
        return db.open_table(TABLE_NAME)
    return db.create_table(TABLE_NAME, schema=FaceRecord)


def add_faces(records: List[Dict[str, Any]]) -> int:
    """
    Add face records to the database.
    
    Args:
        records: List of dicts with keys: vector, image_blob, source_path
        
    Returns:
        Number of records added
    """
    table = get_or_create_table()
    
    # Prepare records with defaults
    face_records = []
    for rec in records:
        face_records.append({
            "id": str(uuid.uuid4()),
            "vector": rec["vector"],
            "image_blob": rec["image_blob"],
            "source_path": rec["source_path"],
            "created_at": datetime.now().isoformat()
        })
    
    table.add(face_records)
    return len(face_records)


def search_similar(
    query_vector: List[float],
    limit: int = 5,
    include_blob: bool = False
) -> List[Dict[str, Any]]:
    """
    Search for similar faces using vector similarity.
    
    Args:
        query_vector: 512D face embedding to search for
        limit: Maximum number of results
        include_blob: Whether to include image_blob in results
        
    Returns:
        List of matching records with distance scores
    """
    table = get_or_create_table()
    
    # Perform ANN search
    results = table.search(query_vector).limit(limit).to_pandas()
    
    # Convert to list of dicts
    matches = []
    for _, row in results.iterrows():
        match = {
            "id": row["id"],
            "source_path": row["source_path"],
            "distance": row["_distance"],
            "created_at": row["created_at"]
        }
        if include_blob:
            match["image_blob"] = row["image_blob"]
        matches.append(match)
    
    return matches


def get_stats() -> Dict[str, Any]:
    """Get database statistics."""
    db = get_db()
    if TABLE_NAME not in db.table_names():
        return {"total_faces": 0, "table_exists": False}
    
    table = db.open_table(TABLE_NAME)
    return {
        "total_faces": len(table),
        "table_exists": True
    }


def clear_database() -> bool:
    """Clear all face records (for testing/reset)."""
    db = get_db()
    if TABLE_NAME in db.table_names():
        db.drop_table(TABLE_NAME)
        return True
    return False
