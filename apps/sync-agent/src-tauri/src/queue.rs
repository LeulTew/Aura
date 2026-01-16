use rusqlite::{params, Connection, Result};
use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct QueueItem {
    pub id: i64,
    pub file_path: String,
    pub status: String, // pending, uploading, completed, failed
    pub retries: i32,
    pub last_error: Option<String>,
    pub created_at: String,
}

#[derive(Clone)]
pub struct SyncQueue {
    conn: Arc<Mutex<Connection>>,
}

impl SyncQueue {
    pub fn new(db_path: PathBuf) -> Result<Self> {
        let conn = Connection::open(db_path)?;
        
        // Initialize schema
        conn.execute(
            "CREATE TABLE IF NOT EXISTS sync_queue (
                id INTEGER PRIMARY KEY,
                file_path TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                retries INTEGER DEFAULT 0,
                last_error TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;

        // Delta Sync: Track last synced state
        conn.execute(
            "CREATE TABLE IF NOT EXISTS synced_files (
                file_path TEXT PRIMARY KEY,
                file_hash TEXT NOT NULL,
                synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            [],
        )?;
        
        Ok(Self {
            conn: Arc::new(Mutex::new(conn)),
        })
    }

    pub fn add_item(&self, file_path: String) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO sync_queue (file_path) VALUES (?1)",
            params![file_path],
        )?;
        Ok(())
    }

    pub fn get_pending(&self, limit: i32) -> Result<Vec<QueueItem>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, file_path, status, retries, last_error, created_at 
             FROM sync_queue 
             WHERE status = 'pending' 
             ORDER BY created_at ASC 
             LIMIT ?1"
        )?;
        
        let rows = stmt.query_map(params![limit], |row| {
            Ok(QueueItem {
                id: row.get(0)?,
                file_path: row.get(1)?,
                status: row.get(2)?,
                retries: row.get(3)?,
                last_error: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?;

        let mut items = Vec::new();
        for item in rows {
            items.push(item?);
        }
        Ok(items)
    }

    pub fn update_status(&self, id: i64, status: &str, error: Option<String>) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE sync_queue SET status = ?1, last_error = ?2 WHERE id = ?3",
            params![status, error, id],
        )?;
        Ok(())
    }

    pub fn get_synced_hash(&self, path: &str) -> Result<Option<String>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare("SELECT file_hash FROM synced_files WHERE file_path = ?1")?;
        let mut rows = stmt.query(params![path])?;
        
        if let Some(row) = rows.next()? {
            Ok(Some(row.get(0)?))
        } else {
            Ok(None)
        }
    }

    pub fn update_synced_hash(&self, path: &str, hash: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO synced_files (file_path, file_hash, synced_at) VALUES (?1, ?2, CURRENT_TIMESTAMP)",
            params![path, hash],
        )?;
        Ok(())
    }

    pub fn increment_retry(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE sync_queue SET retries = retries + 1 WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    #[test]
    fn test_queue_operations() {
        let db_path = PathBuf::from("test_queue.db");
        if db_path.exists() {
            fs::remove_file(&db_path).unwrap();
        }

        let queue = SyncQueue::new(db_path.clone()).unwrap();

        // Test Add
        queue.add_item("test_file.jpg".to_string()).unwrap();
        
        // Test Get Pending
        let pending = queue.get_pending(10).unwrap();
        assert_eq!(pending.len(), 1);
        assert_eq!(pending[0].file_path, "test_file.jpg");
        assert_eq!(pending[0].status, "pending");

        // Test Update Status
        queue.update_status(pending[0].id, "completed", None).unwrap();
        let pending_after = queue.get_pending(10).unwrap();
        assert!(pending_after.is_empty());

        // Cleanup
        fs::remove_file(db_path).unwrap();
    }

    #[test]
    fn test_delta_sync_hash() {
        let db_path = PathBuf::from("test_delta.db");
        if db_path.exists() {
            fs::remove_file(&db_path).unwrap();
        }

        let queue = SyncQueue::new(db_path.clone()).unwrap();

        // Test Hash Store
        queue.update_synced_hash("test.jpg", "abc123hash").unwrap();
        
        // Test Hash Retrieve
        let hash = queue.get_synced_hash("test.jpg").unwrap();
        assert_eq!(hash, Some("abc123hash".to_string()));

        let missing = queue.get_synced_hash("missing.jpg").unwrap();
        assert_eq!(missing, None);

        // Cleanup
        fs::remove_file(db_path).unwrap();
    }
}
