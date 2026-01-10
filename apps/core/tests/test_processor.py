import pytest
from unittest.mock import MagicMock, patch
import numpy as np
import sys
import os

# Ensure apps/core in path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from processor import FaceProcessor

@pytest.fixture
def mock_face_analysis():
    with patch("processor.FaceAnalysis") as MockFaceAnalysis:
        # Mock instance
        app = MockFaceAnalysis.return_value
        
        # Mock get method return
        face = MagicMock()
        face.normed_embedding = np.array([0.1] * 512, dtype=np.float32)
        face.bbox = [0, 0, 100, 100]
        app.get.return_value = [face]
        
        yield MockFaceAnalysis

@pytest.fixture
def mock_cv2():
    with patch("processor.cv2.imread") as mock_read:
        mock_read.return_value = np.zeros((100, 100, 3), dtype=np.uint8)
        yield mock_read

def test_processor_init(mock_face_analysis):
    processor = FaceProcessor()
    assert processor.app is not None
    # Check calling prepare
    processor.app.prepare.assert_called()

def test_get_embedding(mock_face_analysis, mock_cv2):
    processor = FaceProcessor()
    embedding = processor.get_embedding("fake.jpg")
    assert embedding is not None
    assert len(embedding) == 512
    assert abs(embedding[0] - 0.1) < 0.0001

def test_get_embedding_no_face(mock_face_analysis, mock_cv2):
    processor = FaceProcessor()
    processor.app.get.return_value = []
    embedding = processor.get_embedding("fake.jpg")
    assert embedding is None

def test_get_embedding_read_fail(mock_face_analysis, mock_cv2):
    processor = FaceProcessor()
    mock_cv2.return_value = None
    embedding = processor.get_embedding("fake.jpg")
    assert embedding is None

def test_scan_directory(mock_face_analysis, mock_cv2):
    processor = FaceProcessor()
    with patch("os.walk") as mock_walk:
        mock_walk.return_value = [("/root", [], ["img.jpg", "ignore.txt"])]
        with patch("os.path.getmtime") as mock_mtime:
            mock_mtime.return_value = 1672531200 # 2023-01-01
            
            results = processor.scan_directory("/root")
            assert len(results) == 1
            assert results[0]['path'] == "/root/img.jpg"
