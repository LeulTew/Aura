use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc::channel;
use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tauri::{AppHandle, Emitter};
use serde::Serialize;

#[derive(Clone, Serialize, Debug)]
struct WatchEvent {
    kind: String,
    paths: Vec<String>,
}

pub struct FileWatcher {
    watchers: Arc<Mutex<HashMap<String, RecommendedWatcher>>>,
    app_handle: AppHandle,
}

impl FileWatcher {
    pub fn new(app_handle: AppHandle) -> Self {
        Self {
            watchers: Arc::new(Mutex::new(HashMap::new())),
            app_handle,
        }
    }

    pub fn watch_folder(&self, path_str: String) -> Result<(), String> {
        let path = PathBuf::from(&path_str);
        if !path.exists() {
            return Err("Folder does not exist".to_string());
        }

        let (tx, rx) = channel();
        let app_handle = self.app_handle.clone();
        let path_clone = path_str.clone();

        // Create watcher
        let mut watcher = RecommendedWatcher::new(tx, Config::default())
            .map_err(|e| format!("Failed to create watcher: {}", e))?;

        // Start watching
        watcher.watch(&path, RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch path: {}", e))?;

        // Store watcher
        self.watchers.lock().unwrap().insert(path_str.clone(), watcher);

        // Spawn thread to handle events
        std::thread::spawn(move || {
            for res in rx {
                match res {
                    Ok(event) => {
                        let watch_event = WatchEvent {
                            kind: format!("{:?}", event.kind),
                            paths: event.paths.iter().map(|p| p.to_string_lossy().to_string()).collect(),
                        };
                        // Emit event to frontend
                        let _ = app_handle.emit("file-change", &watch_event);
                        
                        // Log event (for debug)
                        println!("File event in {}: {:?}", path_clone, watch_event);
                    }
                    Err(e) => println!("Watch error: {:?}", e),
                }
            }
        });

        Ok(())
    }

    pub fn unwatch_folder(&self, path_str: String) -> Result<(), String> {
        let mut watchers = self.watchers.lock().unwrap();
        if let Some(mut watcher) = watchers.remove(&path_str) {
            let path = PathBuf::from(&path_str);
            let _ = watcher.unwatch(&path);
        }
        Ok(())
    }
}
