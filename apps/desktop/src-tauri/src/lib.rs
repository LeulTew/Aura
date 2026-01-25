//! Aura Desktop - Main Library
//!
//! Entry point for the Tauri application, exposing commands to the frontend.

mod db;
mod scanner;
mod sync;
mod watcher;

use db::Database;
use scanner::{scan_directory, scan_file};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

// Application state
pub struct AppState {
    pub db: Mutex<Option<Database>>,
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
    
    db.add_watched_folder(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn scan_folder(path: String, state: State<AppState>) -> Result<i64, String> {
    let db_lock = state.db.lock().map_err(|e| e.to_string())?;
    let db = db_lock.as_ref().ok_or("Database not initialized")?;
    
    // Add folder if not exists
    let folder_id = db.add_watched_folder(&path).map_err(|e| e.to_string())?;
    
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
        })
        .setup(|app| {
            // Initialize database on startup
            let handle = app.handle().clone();
            match init_database(&handle) {
                Ok(db) => {
                    let state: State<AppState> = handle.state();
                    *state.db.lock().unwrap() = Some(db);
                    println!("Aura Desktop: Database initialized");
                }
                Err(e) => {
                    eprintln!("Aura Desktop: Failed to initialize database: {}", e);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            get_sync_stats,
            get_watched_folders,
            add_watched_folder,
            scan_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
