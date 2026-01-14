/**
 * Aura Sync Agent - Main App Component
 * 
 * Desktop application for bidirectional sync between local folders and Aura cloud
 */

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { 
  FolderSync, Cloud, Settings, Play, Pause, 
  RefreshCw, AlertCircle, CheckCircle2, Loader2 
} from 'lucide-react';

interface SyncFolder {
  id: string;
  localPath: string;
  cloudPath: string;
  mode: 'upload-only' | 'download-only' | 'bidirectional';
  status: 'syncing' | 'synced' | 'error' | 'paused';
  lastSync: string | null;
  pendingFiles: number;
}

interface AppState {
  connected: boolean;
  orgSlug: string | null;
  folders: SyncFolder[];
  isRunning: boolean;
  totalPending: number;
  bandwidthKbps: number;
}

export default function App() {
  const [state, setState] = useState<AppState>({
    connected: false,
    orgSlug: null,
    folders: [],
    isRunning: false,
    totalPending: 0,
    bandwidthKbps: 5000
  });
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize on mount
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Check if config exists via Tauri command
      // const config = await invoke('get_config');
      // setState(prev => ({ ...prev, ...config }));
      
      // Simulated for now (Tauri backend not yet built)
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          connected: true,
          orgSlug: 'demo-studio',
          folders: [
            {
              id: '1',
              localPath: 'D:\\Photos\\2026\\Weddings',
              cloudPath: 'demo-studio/2026/weddings',
              mode: 'bidirectional',
              status: 'synced',
              lastSync: new Date().toISOString(),
              pendingFiles: 0
            }
          ]
        }));
        setLoading(false);
      }, 1000);
    } catch (err) {
      console.error('Init error:', err);
      setLoading(false);
    }
  };

  const toggleSync = () => {
    setState(prev => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const StatusIcon = ({ status }: { status: SyncFolder['status'] }) => {
    switch (status) {
      case 'syncing': return <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />;
      case 'synced': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'paused': return <Pause className="w-4 h-4 text-yellow-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4 flex justify-between items-center bg-black">
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 bg-[#7C3AED] flex items-center justify-center">
            <FolderSync className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold uppercase tracking-wider text-sm">Aura Sync</h1>
            <span className="text-[10px] text-white/40 uppercase tracking-widest font-mono">
              {state.connected ? `Connected • ${state.orgSlug}` : 'Disconnected'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleSync}
            className={`px-4 py-2 text-xs uppercase tracking-widest font-bold flex items-center gap-2 transition-colors ${
              state.isRunning 
                ? 'bg-[#7C3AED] hover:bg-[#6B2FD6]' 
                : 'bg-white/10 hover:bg-white/20'
            }`}
          >
            {state.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {state.isRunning ? 'Pause' : 'Start'}
          </button>
          <button 
            onClick={() => setShowSettings(true)}
            className="w-10 h-10 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Status Bar */}
      <div className="bg-black/50 border-b border-white/5 px-6 py-3 flex justify-between items-center text-xs text-white/60">
        <div className="flex items-center gap-6">
          <span>
            <span className="text-white/30 uppercase tracking-widest">Folders:</span>{' '}
            <span className="font-mono">{state.folders.length}</span>
          </span>
          <span>
            <span className="text-white/30 uppercase tracking-widest">Pending:</span>{' '}
            <span className="font-mono">{state.totalPending}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-white/30">Bandwidth:</span>
          <span className="font-mono">{state.bandwidthKbps} KB/s</span>
        </div>
      </div>

      {/* Folder List */}
      <main className="p-6">
        <div className="space-y-4">
          {state.folders.map(folder => (
            <div 
              key={folder.id}
              className="border border-white/10 bg-black/30 p-6 hover:border-white/20 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <StatusIcon status={folder.status} />
                    <h3 className="font-bold">{folder.localPath.split('\\').pop()}</h3>
                    <span className="text-[10px] uppercase tracking-widest bg-white/10 px-2 py-1 font-mono">
                      {folder.mode}
                    </span>
                  </div>
                  <div className="text-xs text-white/40 space-y-1">
                    <p><span className="text-white/20">Local:</span> {folder.localPath}</p>
                    <p><span className="text-white/20">Cloud:</span> {folder.cloudPath}</p>
                  </div>
                </div>
                <div className="text-right text-xs text-white/40">
                  <p className="uppercase tracking-widest mb-1">Last Sync</p>
                  <p className="font-mono">
                    {folder.lastSync 
                      ? new Date(folder.lastSync).toLocaleString() 
                      : 'Never'
                    }
                  </p>
                  {folder.pendingFiles > 0 && (
                    <p className="text-yellow-500 mt-2 font-mono">
                      {folder.pendingFiles} pending
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {state.folders.length === 0 && (
          <div className="border border-dashed border-white/10 p-12 text-center">
            <Cloud className="w-12 h-12 mx-auto mb-4 text-white/10" />
            <p className="text-white/40 mb-4">No folders configured</p>
            <button className="px-6 py-3 bg-[#7C3AED] text-xs uppercase tracking-widest font-bold hover:bg-[#6B2FD6] transition-colors">
              Add Folder
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
