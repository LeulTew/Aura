//! Aura Desktop - Cloud Sync Module
//!
//! Handles polling the cloud for changes (bi-directional sync).

use crate::db::Database;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

#[derive(Debug, Clone, Deserialize)]
pub struct CloudPhoto {
    pub id: String, // UUID
    pub full_path: Option<String>,
    pub source_type: Option<String>,
}

pub struct CloudSync {
    db: Database,
    client: Client,
    api_url: String,
    api_key: String,
    org_id: String,
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
    pub async fn poll_changes(&self) -> Result<(), String> {
        println!("CloudSync: Polling for changes...");

        // 1. Fetch all cloud photos for this org
        // Note: In production we should use pagination or updated_at filtering
        let url = format!("{}/rest/v1/photos?select=id,full_path&org_id=eq.{}", self.api_url, self.org_id);
        
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

        // 2. Compare with local DB
        // We need to map cloud paths/hashes to local files
        // This is complex because local DB stores absolute paths, while Cloud stores relative/bucket paths.
        // For MVP, simple deletion detection:
        
        // If a file was marked as 'synced' locally, but is missing from Cloud List -> It was deleted on Cloud.
        // Implementation TODO:
        // - Get all local files with sync_status='synced'
        // - Check if they exist in cloud_photos list (matching by some ID or Hash column if we synced it)
        // - If missing, update local state to 'deleted_on_cloud' or 'conflict'
        
        Ok(())
    }
}
