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

    pub fn increment_retry(&self, id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE sync_queue SET retries = retries + 1 WHERE id = ?1",
            params![id],
        )?;
        Ok(())
    }
}
