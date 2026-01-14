/* eslint-disable */
'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
    Loader2, Building2, Users, HardDrive, Activity, 
    Plus, ArrowLeft, RefreshCw, AlertCircle,
    CheckCircle2, XCircle, Camera
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

interface UsageLog {
    id: string;
    org_id: string;
    action: string;
    bytes_processed: number;
    created_at: string;
    metadata: any;
    organizations?: { name: string };
}

export default function SuperAdminPage() {
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [error, setError] = useState("");
    
    // Create tenant modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTenantName, setNewTenantName] = useState("");
    const [newTenantSlug, setNewTenantSlug] = useState("");
    const [creating, setCreating] = useState(false);

    // Edit tenant modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
    const [editPlan, setEditPlan] = useState("");
    const [editLimit, setEditLimit] = useState(0);
    const [updating, setUpdating] = useState(false);

    // Design tokens - Editorial style
    const accentColor = '#7C3AED'; // Purple for SuperAdmin
    const fontDisplay = "font-sans font-black uppercase leading-[0.9] tracking-[-0.03em]";
    const fontMono = "font-mono text-xs uppercase tracking-[0.15em] font-medium";
    const container = "max-w-[1200px] mx-auto w-full";

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
            
            const { count: photoCount } = await supabase
                .from('photos')
                .select('*', { count: 'exact', head: true });
            
            setStats({
                total_tenants: orgData?.length || 0,
                active_tenants: orgData?.filter(o => o.is_active).length || 0,
                total_photos: photoCount || 0,
                total_storage_gb: orgData?.reduce((acc, o) => acc + (o.storage_used_bytes || 0), 0) / (1024 * 1024 * 1024) || 0
            });

            // Fetch recent usage logs
            const { data: logData } = await supabase
                .from('usage_logs')
                .select('*, organizations(name)')
                .order('created_at', { ascending: false })
                .limit(20);
            
            setLogs(logData || []);
            
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

    const handleUpdateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrg) return;
        
        setUpdating(true);
        setError("");
        try {
            const { data, error } = await supabase
                .from('organizations')
                .update({
                    plan: editPlan,
                    storage_limit_gb: editLimit
                })
                .eq('id', selectedOrg.id)
                .select()
                .single();
            
            if (error) throw error;
            
            setOrgs(prev => prev.map(o => o.id === selectedOrg.id ? data : o));
            setShowEditModal(false);
            setSelectedOrg(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUpdating(false);
        }
    };

    const openEditModal = (org: Organization) => {
        setSelectedOrg(org);
        setEditPlan(org.plan);
        setEditLimit(org.storage_limit_gb);
        setShowEditModal(true);
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
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-black antialiased">
            {/* HEADER */}
            <header className="fixed top-0 w-full z-50 bg-black text-white border-b-[3px] border-white">
                <div className={`${container} flex justify-between items-center py-4 px-8`}>
                    <div className="flex items-center gap-4">
                        <Link href="/" className="w-10 h-10 bg-white flex items-center justify-center hover:bg-[#7C3AED] transition-colors group">
                            <ArrowLeft className="w-5 h-5 text-black group-hover:text-white" />
                        </Link>
                        <div>
                            <div className={fontMono} style={{ color: accentColor }}>SuperAdmin</div>
                            <div className={`${fontDisplay} text-xl`}>Platform Control</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={fetchData} 
                            className="w-10 h-10 border-[3px] border-white flex items-center justify-center hover:bg-white hover:text-black transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                        <button 
                            onClick={handleLogout}
                            className={`${fontMono} border-[3px] border-white px-6 py-2 hover:bg-white hover:text-black transition-colors`}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="pt-[88px]">
                {/* STATS SECTION */}
                <section className="bg-black text-white py-16 px-8 border-b-[3px] border-white">
                    <div className={container}>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-[3px] bg-white">
                            <div className="bg-black p-8 text-center">
                                <Building2 className="w-8 h-8 mx-auto mb-4" style={{ color: accentColor }} />
                                <div className={`${fontDisplay} text-4xl mb-2`}>{stats?.total_tenants || 0}</div>
                                <div className={`${fontMono} text-white/50`}>Total Tenants</div>
                            </div>
                            <div className="bg-black p-8 text-center">
                                <Activity className="w-8 h-8 mx-auto mb-4 text-green-500" />
                                <div className={`${fontDisplay} text-4xl mb-2`}>{stats?.active_tenants || 0}</div>
                                <div className={`${fontMono} text-white/50`}>Active</div>
                            </div>
                            <div className="bg-black p-8 text-center">
                                <Users className="w-8 h-8 mx-auto mb-4 text-blue-500" />
                                <div className={`${fontDisplay} text-4xl mb-2`}>{stats?.total_photos?.toLocaleString() || 0}</div>
                                <div className={`${fontMono} text-white/50`}>Total Photos</div>
                            </div>
                            <div className="bg-black p-8 text-center">
                                <HardDrive className="w-8 h-8 mx-auto mb-4 text-orange-500" />
                                <div className={`${fontDisplay} text-4xl mb-2`}>{stats?.total_storage_gb.toFixed(1) || 0} GB</div>
                                <div className={`${fontMono} text-white/50`}>Storage</div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* ACTIONS BAR */}
                <section className="py-8 px-8 border-b-[3px] border-black bg-[#F5F5F5]">
                    <div className={`${container} flex justify-between items-center`}>
                        <div>
                            <span className={fontMono} style={{ color: accentColor }}>Organizations</span>
                            <h2 className={`${fontDisplay} text-3xl mt-1 text-black`}>Manage Tenants</h2>
                        </div>
                        <button 
                            onClick={() => setShowCreateModal(true)}
                            className="bg-black text-white px-8 py-4 flex items-center gap-3 hover:bg-[#7C3AED] transition-colors"
                        >
                            <Plus className="w-5 h-5" />
                            <span className={fontMono}>New Tenant</span>
                        </button>
                    </div>
                </section>

                {/* MAIN CONTENT GRID */}
                <section className="px-8 py-12">
                    <div className={`${container} grid grid-cols-1 lg:grid-cols-3 gap-12`}>
                        {/* LEFT: TENANTS TABLE */}
                        <div className="lg:col-span-2">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-black" />
                            </div>
                        ) : orgs.length === 0 ? (
                            <div className="py-20 text-center border-[3px] border-black bg-white">
                                <Building2 className="w-12 h-12 mx-auto mb-4 text-black/20" />
                                <p className={`${fontMono} text-black/40 mb-6`}>No tenants created yet</p>
                                <button 
                                    onClick={() => setShowCreateModal(true)}
                                    className="bg-black text-white px-8 py-4 hover:bg-[#7C3AED] transition-colors"
                                >
                                    <span className={fontMono}>Create First Tenant</span>
                                </button>
                            </div>
                        ) : (
                            <div className="border-[3px] border-black bg-white">
                                <table className="w-full">
                                    <thead className="bg-black text-white">
                                        <tr>
                                            <th className={`${fontMono} text-left p-4`}>Name</th>
                                            <th className={`${fontMono} text-left p-4`}>Slug</th>
                                            <th className={`${fontMono} text-left p-4`}>Plan</th>
                                            <th className={`${fontMono} text-left p-4`}>Storage</th>
                                            <th className={`${fontMono} text-left p-4`}>Status</th>
                                            <th className={`${fontMono} text-right p-4`}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orgs.map((org, i) => (
                                            <tr key={org.id} className={`border-t-[1px] border-black/10 ${i % 2 === 0 ? 'bg-white' : 'bg-[#F9F9F9]'}`}>
                                                <td className="p-4">
                                                    <div className="font-bold text-black">{org.name}</div>
                                                    <div className={`${fontMono} text-black/40`}>{org.id.slice(0, 8)}</div>
                                                </td>
                                                <td className={`${fontMono} p-4 text-black/60`}>{org.slug}</td>
                                                <td className="p-4">
                                                    <span className={`${fontMono} px-3 py-1 border-[2px] ${
                                                        org.plan === 'enterprise' ? 'border-purple-500 text-purple-600' :
                                                        org.plan === 'pro' ? 'border-blue-500 text-blue-600' :
                                                        'border-black/10 text-black/40'
                                                    }`}>
                                                        {org.plan.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className={`${fontMono} text-black/80`}>{formatBytes(org.storage_used_bytes)} / {org.storage_limit_gb}GB</div>
                                                    <div className="w-24 h-2 bg-black/5 mt-1">
                                                        <div 
                                                            className="h-full bg-[#7C3AED]"
                                                            style={{ width: `${Math.min((org.storage_used_bytes / (org.storage_limit_gb * 1024 * 1024 * 1024)) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    {org.is_active ? (
                                                        <span className={`${fontMono} text-green-600 flex items-center gap-2`}>
                                                            <CheckCircle2 className="w-4 h-4" /> ACTIVE
                                                        </span>
                                                    ) : (
                                                        <span className={`${fontMono} text-red-600 flex items-center gap-2`}>
                                                            <XCircle className="w-4 h-4" /> SUSPENDED
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => openEditModal(org)}
                                                            className={`${fontMono} px-4 py-2 border-[2px] border-black/10 text-black hover:bg-black hover:text-white transition-colors`}
                                                        >
                                                            EDIT
                                                        </button>
                                                        <button 
                                                            onClick={() => toggleTenantStatus(org)}
                                                            className={`${fontMono} px-4 py-2 border-[2px] transition-colors ${
                                                                org.is_active 
                                                                    ? 'border-red-500/20 text-red-600 hover:bg-red-500 hover:text-white' 
                                                                    : 'border-green-500/20 text-green-600 hover:bg-green-500 hover:text-white'
                                                            }`}
                                                        >
                                                            {org.is_active ? 'SUSPEND' : 'ACTIVATE'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        </div>

                        {/* RIGHT: ACTIVITY FEED */}
                        <div className="lg:col-span-1">
                            {/* KEEP ACTIVITY FEED DARK FOR CONTRAST MIX */}
                            <div className="border-[3px] border-black bg-[#0A0A0A]">
                                <div className="bg-black text-white p-4">
                                    <h3 className={fontMono}>Platform Activity</h3>
                                </div>
                                <div className="divide-y-[1px] divide-white/10 max-h-[600px] overflow-y-auto">
                                    {logs.length === 0 ? (
                                        <div className="p-8 text-center text-white/40">
                                            <p className={fontMono}>No recent activity</p>
                                        </div>
                                    ) : (
                                        logs.map((log) => (
                                            <div key={log.id} className="p-4 hover:bg-white/5 transition-colors">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`${fontMono} text-[10px] bg-[#7C3AED] text-white px-2 py-0.5`}>
                                                        {log.action.toUpperCase()}
                                                    </span>
                                                    <span className="text-[10px] text-white/40 font-mono">
                                                        {new Date(log.created_at).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                                <div className="text-sm font-bold text-white">
                                                    {log.organizations?.name || 'Unknown Tenant'}
                                                </div>
                                                <div className="text-xs text-white/60 truncate">
                                                    {log.action === 'upload' ? `Processed ${formatBytes(log.bytes_processed)}` : 
                                                     log.action === 'search' ? `Face search performed` :
                                                     log.action === 'bundle_create' ? `Bundle created: ${log.metadata?.name || 'unnamed'}` :
                                                     'Platform action'}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="p-4 bg-white/5 border-t-[3px] border-white text-center">
                                    <Link href="/superadmin/logs" className={`${fontMono} text-[10px] text-white/60 hover:text-white hover:underline`}>
                                        View Full Audit Log
                                    </Link>
                                </div>
                            </div>

                            {/* SYSTEM STATUS CARD (KEEP DARK/PURPLE) */}
                            <div className="mt-8 border-[3px] border-black p-6 bg-[#7C3AED] text-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                                <h3 className={`${fontMono} mb-4`}>System Health</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span>API Core</span>
                                        <span className="flex items-center gap-2"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> Operational</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span>Supabase DB</span>
                                        <span className="flex items-center gap-2"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> Normal</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span>Storage Bucket</span>
                                        <span className="flex items-center gap-2"><div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> Active</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

             {/* CREATE TENANT MODAL (MIXED AESTHETIC) */}
            {showCreateModal && (
                <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm">
                    <form onSubmit={handleCreateTenant} className="bg-white border-[3px] border-black w-full max-w-lg shadow-[12px_12px_0px_0px_rgba(124,58,237,0.5)]">
                        <div className="bg-black text-white p-6">
                            <span className={fontMono} style={{ color: accentColor }}>New Organization</span>
                            <h2 className={`${fontDisplay} text-3xl mt-2`}>Create Tenant</h2>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div>
                                <label className={`${fontMono} text-black/60 block mb-2`}>Organization Name</label>
                                <input
                                    type="text"
                                    value={newTenantName}
                                    onChange={(e) => {
                                        setNewTenantName(e.target.value);
                                        setNewTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                                    }}
                                    placeholder="Studio ABC"
                                    className="w-full bg-white border-[3px] border-black p-4 text-lg text-black focus:border-[#7C3AED] outline-none transition-colors"
                                    required
                                    autoFocus
                                />
                            </div>
                            
                            <div>
                                <label className={`${fontMono} text-black/60 block mb-2`}>URL Slug</label>
                                <input
                                    type="text"
                                    value={newTenantSlug}
                                    onChange={(e) => setNewTenantSlug(e.target.value)}
                                    placeholder="studio-abc"
                                    className={`w-full bg-white border-[3px] border-black p-4 ${fontMono} text-black focus:border-[#7C3AED] outline-none transition-colors`}
                                    required
                                />
                                <p className={`${fontMono} text-black/40 mt-2`}>aura.app/{newTenantSlug || 'slug'}</p>
                            </div>
                            
                            {error && (
                                <div className="p-4 border-[3px] border-red-500 text-red-600 flex items-center gap-3 bg-red-50">
                                    <AlertCircle className="w-5 h-5" />
                                    <span className={fontMono}>{error}</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 border-t-[3px] border-black">
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className={`${fontMono} p-4 text-black hover:bg-black/5 transition-colors border-r-[3px] border-black`}
                            >
                                CANCEL
                            </button>
                            <button
                                type="submit"
                                disabled={creating}
                                className={`${fontMono} p-4 bg-black text-white hover:bg-[#7C3AED] transition-colors flex items-center justify-center gap-2`}
                            >
                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                CREATE
                            </button>
                        </div>
                    </form>
                </div>
            )}

             {/* EDIT TENANT MODAL (MIXED AESTHETIC) */}
            {showEditModal && (
                <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-8 backdrop-blur-sm">
                    <form onSubmit={handleUpdateTenant} className="bg-white border-[3px] border-black w-full max-w-lg shadow-[12px_12px_0px_0px_rgba(124,58,237,0.5)]">
                        <div className="bg-black text-white p-6">
                            <span className={fontMono} style={{ color: accentColor }}>Management</span>
                            <h2 className={`${fontDisplay} text-3xl mt-2`}>Edit {selectedOrg?.name}</h2>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div>
                                <label className={`${fontMono} text-black/60 block mb-2`}>Subscription Plan</label>
                                <select 
                                    value={editPlan}
                                    onChange={(e) => setEditPlan(e.target.value)}
                                    className="w-full bg-white border-[3px] border-black p-4 text-lg text-black focus:border-[#7C3AED] outline-none transition-colors appearance-none"
                                >
                                    <option value="free">FREE</option>
                                    <option value="pro">PRO</option>
                                    <option value="enterprise">ENTERPRISE</option>
                                </select>
                            </div>
                            
                            <div>
                                <label className={`${fontMono} text-black/60 block mb-2`}>Storage Limit (GB)</label>
                                <input
                                    type="number"
                                    value={editLimit}
                                    onChange={(e) => setEditLimit(parseInt(e.target.value))}
                                    className="w-full bg-white border-[3px] border-black p-4 text-lg text-black focus:border-[#7C3AED] outline-none transition-colors"
                                    required
                                    min="1"
                                />
                            </div>
                            
                            {error && (
                                <div className="p-4 border-[3px] border-red-500 text-red-600 flex items-center gap-3 bg-red-50">
                                    <AlertCircle className="w-5 h-5" />
                                    <span className={fontMono}>{error}</span>
                                </div>
                            )}
                        </div>
                        
                        <div className="grid grid-cols-2 border-t-[3px] border-black">
                            <button
                                type="button"
                                onClick={() => setShowEditModal(false)}
                                className={`${fontMono} p-4 text-black hover:bg-black/5 transition-colors border-r-[3px] border-black`}
                            >
                                CANCEL
                            </button>
                            <button
                                type="submit"
                                disabled={updating}
                                className={`${fontMono} p-4 bg-black text-white hover:bg-[#7C3AED] transition-colors flex items-center justify-center gap-2`}
                            >
                                {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                SAVE CHANGES
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
