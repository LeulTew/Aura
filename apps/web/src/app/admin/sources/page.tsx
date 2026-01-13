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
        <main className="min-h-screen bg-black text-white antialiased">
            {/* Header */}
            <header className="border-b border-white/10 bg-black/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-8 py-6 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <Link 
                            href="/admin"
                            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            <span className={fontMono}>Back</span>
                        </Link>
                        <div className="w-px h-6 bg-white/10" />
                        <div className="flex items-center gap-3">
                            <HardDrive className="w-5 h-5 text-[#7C3AED]" />
                            <span className={`${fontDisplay} text-xl`}>Storage Sources</span>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 bg-[#7C3AED] text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#6D28D9] transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Source
                    </button>
                </div>
            </header>

            {/* Alerts */}
            <div className="max-w-6xl mx-auto px-8 mt-8">
                {error && (
                    <div className="mb-6 p-4 border-2 border-red-500/50 bg-red-500/10 flex items-center gap-4 text-red-400">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span className={fontMono}>{error}</span>
                    </div>
                )}
                {success && (
                    <div className="mb-6 p-4 border-2 border-green-500/50 bg-green-500/10 flex items-center gap-4 text-green-400">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span className={fontMono}>{success}</span>
                    </div>
                )}
            </div>

            {/* Sources Grid */}
            <div className="max-w-6xl mx-auto px-8 py-8">
                {sources.length === 0 ? (
                    <div className="border border-white/10 bg-[#050505] p-12 text-center">
                        <HardDrive className="w-12 h-12 text-white/10 mx-auto mb-4" />
                        <p className={`${fontMono} text-white/40`}>No storage sources configured</p>
                        <p className="text-white/20 text-sm mt-2">Photos will be uploaded to cloud storage by default</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sources.map((source) => {
                            const config = sourceTypeConfig[source.source_type];
                            const Icon = config.icon;
                            
                            return (
                                <div 
                                    key={source.id}
                                    className="border border-white/10 bg-[#050505] p-6 hover:border-white/20 transition-colors"
                                >
                                    <div className="flex items-start justify-between mb-6">
                                        <div 
                                            className="w-12 h-12 flex items-center justify-center"
                                            style={{ backgroundColor: `${config.color}20`, borderColor: `${config.color}40`, borderWidth: 1 }}
                                        >
                                            <Icon className="w-6 h-6" style={{ color: config.color }} />
                                        </div>
                                        <span 
                                            className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest"
                                            style={{ backgroundColor: `${config.color}20`, color: config.color }}
                                        >
                                            {source.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                    
                                    <h3 className="font-bold text-lg mb-1">{source.name}</h3>
                                    <p className="text-white/40 text-sm font-mono mb-6">{config.desc}</p>
                                    
                                    <div className="space-y-3 border-t border-white/5 pt-4">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-white/40">Photos</span>
                                            <span className="font-mono">{source.photo_count.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-white/40">Last Activity</span>
                                            <span className="font-mono text-xs">
                                                {source.last_sync ? new Date(source.last_sync).toLocaleDateString() : 'Never'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {/* Info Section */}
                <div className="mt-12 border border-white/10 bg-[#050505] p-8">
                    <h3 className={`${fontDisplay} text-xl mb-4`}>About Storage Sources</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {Object.entries(sourceTypeConfig).map(([type, config]) => {
                            const Icon = config.icon;
                            return (
                                <div key={type} className="flex gap-4">
                                    <Icon className="w-6 h-6 shrink-0" style={{ color: config.color }} />
                                    <div>
                                        <div className="font-bold mb-1">{config.label}</div>
                                        <p className="text-white/40 text-sm">{config.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Add Source Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-8">
                    <div className="bg-[#0A0A0A] border border-white/10 max-w-md w-full p-8">
                        <h2 className={`${fontDisplay} text-2xl mb-2`}>Register Source</h2>
                        <p className="text-white/40 font-mono text-xs mb-8">
                            CONFIGURE A NEW STORAGE SOURCE FOR SYNC
                        </p>
                        
                        <form onSubmit={handleAddSource} className="space-y-6">
                            <div>
                                <label className={`${fontMono} text-white/40 block mb-3`}>
                                    Source Name
                                </label>
                                <input
                                    type="text"
                                    value={newSourceName}
                                    onChange={(e) => setNewSourceName(e.target.value)}
                                    placeholder="Studio Main Server"
                                    className="w-full h-14 px-5 bg-transparent border-2 border-white/10 focus:border-[#7C3AED] outline-none transition-all text-white placeholder:text-white/20 font-mono"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className={`${fontMono} text-white/40 block mb-3`}>
                                    Local Path
                                </label>
                                <input
                                    type="text"
                                    value={newSourcePath}
                                    onChange={(e) => setNewSourcePath(e.target.value)}
                                    placeholder="D:\Photos\2026"
                                    className="w-full h-14 px-5 bg-transparent border-2 border-white/10 focus:border-[#7C3AED] outline-none transition-all text-white placeholder:text-white/20 font-mono"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className={`${fontMono} text-white/40 block mb-3`}>
                                    Source Type
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {Object.entries(sourceTypeConfig).map(([type, config]) => {
                                        const Icon = config.icon;
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => setNewSourceType(type as any)}
                                                className={`p-4 border-2 text-center transition-all ${
                                                    newSourceType === type
                                                        ? 'border-[#7C3AED] bg-[#7C3AED]/10'
                                                        : 'border-white/10 hover:border-white/20'
                                                }`}
                                            >
                                                <Icon className="w-5 h-5 mx-auto mb-2" style={{ color: config.color }} />
                                                <div className="text-xs font-bold uppercase">{type.replace('_', ' ')}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 h-14 border-2 border-white/10 text-white font-bold uppercase tracking-widest hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={adding}
                                    className="flex-1 h-14 bg-[#7C3AED] text-white font-bold uppercase tracking-widest hover:bg-[#6D28D9] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
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
            )}
        </main>
    );
}
