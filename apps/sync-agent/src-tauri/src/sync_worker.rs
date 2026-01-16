use std::thread;
use std::time::Duration;
use std::sync::{Arc, Mutex};
use std::path::Path;
use reqwest::blocking::Client;
use reqwest::blocking::multipart;
use crate::queue::{SyncQueue, QueueItem};
use crate::hash::calculate_file_hash;
use log::{info, error};

pub struct SyncWorker {
    queue: SyncQueue,
    client: Client,
    running: Arc<Mutex<bool>>,
}

impl SyncWorker {
    pub fn new(queue: SyncQueue) -> Self {
        Self {
            queue,
            client: Client::new(),
            running: Arc::new(Mutex::new(false)),
        }
    }

    pub fn start(&self) {
        let queue = self.queue.clone();
        let client = self.client.clone();
        let running = self.running.clone();
        
        // Mark as running
        {
            let mut r = running.lock().unwrap();
            *r = true;
        }

        thread::spawn(move || {
            info!("Sync Worker started");
            
            loop {
                // Check if we should stop
                {
                    let r = running.lock().unwrap();
                    if !*r {
                        break;
                    }
                }

                // Process pending items
                let pending_items = match queue.get_pending(5) { 
                    Ok(items) => items,
                    Err(e) => {
                        error!("Failed to get pending items: {}", e);
                        Vec::new()
                    }
                };

                if pending_items.is_empty() {
                    thread::sleep(Duration::from_secs(2));
                    continue;
                }

                for item in pending_items {
                    if let Err(e) = process_item(&client, &item, &queue) {
                        error!("Failed to process item {}: {}", item.id, e);
                    }
                }
            }
            
            info!("Sync Worker stopped");
        });
    }

    pub fn stop(&self) {
        let mut r = self.running.lock().unwrap();
        *r = false;
    }
}

fn process_item(_client: &Client, item: &QueueItem, queue: &SyncQueue) -> Result<(), String> {
    let path = Path::new(&item.file_path);
    
    // 1. Check if file exists
    if !path.exists() {
        queue.update_status(item.id, "failed", Some("File not found".to_string()))
            .map_err(|e| e.to_string())?;
        return Err("File not found".to_string());
    }

    // 2. Mark as uploading
    queue.update_status(item.id, "uploading", None).map_err(|e| e.to_string())?;

    // 3. Delta Sync: Calculate hash and compare
    let current_hash = match calculate_file_hash(path) {
        Ok(h) => h,
        Err(e) => {
            queue.update_status(item.id, "failed", Some(format!("Hash error: {}", e)))
                .map_err(|e| e.to_string())?;
            return Err(e.to_string());
        }
    };

    if let Ok(Some(last_hash)) = queue.get_synced_hash(&item.file_path) {
        if last_hash == current_hash {
            info!("Skipping unchanged file: {}", item.file_path);
            queue.update_status(item.id, "completed", None).map_err(|e| e.to_string())?;
            return Ok(());
        }
    }
    
    // 4. Determine upload URL and fields (Mock for now)
    let _backend_url = "http://localhost:8000"; 
    
    // ... Upload Logic Here ...
    // For Prototype: Simulate network
    thread::sleep(Duration::from_millis(500)); 

    // 5. Update status and synced hash
    if let Err(e) = queue.update_synced_hash(&item.file_path, &current_hash) {
        error!("Failed to update synced hash: {}", e);
    }
    
    queue.update_status(item.id, "completed", None).map_err(|e| e.to_string())?;
    
    info!("Successfully synced: {}", item.file_path);
    Ok(())
}
