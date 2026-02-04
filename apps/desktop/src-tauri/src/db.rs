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
    pub cloud_hash: Option<String>,
    pub conflict_state: String, // "none", "conflict", "resolved"
}

use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct Database {
    conn: Arc<Mutex<Connection>>,
}

impl Database {
    pub fn new(app_data_dir: &PathBuf) -> Result<Self> {
        let db_path = app_data_dir.join("aura.db");
        let conn = Connection::open(db_path)?;
        
        // Enable WAL mode for concurrency
        conn.pragma_update(None, "journal_mode", "WAL")?;
        
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
                ai_scanned INTEGER DEFAULT 0,
                cloud_hash TEXT,
                conflict_state TEXT DEFAULT 'none',
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
            
            CREATE TABLE IF NOT EXISTS face_embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_id INTEGER NOT NULL,
                embedding BLOB NOT NULL,
                score REAL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (file_id) REFERENCES file_index(id) ON DELETE CASCADE
            );
            "
        )?;

        // Migrations
        // Add ai_scanned column if it doesn't exist
        let _ = conn.execute("ALTER TABLE file_index ADD COLUMN ai_scanned INTEGER DEFAULT 0", []);
        // Add cloud_hash column if it doesn't exist
        let _ = conn.execute("ALTER TABLE file_index ADD COLUMN cloud_hash TEXT", []);
        // Add conflict_state column if it doesn't exist
        let _ = conn.execute("ALTER TABLE file_index ADD COLUMN conflict_state TEXT DEFAULT 'none'", []);
        
        Ok(Self { conn: Arc::new(Mutex::new(conn)) })
    }
    
    pub fn add_watched_folder(&self, path: &str) -> Result<i64> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR IGNORE INTO watched_folders (path) VALUES (?1)",
            params![path],
        )?;
        Ok(conn.last_insert_rowid())
    }
    
    pub fn get_watched_folders(&self) -> Result<Vec<WatchedFolder>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
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
        let conn = self.conn.lock().unwrap();
        // Reset ai_scanned to 0 on update since file changed
        // We preserve cloud_hash and conflict_state on update for now, 
        // but reset sync_status to pending.
        conn.execute(
            "INSERT INTO file_index (path, hash, mod_time, sync_status, folder_id, ai_scanned, conflict_state) 
             VALUES (?1, ?2, ?3, 'pending', ?4, 0, 'none')
             ON CONFLICT(path) DO UPDATE SET 
                hash = ?2, 
                mod_time = ?3, 
                sync_status = 'pending',
                ai_scanned = 0",
            params![path, hash, mod_time, folder_id],
        )?;
        Ok(conn.last_insert_rowid())
    }
    
    pub fn get_pending_files(&self, limit: i64) -> Result<Vec<FileEntry>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, path, hash, mod_time, sync_status, folder_id, cloud_hash, conflict_state 
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
                cloud_hash: row.get(6)?,
                conflict_state: row.get(7)?,
            })
        })?;
        
        files.collect()
    }

    pub fn get_unscanned_files(&self, limit: i64) -> Result<Vec<FileEntry>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, path, hash, mod_time, sync_status, folder_id, cloud_hash, conflict_state 
             FROM file_index WHERE ai_scanned = 0 LIMIT ?1"
        )?;
        
        let files = stmt.query_map(params![limit], |row| {
            Ok(FileEntry {
                id: row.get(0)?,
                path: row.get(1)?,
                hash: row.get(2)?,
                mod_time: row.get(3)?,
                sync_status: row.get(4)?,
                folder_id: row.get(5)?,
                cloud_hash: row.get(6)?,
                conflict_state: row.get(7)?,
            })
        })?;
        
        files.collect()
    }
    
    pub fn save_embedding(&self, file_id: i64, embedding: &[f32], score: f32) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        
        // Serialize embedding to bytes (f32 -> u8)
        let bytes: Vec<u8> = embedding.iter().flat_map(|f| f.to_le_bytes().to_vec()).collect();
        
        conn.execute(
            "INSERT INTO face_embeddings (file_id, embedding, score, created_at) VALUES (?1, ?2, ?3, ?4)",
            params![file_id, bytes, score, chrono::Utc::now().timestamp()],
        )?;
        Ok(())
    }

    pub fn mark_scanned(&self, file_id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE file_index SET ai_scanned = 1 WHERE id = ?1",
            params![file_id],
        )?;
        Ok(())
    }
    
    pub fn mark_synced(&self, file_id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE file_index SET sync_status = 'synced' WHERE id = ?1",
            params![file_id],
        )?;
        Ok(())
    }
    
    pub fn get_stats(&self) -> Result<(i64, i64, i64)> {
        let conn = self.conn.lock().unwrap();
        let total: i64 = conn.query_row(
            "SELECT COUNT(*) FROM file_index", [], |row| row.get(0)
        )?;
        let synced: i64 = conn.query_row(
            "SELECT COUNT(*) FROM file_index WHERE sync_status = 'synced'", [], |row| row.get(0)
        )?;
        let pending: i64 = conn.query_row(
            "SELECT COUNT(*) FROM file_index WHERE sync_status = 'pending'", [], |row| row.get(0)
        )?;
        Ok((total, synced, pending))
    }
    
    pub fn remove_watched_folder(&self, folder_id: i64) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        // Delete associated files first
        conn.execute(
            "DELETE FROM file_index WHERE folder_id = ?1",
            params![folder_id],
        )?;
        // Delete the folder
        conn.execute(
            "DELETE FROM watched_folders WHERE id = ?1",
            params![folder_id],
        )?;
        Ok(())
    }

    /// Get all files that have been synced to cloud
    pub fn get_synced_files(&self) -> Result<Vec<FileEntry>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, path, hash, mod_time, sync_status, folder_id, cloud_hash, conflict_state 
             FROM file_index WHERE sync_status = 'synced'"
        )?;
        
        let files = stmt.query_map([], |row| {
            Ok(FileEntry {
                id: row.get(0)?,
                path: row.get(1)?,
                hash: row.get(2)?,
                mod_time: row.get(3)?,
                sync_status: row.get(4)?,
                folder_id: row.get(5)?,
                cloud_hash: row.get(6)?,
                conflict_state: row.get(7)?,
            })
        })?;
        
        files.collect()
    }

    /// Set conflict state for a file
    pub fn set_conflict_state(&self, file_id: i64, state: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "UPDATE file_index SET conflict_state = ?1 WHERE id = ?2",
            params![state, file_id],
        )?;
        Ok(())
    }

    /// Get all files with conflicts
    pub fn get_conflicts(&self) -> Result<Vec<FileEntry>> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, path, hash, mod_time, sync_status, folder_id, cloud_hash, conflict_state 
             FROM file_index WHERE conflict_state != 'none'"
        )?;
        
        let files = stmt.query_map([], |row| {
            Ok(FileEntry {
                id: row.get(0)?,
                path: row.get(1)?,
                hash: row.get(2)?,
                mod_time: row.get(3)?,
                sync_status: row.get(4)?,
                folder_id: row.get(5)?,
                cloud_hash: row.get(6)?,
                conflict_state: row.get(7)?,
            })
        })?;
        
        files.collect()
    }

    /// Resolve a conflict by choosing local or cloud version
    pub fn resolve_conflict(&self, file_id: i64, resolution: &str) -> Result<()> {
        let conn = self.conn.lock().unwrap();
        match resolution {
            "keep_local" => {
                // Mark as pending to re-upload local version
                conn.execute(
                    "UPDATE file_index SET conflict_state = 'none', sync_status = 'pending' WHERE id = ?1",
                    params![file_id],
                )?;
            },
            "keep_cloud" => {
                // Mark for download (or just clear conflict if we want to delete local)
                conn.execute(
                    "UPDATE file_index SET conflict_state = 'none', sync_status = 'deleted_on_cloud' WHERE id = ?1",
                    params![file_id],
                )?;
            },
            "keep_both" => {
                // User will manually resolve - just clear conflict flag
                conn.execute(
                    "UPDATE file_index SET conflict_state = 'none' WHERE id = ?1",
                    params![file_id],
                )?;
            },
            _ => {
                return Err(rusqlite::Error::InvalidParameterName("Invalid resolution".to_string()));
            }
        }
        Ok(())
    }
}
