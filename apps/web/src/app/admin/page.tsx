/* eslint-disable */
'use client';

import { useState, useEffect, useCallback, useRef } from "react";
import VoidBackground from "@/components/VoidBackground";
import { supabase } from "@/lib/supabase";
import { Loader2, Upload, Trash2, RefreshCw, AlertCircle, CheckCircle2, Image as ImageIcon, ArrowLeft } from "lucide-react";
import Link from 'next/link';

interface PhotoRecord {
  id: string;
  full_path: string;
  created_at: string;
  metadata?: any;
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Dashboard State
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [deletionId, setDeletionId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load token
  useEffect(() => {
    const t = sessionStorage.getItem("admin_token");
    if (t) {
        setToken(t);
        // Only fetch photos if token exists to avoid unnecessary calls
    }
  }, []);

  // Fetch only when token is resolved
  useEffect(() => {
    if (token) fetchPhotos();
  }, [token]);

  const fetchPhotos = async () => {
    setLoading(true);
    try {
        const { data, error } = await supabase
            .from('photos')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        setPhotos(data || []);
    } catch (err: any) {
        console.error("Fetch error:", err);
        setError(err.message);
    } finally {
        setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const res = await fetch(`${backendUrl}/api/admin/login`, {
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
          setError("Access Denied: Invalid PIN");
        }
    } catch (err) {
        setError("Connection failed");
    } finally {
        setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    sessionStorage.removeItem("admin_token");
    setPhotos([]);
  };

  // Upload Logic
  const processUpload = async (file: File) => {
    setIsUploading(true);
    setUploadStatus("Initializing upload stream...");
    setUploadProgress(10);

    try {
        // 1. Upload to Supabase Storage
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `uploads/${fileName}`;

        setUploadStatus("Pushing binary to cloud...");
        const { error: uploadError } = await supabase.storage
            .from('photos')
            .upload(filePath, file);

        if (uploadError) throw uploadError;
        setUploadProgress(50);

        // 2. Trigger Backend Indexing (Generates Embedding & DB Record)
        setUploadStatus("Vectorizing face data...");
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('path', filePath); // Backend needs this to store refernece
        formData.append('metadata', JSON.stringify({
            original_name: file.name,
            size: file.size,
            type: file.type,
            uploaded_by: 'admin_panel'
        }));

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
        const indexRes = await fetch(`${backendUrl}/api/index-photo`, {
            method: 'POST',
            body: formData
        });

        if (!indexRes.ok) {
            const errData = await indexRes.json();
            throw new Error(errData.detail || "Indexing failed");
        }
        
        const indexData = await indexRes.json();
        setUploadProgress(100);
        setUploadStatus(`Indexed: ${indexData.faces_found || 1} face(s) found`);
        
        // Refresh Grid
        await fetchPhotos();
        
        // Reset after delay
        setTimeout(() => {
            setIsUploading(false);
            setUploadStatus("");
            setUploadProgress(0);
        }, 2000);

    } catch (err: any) {
        console.error("Upload failed:", err);
        setError(`Upload Failed: ${err.message}`);
        setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processUpload(e.dataTransfer.files[0]);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDelete = async (id: string, path: string) => {
    if (!confirm("Are you sure? This effectively removes the photo from search.")) return;
    setDeletionId(id);
    
    try {
        // 1. Delete from DB
        const { error: dbError } = await supabase
            .from('photos')
            .delete()
            .eq('id', id);
            
        if (dbError) throw dbError;

        // 2. Delete from Storage (Optional, good hygiene)
        if (path) {
            await supabase.storage.from('photos').remove([path]);
        }

        // Refresh
        setPhotos(prev => prev.filter(p => p.id !== id));
    } catch (err: any) {
        alert("Delete failed: " + err.message);
    } finally {
        setDeletionId(null);
    }
  };
  
  // Signed URL Helper
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const generateUrls = async () => {
        const newUrls: Record<string, string> = {};
        for (const p of photos) {
            if (!imageUrls[p.full_path]) {
                const { data } = await supabase.storage.from('photos').createSignedUrl(p.full_path, 3600);
                if (data?.signedUrl) newUrls[p.full_path] = data.signedUrl;
            }
        }
        if (Object.keys(newUrls).length > 0) {
            setImageUrls(prev => ({ ...prev, ...newUrls }));
        }
    };
    if (photos.length > 0) generateUrls();
  }, [photos]);

  if (!token) {
    return (
      <main className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <VoidBackground />
        
        <form onSubmit={handleLogin} className="w-full max-w-md backdrop-blur-3xl bg-white/[0.02] p-12 rounded-[32px] border border-white/10 z-10 hover:border-white/20 transition-all shadow-2xl">
          <div className="flex flex-col items-center mb-12">
            <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent)] to-[#6366f1] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
              <Upload className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-light text-white tracking-[0.2em] uppercase">Cloud Terminal</h1>
            <p className="text-white/30 font-mono text-[10px] mt-3 tracking-widest uppercase">Aura Intelligent Core v2</p>
          </div>

          <div className="space-y-8">
            <div className="relative group">
              <input
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                className="w-full bg-black/40 border-2 border-white/5 rounded-2xl px-6 py-5 text-center text-4xl tracking-[0.6em] font-mono focus:border-[var(--accent)]/50 focus:bg-black/60 outline-none transition-all placeholder:text-white/5 text-white"
                autoFocus
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full h-16 bg-white text-black font-mono text-xs font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-gray-100 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Authenticate"}
            </button>
          </div>

          {error && (
            <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-xs font-mono">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          
          <div className="mt-12 text-center">
             <Link href="/" className="text-white/20 text-[10px] uppercase tracking-widest hover:text-white transition-colors">
                ← Return to Surface
             </Link>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white font-sans relative">
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
          <VoidBackground />
      </div>

      {/* Header */}
      <header className="fixed top-0 w-full z-50 px-8 py-6 bg-black/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <Link href="/" className="w-10 h-10 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg flex items-center justify-center hover:bg-[var(--accent)]/20 transition-colors">
                <ArrowLeft className="w-5 h-5 text-[var(--accent)]" />
            </Link>
            <div>
                <h1 className="text-sm font-bold uppercase tracking-widest text-white">Upload Command Center</h1>
                <p className="text-[10px] text-white/40 font-mono mt-0.5 tracking-wider">{photos.length} OBJECTS INDEXED</p>
            </div>
         </div>
         <div className="flex items-center gap-4">
             <button onClick={() => fetchPhotos()} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors">
                 <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
             </button>
             <button onClick={handleLogout} className="px-4 py-2 border border-white/10 text-white/40 text-[10px] font-mono uppercase tracking-widest hover:bg-white/5 hover:text-white rounded transition-all">
                 Terminate
             </button>
         </div>
      </header>

      <div className="relative z-10 pt-32 px-6 pb-20 max-w-7xl mx-auto space-y-12">
      
         {/* Upload Zone */}
         <section>
            <div 
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={`relative h-64 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all group overflow-hidden ${
                    isUploading ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-white/10 hover:border-white/30 hover:bg-white/[0.02]'
                }`}
            >
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={(e) => e.target.files?.[0] && processUpload(e.target.files[0])}
                    accept="image/*"
                />
                
                {isUploading ? (
                   <div className="flex flex-col items-center gap-4 z-10">
                      <Loader2 className="w-10 h-10 text-[var(--accent)] animate-spin" />
                      <div className="text-center">
                          <p className="text-[var(--accent)] font-mono text-xs uppercase tracking-widest mb-2">{uploadStatus}</p>
                          <div className="w-64 h-1 bg-black/20 rounded-full overflow-hidden">
                             <div className="h-full bg-[var(--accent)] transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                          </div>
                      </div>
                   </div>
                ) : (
                   <>
                      <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/5 group-hover:border-[var(--accent)]/30">
                          <Upload className="w-8 h-8 text-white/40 group-hover:text-[var(--accent)] transition-colors" />
                      </div>
                      <h3 className="text-lg font-light text-white tracking-widest uppercase">Drop Source Material</h3>
                      <p className="text-white/30 font-mono text-xs mt-2 uppercase tracking-wider">or click to initialize stream</p>
                   </>
                )}
                
                {/* Decoration */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />
            </div>
         </section>

         {/* Grid */}
         <section>
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-white/50">Database Matrix</h2>
            </div>
            
            {photos.length === 0 && !loading ? (
                <div className="py-20 text-center border border-white/5 rounded-2xl bg-white/[0.01]">
                    <ImageIcon className="w-10 h-10 text-white/10 mx-auto mb-4" />
                    <p className="text-white/20 font-mono text-xs uppercase tracking-widest">No vectors found</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {photos.map((p) => (
                        <div key={p.id} className="relative aspect-[3/4] group bg-gray-900 rounded-xl overflow-hidden border border-white/5">
                            <img 
                                src={imageUrls[p.full_path] || `https://placehold.co/400x600/101010/FFF?text=Loading`} 
                                alt="" 
                                className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500"
                            />
                            
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] font-mono text-white/50 truncate w-24">{p.id.slice(0,8)}</p>
                                        <p className="text-[9px] font-mono text-[var(--accent)] mt-0.5">VECTORIZED</p>
                                    </div>
                                    <button 
                                        onClick={() => handleDelete(p.id, p.full_path)}
                                        className="w-8 h-8 flex items-center justify-center bg-red-500/20 hover:bg-red-500 text-red-500 hover:text-white rounded transition-colors"
                                    >
                                        {deletionId === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
         </section>
      </div>
    </main>
  );
}
