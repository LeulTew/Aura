//! Aura Sync Agent - Tauri 2.0 Backend
//! 
//! Handles local-cloud synchronization with:
//! - File watching via `notify`
//! - Local trash management (.aura_trash/)
//! - Sync queue with SQLite
//! - Bandwidth-throttled uploads

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

mod trash_manager;

/// Represents a file in the local trash
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TrashItem {
    pub id: String,
    pub original_path: String,
    pub trash_path: String,
    pub trashed_at: String,
    pub size_bytes: u64,
    pub days_remaining: i64,
}

/// Represents a sync folder configuration
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SyncFolder {
    pub local_path: String,
    pub cloud_path: String,
    pub mode: String, // "upload-only", "download-only", "bidirectional"
    pub enabled: bool,
    pub last_sync: Option<String>,
}

/// Get the .aura_trash directory path
fn get_trash_dir(base_path: &Path) -> PathBuf {
    base_path.join(".aura_trash")
}

/// Initialize the trash directory if it doesn't exist
#[tauri::command]
fn init_trash_dir(folder_path: String) -> Result<String, String> {
    let trash_dir = get_trash_dir(Path::new(&folder_path));
    
    if !trash_dir.exists() {
        fs::create_dir_all(&trash_dir)
            .map_err(|e| format!("Failed to create trash directory: {}", e))?;
    }
    
    Ok(trash_dir.to_string_lossy().to_string())
}

/// Move a file to local trash (.aura_trash/)
#[tauri::command]
fn move_to_trash(file_path: String, base_folder: String) -> Result<TrashItem, String> {
    let source = Path::new(&file_path);
    
    if !source.exists() {
        return Err("Source file does not exist".to_string());
    }
    
    let trash_dir = get_trash_dir(Path::new(&base_folder));
    if !trash_dir.exists() {
        fs::create_dir_all(&trash_dir)
            .map_err(|e| format!("Failed to create trash directory: {}", e))?;
    }
    
    // Generate unique trash filename with timestamp
    let now: DateTime<Utc> = Utc::now();
    let timestamp = now.format("%Y%m%d_%H%M%S").to_string();
    let file_name = source.file_name()
        .ok_or("Invalid file name")?
        .to_string_lossy();
    
    let trash_filename = format!("{}_{}", timestamp, file_name);
    let trash_path = trash_dir.join(&trash_filename);
    
    // Get file size before moving
    let metadata = fs::metadata(&source)
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;
    let size_bytes = metadata.len();
    
    // Move file to trash
    fs::rename(&source, &trash_path)
        .map_err(|e| format!("Failed to move file to trash: {}", e))?;
    
    // Create metadata file for restoration
    let meta_path = trash_dir.join(format!("{}.meta", trash_filename));
    let meta_content = serde_json::json!({
        "original_path": file_path,
        "trashed_at": now.to_rfc3339(),
        "size_bytes": size_bytes
    });
    fs::write(&meta_path, meta_content.to_string())
        .map_err(|e| format!("Failed to write metadata: {}", e))?;
    
    Ok(TrashItem {
        id: trash_filename.clone(),
        original_path: file_path,
        trash_path: trash_path.to_string_lossy().to_string(),
        trashed_at: now.to_rfc3339(),
        size_bytes,
        days_remaining: 30,
    })
}

