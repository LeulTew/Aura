/* eslint-disable */
'use client';

import { useState, useEffect } from "react";
import VoidBackground from "@/components/VoidBackground";
import { supabase } from "@/lib/supabase";
import { 
    Loader2, Building2, Users, HardDrive, Activity, 
    Plus, ArrowLeft, RefreshCw, AlertCircle,
    CheckCircle2, XCircle, Upload
} from "lucide-react";
import Link from 'next/link';

interface Organization {
    id: string;
    name: string;
    slug: string;
    plan: string;
    storage_limit_gb: number;
    storage_used_bytes: number;
    is_active: boolean;
    created_at: string;
}

interface PlatformStats {
    total_tenants: number;
    active_tenants: number;
    total_photos: number;
    total_storage_gb: number;
}

export default function SuperAdminPage() {
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [error, setError] = useState("");
    
    // Create tenant modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTenantName, setNewTenantName] = useState("");
    const [newTenantSlug, setNewTenantSlug] = useState("");
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const t = sessionStorage.getItem("admin_token");
        if (t) {
            setToken(t);
        } else {
            window.location.href = "/";
        }
    }, []);

    useEffect(() => {
        if (token) fetchData();
    }, [token]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch organizations
            const { data: orgData, error: orgError } = await supabase
                .from('organizations')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (orgError) {
                console.log("Organizations table may not exist:", orgError);
                setOrgs([]);
            } else {
                setOrgs(orgData || []);
            }
            
            // Fetch stats
            const { count: photoCount } = await supabase
                .from('photos')
                .select('*', { count: 'exact', head: true });
            
            setStats({
                total_tenants: orgData?.length || 0,
                active_tenants: orgData?.filter(o => o.is_active).length || 0,
                total_photos: photoCount || 0,
                total_storage_gb: orgData?.reduce((acc, o) => acc + (o.storage_used_bytes || 0), 0) / (1024 * 1024 * 1024) || 0
            });
            
        } catch (err: any) {
            console.error("Fetch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem("admin_token");
        window.location.href = "/";
    };

    const handleCreateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTenantName || !newTenantSlug) return;
        
        setCreating(true);
        setError("");
        try {
            const { data, error } = await supabase
                .from('organizations')
                .insert({
                    name: newTenantName,
                    slug: newTenantSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    plan: 'free',
                    storage_limit_gb: 5
                })
                .select()
                .single();
            
            if (error) throw error;
            
            setOrgs(prev => [data, ...prev]);
            setShowCreateModal(false);
            setNewTenantName("");
            setNewTenantSlug("");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const toggleTenantStatus = async (org: Organization) => {
        try {
            const { error } = await supabase
                .from('organizations')
                .update({ is_active: !org.is_active })
                .eq('id', org.id);
            
            if (error) throw error;
            
            setOrgs(prev => prev.map(o => 
                o.id === org.id ? { ...o, is_active: !o.is_active } : o
            ));
        } catch (err: any) {
            setError(err.message);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (!token) {
        return (
            <main className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden font-sans">
                <VoidBackground />
                <div className="text-center z-10">
                    <Loader2 className="w-10 h-10 text-[var(--accent)] animate-spin mx-auto mb-4" />
                    <p className="text-white/40 font-mono text-xs uppercase tracking-widest">Initializing...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#050505] text-white font-sans relative">
            <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
                <VoidBackground />
            </div>

            {/* Header - Matching admin page exactly */}
            <header className="fixed top-0 w-full z-50 px-8 py-6 bg-black/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/" className="w-10 h-10 bg-[var(--accent)]/10 border border-[var(--accent)]/30 rounded-lg flex items-center justify-center hover:bg-[var(--accent)]/20 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-[var(--accent)]" />
                    </Link>
                    <div>
                        <h1 className="text-sm font-bold uppercase tracking-widest text-white">Platform Control</h1>
                        <p className="text-[10px] text-white/40 font-mono mt-0.5 tracking-wider">
                            {orgs.length} TENANTS • {stats?.total_photos || 0} OBJECTS INDEXED
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={fetchData} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={handleLogout} className="px-4 py-2 border border-white/10 text-white/40 text-[10px] font-mono uppercase tracking-widest hover:bg-white/5 hover:text-white rounded transition-all">
                        Terminate
                    </button>
                </div>
            </header>

            <div className="relative z-10 pt-32 px-6 pb-20 max-w-7xl mx-auto space-y-12">
                
                {/* Create Tenant Zone - Matching upload zone style */}
                <section>
                    <div 
                        onClick={() => setShowCreateModal(true)}
                        className="relative h-32 border-2 border-dashed border-white/10 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all group overflow-hidden hover:border-white/30 hover:bg-white/[0.02]"
                    >
                        <Plus className="w-8 h-8 text-white/20 mb-2 group-hover:text-white/40 transition-colors" />
                        <p className="text-white/30 font-mono text-[10px] uppercase tracking-widest group-hover:text-white/50 transition-colors">
                            Create New Studio Tenant
                        </p>
                    </div>
                </section>

                {/* Stats Grid - Matching card styles */}
                <section>
                    <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mb-6">Platform Metrics</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="backdrop-blur-3xl bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-[var(--accent)]/10 border border-[var(--accent)]/20 rounded-xl flex items-center justify-center">
                                    <Building2 className="w-5 h-5 text-[var(--accent)]" />
                                </div>
                            </div>
                            <p className="text-3xl font-light text-white mb-1">{stats?.total_tenants || 0}</p>
                            <span className="text-[10px] text-white/30 uppercase tracking-widest font-mono">Total Tenants</span>
                        </div>
                        
                        <div className="backdrop-blur-3xl bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center">
                                    <Activity className="w-5 h-5 text-green-400" />
                                </div>
                            </div>
                            <p className="text-3xl font-light text-white mb-1">{stats?.active_tenants || 0}</p>
                            <span className="text-[10px] text-white/30 uppercase tracking-widest font-mono">Active</span>
                        </div>
                        
                        <div className="backdrop-blur-3xl bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
                                    <Users className="w-5 h-5 text-blue-400" />
                                </div>
                            </div>
                            <p className="text-3xl font-light text-white mb-1">{stats?.total_photos?.toLocaleString() || 0}</p>
                            <span className="text-[10px] text-white/30 uppercase tracking-widest font-mono">Total Photos</span>
                        </div>
                        
                        <div className="backdrop-blur-3xl bg-white/[0.02] border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-all">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-center">
                                    <HardDrive className="w-5 h-5 text-orange-400" />
                                </div>
                            </div>
                            <p className="text-3xl font-light text-white mb-1">{stats?.total_storage_gb.toFixed(2) || 0} GB</p>
                            <span className="text-[10px] text-white/30 uppercase tracking-widest font-mono">Storage Used</span>
                        </div>
                    </div>
                </section>

                {/* Tenants Table */}
                <section>
                    <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 mb-6">Organizations</h2>
                    
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-[var(--accent)] animate-spin" />
                        </div>
                    ) : orgs.length === 0 ? (
                        <div className="py-20 text-center border border-white/5 rounded-[2rem] backdrop-blur-3xl bg-white/[0.01]">
                            <Building2 className="w-10 h-10 text-white/10 mx-auto mb-4" />
                            <p className="text-white/20 font-mono text-xs uppercase tracking-widest mb-6">No tenants yet</p>
                            <button 
                                onClick={() => setShowCreateModal(true)}
                                className="px-6 py-3 bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--accent)] text-xs font-mono uppercase tracking-widest rounded-xl hover:bg-[var(--accent)]/20 transition-all"
                            >
                                Create First Tenant
                            </button>
                        </div>
                    ) : (
                        <div className="backdrop-blur-3xl bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="text-left p-6 text-[10px] font-mono uppercase tracking-widest text-white/30">Name</th>
                                        <th className="text-left p-6 text-[10px] font-mono uppercase tracking-widest text-white/30">Slug</th>
                                        <th className="text-left p-6 text-[10px] font-mono uppercase tracking-widest text-white/30">Plan</th>
                                        <th className="text-left p-6 text-[10px] font-mono uppercase tracking-widest text-white/30">Storage</th>
                                        <th className="text-left p-6 text-[10px] font-mono uppercase tracking-widest text-white/30">Status</th>
                                        <th className="text-right p-6 text-[10px] font-mono uppercase tracking-widest text-white/30">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orgs.map((org) => (
                                        <tr key={org.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                            <td className="p-6">
                                                <p className="text-white font-medium">{org.name}</p>
                                                <p className="text-[10px] text-white/30 font-mono">{org.id.slice(0, 8)}</p>
                                            </td>
                                            <td className="p-6">
                                                <span className="text-white/60 font-mono text-sm">{org.slug}</span>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-widest ${
                                                    org.plan === 'enterprise' ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20' :
                                                    org.plan === 'pro' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                    'bg-white/5 text-white/40 border border-white/10'
                                                }`}>
                                                    {org.plan}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <div className="w-24">
                                                    <div className="flex justify-between text-[10px] mb-1">
                                                        <span className="text-white/40 font-mono">{formatBytes(org.storage_used_bytes)}</span>
                                                        <span className="text-white/20 font-mono">{org.storage_limit_gb}GB</span>
                                                    </div>
                                                    <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-[var(--accent)] transition-all"
                                                            style={{ width: `${Math.min((org.storage_used_bytes / (org.storage_limit_gb * 1024 * 1024 * 1024)) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                {org.is_active ? (
                                                    <span className="flex items-center gap-1.5 text-green-400 text-xs font-mono">
                                                        <CheckCircle2 className="w-3 h-3" /> Active
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1.5 text-red-400 text-xs font-mono">
                                                        <XCircle className="w-3 h-3" /> Suspended
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-6 text-right">
                                                <button 
                                                    onClick={() => toggleTenantStatus(org)}
                                                    className={`px-4 py-2 rounded-lg text-[10px] uppercase tracking-widest transition-all font-mono ${
                                                        org.is_active 
                                                            ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' 
                                                            : 'bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20'
                                                    }`}
                                                >
                                                    {org.is_active ? 'Suspend' : 'Activate'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </div>

            {/* Create Tenant Modal - Matching admin modal style */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
                    <form onSubmit={handleCreateTenant} className="w-full max-w-md backdrop-blur-3xl bg-white/[0.02] p-12 rounded-[32px] border border-white/10 hover:border-white/20 transition-all shadow-2xl">
                        <div className="flex flex-col items-center mb-12">
                            <div className="w-16 h-16 bg-gradient-to-br from-[var(--accent)] to-[#6366f1] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20">
                                <Building2 className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-2xl font-light text-white tracking-[0.15em] uppercase">New Studio</h1>
                            <p className="text-white/30 font-mono text-[10px] mt-3 tracking-widest uppercase">Create Tenant Organization</p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-3 font-mono">
                                    Organization Name
                                </label>
                                <input
                                    type="text"
                                    value={newTenantName}
                                    onChange={(e) => {
                                        setNewTenantName(e.target.value);
                                        setNewTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                                    }}
                                    placeholder="Studio ABC"
                                    className="w-full bg-black/40 border-2 border-white/5 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:border-[var(--accent)]/50 focus:bg-black/60 outline-none transition-all font-light"
                                    required
                                    autoFocus
                                />
                            </div>
                            
                            <div>
                                <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-3 font-mono">
                                    URL Slug
                                </label>
                                <input
                                    type="text"
                                    value={newTenantSlug}
                                    onChange={(e) => setNewTenantSlug(e.target.value)}
                                    placeholder="studio-abc"
                                    className="w-full bg-black/40 border-2 border-white/5 rounded-2xl px-6 py-4 text-white font-mono placeholder:text-white/20 focus:border-[var(--accent)]/50 focus:bg-black/60 outline-none transition-all"
                                    required
                                />
                                <p className="text-[10px] text-white/20 mt-2 font-mono">aura.app/{newTenantSlug || 'slug'}</p>
                            </div>
                            
                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400 text-xs font-mono">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {error}
                                </div>
                            )}
                            
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 h-14 border border-white/10 text-white/40 rounded-xl hover:bg-white/5 hover:text-white transition-all text-xs font-mono uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 h-14 bg-white text-black font-mono text-xs font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-gray-100 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                >
                                    {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create"}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            )}
        </main>
    );
}
