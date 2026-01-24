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
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-gray-200 dark:border-white/5">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight font-sans">Storage Sources</h1>
                    <p className="text-gray-500 dark:text-white/40 text-sm mt-1 font-mono uppercase tracking-wider">Configure Ingest Pipelines</p>
                </div>
                
                <button
                    onClick={() => setShowAddModal(true)}
                    className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-2 rounded-xl"
                >
                    <Plus className="w-4 h-4" />
                    Add Source
                </button>
            </div>

            {/* Alerts */}
            <div className="space-y-4">
                {error && (
                    <div className="p-4 border border-red-500/20 bg-red-500/5 flex items-center gap-4 text-red-500 rounded-xl">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span className="font-mono text-xs">{error}</span>
                    </div>
                )}
                {success && (
                    <div className="p-4 border border-green-500/20 bg-green-500/5 flex items-center gap-4 text-green-500 rounded-xl">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span className="font-mono text-xs">{success}</span>
                    </div>
                )}
            </div>

            {/* Sources Grid */}
            <div>
                {sources.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#050505] p-24 text-center rounded-2xl">
                        <div className="w-16 h-16 bg-white dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-100 dark:border-white/5">
                            <HardDrive className="w-8 h-8 text-gray-300 dark:text-white/10" />
                        </div>
                        <p className="font-mono text-gray-400 dark:text-white/40 mb-2 uppercase tracking-tight">No storage sources configured</p>
                        <p className="text-gray-500 dark:text-white/20 text-sm">Photos will be routed to global cloud storage by default.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {sources.map((source) => {
                            const config = sourceTypeConfig[source.source_type];
                            const Icon = config.icon;
                            
                            return (
                                <div 
                                    key={source.id}
                                    className="border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050505] p-8 hover:border-[#7C3AED]/30 dark:hover:border-white/30 transition-all group relative overflow-hidden rounded-2xl shadow-sm hover:shadow-lg"
                                >
                                    {/* Accent Corner */}
                                    <div 
                                        className="absolute top-0 right-0 w-24 h-24 opacity-5 group-hover:opacity-10 transition-opacity rounded-bl-full"
                                        style={{ background: config.color }}
                                    />

                                    <div className="flex items-start justify-between mb-8">
                                        <div 
                                            className="w-14 h-14 flex items-center justify-center border transition-all group-hover:scale-105 rounded-2xl"
                                            style={{ backgroundColor: `${config.color}10`, borderColor: `${config.color}20` }}
                                        >
                                            <Icon className="w-6 h-6" style={{ color: config.color }} />
                                        </div>
                                        <span 
                                            className="px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-full border"
                                            style={{ 
                                                backgroundColor: source.is_active ? 'rgba(16, 185, 129, 0.1)' : 'transparent', 
                                                color: source.is_active ? '#10B981' : 'gray',
                                                borderColor: source.is_active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(128,128,128,0.2)'
                                            }}
                                        >
                                            {source.is_active ? 'Active' : 'Offline'}
                                        </span>
                                    </div>
                                    
                                    <h3 className="font-bold text-2xl mb-1 tracking-tight text-gray-900 dark:text-white">{source.name}</h3>
                                    <p className="font-mono text-gray-400 dark:text-white/40 text-[10px] mb-8 uppercase tracking-wide">{config.desc}</p>
                                    
                                    <div className="space-y-4 border-t border-gray-100 dark:border-white/5 pt-6">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400 dark:text-white/30 uppercase tracking-widest text-[10px] font-bold">Volume</span>
                                            <span className="font-mono font-bold text-gray-700 dark:text-gray-200">{source.photo_count.toLocaleString()} <span className="text-gray-300 dark:text-white/20 text-[10px] ml-1 uppercase">Images</span></span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400 dark:text-white/30 uppercase tracking-widest text-[10px] font-bold">Telemetry</span>
                                            <span className="font-mono text-xs text-gray-500 dark:text-white/60">
                                                {source.last_sync ? new Date(source.last_sync).toLocaleDateString() : 'NO ACTIVITY'}
                                            </span>
                                        </div>
                                        {source.source_type === 'event_temp' && source.photo_count > 0 && (
                                            <button
                                                onClick={async () => {
                                                    if (!confirm(`Convert all ${source.photo_count} event photos to permanent storage?`)) return;
                                                    setError('');
                                                    setSuccess('');
                                                    try {
                                                        const res = await fetch('/api/convert-permanent', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ orgId, convertAll: true })
                                                        });
                                                        const data = await res.json();
                                                        if (data.success) {
                                                            setSuccess(data.message);
                                                            fetchSources();
                                                        } else {
                                                            setError(data.error || 'Conversion failed');
                                                        }
                                                    } catch (err) {
                                                        setError('Network error during conversion');
                                                    }
                                                }}
                                                className="mt-4 w-full py-3 bg-[#F59E0B] hover:bg-[#D97706] text-black font-bold text-xs uppercase tracking-[0.2em] transition-colors rounded-xl shadow-lg shadow-orange-500/20"
                                            >
                                                Convert to Permanent
                                            </button>
                                        )}
                                    </div>

                                </div>
                            );
                        })}
                    </div>
                )}
                
                {/* Info Section */}
                <div className="mt-12 border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#050505] p-12 rounded-3xl">
                    <h3 className="font-sans font-black uppercase tracking-tight text-3xl mb-8 text-gray-900 dark:text-white">Architecture Definition</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {Object.entries(sourceTypeConfig).map(([type, config]) => {
                            const Icon = config.icon;
                            return (
                                <div key={type} className="flex gap-6">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm">
                                        <Icon className="w-6 h-6" style={{ color: config.color }} />
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg mb-2 uppercase tracking-tight text-gray-900 dark:text-white">{config.label}</div>
                                        <p className="text-gray-500 dark:text-white/40 text-sm leading-relaxed">{config.desc}. Optimized for high-speed indexing and retrieval.</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Add Source Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-8 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 max-w-lg w-full p-12 relative overflow-hidden rounded-3xl shadow-2xl">
                        
                        <div className="relative z-10">
                            <h2 className="font-sans font-black text-3xl mb-2 text-gray-900 dark:text-white uppercase tracking-tight">Register Source</h2>
                            <p className="font-mono text-gray-500 dark:text-white/40 text-xs mb-12 uppercase tracking-wider">
                                CONFIGURE A NEW STORAGE ENDPOINT FOR SYNC
                            </p>
                            
                            <form onSubmit={handleAddSource} className="space-y-8">
                                <div>
                                    <label className="font-mono text-gray-500 dark:text-white/40 text-xs uppercase tracking-wider block mb-3">
                                        Source Designation
                                    </label>
                                    <input
                                        type="text"
                                        value={newSourceName}
                                        onChange={(e) => setNewSourceName(e.target.value)}
                                        placeholder="Studio Cluster Alpha"
                                        className="w-full h-14 px-6 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 focus:border-[#7C3AED] dark:focus:border-[#7C3AED] outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/10 font-mono text-sm rounded-xl"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="font-mono text-gray-500 dark:text-white/40 text-xs uppercase tracking-wider block mb-3">
                                        Mount Point (Local Path)
                                    </label>
                                    <input
                                        type="text"
                                        value={newSourcePath}
                                        onChange={(e) => setNewSourcePath(e.target.value)}
                                        placeholder="E:\Studio_Archive\2026"
                                        className="w-full h-14 px-6 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 focus:border-[#7C3AED] dark:focus:border-[#7C3AED] outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/10 font-mono text-sm rounded-xl"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="font-mono text-gray-500 dark:text-white/40 text-xs uppercase tracking-wider block mb-3">
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
                                                    className={`p-4 border rounded-xl transition-all text-center group flex flex-col items-center justify-center gap-2 ${
                                                        isSelected
                                                            ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg ring-2 ring-transparent'
                                                            : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/30 bg-white dark:bg-white/5'
                                                    }`}
                                                >
                                                    <Icon className={`w-5 h-5 ${isSelected ? 'text-white dark:text-black' : 'text-gray-400 dark:text-white/40'}`} style={{ color: isSelected ? undefined : config.color }} />
                                                    <div className="text-[10px] font-black uppercase tracking-tighter leading-none">{type.replace('_', ' ')}</div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                
                                <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 h-14 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/60 font-bold uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-xs rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={adding}
                                        className="flex-1 h-14 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-xs rounded-xl"
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
        </div>
    );
}
