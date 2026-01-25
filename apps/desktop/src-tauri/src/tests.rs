#[cfg(test)]
mod tests {
    use crate::db::Database;
    use std::fs;
    use std::path::PathBuf;

    fn setup_test_db() -> (Database, PathBuf) {
        let temp_dir = std::env::temp_dir().join(format!("aura_test_{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&temp_dir).unwrap();
        let db = Database::new(&temp_dir).unwrap();
        (db, temp_dir)
    }

    fn teardown_test_db(dir: PathBuf) {
        fs::remove_dir_all(dir).unwrap_or_default();
    }

    #[test]
    fn test_watched_folders() {
        let (db, dir) = setup_test_db();
        
        // Add folder
        let id = db.add_watched_folder("/tmp/photos").unwrap();
        assert!(id > 0);
        
        // Get folders
        let folders = db.get_watched_folders().unwrap();
        assert_eq!(folders.len(), 1);
        assert_eq!(folders[0].path, "/tmp/photos");
        assert!(folders[0].enabled);
        
        // Add duplicate (should be ignored or idempotent)
        let id2 = db.add_watched_folder("/tmp/photos").unwrap();
        // In our impl, INSERT OR IGNORE returns 0 rows affected, so last_insert_rowid might track strictly inserts.
        // But let's check count.
        let folders_after = db.get_watched_folders().unwrap();
        assert_eq!(folders_after.len(), 1);

        teardown_test_db(dir);
    }

    #[test]
    fn test_file_indexing() {
        let (db, dir) = setup_test_db();
        let folder_id = db.add_watched_folder("/tmp/photos").unwrap();
        
        // Insert file
        let file_id = db.upsert_file("/tmp/photos/1.jpg", "hash123", 1000, folder_id).unwrap();
        
        // Check stats
        let (total, synced, pending) = db.get_stats().unwrap();
        assert_eq!(total, 1);
        assert_eq!(synced, 0);
        assert_eq!(pending, 1);
        
        // Get pending
        let pending_files = db.get_pending_files(10).unwrap();
        assert_eq!(pending_files.len(), 1);
        assert_eq!(pending_files[0].hash, "hash123");
        
        // Mark synced
        db.mark_synced(file_id).unwrap();
        
        // Check stats again
        let (total, synced, pending) = db.get_stats().unwrap();
        assert_eq!(total, 1);
        assert_eq!(synced, 1);
        assert_eq!(pending, 0);

        teardown_test_db(dir);
    }
}
