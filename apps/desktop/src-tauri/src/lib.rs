//! Aura Desktop - Main Library
//!
//! Entry point for the Tauri application, exposing commands to the frontend.

mod db;
mod scanner;
mod sync;
mod watcher;
mod cloud_sync;

#[cfg(feature = "ai")]
mod ml;

#[cfg(test)]
mod tests;

use db::Database;
use scanner::{scan_directory};
use sync::{SyncEngine, SyncConfig};
use watcher::FileWatcher;
use serde::{Deserialize, Serialize};
use std::path::{PathBuf, Path};
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Manager, State};

// Application state
pub struct AppState {
    pub db: Mutex<Option<Database>>,
    pub watcher: Mutex<Option<FileWatcher>>,
    pub sync_engine: Mutex<Option<SyncEngine>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncStats {
    pub total: i64,
    pub synced: i64,
    pub pending: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FolderInfo {
    pub id: i64,
    pub path: String,
    pub enabled: bool,
}

// ============ Tauri Commands ============

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to Aura Desktop.", name)
}

#[tauri::command]
fn configure_sync(config: SyncConfig, state: State<AppState>) -> Result<(), String> {
    let mut engine_lock = state.sync_engine.lock().map_err(|e| e.to_string())?;
    *engine_lock = Some(SyncEngine::new(config));
    Ok(())
}

#[tauri::command]
fn get_sync_stats(state: State<AppState>) -> Result<SyncStats, String> {
    let db_lock = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_lock.as_ref().ok_or("Database not initialized")?;
    
    let (total, synced, pending) = db.get_stats().map_err(|e| e.to_string())?;
    
    Ok(SyncStats { total, synced, pending })
}

#[tauri::command]
fn get_watched_folders(state: State<AppState>) -> Result<Vec<FolderInfo>, String> {
    let db_lock = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_lock.as_ref().ok_or("Database not initialized")?;
    
    let folders = db.get_watched_folders().map_err(|e| e.to_string())?;
    
    Ok(folders.into_iter().map(|f| FolderInfo {
        id: f.id,
        path: f.path,
        enabled: f.enabled,
    }).collect())
}

#[tauri::command]
fn add_watched_folder(path: String, state: State<AppState>) -> Result<i64, String> {
    let db_lock = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_lock.as_ref().ok_or("Database not initialized")?;
    
    // Add to DB
    let id = db.add_watched_folder(&path).map_err(|e| e.to_string())?;
    
    // Add to Watcher
    let mut watcher_lock = state.watcher.lock().map_err(|e| e.to_string())?;
    if let Some(watcher) = watcher_lock.as_mut() {
        let _ = watcher.watch(Path::new(&path)); // Ignore error if already watched
    }
    
    Ok(id)
}

#[tauri::command]
fn remove_watched_folder(folder_id: i64, state: State<AppState>) -> Result<(), String> {
    let db_lock = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_lock.as_ref().ok_or("Database not initialized")?;
    
    // Get folder path before removal (for unwatching)
    let folders = db.get_watched_folders().map_err(|e| e.to_string())?;
    let folder_path = folders.iter().find(|f| f.id == folder_id).map(|f| f.path.clone());
    
    // Remove from DB
    db.remove_watched_folder(folder_id).map_err(|e| e.to_string())?;
    
    // Remove from Watcher
    if let Some(path) = folder_path {
        let mut watcher_lock = state.watcher.lock().map_err(|e| e.to_string())?;
        if let Some(watcher) = watcher_lock.as_mut() {
            let _ = watcher.unwatch(Path::new(&path));
        }
    }
    
    Ok(())
}


#[tauri::command]
fn scan_folder(path: String, state: State<AppState>) -> Result<i64, String> {
    let db_lock = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_lock.as_ref().ok_or("Database not initialized")?;
    
    // Add folder if not exists
    let folder_id = db.add_watched_folder(&path).map_err(|e| e.to_string())?;
    
    // Add to Watcher
    let mut watcher_lock = state.watcher.lock().map_err(|e| e.to_string())?;
    if let Some(watcher) = watcher_lock.as_mut() {
        let _ = watcher.watch(Path::new(&path));
    }
    
    // Scan directory
    let path_buf = PathBuf::from(&path);
    let files = scan_directory(&path_buf);
    
    // Index files
    let mut count = 0;
    for file in files {
        if db.upsert_file(&file.path, &file.hash, file.mod_time, folder_id).is_ok() {
            count += 1;
        }
    }
    
    Ok(count)
}

// ============ Conflict Management Commands ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConflictInfo {
    pub id: i64,
    pub path: String,
    pub conflict_state: String,
    pub mod_time: i64,
}

#[tauri::command]
fn get_conflicts(state: State<AppState>) -> Result<Vec<ConflictInfo>, String> {
    let db_lock = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_lock.as_ref().ok_or("Database not initialized")?;
    
    let conflicts = db.get_conflicts().map_err(|e| e.to_string())?;
    
    Ok(conflicts.into_iter().map(|f| ConflictInfo {
        id: f.id,
        path: f.path,
        conflict_state: f.conflict_state,
        mod_time: f.mod_time,
    }).collect())
}

