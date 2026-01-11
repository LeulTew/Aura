"use client";

import { useState, useEffect } from "react";
import VoidBackground from "@/components/VoidBackground";

interface FolderItem {
  name: string;
  path: string;
  type: "dir" | "file";
}

interface FolderResponse {
  path: string;
  parent: string | null;
  items: FolderItem[];
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [currentPath, setCurrentPath] = useState("/");
  const [pathInput, setPathInput] = useState("/");
  const [folderData, setFolderData] = useState<FolderResponse | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [bundleName, setBundleName] = useState("");
  const [createdBundle, setCreatedBundle] = useState<{id: string, url: string} | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Load token on mount
  useEffect(() => {
    const t = sessionStorage.getItem("admin_token");
    if (t) setToken(t);
  }, []);

  // Fetch folder data
  useEffect(() => {
    if (!token) return;
    setPathInput(currentPath);
    fetch(`/api/admin/folders?path=${encodeURIComponent(currentPath)}`)
      .then(async res => {
        if (!res.ok) throw new Error((await res.json()).detail || "Failed to load folder");
        return res.json();
      })
      .then(data => {
        if (!data.items) data.items = [];
        setFolderData(data);
        setError("");
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
        setFolderData({ path: currentPath, parent: null, items: [] });
      });
  }, [currentPath, token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin })
    });
    const data = await res.json();
    if (data.success) {
      setToken(data.token);
      sessionStorage.setItem("admin_token", data.token);
      setError("");
    } else {
      setError("Invalid PIN");
    }
  };

  const handleLogout = () => {
    setToken(null);
    sessionStorage.removeItem("admin_token");
  };

  const createBundle = async () => {
    if (!bundleName || selectedPhotos.size === 0) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: bundleName,
          photo_ids: Array.from(selectedPhotos)
        })
      });
      const data = await res.json();
      setCreatedBundle(data);
    } catch {
      setError("Failed to create bundle");
    } finally {
      setIsCreating(false);
    }
  };

  const toggleSelect = (path: string) => {
    setSelectedPhotos(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const selectFolder = async (path: string) => {
    try {
      const res = await fetch(`/api/admin/folders?path=${encodeURIComponent(path)}`);
      const data: FolderResponse = await res.json();
      const files = data.items.filter(item => item.type === "file").map(item => item.path);
      setSelectedPhotos(prev => {
        const next = new Set(prev);
        files.forEach(f => next.add(f));
        return next;
      });
    } catch (err) {
      console.error("Failed to select folder", err);
    }
  };

  const getImageUrl = (path: string) => `/api/image?path=${encodeURIComponent(path)}&w=100`;

  if (!token) {
    return (
      <main className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
        <VoidBackground />
        
        <form onSubmit={handleLogin} className="w-full max-w-md backdrop-blur-3xl bg-white/[0.02] p-12 rounded-[32px] border border-white/10 z-10 transition-all hover:border-white/20">
          <div className="flex flex-col items-center mb-12">
            <div className="w-12 h-12 bg-gradient-to-br from-[var(--accent)] to-[#6366f1] rounded-2xl flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-semibold text-white tracking-widest uppercase">Admin Terminal</h1>
            <p className="text-gray-500 font-mono text-[10px] mt-2 tracking-widest uppercase">Aura Intelligent Photo Core</p>
          </div>

          <div className="space-y-6">
            <div className="relative group">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-black/40 border-2 border-white/5 rounded-2xl px-6 py-5 text-center text-3xl tracking-[0.8em] font-mono focus:border-[var(--accent)]/50 focus:bg-black/60 outline-none transition-all placeholder:text-white/10"
                autoFocus
              />
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[var(--accent)] to-[#6366f1] rounded-2xl opacity-0 group-focus-within:opacity-20 transition-opacity blur-sm" />
            </div>

            <button type="submit" className="w-full py-5 bg-white text-black font-mono text-[11px] font-bold uppercase tracking-[0.2em] rounded active:scale-[0.98] transition-all">
              Initialize Session
            </button>
          </div>

          {error && (
            <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center text-xs font-mono animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}
        </form>

        <style jsx global>{`
          :root {
            --accent: #6366F1;
          }
           @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
        `}</style>
      </main>
    );
  }

  return (
    <main className="flex h-screen bg-[#050505] text-white font-sans overflow-hidden">
      <style jsx global>{`
        :root {
          --bg: #050505;
          --panel-bg: rgba(15, 15, 15, 0.8);
          --accent: #6366F1;
          --accent-soft: rgba(99, 102, 241, 0.1);
          --border: rgba(255, 255, 255, 0.08);
          --text-primary: #FFFFFF;
          --text-secondary: #808080;
          --text-muted: #404040;
          --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          --font-mono: 'JetBrains Mono', monospace;
        }

        body { font-family: var(--font-sans); }
        .font-mono { font-family: var(--font-mono); }
      `}</style>

      {/* Sidebar: File Tree */}
      <aside className="w-[380px] border-r border-[var(--border)] flex flex-col bg-[#050505]">
        <div className="p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3 mb-4">
             <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
             </div>
             <div className="font-semibold uppercase tracking-widest text-xs">Core Browser</div>
          </div>
          <div className="bg-white/[0.03] border border-[var(--border)] p-2 px-3 flex items-center gap-3 rounded">
            <svg className="w-3.5 h-3.5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <form 
              className="flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                let cleanPath = pathInput.trim();
                cleanPath = cleanPath.replace(/\\/g, "/");
                if (cleanPath.startsWith("//wsl.localhost/") || cleanPath.startsWith("//wsl$/")) {
                  const match = cleanPath.match(/^\/\/[^\/]+\/[^\/]+(.*)/);
                  if (match) cleanPath = match[1] || "/";
                }
                const driveMatch = cleanPath.match(/^([a-zA-Z]):/);
                if (driveMatch) {
                   const drive = driveMatch[1].toLowerCase();
                   cleanPath = `/mnt/${drive}` + cleanPath.substring(2);
                }
                if (!cleanPath) cleanPath = "/";
                setPathInput(cleanPath);
                setCurrentPath(cleanPath);
              }}
            >
              <input 
                type="text" 
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                className="w-full bg-transparent border-none text-[var(--text-secondary)] font-mono text-[11px] outline-none"
              />
            </form>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pt-2">
          {/* Back button */}
          {folderData?.parent && (
            <div 
              onClick={() => setCurrentPath(folderData.parent!)}
              className="px-6 py-2 flex items-center gap-2 cursor-pointer hover:bg-white/[0.02] text-gray-500 group transition-colors"
            >
              <span className="text-gray-700 group-hover:text-[var(--accent)] transition-colors">←</span>
              <span className="text-[11px] uppercase tracking-widest font-mono">Up Level</span>
            </div>
          )}

          {folderData?.items.map((item) => (
            <div 
              key={item.path}
              className={`flex items-center px-6 py-1.5 cursor-pointer group hover:bg-white/[0.02] transition-all border-l-2 border-transparent ${
                selectedPhotos.has(item.path) || (item.type === 'dir' && currentPath === item.path) ? "bg-[var(--accent-soft)] border-[var(--accent)]" : ""
              }`}
              onClick={() => item.type === "dir" ? setCurrentPath(item.path) : toggleSelect(item.path)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {item.type === "dir" ? (
                  <>
                    <svg className="w-4 h-4 text-gray-600 group-hover:text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <span className={`text-[13px] truncate ${selectedPhotos.has(item.path) ? "text-[var(--accent)]" : "text-gray-300"}`}>{item.name}</span>
                  </>
                ) : (
                  <>
                    <img src={getImageUrl(item.path)} alt={item.name} className="w-5 h-5 object-cover rounded shadow-inner bg-gray-900 border border-white/5" />
                    <span className={`text-[13px] truncate ${selectedPhotos.has(item.path) ? "text-[var(--accent)]" : "text-gray-500"}`}>{item.name}</span>
                  </>
                )}
              </div>

              {item.type === "dir" ? (
                <button 
                  onClick={(e) => { e.stopPropagation(); selectFolder(item.path); }}
                  className="opacity-0 group-hover:opacity-100 px-2 py-0.5 border border-[var(--accent)]/30 text-[var(--accent)] font-mono text-[9px] uppercase tracking-tighter hover:bg-[var(--accent)] hover:text-black transition-all rounded"
                >
                  Select All
                </button>
              ) : (
                <div className={`w-3.5 h-3.5 rounded-sm border transition-all ${
                  selectedPhotos.has(item.path) ? "bg-[var(--accent)] border-[var(--accent)]" : "border-white/10 group-hover:border-white/30"
                } flex items-center justify-center`}>
                  {selectedPhotos.has(item.path) && <span className="text-black text-[10px] font-bold">✓</span>}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-[var(--border)] flex justify-between items-center text-[10px] font-mono uppercase tracking-[0.2em] text-gray-600">
           <span>{selectedPhotos.size} STASHED</span>
           <button onClick={handleLogout} className="hover:text-red-400 transition-colors">Term Session</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-12 py-10 space-y-12">
        
        {/* Section 1: Public Access */}
        <section>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6">Public Access</div>
          <div className="border border-[var(--border)] p-8 rounded-2xl flex items-center justify-between group hover:border-white/20 transition-all">
             <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">Public Gallery Root</label>
                <div className="text-lg font-light text-white tracking-tight flex items-center gap-3">
                  {typeof window !== 'undefined' ? window.location.origin : ""}
                  <a href="/" target="_blank" className="text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </div>
             </div>
             <div className="w-24 h-24 bg-white p-2 rounded-xl">
                <img 
                  src={`/api/qr?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : "")}`}
                  alt="QR Code for public gallery"
                  className="w-full h-full object-contain"
                />
             </div>
          </div>
        </section>

        {/* Section 2: Bundle Creator */}
        <section>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6">Bundle Creator</div>
          <div className="border border-[var(--border)] p-8 rounded-2xl space-y-8">
            
            {/* Selection Grid Preview */}
            <div className="space-y-4">
              <label className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">Selected Stash ({selectedPhotos.size})</label>
              <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-2 min-h-[40px]">
                {Array.from(selectedPhotos).slice(0, 30).map(path => (
                  <div key={path} className="aspect-square bg-gray-900 rounded-lg overflow-hidden border border-white/5 relative group">
                    <img src={getImageUrl(path)} alt="Selected photo thumbnail" className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all" />
                    <button 
                      onClick={() => toggleSelect(path)}
                      className="absolute inset-0 bg-red-500/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {selectedPhotos.size > 30 && (
                  <div className="aspect-square bg-white/5 rounded-lg flex items-center justify-center text-[10px] font-mono text-gray-500">
                    +{selectedPhotos.size - 30}
                  </div>
                )}
                {selectedPhotos.size === 0 && (
                  <div className="col-span-full py-8 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center text-[11px] uppercase tracking-widest text-gray-700 font-mono">
                    No items selected in core browser
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-end">
              <div className="flex-1 space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-[var(--text-secondary)]">Bundle Name</label>
                <input 
                  type="text" 
                  value={bundleName}
                  onChange={(e) => setBundleName(e.target.value)}
                  placeholder="E.G. SUMMER_GALA_RECAP"
                  className="w-full bg-white/[0.03] border border-[var(--border)] rounded-xl px-4 py-3 text-sm font-mono tracking-wider focus:border-[var(--accent)]/50 focus:bg-white/[0.05] outline-none transition-all"
                />
              </div>
              <button 
                onClick={createBundle}
                disabled={selectedPhotos.size === 0 || !bundleName || isCreating}
                className="px-10 py-4 bg-gradient-to-r from-[var(--accent)] to-[#6366f1] text-white font-mono text-[11px] font-bold uppercase tracking-[0.2em] rounded hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale disabled:cursor-not-allowed"
              >
                {isCreating ? "CORE_PROCESSING..." : "GENERATE_BUNDLE"}
              </button>
            </div>
          </div>
        </section>

        {/* Section 3: Output */}
        <section className={`transition-all duration-700 ${createdBundle ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"}`}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] mb-6">Output Terminal</div>
          <div className="border border-[var(--border)] p-10 rounded-2xl flex flex-col md:flex-row gap-12 items-center">
             <div className="w-56 h-56 bg-white p-4 rounded-2xl border border-white/20">
                {createdBundle && (
                  <img 
                    src={`/api/qr?url=${encodeURIComponent(window.location.origin + createdBundle.url)}`}
                    alt="QR Code for bundle"
                    className="w-full h-full"
                  />
                )}
             </div>
             <div className="flex-1 space-y-6">
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-1">
                      <div className="text-[10px] text-gray-600 uppercase tracking-widest">Bundle ID</div>
                      <div className="font-mono text-sm text-[var(--accent)]">{createdBundle?.id}</div>
                   </div>
                   <div className="space-y-1">
                      <div className="text-[10px] text-gray-600 uppercase tracking-widest">Status</div>
                      <div className="font-mono text-sm text-green-400">ENCRYPTED_ONLINE</div>
                   </div>
                </div>
                <div className="space-y-2">
                   <div className="text-[10px] text-gray-600 uppercase tracking-widest">Direct Link</div>
                   <div className="bg-black/40 border border-[var(--border)] p-3 rounded-xl font-mono text-xs text-gray-400 break-all select-all">
                      {createdBundle ? window.location.origin + createdBundle.url : ""}
                   </div>
                </div>
                <button className="text-[11px] uppercase tracking-widest text-[var(--accent)] hover:underline">
                   Push to Production Gateway →
                </button>
             </div>
          </div>
        </section>

      </main>
    </main>
  );
}
