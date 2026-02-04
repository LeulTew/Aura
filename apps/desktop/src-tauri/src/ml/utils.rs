//! Aura Desktop - ML Utilities
//!
//! Image preprocessing and postprocessing helpers for face detection.

#![allow(dead_code)]

use image::{DynamicImage, RgbImage};

/// Preprocess an image for SCRFD face detection.
/// Resizes to target size and normalizes to [0, 1] range.
/// Returns flattened [1, 3, H, W] tensor data in CHW format.
pub fn preprocess_for_detection(img: &DynamicImage, target_size: u32) -> (Vec<f32>, u32, u32) {
    // Resize maintaining aspect ratio, pad to square
    let resized = img.resize_exact(
        target_size,
        target_size,
        image::imageops::FilterType::Triangle,
    );

    let rgb = resized.to_rgb8();
    let (width, height) = (target_size, target_size);

    // Convert to CHW format with normalization
    let mut data = vec![0.0f32; (3 * width * height) as usize];

    for (x, y, pixel) in rgb.enumerate_pixels() {
        let idx = (y * width + x) as usize;
        // BGR order for SCRFD, with mean subtraction
        data[idx] = (pixel[2] as f32 - 127.5) / 128.0;                          // B
        data[(width * height) as usize + idx] = (pixel[1] as f32 - 127.5) / 128.0; // G
        data[(2 * width * height) as usize + idx] = (pixel[0] as f32 - 127.5) / 128.0; // R
    }

    (data, width, height)
}

/// Preprocess a face crop for ArcFace embedding extraction.
/// Input: 112x112 aligned face crop.
/// Returns flattened [1, 3, 112, 112] tensor data.
pub fn preprocess_for_recognition(face_crop: &RgbImage) -> Vec<f32> {
    let (width, height) = (112, 112);

    // Resize if needed
    let resized = if face_crop.width() != 112 || face_crop.height() != 112 {
        image::imageops::resize(face_crop, 112, 112, image::imageops::FilterType::Triangle)
    } else {
        face_crop.clone()
    };

    let mut data = vec![0.0f32; (3 * width * height) as usize];

    for (x, y, pixel) in resized.enumerate_pixels() {
        let idx = (y * width + x) as usize;
        // RGB order, normalized to [-1, 1]
        data[idx] = (pixel[0] as f32 - 127.5) / 127.5;                          // R
        data[(width * height) as usize + idx] = (pixel[1] as f32 - 127.5) / 127.5; // G
        data[(2 * width * height) as usize + idx] = (pixel[2] as f32 - 127.5) / 127.5; // B
    }

    data
}

/// Apply Non-Maximum Suppression to a list of bounding boxes.
/// Returns indices of boxes to keep.
pub fn nms(boxes: &[[f32; 5]], iou_threshold: f32) -> Vec<usize> {
    if boxes.is_empty() {
        return vec![];
    }

    // Sort by score (descending)
    let mut indices: Vec<usize> = (0..boxes.len()).collect();
    indices.sort_by(|&a, &b| boxes[b][4].partial_cmp(&boxes[a][4]).unwrap());

    let mut keep = Vec::new();

    while !indices.is_empty() {
        let current = indices.remove(0);
        keep.push(current);

        indices.retain(|&idx| {
            let iou = compute_iou(&boxes[current], &boxes[idx]);
            iou < iou_threshold
        });
    }

    keep
}

/// Compute Intersection over Union between two boxes.
/// Box format: [x1, y1, x2, y2, score]
fn compute_iou(box1: &[f32; 5], box2: &[f32; 5]) -> f32 {
    let x1 = box1[0].max(box2[0]);
    let y1 = box1[1].max(box2[1]);
    let x2 = box1[2].min(box2[2]);
    let y2 = box1[3].min(box2[3]);

    let intersection = (x2 - x1).max(0.0) * (y2 - y1).max(0.0);

    let area1 = (box1[2] - box1[0]) * (box1[3] - box1[1]);
    let area2 = (box2[2] - box2[0]) * (box2[3] - box2[1]);

    let union = area1 + area2 - intersection;

    if union > 0.0 {
        intersection / union
    } else {
        0.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_nms_empty() {
        let boxes: Vec<[f32; 5]> = vec![];
        let result = nms(&boxes, 0.5);
        assert!(result.is_empty());
    }

    #[test]
    fn test_nms_single() {
        let boxes = vec![[10.0, 10.0, 50.0, 50.0, 0.9]];
        let result = nms(&boxes, 0.5);
        assert_eq!(result, vec![0]);
    }

    #[test]
    fn test_nms_overlapping() {
        let boxes = vec![
            [10.0, 10.0, 50.0, 50.0, 0.9],
            [12.0, 12.0, 52.0, 52.0, 0.8], // High overlap
            [100.0, 100.0, 150.0, 150.0, 0.7], // No overlap
        ];
        let result = nms(&boxes, 0.5);
        assert_eq!(result, vec![0, 2]); // First and third kept
    }
}