#[tauri::command]
fn resolve_conflict(file_id: i64, resolution: String, state: State<AppState>) -> Result<(), String> {
    let db_lock = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_lock.as_ref().ok_or("Database not initialized")?;
    
    db.resolve_conflict(file_id, &resolution).map_err(|e| e.to_string())?;
    
    println!("Conflict resolved: file_id={}, resolution={}", file_id, resolution);
    Ok(())
}

// ============ AI Commands ============

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIModelStatus {
    pub models_available: bool,
    pub model_dir: String,
    pub local_ai_enabled: bool,
}

/// Check if AI models are available on disk
#[tauri::command]
fn check_ai_models(state: State<AppState>) -> Result<AIModelStatus, String> {
    let db_lock = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_lock.as_ref().ok_or("Database not initialized")?;
    
    // Get local AI enabled setting
    let local_ai_enabled = db.get_setting("local_ai_enabled")
        .map_err(|e| e.to_string())?
        .map(|v| v == "true")
        .unwrap_or(false);
    
    #[cfg(feature = "ai")]
    {
        use ml::FaceEngine;
        Ok(AIModelStatus {
            models_available: FaceEngine::models_available(),
            model_dir: FaceEngine::get_model_dir().to_string_lossy().to_string(),
            local_ai_enabled,
        })
    }
    
    #[cfg(not(feature = "ai"))]
    {
        // Return the stored preference even if AI isn't compiled
        Ok(AIModelStatus {
            models_available: false,
            model_dir: "AI feature not compiled".to_string(),
            local_ai_enabled,
        })
    }
}

/// Enable or disable local AI processing
#[tauri::command]
fn enable_local_ai(enabled: bool, state: State<AppState>) -> Result<(), String> {
    let db_lock = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_lock.as_ref().ok_or("Database not initialized")?;
    
    db.set_setting("local_ai_enabled", if enabled { "true" } else { "false" })
        .map_err(|e| e.to_string())?;
    
    println!("Aura AI: Local AI {}", if enabled { "enabled" } else { "disabled" });
    Ok(())
}

/// Get a specific setting value
#[tauri::command]
fn get_setting(key: String, state: State<AppState>) -> Result<Option<String>, String> {
    let db_lock = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_lock.as_ref().ok_or("Database not initialized")?;
    
    db.get_setting(&key).map_err(|e| e.to_string())
}

/// Set a specific setting value
#[tauri::command]
fn set_setting(key: String, value: String, state: State<AppState>) -> Result<(), String> {
    let db_lock = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_lock.as_ref().ok_or("Database not initialized")?;
    
    db.set_setting(&key, &value).map_err(|e| e.to_string())
}

// ============ Background Workers ============

fn start_sync_worker(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        println!("Aura Desktop: Sync worker started");
        loop {
            tokio::time::sleep(Duration::from_secs(5)).await;
            
            let state: State<AppState> = app.state();
            
            // Scope for locks
            let (db_opt, engine_opt) = {
                let db = state.db.lock().unwrap().clone();
                let engine = state.sync_engine.lock().unwrap().as_ref().cloned();
                (db, engine)
            };

            if let (Some(db), Some(engine)) = (db_opt, engine_opt) {
                // Get pending files
                if let Ok(files) = db.get_pending_files(5) {
                    for file in files {
                        // Attempt upload
                        let path = Path::new(&file.path);
                        if !path.exists() {
                            println!("Skipping missing file: {}", file.path);
                            continue;
                        }
                        
                        let remote_name = format!("{}/{}", file.hash, path.file_name().unwrap().to_string_lossy());
                        
                        match engine.upload_file(path, &remote_name).await {
                            result if result.success => {
                                let _ = db.mark_synced(file.id);
                                println!("Synced: {}", file.path);
                            },
                            result => {
                                println!("Failed to sync {}: {:?}", file.path, result.error);
                            }
                        }
                    }
                }
            }
        }
    });
}

