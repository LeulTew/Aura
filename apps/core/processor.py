import os
import time
from typing import List, Dict, Any
from deepface import DeepFace
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FaceProcessor:
    def __init__(self):
        """
        Initialize the FaceProcessor with GhostFaceNet and YuNet.
        We perform a dummy forward pass to warm up the model.
        """
        self.model_name = "GhostFaceNet"
        self.detector_backend = "yunet"
        logger.info(f"Initializing FaceProcessor with {self.model_name} and {self.detector_backend}...")
        
        # Warmup
        try:
            # Create a dummy black image for warmup if needed, 
            # but DeepFace usually loads lazy. We force build here.
            DeepFace.build_model(self.model_name)
            logger.info("Model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise e

    def get_embedding(self, img_path: str) -> List[float]:
        """
        Detects the largest face in the image and returns its 128D/512D embedding.
        Returns None if no face is found.
        """
        try:
            start = time.time()
            embeddings = DeepFace.represent(
                img_path=img_path,
                model_name=self.model_name,
                detector_backend=self.detector_backend,
                enforce_detection=True,
                align=True
            )
            
            if not embeddings:
                return None
            
            # Assuming we only want the most prominent face for now (index 0)
            # In a group photo scenario, we would iterate, but for the 'Subject' search, usually one.
            # DeepFace.represent returns a list of dicts.
            
            embedding = embeddings[0]['embedding']
            duration = time.time() - start
            logger.info(f"Processed {os.path.basename(img_path)} in {duration:.2f}s")
            
            return embedding

        except ValueError:
            logger.warning(f"No face detected in {img_path}")
            return None
        except Exception as e:
            logger.error(f"Error processing {img_path}: {e}")
            return None

    def get_photo_date(self, img_path: str) -> str:
        """
        Extract photo date from EXIF metadata or fallback to file mtime.
        Returns date in YYYY-MM-DD format.
        """
        from datetime import datetime
        
        # Try to extract EXIF date
        try:
            from PIL import Image
            from PIL.ExifTags import TAGS
            
            with Image.open(img_path) as img:
                exif_data = img._getexif()
                if exif_data:
                    for tag_id, value in exif_data.items():
                        tag = TAGS.get(tag_id, tag_id)
                        if tag == "DateTimeOriginal" or tag == "DateTime":
                            # Format: "2025:07:16 18:54:03"
                            date_str = value.split(" ")[0].replace(":", "-")
                            return date_str
        except Exception:
            pass
        
        # Fallback to file modification time
        try:
            mtime = os.path.getmtime(img_path)
            return datetime.fromtimestamp(mtime).strftime("%Y-%m-%d")
        except Exception:
            return datetime.now().strftime("%Y-%m-%d")

    def scan_directory(self, directory_path: str) -> List[Dict[str, Any]]:
        """
        Scans a directory for images and returns a list of results.
        """
        results = []
        valid_extensions = {".jpg", ".jpeg", ".png", ".webp"}
        
        for root, _, files in os.walk(directory_path):
            for file in files:
                if os.path.splitext(file)[1].lower() in valid_extensions:
                    full_path = os.path.join(root, file)
                    emb = self.get_embedding(full_path)
                    if emb:
                        results.append({
                            "path": full_path,
                            "embedding": emb,
                            "photo_date": self.get_photo_date(full_path)
                        })
        return results

