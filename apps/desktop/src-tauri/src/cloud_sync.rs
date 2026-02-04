//! Aura Desktop - Cloud Sync Module
//!
//! Handles polling the cloud for changes (bi-directional sync).

use crate::db::Database;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[allow(dead_code)]
#[derive(Debug, Clone, Deserialize)]
pub struct CloudPhoto {
    pub id: String, // UUID
    pub full_path: Option<String>,
    pub path: Option<String>,
    pub source_type: Option<String>,
}

#[allow(dead_code)]
pub struct CloudSync {
    db: Database,
    client: Client,
    api_url: String,
    api_key: String,
    org_id: String,
}

#[allow(dead_code)]
#[derive(Debug, Clone, Serialize)]
pub struct SyncResult {
    pub photos_in_cloud: usize,
    pub local_synced: usize,
    pub marked_deleted: usize,
    pub conflicts_found: usize,
}

impl CloudSync {
    pub fn new(db: Database, api_url: String, api_key: String, org_id: String) -> Self {
        Self {
            db,
            client: Client::new(),
            api_url,
            api_key,
            org_id,
        }
    }

    /// Poll Supabase for changes in this organization
    pub async fn poll_changes(&self) -> Result<SyncResult, String> {
        println!("CloudSync: Polling for changes...");

        // 1. Fetch all cloud photos for this org
        // Note: In production we should use pagination or updated_at filtering
        let url = format!(
            "{}/rest/v1/photos?select=id,full_path,path&org_id=eq.{}",
            self.api_url, self.org_id
        );
        
        let response = self.client.get(&url)
            .header("apikey", &self.api_key)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .send()
            .await
            .map_err(|e| e.to_string())?;

        if !response.status().is_success() {
            return Err(format!("Failed to fetch cloud photos: {}", response.status()));
        }

        let cloud_photos: Vec<CloudPhoto> = response.json().await.map_err(|e| e.to_string())?;
        println!("CloudSync: Found {} photos in cloud", cloud_photos.len());

        // 2. Build a set of cloud paths for fast lookup
        let cloud_paths: HashSet<String> = cloud_photos
            .iter()
            .filter_map(|p| p.full_path.clone().or_else(|| p.path.clone()))
            .collect();

        // 3. Get all local synced files
        let local_synced = self.db.get_synced_files().map_err(|e| e.to_string())?;
        println!("CloudSync: Found {} synced files locally", local_synced.len());

        let mut marked_deleted = 0;

        // 4. Check each local synced file against cloud
        for file in &local_synced {
            // Extract filename from local path for comparison
            // Cloud stores relative paths like "photos/abc123.jpg"
            // Local stores absolute paths like "/home/user/photos/abc123.jpg"
            let filename = std::path::Path::new(&file.path)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            // Check if any cloud photo path ends with this filename
            let exists_in_cloud = cloud_paths.iter().any(|cp| {
                cp.ends_with(&filename) || cp == &file.path
            });

            if !exists_in_cloud {
                // File was deleted on cloud
                println!("CloudSync: File deleted on cloud: {}", file.path);
                self.db.set_conflict_state(file.id, "deleted_on_cloud")
                    .map_err(|e| e.to_string())?;
                marked_deleted += 1;
            }
        }

        // 5. Count current conflicts
        let conflicts = self.db.get_conflicts().map_err(|e| e.to_string())?;
        let conflicts_found = conflicts.len();

        let result = SyncResult {
            photos_in_cloud: cloud_photos.len(),
            local_synced: local_synced.len(),
            marked_deleted,
            conflicts_found,
        };

        println!("CloudSync: Poll complete - {:?}", result);
        Ok(result)
    }

    /// Get the database reference (for Tauri commands)
    pub fn get_db(&self) -> &Database {
        &self.db
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cloud_photo_deserialize() {
        let json = r#"{"id": "abc-123", "full_path": "photos/test.jpg", "source_type": "cloud"}"#;
        let photo: CloudPhoto = serde_json::from_str(json).unwrap();
        assert_eq!(photo.id, "abc-123");
        assert_eq!(photo.full_path, Some("photos/test.jpg".to_string()));
    }
}