fn start_watcher_worker(app: AppHandle) {
    std::thread::spawn(move || {
        println!("Aura Desktop: Watcher worker started");
        loop {
            std::thread::sleep(Duration::from_secs(1));
            
            let state: State<AppState> = app.state();
            
            // 1. Poll events from watcher
            let events = {
                let watcher_lock = state.watcher.lock().unwrap();
                if let Some(watcher) = watcher_lock.as_ref() {
                    watcher.poll_events(Duration::from_millis(100))
                } else {
                    vec![]
                }
            };
            
            // 2. Process events
            if !events.is_empty() {
                if let Some(db) = state.db.lock().unwrap().as_ref() {
                    for event in events {
                        for path in event.paths {
                            if path.is_file() {
                                // Find which folder this belongs to (naive approach)
                                // In a real app we'd map path prefix to folder_id efficiently
                                if let Ok(folders) = db.get_watched_folders() {
                                    if let Some(folder) = folders.iter().find(|f| path.starts_with(&f.path)) {
                                        // Index it
                                        if let Ok(scanned) = scanner::scan_file(&path) {
                                            let _ = db.upsert_file(&scanned.path, &scanned.hash, scanned.mod_time, folder.id);
                                            println!("Watcher: Indexed {}", scanned.path);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });
}

// ============ App Initialization ============

fn init_database(app: &AppHandle) -> Result<Database, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
    Database::new(&app_data_dir).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            db: Mutex::new(None),
            watcher: Mutex::new(None),
            sync_engine: Mutex::new(None),
        })
        .setup(|app| {
            let handle = app.handle().clone();
            
            // Initialize DB
            match init_database(&handle) {
                Ok(db) => {
                    let state: State<AppState> = handle.state();
                    *state.db.lock().unwrap() = Some(db.clone());
                    
                    // Initialize Watcher
                    if let Ok(mut watcher) = FileWatcher::new() {
                         // Add existing folders to watcher
                         if let Ok(folders) = db.get_watched_folders() {
                             for folder in folders {
                                 let _ = watcher.watch(Path::new(&folder.path));
                             }
                         }
                         *state.watcher.lock().unwrap() = Some(watcher);
                    }
                    
                    println!("Aura Desktop: Database & Watcher initialized");
                    
                    // Start Sync Worker
                    start_sync_worker(handle.clone());
                    start_watcher_worker(handle.clone());

                    #[cfg(feature = "ai")]
                    start_indexer_worker(handle.clone());
                }
                Err(e) => {
                    eprintln!("Aura Desktop: Failed to initialize database: {}", e);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            configure_sync,
            get_sync_stats,
            get_watched_folders,
            add_watched_folder,
            remove_watched_folder,
            scan_folder,
            get_conflicts,
            resolve_conflict,
            check_ai_models,
            enable_local_ai,
            get_setting,
            set_setting,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(feature = "ai")]
fn start_indexer_worker(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        use ml::FaceEngine;
        use std::path::Path;
        
        println!("Aura AI: Initializing Face Engine...");
        
        let mut engine = match FaceEngine::new() {
            Ok(e) => {
                println!("Aura AI: Models loaded successfully.");
                e
            },
            Err(e) => {
                eprintln!("Aura AI: Failed to load models: {}. Indexing disabled.", e);
                return;
            }
        };

        loop {
            tokio::time::sleep(Duration::from_secs(2)).await;
            
            let state: State<AppState> = app.state();
            let db_lock = match state.db.lock() {
                Ok(lock) => lock,
                Err(_) => continue,
            };
            let db = match db_lock.as_ref() {
                Some(db) => db.clone(),
                None => continue,
            };
            drop(db_lock); // Release lock
            
            // Get batch of files
            match db.get_unscanned_files(5) {
                Ok(files) => {
                    for file in files {
                        println!("Aura AI: Processing {}", file.path);
                        
                        // Load image
                        let img_path = Path::new(&file.path);
                        let img = match image::open(img_path) {
                            Ok(img) => img,
                            Err(e) => {
                                eprintln!("Aura AI: Failed to open image {}: {}", file.path, e);
                                let _ = db.mark_scanned(file.id);
                                continue;
                            }
                        };
                        
                        // Detect
                        match engine.detect_faces(&img) {
                            Ok(faces) => {
                                if !faces.is_empty() {
                                    println!("Aura AI: Detected {} faces in {}", faces.len(), file.path);
                                    
                                    for face in faces {
                                        // Crop face
                                        let bbox = face.bbox;
                                        // Ensure bounds
                                        let x = bbox[0].max(0.0) as u32;
                                        let y = bbox[1].max(0.0) as u32;
                                        let w = (bbox[2] - bbox[0]).max(1.0) as u32;
                                        let h = (bbox[3] - bbox[1]).max(1.0) as u32;
                                        
                                        // Skip if crop is invalid
                                        if x + w > img.width() || y + h > img.height() {
                                            continue;
                                        }

                                        let crop = img.crop_imm(x, y, w, h).to_rgb8();
                                        
                                        // Extract Embedding
                                        match engine.extract_embedding(&crop) {
                                            Ok(embedding) => {
                                                // Save to DB
                                                if let Err(e) = db.save_embedding(file.id, &embedding, face.score) {
                                                    eprintln!("Aura AI: Failed to save embedding: {}", e);
                                                } else {
                                                    println!("Aura AI: Saved embedding for file {}", file.id);
                                                }
                                            },
                                            Err(e) => eprintln!("Aura AI: Embedding extraction failed: {}", e),
                                        }
                                    }
                                }
                                let _ = db.mark_scanned(file.id);
                            },
                            Err(e) => {
                                eprintln!("Aura AI: Inference failed: {}", e);
                                // Mark scanned to avoid retry loop on bad file? Maybe.
                                // Or retry logic. For now, optimize progress.
                                let _ = db.mark_scanned(file.id);
                            },
                        }
                    }
                },
                Err(e) => eprintln!("Aura AI: DB Error: {}", e),
            }
        }
    });
}
