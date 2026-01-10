#!/usr/bin/env python
"""
Unit tests for Aura Core API.
Run with: ./venv/bin/pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

client = TestClient(app)


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


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
