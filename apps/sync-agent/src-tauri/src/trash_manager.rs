//! Trash Manager Module
//! 
//! Handles local `.aura_trash/` operations for safe file deletion
//! with 30-day retention and automatic cleanup.

use std::path::{Path, PathBuf};

/// Configuration for trash management
#[derive(Debug, Clone)]
pub struct TrashConfig {
    /// Number of days to retain trashed files
    pub retention_days: u32,
    /// Whether to auto-cleanup expired files on startup
    pub auto_cleanup: bool,
}

impl Default for TrashConfig {
    fn default() -> Self {
        Self {
            retention_days: 30,
            auto_cleanup: true,
        }
    }
}

/// Get the canonical trash directory path for a sync folder
pub fn get_trash_path(sync_folder: &Path) -> PathBuf {
    sync_folder.join(".aura_trash")
}

/// Ensure the trash directory exists with proper permissions
pub fn ensure_trash_dir(sync_folder: &Path) -> std::io::Result<PathBuf> {
    let trash_path = get_trash_path(sync_folder);
    
    if !trash_path.exists() {
        std::fs::create_dir_all(&trash_path)?;
        
        // Create a README to explain the folder
        let readme_path = trash_path.join("README.txt");
        std::fs::write(
            &readme_path,
            "This folder contains deleted files from Aura Sync Agent.\n\
             Files are automatically removed after 30 days.\n\
             Do not manually modify this folder."
        )?;
    }
    
    Ok(trash_path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;
    
    #[test]
    fn test_get_trash_path() {
        let folder = Path::new("/home/user/photos");
        let trash = get_trash_path(folder);
        assert_eq!(trash, PathBuf::from("/home/user/photos/.aura_trash"));
    }
    
    #[test]
    fn test_trash_config_default() {
        let config = TrashConfig::default();
        assert_eq!(config.retention_days, 30);
        assert!(config.auto_cleanup);
    }
}
