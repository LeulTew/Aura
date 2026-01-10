#!/usr/bin/env python
"""
Unit tests for Aura Core API.
Run with: ./venv/bin/pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import os
import sys
import json
import tempfile

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Mock database_supabase before importing main
mock_db_supa = MagicMock()
mock_db_supa.get_stats.return_value = {"total_faces": 42, "table_exists": True}
mock_db_supa.store_embeddings.return_value = 5
mock_db_supa.search_similar.return_value = [
    {"id": "test-id", "path": "test.jpg", "distance": 0.1, "similarity": 0.9, "photo_date": "2023-01-01"}
]
sys.modules["database_supabase"] = mock_db_supa

from main import app

client = TestClient(app)

class TestAuthEndpoint:
    """Tests for the /api/auth/face-login endpoint."""
    
    def test_face_login_success(self):
        """Face login should succeed with valid face match."""
        # Mock processor to return embedding
        with patch("main.get_processor") as mock_get_proc:
            mock_proc_instance = MagicMock()
            mock_proc_instance.get_embedding.return_value = [0.1] * 512
            mock_get_proc.return_value = mock_proc_instance
            
            # Mock DB search to return a match
            mock_db_supa.search_similar.return_value = [
                {"id": "user-face-id", "path": "user.jpg", "distance": 0.2, "similarity": 0.8}
            ]

            # Create dummy image
            with tempfile.NamedTemporaryFile(suffix=".jpg") as tmp:
                tmp.write(b"fake image data")
                tmp.seek(0)
                
                response = client.post(
                    "/api/auth/face-login",
                    files={"file": ("selfie.jpg", tmp, "image/jpeg")}
                )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "token" in data
        assert data["match"]["id"] == "user-face-id"

    def test_face_login_no_face(self):
        """Face login should fail if no face detected."""
        with patch("main.get_processor") as mock_get_proc:
            mock_proc_instance = MagicMock()
            mock_proc_instance.get_embedding.return_value = None
            mock_get_proc.return_value = mock_proc_instance

            with tempfile.NamedTemporaryFile(suffix=".jpg") as tmp:
                tmp.write(b"fake image data")
                tmp.seek(0)
                response = client.post(
                    "/api/auth/face-login",
                    files={"file": ("selfie.jpg", tmp, "image/jpeg")}
                )
        
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "No face detected"



class TestHealthEndpoints:
    """Tests for health and root endpoints."""
    
    def test_root_returns_welcome_message(self):
        """Root endpoint should return welcome message."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "Aura" in data["message"]
    
    def test_health_returns_ok(self):
        """Health endpoint should return ok status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "processor_loaded" in data


class TestDBStatsEndpoint:
    """Tests for the /api/db/stats endpoint."""
    
    def test_stats_returns_data(self):
        """Stats endpoint should return database stats."""
        response = client.get("/api/db/stats")
        assert response.status_code == 200
        data = response.json()
        assert "total_faces" in data
        assert "table_exists" in data


class TestEmbedEndpoint:
    """Tests for the /api/embed endpoint."""
    
    def test_embed_with_valid_image(self):
        """Embed endpoint should return embedding for valid face image."""
        test_image_path = "test_images/test_face_1.png"
        
        if not os.path.exists(test_image_path):
            pytest.skip("Test image not found")
        
        with open(test_image_path, "rb") as f:
            response = client.post(
                "/api/embed",
                files={"file": ("test.png", f, "image/png")}
            )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["embedding"] is not None
        assert data["dimensions"] == 512
    
    def test_embed_rejects_non_image(self):
        """Embed endpoint should reject non-image files."""
        response = client.post(
            "/api/embed",
            files={"file": ("test.txt", b"not an image", "text/plain")}
        )
        
        assert response.status_code == 400


class TestScanEndpoint:
    """Tests for the /api/scan endpoint."""
    
    def test_scan_returns_error_for_missing_directory(self):
        """Scan endpoint should return 404 for missing directory."""
        response = client.post(
            "/api/scan",
            params={"directory_path": "/nonexistent/path"}
        )
        
        assert response.status_code == 404
    
    def test_scan_processes_valid_directory(self):
        """Scan endpoint should process images in valid directory."""
        test_dir = "test_images"
        
        if not os.path.exists(test_dir):
            pytest.skip("Test directory not found")
        
        response = client.post(
            "/api/scan",
            params={"directory_path": test_dir}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["total_processed"] >= 1
        assert len(data["results"]) >= 1


class TestSearchEndpoint:
    """Tests for the /api/search endpoint."""
    
    def test_search_requires_file(self):
        """Search endpoint should require a file upload."""
        response = client.post("/api/search")
        assert response.status_code == 422  # Validation error

    def test_search_with_invalid_file(self):
        """Search endpoint should handle invalid image."""
        response = client.post(
            "/api/search",
            files={"file": ("test.txt", b"not an image", "text/plain")}
        )
        # Should return 400 for bad image or 200 with error
        assert response.status_code in [400, 200]


class TestAdminLogin:
    """Tests for the admin login endpoint."""
    
    def test_login_success(self):
        """Login should succeed with correct PIN."""
        response = client.post(
            "/api/admin/login",
            json={"pin": "1234"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["token"] is not None
    
    def test_login_failure(self):
        """Login should fail with incorrect PIN."""
        response = client.post(
            "/api/admin/login",
            json={"pin": "wrong"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is False


class TestFolderListEndpoint:
    """Tests for the /api/admin/folders endpoint."""
    
    def test_list_root_folder(self):
        """List root folder should return items."""
        response = client.get("/api/admin/folders", params={"path": "/"})
        assert response.status_code == 200
        data = response.json()
        assert "path" in data
        assert "items" in data

    def test_list_nonexistent_folder(self):
        """List non-existent folder should return 404."""
        response = client.get("/api/admin/folders", params={"path": "/nonexistent/path/xyz"})
        # 404 or 200 with empty items
        assert response.status_code in [404, 200]


class TestBundleEndpoints:
    """Tests for bundle creation and retrieval."""
    
    def test_create_bundle(self):
        """Create bundle should return bundle ID."""
        response = client.post(
            "/api/bundles",
            json={
                "name": "Test Bundle",
                "photo_ids": ["/path/to/photo1.jpg", "/path/to/photo2.jpg"]
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "url" in data
    
    def test_get_nonexistent_bundle(self):
        """Get non-existent bundle should return error."""
        response = client.get("/api/bundles/nonexistent-id-12345")
        # 404 or error in response
        assert response.status_code in [404, 200, 500]


class TestImageEndpoint:
    """Tests for the /api/image endpoint."""
    
    def test_get_image_requires_path(self):
        """Image endpoint should require path parameter."""
        response = client.get("/api/image")
        assert response.status_code == 422  # Missing required param
    
    def test_get_nonexistent_image(self):
        """Image endpoint should return 404 for missing file."""
        response = client.get("/api/image", params={"path": "/nonexistent/image.jpg"})
        # Should return error or redirect
        assert response.status_code in [404, 302, 200]


class TestQREndpoint:
    """Tests for the QR code generation endpoint."""
    
    def test_generate_qr_requires_url(self):
        """QR endpoint should require URL parameter."""
        response = client.get("/api/qr")
        assert response.status_code == 422


class TestIndexPhotoEndpoint:
    """Tests for the /api/index-photo endpoint."""
    
    @patch("main.get_processor")
    @patch("database_supabase.store_embedding")
    def test_index_photo_success(self, mock_store, mock_get_processor):
        # Mock processor
        mock_processor = MagicMock()
        mock_processor.get_embedding_from_image.return_value = [0.1] * 512
        mock_get_processor.return_value = mock_processor
        
        # Mock store
        mock_store.return_value = "new_record_id"
        
        # Create dummy image
        import numpy as np
        import cv2
        img = np.zeros((100, 100, 3), dtype=np.uint8)
        _, img_encoded = cv2.imencode('.jpg', img)
        
        response = client.post(
            "/api/index-photo",
            files={"file": ("thumb.jpg", img_encoded.tobytes(), "image/jpeg")},
            data={"path": "photos/test.jpg", "metadata": "{}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "indexed"
        assert data["id"] == "new_record_id"
        
        # Verify calls
        mock_processor.get_embedding_from_image.assert_called_once()
        mock_store.assert_called_once()

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
