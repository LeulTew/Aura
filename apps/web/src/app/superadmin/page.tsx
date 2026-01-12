/* eslint-disable */
'use client';

import { useState, useEffect } from "react";
import VoidBackground from "@/components/VoidBackground";
import { supabase } from "@/lib/supabase";
import { 
    Loader2, Building2, Users, HardDrive, Activity, 
    Plus, MoreVertical, ArrowLeft, RefreshCw, AlertCircle,
    CheckCircle2, XCircle, Pause
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
    const [isAuthorized, setIsAuthorized] = useState(false);
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
        checkAuth();
    }, []);

    const checkAuth = () => {
        const token = sessionStorage.getItem("admin_token");
        if (!token) {
            window.location.href = "/";
            return;
        }
        
        try {
            // Decode JWT to check role
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (payload.role !== 'superadmin') {
                // For MVP, allow 'admin' role too since we don't have profiles yet
                if (payload.role !== 'admin') {
                    setError("Access denied. SuperAdmin only.");
                    setLoading(false);
                    return;
                }
            }
            setIsAuthorized(true);
            fetchData();
        } catch (e) {
            setError("Invalid token");
            setLoading(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch organizations
            const { data: orgData, error: orgError } = await supabase
                .from('organizations')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (orgError) {
                // Table might not exist yet
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

    const handleCreateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTenantName || !newTenantSlug) return;
        
        setCreating(true);
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

    if (!isAuthorized && !loading) {
        return (
            <main className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
                <VoidBackground />
                <div className="text-center z-10">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl text-white mb-2">Access Denied</h1>
                    <p className="text-white/50 mb-6">{error || "You don't have permission to access this page."}</p>
                    <Link href="/" className="text-[var(--accent)] hover:underline">Return to Home</Link>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-[#050505] text-white font-sans relative">
            <div className="fixed inset-0 z-0 opacity-10 pointer-events-none">
                <VoidBackground />
            </div>

            {/* Header */}
            <header className="fixed top-0 w-full z-50 px-8 py-6 bg-black/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/" className="w-10 h-10 bg-purple-500/10 border border-purple-500/30 rounded-lg flex items-center justify-center hover:bg-purple-500/20 transition-colors">
                        <ArrowLeft className="w-5 h-5 text-purple-400" />
                    </Link>
                    <div>
                        <h1 className="text-sm font-bold uppercase tracking-widest text-white flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px]">SUPERADMIN</span>
                            Platform Control
                        </h1>
                        <p className="text-[10px] text-white/40 font-mono mt-0.5 tracking-wider">
                            {orgs.length} TENANTS • {stats?.total_photos || 0} PHOTOS
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={fetchData} className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors">
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                        onClick={() => setShowCreateModal(true)}
                        className="px-4 py-2 bg-purple-500 text-white text-[10px] font-mono uppercase tracking-widest rounded hover:bg-purple-600 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        New Tenant
                    </button>
                </div>
            </header>

            <div className="relative z-10 pt-32 px-6 pb-20 max-w-7xl mx-auto space-y-8">
                
                {/* Stats Grid */}
                <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-purple-400" />
                            </div>
                            <span className="text-[10px] text-white/40 uppercase tracking-widest">Total Tenants</span>
                        </div>
                        <p className="text-3xl font-light text-white">{stats?.total_tenants || 0}</p>
                    </div>
                    
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center">
                                <Activity className="w-5 h-5 text-green-400" />
                            </div>
                            <span className="text-[10px] text-white/40 uppercase tracking-widest">Active</span>
                        </div>
                        <p className="text-3xl font-light text-white">{stats?.active_tenants || 0}</p>
                    </div>
                    
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                                <Users className="w-5 h-5 text-blue-400" />
                            </div>
                            <span className="text-[10px] text-white/40 uppercase tracking-widest">Total Photos</span>
                        </div>
                        <p className="text-3xl font-light text-white">{stats?.total_photos?.toLocaleString() || 0}</p>
                    </div>
                    
                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                                <HardDrive className="w-5 h-5 text-orange-400" />
                            </div>
                            <span className="text-[10px] text-white/40 uppercase tracking-widest">Storage Used</span>
                        </div>
                        <p className="text-3xl font-light text-white">{stats?.total_storage_gb.toFixed(2) || 0} GB</p>
                    </div>
                </section>

                {/* Tenants Table */}
                <section>
                    <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-white/50 mb-6">Organizations</h2>
                    
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                        </div>
                    ) : orgs.length === 0 ? (
                        <div className="py-20 text-center border border-white/5 rounded-2xl bg-white/[0.01]">
                            <Building2 className="w-10 h-10 text-white/10 mx-auto mb-4" />
                            <p className="text-white/20 font-mono text-xs uppercase tracking-widest mb-4">No tenants yet</p>
                            <button 
                                onClick={() => setShowCreateModal(true)}
                                className="px-6 py-3 bg-purple-500/20 text-purple-400 text-xs font-mono uppercase tracking-widest rounded-xl hover:bg-purple-500/30 transition-all"
                            >
                                Create First Tenant
                            </button>
                        </div>
                    ) : (
                        <div className="bg-white/[0.02] border border-white/5 rounded-2xl overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-white/5">
                                        <th className="text-left p-4 text-[10px] font-mono uppercase tracking-widest text-white/30">Name</th>
                                        <th className="text-left p-4 text-[10px] font-mono uppercase tracking-widest text-white/30">Slug</th>
                                        <th className="text-left p-4 text-[10px] font-mono uppercase tracking-widest text-white/30">Plan</th>
                                        <th className="text-left p-4 text-[10px] font-mono uppercase tracking-widest text-white/30">Storage</th>
                                        <th className="text-left p-4 text-[10px] font-mono uppercase tracking-widest text-white/30">Status</th>
                                        <th className="text-right p-4 text-[10px] font-mono uppercase tracking-widest text-white/30">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orgs.map((org) => (
                                        <tr key={org.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                            <td className="p-4">
                                                <p className="text-white font-medium">{org.name}</p>
                                                <p className="text-[10px] text-white/30 font-mono">{org.id.slice(0, 8)}</p>
                                            </td>
                                            <td className="p-4">
                                                <span className="text-white/60 font-mono text-sm">{org.slug}</span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-widest ${
                                                    org.plan === 'enterprise' ? 'bg-purple-500/20 text-purple-400' :
                                                    org.plan === 'pro' ? 'bg-blue-500/20 text-blue-400' :
                                                    'bg-white/10 text-white/40'
                                                }`}>
                                                    {org.plan}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="w-24">
                                                    <div className="flex justify-between text-[10px] mb-1">
                                                        <span className="text-white/40">{formatBytes(org.storage_used_bytes)}</span>
                                                        <span className="text-white/20">{org.storage_limit_gb}GB</span>
                                                    </div>
                                                    <div className="h-1 bg-white/10 rounded overflow-hidden">
                                                        <div 
                                                            className="h-full bg-purple-500 transition-all"
                                                            style={{ width: `${Math.min((org.storage_used_bytes / (org.storage_limit_gb * 1024 * 1024 * 1024)) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {org.is_active ? (
                                                    <span className="flex items-center gap-1 text-green-400 text-xs">
                                                        <CheckCircle2 className="w-3 h-3" /> Active
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-red-400 text-xs">
                                                        <XCircle className="w-3 h-3" /> Suspended
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                <button 
                                                    onClick={() => toggleTenantStatus(org)}
                                                    className={`px-3 py-1.5 rounded text-[10px] uppercase tracking-widest transition-all ${
                                                        org.is_active 
                                                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                                                            : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
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

            {/* Create Tenant Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-[#0a0a0a] border border-white/10 p-8 rounded-[2rem] max-w-md w-full">
                        <h3 className="text-xl font-light text-white mb-6">Create New Tenant</h3>
                        
                        <form onSubmit={handleCreateTenant} className="space-y-4">
                            <div>
                                <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-2">
                                    Organization Name
                                </label>
                                <input
                                    type="text"
                                    value={newTenantName}
                                    onChange={(e) => {
                                        setNewTenantName(e.target.value);
                                        // Auto-generate slug
                                        setNewTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                                    }}
                                    placeholder="Studio ABC"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:border-purple-500/50 outline-none"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className="block text-[10px] text-white/40 uppercase tracking-widest mb-2">
                                    URL Slug
                                </label>
                                <input
                                    type="text"
                                    value={newTenantSlug}
                                    onChange={(e) => setNewTenantSlug(e.target.value)}
                                    placeholder="studio-abc"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-mono placeholder:text-white/20 focus:border-purple-500/50 outline-none"
                                    required
                                />
                                <p className="text-[10px] text-white/30 mt-1">Used in URLs: /studio/{newTenantSlug || 'slug'}</p>
                            </div>
                            
                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
                                    {error}
                                </div>
                            )}
                            
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 py-3 border border-white/10 text-white/40 rounded-xl hover:bg-white/5 transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={creating}
                                    className="flex-1 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-all text-sm flex items-center justify-center gap-2"
                                >
                                    {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
