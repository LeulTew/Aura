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

interface SyncConfig {
  supabase_url: string;
  supabase_key: string;
  org_id: string;
  bucket: string;
}

interface ConflictInfo {
  id: number;
  path: string;
  conflict_state: string;
  mod_time: number;
}

type Tab = "dashboard" | "settings" | "conflicts";

// Conflicts Panel Component
function ConflictsPanel() {
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConflicts();
  }, []);

  const fetchConflicts = async () => {
    setLoading(true);
    try {
      const data = await invoke<ConflictInfo[]>("get_conflicts");
      setConflicts(data);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (fileId: number, resolution: string) => {
    try {
      await invoke("resolve_conflict", { fileId, resolution });
      // Refresh list after resolution
      await fetchConflicts();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleResolveAll = async (resolution: string) => {
    for (const conflict of conflicts) {
      await handleResolve(conflict.id, resolution);
    }
  };

  // Extract filename from full path
  const getFileName = (path: string) => {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || path;
  };

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <section className="conflicts-section">
      <div className="section-header">
        <h2>Sync Conflicts</h2>
        <div className="conflict-actions">
          <button 
            className="refresh-btn" 
            onClick={fetchConflicts} 
            disabled={loading}
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
          {conflicts.length > 0 && (
            <button 
              className="resolve-all-btn" 
              onClick={() => handleResolveAll("keep_local")}
            >
              Resolve All (Keep Local)
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {!loading && conflicts.length === 0 ? (
        <div className="empty-state">
          <p>No conflicts detected.</p>
          <p className="hint">
            Great! Your local files are in sync with the cloud.
          </p>
        </div>
      ) : (
        <ul className="conflict-list">
          {conflicts.map((conflict) => (
            <li key={conflict.id} className="conflict-item">
              <div className="conflict-info">
                <span className="file-name">{getFileName(conflict.path)}</span>
                <span className="file-path">{conflict.path}</span>
                <span className="conflict-type">{conflict.conflict_state}</span>
                <span className="file-time">Modified: {formatTime(conflict.mod_time)}</span>
              </div>
              <div className="resolution-options">
                <button 
                  className="btn-local"
                  onClick={() => handleResolve(conflict.id, "keep_local")}
                >
                  Keep Local
                </button>
                <button 
                  className="btn-cloud"
                  onClick={() => handleResolve(conflict.id, "keep_cloud")}
                >
                  Keep Cloud
                </button>
                <button 
                  className="btn-both"
                  onClick={() => handleResolve(conflict.id, "keep_both")}
                >
                  Keep Both
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncPaused, setSyncPaused] = useState(false);

  // Settings state
  const [config, setConfig] = useState<SyncConfig>({
    supabase_url: "",
    supabase_key: "",
    org_id: "",
    bucket: "photos",
  });
  const [configSaved, setConfigSaved] = useState(false);

  // Fetch stats and folders on mount
  useEffect(() => {
    refreshData();
    // Load saved config from localStorage
    const saved = localStorage.getItem("aura_sync_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setConfig(parsed);
        // Apply to backend
        invoke("configure_sync", { config: parsed }).catch(console.error);
        setConfigSaved(true);
      } catch {}
    }
  }, []);

  // Periodic refresh
  useEffect(() => {
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
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

  const handleRemoveFolder = async (id: number) => {
    if (!confirm("Remove this folder from sync?")) return;
    try {
      await invoke("remove_watched_folder", { folderId: id });
      await refreshData();
    } catch (e) {
      setError(String(e));
    }
  };

  const handleSaveConfig = async () => {
    try {
      await invoke("configure_sync", { config });
      localStorage.setItem("aura_sync_config", JSON.stringify(config));
      setConfigSaved(true);
      setError(null);
      alert("Configuration saved!");
    } catch (e) {
      setError(String(e));
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
        <nav className="tabs">
          <button
            className={activeTab === "dashboard" ? "active" : ""}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={activeTab === "settings" ? "active" : ""}
            onClick={() => setActiveTab("settings")}
          >
            Settings
          </button>
          <button
            className={activeTab === "conflicts" ? "active" : ""}
            onClick={() => setActiveTab("conflicts")}
          >
            Conflicts
          </button>
        </nav>
        <div className="status-indicator">
          <span className={`status-dot ${configSaved ? "online" : "offline"}`}></span>
          <span>{configSaved ? (syncPaused ? "Paused" : "Connected") : "Not Configured"}</span>
        </div>
      </header>

      {activeTab === "dashboard" && (
        <>
          {/* Stats Cards */}
          <section className="stats-section">
            <div className="section-header">
              <h2>Sync Status</h2>
              <button
                className={`pause-button ${syncPaused ? "paused" : ""}`}
                onClick={() => setSyncPaused(!syncPaused)}
              >
                {syncPaused ? "▶ Resume" : "⏸ Pause"}
              </button>
            </div>
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
                disabled={scanning || !configSaved}
              >
                {scanning ? "Scanning..." : "+ Add Folder"}
              </button>
            </div>

            {!configSaved && (
              <div className="warning-banner">
                ⚠️ Configure Supabase credentials in Settings before adding folders.
              </div>
            )}

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
                    <button
                      className="remove-button"
                      onClick={() => handleRemoveFolder(folder.id)}
                      title="Remove folder"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {activeTab === "settings" && (
        <section className="settings-section">
          <h2>Sync Configuration</h2>
          <p className="settings-hint">
            Enter your Supabase project credentials to enable cloud sync.
          </p>

          <div className="form-group">
            <label>Supabase URL</label>
            <input
              type="url"
              placeholder="https://your-project.supabase.co"
              value={config.supabase_url}
              onChange={(e) =>
                setConfig({ ...config, supabase_url: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>API Key (anon/service)</label>
            <input
              type="password"
              placeholder="eyJhbGc..."
              value={config.supabase_key}
              onChange={(e) =>
                setConfig({ ...config, supabase_key: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Organization ID</label>
            <input
              type="text"
              placeholder="your-org-uuid"
              value={config.org_id}
              onChange={(e) => setConfig({ ...config, org_id: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Storage Bucket</label>
            <input
              type="text"
              placeholder="photos"
              value={config.bucket}
              onChange={(e) => setConfig({ ...config, bucket: e.target.value })}
            />
          </div>

          <button className="save-button" onClick={handleSaveConfig}>
            Save Configuration
          </button>
        </section>
      )}

      {activeTab === "conflicts" && (
        <ConflictsPanel />
      )}

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
