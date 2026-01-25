//! Aura Desktop - Sync Engine Module
//!
//! Handles uploading local files to Supabase Storage.

use reqwest::multipart::{Form, Part};
use serde::{Deserialize, Serialize};
use std::path::Path;
use tokio::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyncConfig {
    pub supabase_url: String,
    pub supabase_key: String,
    pub org_id: String,
    pub bucket: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UploadResult {
    pub success: bool,
    pub path: Option<String>,
    pub error: Option<String>,
}

pub struct SyncEngine {
    config: SyncConfig,
    client: reqwest::Client,
}

impl SyncEngine {
    pub fn new(config: SyncConfig) -> Self {
        Self {
            config,
            client: reqwest::Client::new(),
        }
    }
    
    /// Upload a file to Supabase Storage
    pub async fn upload_file(&self, local_path: &Path, remote_path: &str) -> UploadResult {
        // Read file
        let file_bytes = match fs::read(local_path).await {
            Ok(bytes) => bytes,
            Err(e) => {
                return UploadResult {
                    success: false,
                    path: None,
                    error: Some(format!("Failed to read file: {}", e)),
                };
            }
        };
        
        // Determine content type
        let content_type = match local_path.extension().and_then(|e| e.to_str()) {
            Some("jpg") | Some("jpeg") => "image/jpeg",
            Some("png") => "image/png",
            Some("webp") => "image/webp",
            Some("heic") | Some("heif") => "image/heic",
            _ => "application/octet-stream",
        };
        
        // Build upload URL
        let upload_url = format!(
            "{}/storage/v1/object/{}/{}",
            self.config.supabase_url,
            self.config.bucket,
            remote_path
        );
        
        // Upload
        let result = self.client
            .post(&upload_url)
            .header("Authorization", format!("Bearer {}", self.config.supabase_key))
            .header("Content-Type", content_type)
            .body(file_bytes)
            .send()
            .await;
        
        match result {
            Ok(response) => {
                if response.status().is_success() {
                    UploadResult {
                        success: true,
                        path: Some(remote_path.to_string()),
                        error: None,
                    }
                } else {
                    let status = response.status();
                    let body = response.text().await.unwrap_or_default();
                    UploadResult {
                        success: false,
                        path: None,
                        error: Some(format!("Upload failed: {} - {}", status, body)),
                    }
                }
            }
            Err(e) => UploadResult {
                success: false,
                path: None,
                error: Some(format!("Request failed: {}", e)),
            },
        }
    }
    
    /// Check if we have network connectivity
    pub async fn check_connectivity(&self) -> bool {
        let health_url = format!("{}/rest/v1/", self.config.supabase_url);
        self.client
            .head(&health_url)
            .header("apikey", &self.config.supabase_key)
            .send()
            .await
            .map(|r| r.status().is_success())
            .unwrap_or(false)
    }
}
