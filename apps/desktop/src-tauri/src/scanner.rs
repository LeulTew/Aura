//! Aura Desktop - File Scanner Module
//!
//! Scans directories for image files and indexes them.

use std::path::Path;
use walkdir::WalkDir;
use xxhash_rust::xxh3::xxh3_64;
use std::fs;
use std::time::SystemTime;

const IMAGE_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "webp", "heic", "heif", "raw", "cr2", "nef", "arw"];

#[derive(Debug, Clone)]
pub struct ScannedFile {
    pub path: String,
    pub hash: String,
    pub mod_time: i64,
}

/// Scan a directory recursively for image files
pub fn scan_directory(dir: &Path) -> Vec<ScannedFile> {
    let mut files = Vec::new();
    
    for entry in WalkDir::new(dir)
        .follow_links(false)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let path = entry.path();
        
        // Skip non-files
        if !path.is_file() {
            continue;
        }
        
        // Check extension
        let ext = path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_lowercase());
        
        let is_image = ext.as_ref()
            .map(|e| IMAGE_EXTENSIONS.contains(&e.as_str()))
            .unwrap_or(false);
        
        if !is_image {
            continue;
        }
        
        // Compute hash and get mod time
        if let Ok(scanned) = scan_file(path) {
            files.push(scanned);
        }
    }
    
    files
}

/// Scan a single file and compute its hash
pub fn scan_file(path: &Path) -> std::io::Result<ScannedFile> {
    let content = fs::read(path)?;
    let hash = format!("{:016x}", xxh3_64(&content));
    
    let metadata = fs::metadata(path)?;
    let mod_time = metadata.modified()?
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    
    Ok(ScannedFile {
        path: path.to_string_lossy().to_string(),
        hash,
        mod_time,
    })
}
