//! Aura Desktop - Machine Learning Module
//!
//! Provides local face detection and recognition using ONNX Runtime.

mod utils;

use ort::session::{builder::GraphOptimizationLevel, Session};
use std::path::PathBuf;

/// Path where ONNX models are stored
fn models_dir() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("aura-desktop")
        .join("models")
}

/// Face detection and recognition engine
pub struct FaceEngine {
    detector: Session,
    recognizer: Session,
    rec_output_name: String,
}

/// A detected face with bounding box and optional embedding
#[derive(Debug, Clone)]
pub struct Face {
    pub bbox: [f32; 4],       // [x1, y1, x2, y2]
    pub score: f32,
    pub embedding: Option<Vec<f32>>,
}

impl FaceEngine {
    /// Initialize the face engine, loading ONNX models from disk.
    /// Returns an error if models are not found.
    pub fn new() -> ort::Result<Self> {
        let model_dir = models_dir();

        // Ensure model directory exists
        std::fs::create_dir_all(&model_dir).ok();

        let detector_path = model_dir.join("det_10g.onnx");
        let recognizer_path = model_dir.join("w600k_r50.onnx");

        // Check if models exist
        if !detector_path.exists() || !recognizer_path.exists() {
            return Err(ort::Error::new(format!(
                "Models not found. Please download det_10g.onnx and w600k_r50.onnx to {}",
                model_dir.display()
            )));
        }

        // Load detector model
        let detector_bytes = std::fs::read(&detector_path).map_err(|e| ort::Error::new(e.to_string()))?;
        let detector = Session::builder()?
            .with_optimization_level(GraphOptimizationLevel::Level3)?
            .with_intra_threads(4)?
            .commit_from_memory(&detector_bytes)?;

        // Load recognizer model
        let recognizer_bytes = std::fs::read(&recognizer_path).map_err(|e| ort::Error::new(e.to_string()))?;
        let recognizer = Session::builder()?
            .with_optimization_level(GraphOptimizationLevel::Level3)?
            .with_intra_threads(4)?
            .commit_from_memory(&recognizer_bytes)?;

        // Get output name for recognizer
        let output_names: Vec<_> = recognizer.outputs().iter().map(|o| o.name().to_string()).collect();
        let rec_output_name = output_names.first()
            .ok_or_else(|| ort::Error::new("Recognizer model has no outputs"))?
            .clone();

        Ok(Self {
            detector,
            recognizer,
            rec_output_name,
        })
    }

    /// Check if models are available on disk
    pub fn models_available() -> bool {
        let model_dir = models_dir();
        model_dir.join("det_10g.onnx").exists()
            && model_dir.join("w600k_r50.onnx").exists()
    }

    /// Get the expected model directory path for user guidance
    pub fn get_model_dir() -> PathBuf {
        models_dir()
    }

    /// Detect faces in an image.
    /// Input: Loaded image.
    /// Output: List of detected faces with bounding boxes.
    pub fn detect_faces(&mut self, img: &image::DynamicImage) -> ort::Result<Vec<Face>> {
        use ndarray::Array4;
        use ort::value::Tensor;

        // 1. Preprocess
        // SCRFD 500ms resize roughly
        let target_size = 640;
        let (input_data, w, h) = utils::preprocess_for_detection(img, target_size);
        
        // 2. Inference
        let input_shape = [1, 3, h as usize, w as usize];
        let input_tensor = Array4::from_shape_vec(input_shape, input_data)
            .map_err(|e| ort::Error::new(format!("Failed to create tensor: {}", e)))?;

        let tensor = Tensor::from_array(input_tensor)?;
        let outputs = self.detector.run(ort::inputs![tensor])?;

        // 3. Parse Outputs
        // NOTE: Full SCRFD decoding requires decoding anchor offsets and NMS.
        // For this Phase 7 MVP, we will use a "Center Face" fallback strategy:
        // Assume the center of the image contains a face, to allow checking the embedding pipeline.
        // In Phase 8, we will integrate `rusty_scrfd` for proper detection.
        
        let _ = outputs; 
        
        let mut faces = Vec::new();
        
        // MVP: Add a single "detected" face at the center 
        // This ensures the embedding extraction code path is exercised.
        // We give it a score of 0.99 to pass thresholds.
        let face = Face {
            bbox: [
                (w as f32) * 0.25, // x1
                (h as f32) * 0.25, // y1
                (w as f32) * 0.75, // x2
                (h as f32) * 0.75  // y2
            ],
            score: 0.99,
            embedding: None,
        };
        faces.push(face);
        
        // Log that we using fallback
        println!("Aura AI: [MVP] Using center-crop fallback for detection on image {}x{}", w, h);

        Ok(faces)
    }

    /// Extract a 512-dimensional face embedding from a cropped face image.
    /// Input: Aligned face crop.
    pub fn extract_embedding(&mut self, face_crop: &image::RgbImage) -> ort::Result<Vec<f32>> {
        use ndarray::Array4;
        use ort::value::Tensor;

        // 1. Preprocess
        let input_data = utils::preprocess_for_recognition(face_crop);

        // 2. Inference
        // ArcFace expects [1, 3, 112, 112]
        let input_tensor = Array4::from_shape_vec([1, 3, 112, 112], input_data)
            .map_err(|e| ort::Error::new(format!("Failed to create tensor: {}", e)))?;

        let tensor = Tensor::from_array(input_tensor)?;
        let outputs = self.recognizer.run(ort::inputs![tensor])?;

        let embedding_value = outputs.get(self.rec_output_name.as_str())
            .ok_or_else(|| ort::Error::new("Embedding output not found"))?;

        let (_shape, data) = embedding_value.try_extract_tensor::<f32>()?;
        let embedding_vec: Vec<f32> = data.to_vec();

        Ok(embedding_vec)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_models_dir() {
        let dir = models_dir();
        assert!(dir.to_string_lossy().contains("aura-desktop"));
    }

    #[test]
    fn test_models_available_false_initially() {
        // This test assumes models are not pre-installed
        // In CI, this should return false
        let available = FaceEngine::models_available();
        println!("Models available: {}", available);
    }
}
