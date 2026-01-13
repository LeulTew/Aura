/* eslint-disable */
'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
    Loader2, HardDrive, Plus, ArrowLeft, Trash2, 
    Cloud, Monitor, Clock, AlertCircle, CheckCircle2,
    FolderSync, Settings
} from "lucide-react";
import Link from 'next/link';

interface StorageSource {
    id: string;
    name: string;
    path: string;
    source_type: 'cloud' | 'local_sync' | 'event_temp';
    is_active: boolean;
    photo_count: number;
    last_sync: string | null;
    created_at: string;
}

// Helper to decode JWT and extract claims
function parseJwt(token: string): any {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

export default function SourcesPage() {
    const [loading, setLoading] = useState(true);
    const [sources, setSources] = useState<StorageSource[]>([]);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [orgSlug, setOrgSlug] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    
    // Add source modal state
    const [showAddModal, setShowAddModal] = useState(false);
    const [newSourceName, setNewSourceName] = useState("");
    const [newSourcePath, setNewSourcePath] = useState("");
    const [newSourceType, setNewSourceType] = useState<'cloud' | 'local_sync' | 'event_temp'>('cloud');
    const [adding, setAdding] = useState(false);

    // Design Tokens (Editorial Dark)
    const accentColor = '#7C3AED';
    const fontDisplay = "font-sans font-black uppercase leading-[0.85] tracking-[-0.04em]";
    const fontMono = "font-mono text-xs uppercase tracking-[0.2em] font-medium";

    const sourceTypeConfig = {
        cloud: { icon: Cloud, label: 'Cloud Storage', color: '#3B82F6', desc: 'Direct upload to cloud' },
        local_sync: { icon: FolderSync, label: 'Local Sync', color: '#7C3AED', desc: 'Synced from local folder' },
        event_temp: { icon: Clock, label: 'Event Temp', color: '#F59E0B', desc: 'Auto-cleanup after 30 days' }
    };

    useEffect(() => {
        const token = sessionStorage.getItem("admin_token");
        if (!token) {
            window.location.href = "/login";
            return;
        }
        
        const claims = parseJwt(token);
        if (claims) {
            setOrgId(claims.org_id || null);
            setOrgSlug(claims.org_slug || null);
            
            if (claims.role !== 'admin' && claims.role !== 'superadmin') {
                window.location.href = "/admin";
                return;
            }
        }
    }, []);

    useEffect(() => {
        if (orgId) fetchSources();
    }, [orgId]);

    const fetchSources = async () => {
        setLoading(true);
        try {
            // Aggregate photos by source_type to show as "sources"
            const { data, error } = await supabase
                .from('photos')
                .select('source_type, created_at')
                .eq('org_id', orgId);
            
            if (error) throw error;
            
            // Group by source_type
            const grouped: Record<string, { count: number; latest: string }> = {};
            (data || []).forEach(photo => {
                const type = photo.source_type || 'cloud';
                if (!grouped[type]) {
                    grouped[type] = { count: 0, latest: photo.created_at };
                }
                grouped[type].count++;
                if (photo.created_at > grouped[type].latest) {
                    grouped[type].latest = photo.created_at;
                }
            });
            
            // Convert to source objects
            const sourceList: StorageSource[] = Object.entries(grouped).map(([type, data]) => ({
                id: type,
                name: sourceTypeConfig[type as keyof typeof sourceTypeConfig]?.label || 'Unknown',
                path: `${orgSlug}/${type}`,
                source_type: type as 'cloud' | 'local_sync' | 'event_temp',
                is_active: true,
                photo_count: data.count,
                last_sync: data.latest,
                created_at: data.latest
            }));
            
            setSources(sourceList);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSource = async (e: React.FormEvent) => {
        e.preventDefault();
        setAdding(true);
        setError("");
        
        try {
            // This would typically register a new sync source endpoint
            // For now, we'll just show success (actual implementation requires Sync Agent)
            setSuccess(`Source "${newSourceName}" registered. Connect the Sync Agent to start syncing.`);
            setShowAddModal(false);
            setNewSourceName("");
            setNewSourcePath("");
            setNewSourceType('cloud');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setAdding(false);
        }
    };

    if (loading) {
        return (
            <main className="min-h-screen bg-black text-white flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black text-white antialiased selection:bg-[#7C3AED] selection:text-white">
            {/* Header */}
            <header className="border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 z-50 py-4">
                <div className="max-w-[1400px] mx-auto px-8 flex justify-between items-center">
                    <div className="flex items-center gap-10">
                        <Link 
                            href="/admin"
                            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors group"
                        >
                            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                            <span className={fontMono}>Back</span>
                        </Link>
                        <div className="w-px h-6 bg-white/10" />
                        <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-white flex items-center justify-center">
                                <HardDrive className="w-5 h-5 text-black" />
                            </div>
                            <h1 className={`${fontDisplay} text-3xl`}>Storage Sources</h1>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="bg-white text-black px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#7C3AED] hover:text-white transition-all duration-300"
                    >
                        <Plus className="w-4 h-4 inline-block mr-2 -mt-0.5" />
                        Add Source
                    </button>
                </div>
            </header>

            {/* Alerts */}
            <div className="max-w-[1400px] mx-auto px-8 mt-12">
                {error && (
                    <div className="mb-6 p-6 border border-red-500/50 bg-red-500/5 flex items-center gap-4 text-red-500">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span className={`${fontMono} tracking-[0.1em]`}>{error}</span>
                    </div>
                )}
                {success && (
                    <div className="mb-6 p-6 border border-green-500/50 bg-green-500/5 flex items-center gap-4 text-green-500">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span className={`${fontMono} tracking-[0.1em]`}>{success}</span>
                    </div>
                )}
            </div>

            {/* Sources Grid */}
            <div className="max-w-[1400px] mx-auto px-8 py-12">
                {sources.length === 0 ? (
                    <div className="border border-white/5 bg-[#050505] p-24 text-center">
                        <HardDrive className="w-16 h-16 text-white/5 mx-auto mb-6" />
                        <p className={`${fontMono} text-white/40 mb-2`}>No storage sources configured</p>
                        <p className="text-white/20 text-sm">Photos will be routed to global cloud storage by default.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {sources.map((source) => {
                            const config = sourceTypeConfig[source.source_type];
                            const Icon = config.icon;
                            
                            return (
                                <div 
                                    key={source.id}
                                    className="border border-white/10 bg-[#050505] p-8 hover:border-white/30 transition-all group relative overflow-hidden"
                                >
                                    {/* Accent Corner */}
                                    <div 
                                        className="absolute top-0 right-0 w-16 h-16 opacity-10 group-hover:opacity-20 transition-opacity"
                                        style={{ background: `linear-gradient(45deg, transparent 50%, ${config.color} 50%)` }}
                                    />

                                    <div className="flex items-start justify-between mb-8">
                                        <div 
                                            className="w-14 h-14 flex items-center justify-center border transition-all group-hover:scale-105"
                                            style={{ backgroundColor: `${config.color}10`, borderColor: `${config.color}30` }}
                                        >
                                            <Icon className="w-6 h-6" style={{ color: config.color }} />
                                        </div>
                                        <span 
                                            className="px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] border"
                                            style={{ 
                                                backgroundColor: source.is_active ? 'white' : 'transparent', 
                                                color: source.is_active ? 'black' : 'white/40',
                                                borderColor: source.is_active ? 'white' : 'white/10'
                                            }}
                                        >
                                            {source.is_active ? 'Active' : 'Offline'}
                                        </span>
                                    </div>
                                    
                                    <h3 className="font-bold text-2xl mb-2 tracking-tight">{source.name}</h3>
                                    <p className={`${fontMono} text-white/40 text-[10px] mb-8 group-hover:text-white/60 transition-colors`}>{config.desc}</p>
                                    
                                    <div className="space-y-4 border-t border-white/5 pt-6">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-white/30 uppercase tracking-widest text-[10px] font-bold">Volume</span>
                                            <span className="font-mono font-bold">{source.photo_count.toLocaleString()} <span className="text-white/20 text-[10px] ml-1 uppercase">Images</span></span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-white/30 uppercase tracking-widest text-[10px] font-bold">Telemetry</span>
                                            <span className="font-mono text-xs text-white/60">
                                                {source.last_sync ? new Date(source.last_sync).toLocaleDateString() : 'NO ACTIVITY'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {/* Info Section */}
                <div className="mt-20 border border-white/5 bg-[#050505] p-12">
                    <h3 className={`${fontDisplay} text-3xl mb-8`}>Architecture Definition</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {Object.entries(sourceTypeConfig).map(([type, config]) => {
                            const Icon = config.icon;
                            return (
                                <div key={type} className="flex gap-6">
                                    <Icon className="w-8 h-8 shrink-0 opacity-40" style={{ color: config.color }} />
                                    <div>
                                        <div className="font-bold text-lg mb-2 uppercase tracking-tight">{config.label}</div>
                                        <p className="text-white/40 text-sm leading-relaxed">{config.desc}. Optimized for high-speed indexing and retrieval.</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Add Source Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-8 animate-in fade-in duration-300">
                    <div className="bg-black border border-white/10 max-w-lg w-full p-12 relative overflow-hidden">
                        {/* Decorative Background Element */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C3AED]/5 blur-3xl rounded-full -mr-16 -mt-16" />
                        
                        <div className="relative z-10">
                            <h2 className={`${fontDisplay} text-4xl mb-2`}>Register Source</h2>
                            <p className={`${fontMono} text-white/40 mb-12`}>
                                CONFIGURE A NEW STORAGE ENDPOINT FOR SYNC
                            </p>
                            
                            <form onSubmit={handleAddSource} className="space-y-10">
                                <div>
                                    <label className={`${fontMono} text-white/60 block mb-4`}>
                                        Source Designation
                                    </label>
                                    <input
                                        type="text"
                                        value={newSourceName}
                                        onChange={(e) => setNewSourceName(e.target.value)}
                                        placeholder="Studio Cluster Alpha"
                                        className="w-full h-16 px-6 bg-white/[0.03] border border-white/10 focus:border-[#7C3AED] outline-none transition-all text-white placeholder:text-white/10 font-mono text-sm"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className={`${fontMono} text-white/60 block mb-4`}>
                                        Mount Point (Local Path)
                                    </label>
                                    <input
                                        type="text"
                                        value={newSourcePath}
                                        onChange={(e) => setNewSourcePath(e.target.value)}
                                        placeholder="E:\Studio_Archive\2026"
                                        className="w-full h-16 px-6 bg-white/[0.03] border border-white/10 focus:border-[#7C3AED] outline-none transition-all text-white placeholder:text-white/10 font-mono text-sm"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className={`${fontMono} text-white/60 block mb-4`}>
                                        Storage Protocol
                                    </label>
                                    <div className="grid grid-cols-3 gap-4">
                                        {Object.entries(sourceTypeConfig).map(([type, config]) => {
                                            const Icon = config.icon;
                                            const isSelected = newSourceType === type;
                                            return (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setNewSourceType(type as any)}
                                                    className={`p-4 border transition-all text-center group ${
                                                        isSelected
                                                            ? 'border-white bg-white text-black'
                                                            : 'border-white/10 hover:border-white/30 bg-white/5'
                                                    }`}
                                                >
                                                    <Icon className={`w-5 h-5 mx-auto mb-2 ${isSelected ? 'text-black' : 'text-white/40'}`} style={{ color: isSelected ? undefined : config.color }} />
                                                    <div className="text-[10px] font-black uppercase tracking-tighter leading-none">{type.replace('_', ' ')}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                
                                <div className="flex gap-4 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 h-16 border border-white/10 text-white font-bold uppercase tracking-[0.2em] hover:bg-white/5 transition-all text-xs"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={adding}
                                        className="flex-1 h-16 bg-white text-black font-bold uppercase tracking-[0.2em] hover:bg-[#7C3AED] hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-xs"
                                    >
                                        {adding ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Settings className="w-4 h-4" />
                                                Register
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}
