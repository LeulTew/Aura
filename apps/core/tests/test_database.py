import pytest
from unittest.mock import MagicMock, patch, PropertyMock
import numpy as np
import sys
import os
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

import database

@pytest.fixture
def mock_lancedb():
    """Mock the entire lancedb module."""
    with patch("database.lancedb") as mock_lance:
        mock_db = MagicMock()
        mock_lance.connect.return_value = mock_db
        yield mock_db

@pytest.fixture
def mock_table():
    """Create a mock table for testing."""
    table = MagicMock()
    return table

class TestDatabaseConnection:
    def test_get_db_creates_connection(self, mock_lancedb):
        # Reset global _db
        database._db = None
        
        db = database.get_db()
        
        assert db is not None
        database.lancedb.connect.assert_called()

    def test_get_db_reuses_connection(self, mock_lancedb):
        database._db = None
        
        db1 = database.get_db()
        db2 = database.get_db()
        
        # Should only call connect once
        assert database.lancedb.connect.call_count == 1

class TestTableOperations:
    def test_get_or_create_table_creates_new(self, mock_lancedb):
        database._db = None
        mock_lancedb.table_names.return_value = []
        mock_lancedb.create_table.return_value = MagicMock()
        
        table = database.get_or_create_table()
        
        mock_lancedb.create_table.assert_called_once()

    def test_get_or_create_table_opens_existing(self, mock_lancedb):
        database._db = None
        mock_lancedb.table_names.return_value = ["gallery"]
        mock_lancedb.open_table.return_value = MagicMock()
        
        table = database.get_or_create_table()
        
        mock_lancedb.open_table.assert_called_with("gallery")

class TestAddFaces:
    def test_add_faces_success(self, mock_lancedb):
        database._db = None
        mock_table = MagicMock()
        mock_lancedb.table_names.return_value = ["gallery"]
        mock_lancedb.open_table.return_value = mock_table
        
        records = [
            {
                "vector": [0.1] * 512,
                "image_blob": b"fake-image",
                "source_path": "/test/image.jpg",
                "photo_date": "2023-01-01"
            }
        ]
        
        count = database.add_faces(records)
        
        assert count == 1
        mock_table.add.assert_called_once()

    def test_add_faces_with_defaults(self, mock_lancedb):
        database._db = None
        mock_table = MagicMock()
        mock_lancedb.table_names.return_value = ["gallery"]
        mock_lancedb.open_table.return_value = mock_table
        
        records = [
            {
                "vector": [0.1] * 512,
                "image_blob": b"fake-image",
                "source_path": "/test/image.jpg"
                # No photo_date - should use default
            }
        ]
        
        count = database.add_faces(records)
        
        assert count == 1
        
        # Check that photo_date was set
        call_args = mock_table.add.call_args[0][0]
        assert "photo_date" in call_args[0]

class TestSearchSimilar:
    def test_search_similar_basic(self, mock_lancedb):
        database._db = None
        mock_table = MagicMock()
        mock_lancedb.table_names.return_value = ["gallery"]
        mock_lancedb.open_table.return_value = mock_table
        
        # Mock search results as DataFrame
        mock_results = pd.DataFrame([{
            "id": "test-id",
            "source_path": "/test/image.jpg",
            "_distance": 0.5,
            "photo_date": "2023-01-01",
            "created_at": "2023-01-01T00:00:00"
        }])
        mock_table.search.return_value.limit.return_value.to_pandas.return_value = mock_results
        
        matches = database.search_similar([0.1] * 512, limit=5)
        
        assert len(matches) == 1
        assert matches[0]["id"] == "test-id"
        assert matches[0]["distance"] == 0.5

    def test_search_similar_with_blob(self, mock_lancedb):
        database._db = None
        mock_table = MagicMock()
        mock_lancedb.table_names.return_value = ["gallery"]
        mock_lancedb.open_table.return_value = mock_table
        
        mock_results = pd.DataFrame([{
            "id": "test-id",
            "source_path": "/test/image.jpg",
            "_distance": 0.5,
            "photo_date": "2023-01-01",
            "created_at": "2023-01-01T00:00:00",
            "image_blob": b"fake-blob"
        }])
        mock_table.search.return_value.limit.return_value.to_pandas.return_value = mock_results
        
        matches = database.search_similar([0.1] * 512, limit=5, include_blob=True)
        
        assert "image_blob" in matches[0]
        assert matches[0]["image_blob"] == b"fake-blob"

    def test_search_similar_fallback_photo_date(self, mock_lancedb):
        database._db = None
        mock_table = MagicMock()
        mock_lancedb.table_names.return_value = ["gallery"]
        mock_lancedb.open_table.return_value = mock_table
        
        # No photo_date in results
        mock_results = pd.DataFrame([{
            "id": "test-id",
            "source_path": "/test/image.jpg",
            "_distance": 0.5,
            "created_at": "2023-06-15T12:00:00"
        }])
        mock_table.search.return_value.limit.return_value.to_pandas.return_value = mock_results
        
        matches = database.search_similar([0.1] * 512)
        
        # Should fall back to created_at date
        assert matches[0]["photo_date"] == "2023-06-15"

class TestGetStats:
    def test_get_stats_no_table(self, mock_lancedb):
        database._db = None
        mock_lancedb.table_names.return_value = []
        
        stats = database.get_stats()
        
        assert stats["total_faces"] == 0
        assert stats["table_exists"] == False

    def test_get_stats_with_table(self, mock_lancedb):
        database._db = None
        mock_table = MagicMock()
        mock_table.__len__ = MagicMock(return_value=100)
        mock_lancedb.table_names.return_value = ["gallery"]
        mock_lancedb.open_table.return_value = mock_table
        
        stats = database.get_stats()
        
        assert stats["total_faces"] == 100
        assert stats["table_exists"] == True

class TestClearDatabase:
    def test_clear_database_existing(self, mock_lancedb):
        database._db = None
        mock_lancedb.table_names.return_value = ["gallery"]
        
        result = database.clear_database()
        
        assert result == True
        mock_lancedb.drop_table.assert_called_with("gallery")

    def test_clear_database_not_existing(self, mock_lancedb):
        database._db = None
        mock_lancedb.table_names.return_value = []
        
        result = database.clear_database()
        
        assert result == False
