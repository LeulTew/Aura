"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

  // Load token on mount
  useEffect(() => {
    const t = sessionStorage.getItem("admin_token");
    if (t) setToken(t);
  }, []);

  // Fetch folder data
  useEffect(() => {
    if (!token) return;
    setPathInput(currentPath); // Sync input when path changes (e.g. clicking folder)
    fetch(`/api/admin/folders?path=${encodeURIComponent(currentPath)}`)
      .then(res => res.json())
      .then(data => setFolderData(data))
      .catch(err => console.error(err));
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
  };

  if (!token) {
    return (
      <main className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm bg-[#111] p-8 rounded-2xl border border-white/10 shadow-2xl">
          <h1 className="text-2xl font-light text-center mb-8 tracking-widest uppercase text-white/80">Admin Access</h1>
          <input
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-full bg-black/50 border border-white/20 rounded px-4 py-3 text-center text-xl tracking-[0.5em] mb-4 focus:border-[var(--accent)] outline-none transition-colors"
            autoFocus
          />
          <button type="submit" className="w-full py-3 bg-[var(--accent)] text-black font-bold uppercase tracking-wider rounded hover:opacity-90 transition-opacity">
            Access
          </button>
          {error && <p className="text-red-400 text-center mt-4 text-xs font-mono">{error}</p>}
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--bg)] p-4 md:p-8">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
        <h1 className="text-xl md:text-2xl font-light uppercase tracking-widest text-white/90">
          Aura <span className="text-[var(--accent)] font-bold">Admin</span>
        </h1>
        <button onClick={handleLogout} className="text-xs font-mono text-red-400 hover:text-red-300 uppercase">
          Logout
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-150px)]">
        
        {/* Left: File Browser */}
        <div className="lg:col-span-2 bg-[#111] rounded-xl border border-white/10 overflow-hidden flex flex-col">
          <div className="p-4 bg-white/5 border-b border-white/10 flex gap-2 items-center font-mono text-xs">
            <button onClick={() => setCurrentPath(folderData?.parent || "/")} disabled={!folderData?.parent} className="hover:text-[var(--accent)] disabled:opacity-30 px-2 py-1">
              ⬆ UP
            </button>
            <form 
              className="flex-1"
              onSubmit={(e) => {
                e.preventDefault();
                setCurrentPath(pathInput);
              }}
            >
               <input 
                type="text" 
                value={pathInput}
                onChange={(e) => setPathInput(e.target.value)}
                className="w-full bg-transparent text-gray-400 focus:text-[var(--accent)] outline-none font-mono"
              />
            </form>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {folderData?.items.map((item) => (
              <div 
                key={item.path}
                onClick={() => item.type === "dir" ? setCurrentPath(item.path) : null}
                className={`flex items-center gap-3 p-3 rounded mb-1 cursor-pointer transition-colors ${
                  item.type === "dir" ? "hover:bg-white/5 text-[var(--accent)]" : "hover:bg-white/5 text-gray-300"
                }`}
              >
                <span className="text-lg">{item.type === "dir" ? "📁" : "📄"}</span>
                <span className="font-mono text-sm truncate flex-1">{item.name}</span>
                
                {item.type === "file" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const newSet = new Set(selectedPhotos);
                      if (newSet.has(item.path)) newSet.delete(item.path);
                      else newSet.add(item.path);
                      setSelectedPhotos(newSet);
                    }}
                    className={`ml-2 w-5 h-5 border rounded flex items-center justify-center ${
                      selectedPhotos.has(item.path) ? "bg-[var(--accent)] border-[var(--accent)] text-black" : "border-white/30"
                    }`}
                  >
                    {selectedPhotos.has(item.path) && "✓"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Bundle Creator */}
        <div className="bg-[#111] rounded-xl border border-white/10 p-6 flex flex-col">
          <h2 className="text-lg font-light uppercase tracking-wide mb-6 border-b border-white/10 pb-2">Bundle Creator</h2>
          
          <div className="flex-1">
            <div className="mb-6">
              <label className="block text-xs font-mono text-gray-400 mb-2 uppercase">Selected Photos</label>
              <div className="text-3xl font-bold text-[var(--accent)]">
                {selectedPhotos.size}
              </div>
            </div>

            <div className="mb-8">
              <label className="block text-xs font-mono text-gray-400 mb-2 uppercase">Bundle Name</label>
              <input 
                type="text" 
                value={bundleName}
                onChange={(e) => setBundleName(e.target.value)}
                placeholder="e.g. Vacation 2024"
                className="w-full bg-black/50 border border-white/20 rounded px-4 py-2 text-sm focus:border-[var(--accent)] outline-none text-white"
              />
            </div>

            <button
              onClick={createBundle}
              disabled={selectedPhotos.size === 0 || !bundleName}
              className="w-full py-3 bg-[var(--accent)] text-black font-bold uppercase tracking-wider rounded disabled:opacity-50 hover:opacity-90 transition-opacity"
            >
              Generate Bundle
            </button>
          </div>

          {/* Result / QR */}
          {createdBundle && (
            <div className="mt-8 pt-8 border-t border-white/10 text-center animate-fade-in">
              <p className="text-xs font-mono text-green-400 mb-4 uppercase">Bundle Created Successfully!</p>
              
              <div className="bg-white p-4 rounded-lg inline-block mb-4">
                 {/* QR Code calling backend */}
                 <img 
                   src={`/api/qr?url=${encodeURIComponent(window.location.origin + createdBundle.url)}`}
                   alt="QR Code"
                   className="w-48 h-48"
                 />
              </div>
              
              <p className="font-mono text-[10px] text-gray-500 break-all select-all">
                {window.location.origin + createdBundle.url}
              </p>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
