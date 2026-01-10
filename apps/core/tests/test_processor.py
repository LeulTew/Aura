import pytest
from unittest.mock import MagicMock, patch, mock_open
import numpy as np
import sys
import os
from datetime import datetime
from io import BytesIO

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from processor import FaceProcessor

@pytest.fixture
def mock_face_analysis():
    with patch("processor.FaceAnalysis") as MockFaceAnalysis:
        app = MockFaceAnalysis.return_value
        
        face = MagicMock()
        face.normed_embedding = np.array([0.1] * 512, dtype=np.float32)
        face.bbox = [0, 0, 100, 100]
        app.get.return_value = [face]
        
        yield MockFaceAnalysis, app, face

@pytest.fixture
def mock_cv2():
    with patch("processor.cv2") as mock_cv:
        mock_cv.imread.return_value = np.zeros((100, 100, 3), dtype=np.uint8)
        yield mock_cv

class TestFaceProcessorInit:
    def test_processor_init_success(self, mock_face_analysis):
        MockFaceAnalysis, app, _ = mock_face_analysis
        
        processor = FaceProcessor()
        
        assert processor.app is not None
        app.prepare.assert_called_once()

    def test_processor_init_failure(self, mock_face_analysis):
        MockFaceAnalysis, app, _ = mock_face_analysis
        app.prepare.side_effect = Exception("Model load failed")
        
        with pytest.raises(Exception) as exc_info:
            FaceProcessor()
        
        assert "Model load failed" in str(exc_info.value)

class TestGetEmbedding:
    def test_get_embedding_success(self, mock_face_analysis, mock_cv2):
        processor = FaceProcessor()
        
        embedding = processor.get_embedding("test.jpg")
        
        assert embedding is not None
        assert len(embedding) == 512
        assert abs(embedding[0] - 0.1) < 0.0001

    def test_get_embedding_no_face(self, mock_face_analysis, mock_cv2):
        _, app, _ = mock_face_analysis
        app.get.return_value = []
        
        processor = FaceProcessor()
        embedding = processor.get_embedding("test.jpg")
        
        assert embedding is None

    def test_get_embedding_image_read_fail(self, mock_face_analysis, mock_cv2):
        mock_cv2.imread.return_value = None
        
        processor = FaceProcessor()
        embedding = processor.get_embedding("nonexistent.jpg")
        
        assert embedding is None

    def test_get_embedding_exception(self, mock_face_analysis, mock_cv2):
        _, app, _ = mock_face_analysis
        app.get.side_effect = Exception("Processing error")
        
        processor = FaceProcessor()
        embedding = processor.get_embedding("test.jpg")
        
        assert embedding is None

    def test_get_embedding_multiple_faces_selects_largest(self, mock_face_analysis, mock_cv2):
        _, app, _ = mock_face_analysis
        
        small_face = MagicMock()
        small_face.normed_embedding = np.array([0.2] * 512, dtype=np.float32)
        small_face.bbox = [0, 0, 50, 50]  # Smaller face
        
        large_face = MagicMock()
        large_face.normed_embedding = np.array([0.3] * 512, dtype=np.float32)
        large_face.bbox = [0, 0, 200, 200]  # Larger face
        
        app.get.return_value = [small_face, large_face]
        
        processor = FaceProcessor()
        embedding = processor.get_embedding("test.jpg")
        
        # Should return embedding from largest face
        assert abs(embedding[0] - 0.3) < 0.0001

class TestGetPhotoDate:
    def test_get_photo_date_from_exif(self, mock_face_analysis):
        processor = FaceProcessor()
        
        with patch("PIL.Image.open") as mock_open:
            mock_img = MagicMock()
            mock_img._getexif.return_value = {
                36867: "2023:07:16 18:54:03"  # DateTimeOriginal tag
            }
            mock_open.return_value.__enter__.return_value = mock_img
            
            with patch("PIL.ExifTags.TAGS", {36867: "DateTimeOriginal"}):
                date = processor.get_photo_date("test.jpg")
        
        assert date == "2023-07-16"

    def test_get_photo_date_from_datetime_tag(self, mock_face_analysis):
        processor = FaceProcessor()
        
        with patch("PIL.Image.open") as mock_open:
            mock_img = MagicMock()
            mock_img._getexif.return_value = {
                306: "2023:06:15 12:00:00"  # DateTime tag
            }
            mock_open.return_value.__enter__.return_value = mock_img
            
            with patch("PIL.ExifTags.TAGS", {306: "DateTime"}):
                date = processor.get_photo_date("test.jpg")
        
        assert date == "2023-06-15"

    def test_get_photo_date_fallback_to_mtime(self, mock_face_analysis):
        processor = FaceProcessor()
        
        with patch("PIL.Image.open") as mock_open:
            mock_open.side_effect = Exception("No EXIF")
        
        with patch("os.path.getmtime") as mock_mtime:
            mock_mtime.return_value = 1672531200  # 2023-01-01 00:00:00 UTC
            date = processor.get_photo_date("test.jpg")
        
        assert "2023" in date  # Year should be 2023

    def test_get_photo_date_fallback_to_now(self, mock_face_analysis):
        processor = FaceProcessor()
        
        with patch("PIL.Image.open") as mock_open:
            mock_open.side_effect = Exception("No EXIF")
        
        with patch("os.path.getmtime") as mock_mtime:
            mock_mtime.side_effect = Exception("No file")
            date = processor.get_photo_date("test.jpg")
        
        # Should return today's date
        today = datetime.now().strftime("%Y-%m-%d")
        assert date == today

    def test_get_photo_date_no_exif_data(self, mock_face_analysis):
        processor = FaceProcessor()
        
        with patch("PIL.Image.open") as mock_open:
            mock_img = MagicMock()
            mock_img._getexif.return_value = None
            mock_open.return_value.__enter__.return_value = mock_img
        
        with patch("os.path.getmtime") as mock_mtime:
            mock_mtime.return_value = 1672531200
            date = processor.get_photo_date("test.jpg")
        
        assert "2023" in date