/// List all items in the local trash
#[tauri::command]
fn list_trash(base_folder: String) -> Result<Vec<TrashItem>, String> {
    let trash_dir = get_trash_dir(Path::new(&base_folder));
    
    if !trash_dir.exists() {
        return Ok(vec![]);
    }
    
    let mut items = Vec::new();
    let now = Utc::now();
    
    for entry in WalkDir::new(&trash_dir).max_depth(1).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        
        // Skip meta files and the directory itself
        if path.is_dir() || path.extension().map_or(false, |ext| ext == "meta") {
            continue;
        }
        
        let file_name = path.file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        
        // Try to read metadata
        let meta_path = trash_dir.join(format!("{}.meta", file_name));
        if let Ok(meta_content) = fs::read_to_string(&meta_path) {
            if let Ok(meta) = serde_json::from_str::<serde_json::Value>(&meta_content) {
                let trashed_at = meta["trashed_at"].as_str().unwrap_or("").to_string();
                let original_path = meta["original_path"].as_str().unwrap_or("").to_string();
                let size_bytes = meta["size_bytes"].as_u64().unwrap_or(0);
                
                // Calculate days remaining (30-day retention)
                let days_remaining = if let Ok(trashed_date) = DateTime::parse_from_rfc3339(&trashed_at) {
                    let trashed_utc = trashed_date.with_timezone(&Utc);
                    let elapsed = now.signed_duration_since(trashed_utc);
                    30 - elapsed.num_days()
                } else {
                    30
                };
                
                items.push(TrashItem {
                    id: file_name,
                    original_path,
                    trash_path: path.to_string_lossy().to_string(),
                    trashed_at,
                    size_bytes,
                    days_remaining: days_remaining.max(0),
                });
            }
        }
    }
    
    Ok(items)
}

/// Restore a file from local trash to its original location
#[tauri::command]
fn restore_from_trash(trash_id: String, base_folder: String) -> Result<String, String> {
    let trash_dir = get_trash_dir(Path::new(&base_folder));
    let trash_path = trash_dir.join(&trash_id);
    let meta_path = trash_dir.join(format!("{}.meta", trash_id));
    
    if !trash_path.exists() {
        return Err("Trash item not found".to_string());
    }
    
    // Read original path from metadata
    let meta_content = fs::read_to_string(&meta_path)
        .map_err(|e| format!("Failed to read metadata: {}", e))?;
    let meta: serde_json::Value = serde_json::from_str(&meta_content)
        .map_err(|e| format!("Invalid metadata: {}", e))?;
    
    let original_path = meta["original_path"]
        .as_str()
        .ok_or("Original path not found in metadata")?;
    
    // Create parent directory if needed
    if let Some(parent) = Path::new(original_path).parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }
    
    // Move file back to original location
    fs::rename(&trash_path, original_path)
        .map_err(|e| format!("Failed to restore file: {}", e))?;
    
    // Remove metadata file
    let _ = fs::remove_file(&meta_path);
    
    Ok(original_path.to_string())
}

/// Permanently delete a file from local trash
#[tauri::command]
fn permanent_delete(trash_id: String, base_folder: String) -> Result<(), String> {
    let trash_dir = get_trash_dir(Path::new(&base_folder));
    let trash_path = trash_dir.join(&trash_id);
    let meta_path = trash_dir.join(format!("{}.meta", trash_id));
    
    if trash_path.exists() {
        fs::remove_file(&trash_path)
            .map_err(|e| format!("Failed to delete file: {}", e))?;
    }
    
    if meta_path.exists() {
        fs::remove_file(&meta_path)
            .map_err(|e| format!("Failed to delete metadata: {}", e))?;
    }
    
    Ok(())
}

/// Clean up expired trash items (older than 30 days)
#[tauri::command]
fn cleanup_expired_trash(base_folder: String) -> Result<u32, String> {
    let items = list_trash(base_folder.clone())?;
    let mut deleted_count = 0;
    
    for item in items {
        if item.days_remaining <= 0 {
            permanent_delete(item.id, base_folder.clone())?;
            deleted_count += 1;
        }
    }
    
    Ok(deleted_count)
}

/// Get sync status summary
#[tauri::command]
fn get_sync_status() -> Result<serde_json::Value, String> {
    // TODO: Implement actual sync status from SQLite queue
    Ok(serde_json::json!({
        "status": "idle",
        "pending_uploads": 0,
        "pending_downloads": 0,
        "last_sync": null,
        "bandwidth_usage_kbps": 0
    }))
}

fn main() {
    env_logger::init();
    
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            init_trash_dir,
            move_to_trash,
            list_trash,
            restore_from_trash,
            permanent_delete,
            cleanup_expired_trash,
            get_sync_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
