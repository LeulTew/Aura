//! Aura Desktop - Database Module
//! 
//! Manages local SQLite database for file index and sync queue.

use rusqlite::{Connection, Result, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WatchedFolder {
    pub id: i64,
    pub path: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub id: i64,
    pub path: String,
    pub hash: String,
    pub mod_time: i64,
    pub sync_status: String, // "pending", "synced", "error"
    pub folder_id: i64,
}

pub struct Database {
    conn: Connection,
}

impl Database {
    pub fn new(app_data_dir: &PathBuf) -> Result<Self> {
        let db_path = app_data_dir.join("aura.db");
        let conn = Connection::open(db_path)?;
        
        // Initialize schema
        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS watched_folders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL UNIQUE,
                enabled INTEGER NOT NULL DEFAULT 1
            );
            
            CREATE TABLE IF NOT EXISTS file_index (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                path TEXT NOT NULL UNIQUE,
                hash TEXT NOT NULL,
                mod_time INTEGER NOT NULL,
                sync_status TEXT NOT NULL DEFAULT 'pending',
                folder_id INTEGER NOT NULL,
                FOREIGN KEY (folder_id) REFERENCES watched_folders(id)
            );
            
            CREATE TABLE IF NOT EXISTS sync_queue (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_id INTEGER NOT NULL,
                priority INTEGER NOT NULL DEFAULT 0,
                attempts INTEGER NOT NULL DEFAULT 0,
                last_error TEXT,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (file_id) REFERENCES file_index(id)
            );
            
            CREATE INDEX IF NOT EXISTS idx_file_sync_status ON file_index(sync_status);
            CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_queue(priority DESC);
            "
        )?;
        
        Ok(Self { conn })
    }
    
    pub fn add_watched_folder(&self, path: &str) -> Result<i64> {
        self.conn.execute(
            "INSERT OR IGNORE INTO watched_folders (path) VALUES (?1)",
            params![path],
        )?;
        Ok(self.conn.last_insert_rowid())
    }
    
    pub fn get_watched_folders(&self) -> Result<Vec<WatchedFolder>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, path, enabled FROM watched_folders WHERE enabled = 1"
        )?;
        
        let folders = stmt.query_map([], |row| {
            Ok(WatchedFolder {
                id: row.get(0)?,
                path: row.get(1)?,
                enabled: row.get(2)?,
            })
        })?;
        
        folders.collect()
    }
    
    pub fn upsert_file(&self, path: &str, hash: &str, mod_time: i64, folder_id: i64) -> Result<i64> {
        self.conn.execute(
            "INSERT INTO file_index (path, hash, mod_time, sync_status, folder_id) 
             VALUES (?1, ?2, ?3, 'pending', ?4)
             ON CONFLICT(path) DO UPDATE SET hash = ?2, mod_time = ?3, sync_status = 'pending'",
            params![path, hash, mod_time, folder_id],
        )?;
        Ok(self.conn.last_insert_rowid())
    }
    
    pub fn get_pending_files(&self, limit: i64) -> Result<Vec<FileEntry>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, path, hash, mod_time, sync_status, folder_id 
             FROM file_index WHERE sync_status = 'pending' LIMIT ?1"
        )?;
        
        let files = stmt.query_map(params![limit], |row| {
            Ok(FileEntry {
                id: row.get(0)?,
                path: row.get(1)?,
                hash: row.get(2)?,
                mod_time: row.get(3)?,
                sync_status: row.get(4)?,
                folder_id: row.get(5)?,
            })
        })?;
        
        files.collect()
    }
    
    pub fn mark_synced(&self, file_id: i64) -> Result<()> {
        self.conn.execute(
            "UPDATE file_index SET sync_status = 'synced' WHERE id = ?1",
            params![file_id],
        )?;
        Ok(())
    }
    
    pub fn get_stats(&self) -> Result<(i64, i64, i64)> {
        let total: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM file_index", [], |row| row.get(0)
        )?;
        let synced: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM file_index WHERE sync_status = 'synced'", [], |row| row.get(0)
        )?;
        let pending: i64 = self.conn.query_row(
            "SELECT COUNT(*) FROM file_index WHERE sync_status = 'pending'", [], |row| row.get(0)
        )?;
        Ok((total, synced, pending))
    }
}
