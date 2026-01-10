import os
import time
import numpy as np
from typing import List, Dict, Any
import logging
import cv2
from insightface.app import FaceAnalysis

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class FaceProcessor:
    def __init__(self):
        """
        Initialize the FaceProcessor with InsightFace (ONNX Runtime).
        Uses the default 'buffalo_l' model pack which includes detection and recognition.
        """
        self.app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
        logger.info("Initializing FaceProcessor (InsightFace/ONNX)...")
        
        # Prepare the model (warmup/download)
        # ctx_id=0 for GPU, -1 for CPU. default is usually CPU if no GPU.
        try:
            self.app.prepare(ctx_id=0, det_size=(640, 640))
            logger.info("InsightFace model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load InsightFace model: {e}")
            raise e

    def get_embedding_from_image(self, img: np.ndarray) -> List[float]:
        """
        Get embedding from a loaded numpy array (BGR).
        """
        try:
            start = time.time()
            
            # Additional safety check for dimensions (if not checked before)
            # Resize loop logic could be here, but usually caller handles optimization if passing raw buffer
            # Or we can reuse resize strict here
            MAX_DIM = 1280
            h, w = img.shape[:2]
            if max(h, w) > MAX_DIM:
                scale = MAX_DIM / max(h, w)
                img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)

            faces = self.app.get(img)
            
            if not faces:
                logging.debug("No faces found in image buffer")
                return None
            
            # Sort by area (largest face first)
            faces = sorted(faces, key=lambda x: (x.bbox[2]-x.bbox[0]) * (x.bbox[3]-x.bbox[1]), reverse=True)
            
            # Get the embedding of the largest face
            embedding = faces[0].normed_embedding.tolist()
            return embedding

        except Exception as e:
            logger.error(f"Error processing image buffer: {e}")
            return None

    def get_embedding(self, img_path: str) -> List[float]:
        """
        Detects the largest face in the image and returns its 512D embedding.
        Returns None if no face is found.
        """
        try:
            start = time.time()
            
            # InsightFace reads via cv2/numpy
            img = cv2.imread(img_path)
            if img is None:
                logger.warning(f"Could not read image: {img_path}")
                return None

            embedding = self.get_embedding_from_image(img)
            
            duration = time.time() - start
            logger.info(f"Processed {os.path.basename(img_path)} in {duration:.4f}s")
            
            return embedding

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
        Scans a directory for images and indexes ALL faces found in each image.
        """
        results = []
        valid_extensions = {".jpg", ".jpeg", ".png", ".webp"}
        
        for root, _, files in os.walk(directory_path):
            for file in files:
                if os.path.splitext(file)[1].lower() in valid_extensions:
                    full_path = os.path.join(root, file)
                    try:
                        # Direct read to get ALL faces
                        img = cv2.imread(full_path)
                        if img is None:
                            continue
                            
                        faces = self.app.get(img)
                        if not faces:
                            continue
                            
                        # Store every face found
                        photo_date = self.get_photo_date(full_path)
                        for face in faces:
                            results.append({
                                "path": full_path,
                                "embedding": face.normed_embedding.tolist(),
                                "photo_date": photo_date
                            })
                            
                    except Exception as e:
                        logger.error(f"Error scanning {full_path}: {e}")
                        continue
                        
        return results

# =============================================================================
# LEGACY DEEPFACE IMPLEMENTATION (For Reference)
# =============================================================================
#
# from deepface import DeepFace
#
# class LegacyFaceProcessor:
#     def __init__(self):
#         self.model_name = "GhostFaceNet"
#         self.detector_backend = "yunet"
#         logger.info(f"Initializing FaceProcessor with {self.model_name}...")
#         try:
#             DeepFace.build_model(self.model_name)
#         except Exception as e:
#             logger.error(f"Failed to load model: {e}")
#             raise e
#
#     def get_embedding(self, img_path: str) -> List[float]:
#         try:
#             embeddings = DeepFace.represent(
#                 img_path=img_path,
#                 model_name=self.model_name,
#                 detector_backend=self.detector_backend,
#                 enforce_detection=True,
#                 align=True
#             )
#             if not embeddings: return None
#             return embeddings[0]["embedding"]
#         except Exception as e:
#             logger.error(f"Error: {e}")
#             return None
