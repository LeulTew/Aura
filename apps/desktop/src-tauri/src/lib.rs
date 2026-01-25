//! Aura Desktop - Main Library
//!
//! Entry point for the Tauri application, exposing commands to the frontend.

mod db;
mod scanner;
mod sync;
mod watcher;

#[cfg(test)]
mod tests;

use db::Database;
use scanner::{scan_directory};
use sync::{SyncEngine, SyncConfig};
use watcher::FileWatcher;
use serde::{Deserialize, Serialize};
use std::path::{PathBuf, Path};
use std::sync::{Arc, Mutex};
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