class TestScanDirectory:
    def test_scan_directory_success(self, mock_face_analysis, mock_cv2):
        processor = FaceProcessor()
        
        with patch("os.walk") as mock_walk:
            mock_walk.return_value = [
                ("/photos", [], ["img1.jpg", "img2.png", "ignore.txt"])
            ]
            with patch.object(processor, "get_photo_date", return_value="2023-01-01"):
                results = processor.scan_directory("/photos")
        
        # Should process 2 images (jpg and png)
        assert len(results) == 2
        assert all(r["photo_date"] == "2023-01-01" for r in results)

    def test_scan_directory_no_faces(self, mock_face_analysis, mock_cv2):
        _, app, _ = mock_face_analysis
        app.get.return_value = []
        
        processor = FaceProcessor()
        
        with patch("os.walk") as mock_walk:
            mock_walk.return_value = [("/photos", [], ["img.jpg"])]
            results = processor.scan_directory("/photos")
        
        assert len(results) == 0

    def test_scan_directory_image_read_fail(self, mock_face_analysis, mock_cv2):
        mock_cv2.imread.return_value = None
        
        processor = FaceProcessor()
        
        with patch("os.walk") as mock_walk:
            mock_walk.return_value = [("/photos", [], ["img.jpg"])]
            results = processor.scan_directory("/photos")
        
        assert len(results) == 0

    def test_scan_directory_exception_handling(self, mock_face_analysis, mock_cv2):
        _, app, _ = mock_face_analysis
        app.get.side_effect = Exception("Processing failed")
        
        processor = FaceProcessor()
        
        with patch("os.walk") as mock_walk:
            mock_walk.return_value = [("/photos", [], ["img.jpg"])]
            results = processor.scan_directory("/photos")
        
        # Should handle exception and return empty
        assert len(results) == 0

    def test_scan_directory_multiple_faces_per_image(self, mock_face_analysis, mock_cv2):
        _, app, _ = mock_face_analysis
        
        face1 = MagicMock()
        face1.normed_embedding = np.array([0.1] * 512, dtype=np.float32)
        
        face2 = MagicMock()
        face2.normed_embedding = np.array([0.2] * 512, dtype=np.float32)
        
        app.get.return_value = [face1, face2]
        
        processor = FaceProcessor()
        
        with patch("os.walk") as mock_walk:
            mock_walk.return_value = [("/photos", [], ["group.jpg"])]
            with patch.object(processor, "get_photo_date", return_value="2023-01-01"):
                results = processor.scan_directory("/photos")
        
        # Should index both faces
        assert len(results) == 2

    def test_scan_directory_nested_folders(self, mock_face_analysis, mock_cv2):
        processor = FaceProcessor()
        
        with patch("os.walk") as mock_walk:
            mock_walk.return_value = [
                ("/photos", ["sub"], ["root.jpg"]),
                ("/photos/sub", [], ["nested.jpg"])
            ]
            with patch.object(processor, "get_photo_date", return_value="2023-01-01"):
                results = processor.scan_directory("/photos")
        
        assert len(results) == 2

    def test_scan_directory_webp_support(self, mock_face_analysis, mock_cv2):
        processor = FaceProcessor()
        
        with patch("os.walk") as mock_walk:
            mock_walk.return_value = [("/photos", [], ["img.webp"])]
            with patch.object(processor, "get_photo_date", return_value="2023-01-01"):
                results = processor.scan_directory("/photos")
        
        assert len(results) == 1
