import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import "./App.css";

interface SyncStats {
  total: number;
  synced: number;
  pending: number;
}

interface FolderInfo {
  id: number;
  path: string;
  enabled: boolean;
}

function App() {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch stats and folders on mount
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    try {
      const [statsData, foldersData] = await Promise.all([
        invoke<SyncStats>("get_sync_stats"),
        invoke<FolderInfo[]>("get_watched_folders"),
      ]);
      setStats(statsData);
      setFolders(foldersData);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  };

  const handleAddFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "Select Photo Folder",
      });

      if (selected && typeof selected === "string") {
        setScanning(true);
        const count = await invoke<number>("scan_folder", { path: selected });
        await refreshData();
        setScanning(false);
        alert(`Indexed ${count} photos from folder`);
      }
    } catch (e) {
      setError(String(e));
      setScanning(false);
    }
  };

  const syncProgress = stats
    ? stats.total > 0
      ? Math.round((stats.synced / stats.total) * 100)
      : 0
    : 0;

  return (
    <main className="app">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <span className="logo-icon">◉</span>
          <span className="logo-text">Aura Desktop</span>
        </div>
        <div className="status-indicator">
          <span className="status-dot online"></span>
          <span>Connected</span>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="stats-section">
        <h2>Sync Status</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats?.total ?? "-"}</div>
            <div className="stat-label">Total Photos</div>
          </div>
          <div className="stat-card synced">
            <div className="stat-value">{stats?.synced ?? "-"}</div>
            <div className="stat-label">Synced</div>
          </div>
          <div className="stat-card pending">
            <div className="stat-value">{stats?.pending ?? "-"}</div>
            <div className="stat-label">Pending</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${syncProgress}%` }}
            ></div>
          </div>
          <span className="progress-text">{syncProgress}% synced</span>
        </div>
      </section>

      {/* Watched Folders */}
      <section className="folders-section">
        <div className="section-header">
          <h2>Watched Folders</h2>
          <button
            className="add-button"
            onClick={handleAddFolder}
            disabled={scanning}
          >
            {scanning ? "Scanning..." : "+ Add Folder"}
          </button>
        </div>

        {folders.length === 0 ? (
          <div className="empty-state">
            <p>No folders added yet.</p>
            <p className="hint">
              Click "Add Folder" to start syncing your photos.
            </p>
          </div>
        ) : (
          <ul className="folder-list">
            {folders.map((folder) => (
              <li key={folder.id} className="folder-item">
                <span className="folder-icon">📁</span>
                <span className="folder-path">{folder.path}</span>
                <span
                  className={`folder-status ${
                    folder.enabled ? "active" : "paused"
                  }`}
                >
                  {folder.enabled ? "Active" : "Paused"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Error Display */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
    </main>
  );
}

export default App;
