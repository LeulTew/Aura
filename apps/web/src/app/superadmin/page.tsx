/* eslint-disable */
'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
    Loader2, Building2, Users, HardDrive, Activity, 
    Plus, ArrowLeft, RefreshCw, AlertCircle,
    CheckCircle2, XCircle, Trash2
} from "lucide-react";
import Link from 'next/link';

// --- FONTS ---
import { Inter, JetBrains_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
const jetbrains = JetBrains_Mono({ subsets: ['latin'] });

// --- TYPES ---
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
    // --- STATE ---
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [stats, setStats] = useState<PlatformStats | null>(null);
    const [logs, setLogs] = useState<UsageLog[]>([]);
    const [error, setError] = useState("");
    
    // Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTenantName, setNewTenantName] = useState("");
    const [newTenantSlug, setNewTenantSlug] = useState("");
    const [creating, setCreating] = useState(false);

    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
    const [editPlan, setEditPlan] = useState("");
    const [editLimit, setEditLimit] = useState(0);
    const [updating, setUpdating] = useState(false);

    // --- EFFECTS ---
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

    // --- ACTIONS ---
    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: orgData } = await supabase
                .from('organizations')
                .select('*')
                .order('created_at', { ascending: false });
            
            setOrgs(orgData || []);
            
            // Stats
            const { count: photoCount } = await supabase
                .from('photos')
                .select('*', { count: 'exact', head: true });
            
            setStats({
                total_tenants: orgData?.length || 0,
                active_tenants: orgData?.filter(o => o.is_active).length || 0,
                total_photos: photoCount || 0,
                total_storage_gb: orgData?.reduce((acc, o) => acc + (o.storage_used_bytes || 0), 0) / (1024 * 1024 * 1024) || 0
            });

            // Logs
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
        setCreating(true);
        setError("");
        try {
            // Use Server-Side API to bypass RLS (since client might use admin_token vs auth session)
            const res = await fetch('/api/superadmin/create-tenant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newTenantName,
                    slug: newTenantSlug,
                    plan: 'free',
                    storage_limit_gb: 5
                })
            });
            
            const result = await res.json();
            
            if (!result.success) throw new Error(result.error);
            const data = result.data;
            
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

    const handleUpdateTenant = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrg) return;
        setUpdating(true);
        try {
            const { data, error } = await supabase
                .from('organizations')
                .update({ plan: editPlan, storage_limit_gb: editLimit })
                .eq('id', selectedOrg.id)
                .select().single();
            
            if (error) throw error;
            setOrgs(prev => prev.map(o => o.id === selectedOrg.id ? data : o));
            setShowEditModal(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUpdating(false);
        }
    };

    const toggleStatus = async (org: Organization) => {
        try {
            await supabase.from('organizations').update({ is_active: !org.is_active }).eq('id', org.id);
            setOrgs(prev => prev.map(o => o.id === org.id ? { ...o, is_active: !o.is_active } : o));
        } catch (e) {
            console.error(e);
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 GB';
        return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    };

    if (!token) return <div className="min-h-screen bg-[#f7f3ee]" />;

    return (
        <div className={`min-h-screen ${inter.className} relative flex flex-col overflow-x-hidden vellum-theme`} style={{
            backgroundColor: '#f7f3ee',
            color: '#1a1c1e',
            backgroundImage: 'url("https://www.transparenttextures.com/patterns/felt.png")'
        }}>
            <style dangerouslySetInnerHTML={{ __html: `
                .vellum-theme h1, .vellum-theme h2, .vellum-theme h3, .vellum-theme h4, .vellum-theme h5, .vellum-theme h6 {
                    color: #1a1c1e !important;
                    font-family: inherit !important;
                }
                .vellum-theme p, .vellum-theme span, .vellum-theme div, .vellum-theme label {
                    color: #4a4d52;
                }
                /* Allow utility classes to override the defaults */
                .vellum-theme .text-red-600 { color: #dc2626 !important; }
                .vellum-theme .text-green-600 { color: #16a34a !important; }
                .vellum-theme .bg-red-400 { background-color: #f87171 !important; }
                .vellum-theme .bg-[#4f772d] { background-color: #4f772d !important; }
                
                .vellum-theme .text-ink { color: #1a1c1e !important; }
                .vellum-theme .text-gold { color: #c5a059 !important; }
                .vellum-theme .text-gray-dark { color: #8e9196 !important; }
            `}} />
            {/* GRAIN OVERLAY */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.04] z-[9999]" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
            }} />

            {/* NAV */}
            <nav className="px-8 py-8 md:px-16 md:py-8 flex justify-between items-end border-b border-[#1a1c1e]/10 relative">
                <div className="flex flex-col">
                    <h1 className="font-extrabold text-[#1a1c1e] text-4xl leading-[0.9] tracking-tighter uppercase">Aura</h1>
                    <span className={`${jetbrains.className} text-[#c5a059] text-xs uppercase tracking-[0.2em] mt-2`}>Platform Control</span>
                </div>
                <button onClick={handleLogout} className={`${jetbrains.className} text-[#8e9196] text-sm hover:text-[#1a1c1e] transition-colors border-b border-transparent hover:border-[#1a1c1e]`}>
                    / Logout
                </button>
            </nav>

            <main className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-16 p-8 md:p-16 flex-grow">
                {/* TOP STATS */}
                <section className="col-span-1 lg:col-span-full grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
                    {[
                        { label: 'Total Tenants', value: stats?.total_tenants || 0 },
                        { label: 'Active Now', value: stats?.active_tenants || 0 },
                        { label: 'Total Photos', value: stats?.total_photos?.toLocaleString() || 0 },
                        { 
                            label: 'Storage', 
                            value: stats?.total_storage_gb.toFixed(1) || '0.0', 
                            unit: 'GB' 
                        }
                    ].map((stat, i) => (
                        <div key={i} className="relative py-6 border-t border-[#1a1c1e]/10 animate-slide-up" style={{ animationDelay: `${0.1 * (i+1)}s` }}>
                            <span className={`${jetbrains.className} text-[#8e9196] text-[0.7rem] uppercase block mb-4`}>{stat.label}</span>
                            <div className="text-5xl font-light tracking-tight text-[#1a1c1e]">
                                {stat.value}
                                {stat.unit && <span className="text-base text-[#4a4d52] ml-2">{stat.unit}</span>}
                            </div>
                        </div>
                    ))}
                </section>

                {/* MANAGEMENT */}
                <section className="flex flex-col">
                    <header className="flex justify-between items-center mb-12">
                        <h2 className="font-extrabold text-xl uppercase tracking-wide text-[#1a1c1e]">Organizations</h2>
                        <button 
                            onClick={() => setShowCreateModal(true)}
                            className={`${jetbrains.className} bg-[#1a1c1e] text-[#f7f3ee] px-6 py-3 text-xs border-none cursor-pointer shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all duration-200`}
                        >
                            CREATE FIRST TENANT
                        </button>
                    </header>

                    {orgs.length === 0 ? (
                        <div className="border border-dashed border-[#1a1c1e]/20 h-[300px] flex flex-col items-center justify-center bg-white/20 backdrop-blur-[4px] relative">
                            <span className="absolute text-[8rem] font-black opacity-[0.02] pointer-events-none select-none">VOID</span>
                            <p className={`${jetbrains.className} text-[#8e9196] text-sm mb-6`}>No tenants created yet</p>
                            <span className={`${jetbrains.className} text-[0.6rem] text-[#c5a059]`}>SYSTEM IDLE : WAITING FOR INPUT</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {orgs.map((org) => (
                                <div key={org.id} className="bg-white/40 border border-[#1a1c1e]/5 p-6 flex justify-between items-center hover:bg-white/60 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-bold text-lg">{org.name}</span>
                                            {org.is_active 
                                                ? <div className="w-2 h-2 rounded-full bg-[#4f772d] shadow-[0_0_8px_#4f772d]" /> 
                                                : <div className="w-2 h-2 rounded-full bg-red-400" />
                                            }
                                        </div>
                                        <div className={`${jetbrains.className} text-xs text-[#8e9196]`}>
                                            {org.slug} • {org.plan.toUpperCase()} • {formatBytes(org.storage_used_bytes)} / {org.storage_limit_gb}GB
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => { setSelectedOrg(org); setEditPlan(org.plan); setEditLimit(org.storage_limit_gb); setShowEditModal(true); }} className={`${jetbrains.className} text-xs underline decoration-[#1a1c1e]/30 hover:decoration-[#1a1c1e]`}>EDIT</button>
                                        <button onClick={() => toggleStatus(org)} className={`${jetbrains.className} text-xs text-[#8e9196] hover:text-[#1a1c1e]`}>{org.is_active ? 'SUSPEND' : 'ACTIVATE'}</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* SIDEBAR */}
                <aside className="flex flex-col gap-16">
                    <div className="flex flex-col">
                        <h3 className={`${jetbrains.className} text-xs uppercase text-[#c5a059] mb-8 pb-2 border-b border-[#c5a059]/30`}>Platform Activity</h3>
                        <ul className="list-none space-y-0">
                            {logs.length === 0 ? (
                                <li className="py-6 border-b border-[#1a1c1e]/5 text-sm text-[#4a4d52]">
                                    System environment initialized.
                                    <span className={`${jetbrains.className} block text-xs text-[#8e9196] mt-2`}>Just now // [SYS]</span>
                                </li>
                            ) : logs.map(log => (
                                <li key={log.id} className="py-6 border-b border-[#1a1c1e]/5 text-sm text-[#4a4d52]">
                                    {log.action.toUpperCase()} - {log.organizations?.name || 'Unknown'}
                                    <span className={`${jetbrains.className} block text-xs text-[#8e9196] mt-2`}>
                                        {new Date(log.created_at).toLocaleTimeString()} // [ID:{log.id.slice(0,4)}]
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <Link href="/superadmin/logs" className={`${jetbrains.className} text-xs text-[#1a1c1e] mt-6 underline decoration-[#1a1c1e] underline-offset-4`}>
                            View Full Audit Log
                        </Link>
                    </div>

                    <div className="flex flex-col">
                        <h3 className={`${jetbrains.className} text-xs uppercase text-[#c5a059] mb-8 pb-2 border-b border-[#c5a059]/30`}>System Health</h3>
                        <div className="grid gap-6">
                            {[
                                { name: 'API Core', status: 'Operational' },
                                { name: 'Supabase DB', status: 'Normal' },
                                { name: 'Storage Bucket', status: 'Active' }
                            ].map((node, i) => (
                                <div key={i} className="flex justify-between items-center p-4 bg-white/30 border-l-[3px] border-[#c5a059]">
                                    <span className={`${jetbrains.className} text-sm font-medium`}>{node.name}</span>
                                    <span className="text-xs uppercase tracking-wider text-[#4f772d] flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#4f772d] animate-pulse shadow-[0_0_10px_#4f772d]" />
                                        {node.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </main>

            {/* --- MODALS (Adapted to Vellum) --- */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 bg-[#1a1c1e]/10 backdrop-blur-sm flex items-center justify-center p-8">
                    <form onSubmit={handleCreateTenant} className="bg-[#f7f3ee] border border-[#1a1c1e]/10 shadow-2xl w-full max-w-lg relative p-8">
                        <div className="absolute top-0 left-0 w-full h-1 bg-[#c5a059]" />
                        <h2 className="font-extrabold text-2xl mb-2 text-[#1a1c1e]">NEW TENANT</h2>
                        <p className={`${jetbrains.className} text-xs text-[#8e9196] mb-8`}>INITIALIZE NEW ORGANIZATION SPACE</p>

                        <div className="space-y-6">
                            <div>
                                <label className={`${jetbrains.className} text-xs uppercase block mb-2 text-[#4a4d52]`}>Organization Name</label>
                                <input 
                                    autoFocus
                                    value={newTenantName}
                                    onChange={e => {
                                        setNewTenantName(e.target.value);
                                        setNewTenantSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                                    }}
                                    className={`w-full bg-white/50 border border-[#1a1c1e]/20 p-3 text-[#1a1c1e] outline-none focus:border-[#c5a059] transition-colors ${jetbrains.className} text-sm`}
                                    placeholder="Studio ABC"
                                />
                            </div>
                            <div>
                                <label className={`${jetbrains.className} text-xs uppercase block mb-2 text-[#4a4d52]`}>Slug</label>
                                <input 
                                    value={newTenantSlug}
                                    onChange={e => setNewTenantSlug(e.target.value)}
                                    className={`w-full bg-white/50 border border-[#1a1c1e]/20 p-3 text-[#1a1c1e] outline-none focus:border-[#c5a059] transition-colors ${jetbrains.className} text-sm`}
                                />
                                <div className={`${jetbrains.className} text-[0.65rem] text-[#c5a059] mt-2`}>aura.app/{newTenantSlug}</div>
                            </div>
                        </div>

                        {error && <div className={`${jetbrains.className} text-xs text-red-600 mt-4`}>ERROR: {error}</div>}

                        <div className="flex gap-4 mt-8 pt-6 border-t border-[#1a1c1e]/10">
                            <button type="button" onClick={() => setShowCreateModal(false)} className={`${jetbrains.className} text-xs px-4 py-3 hover:bg-[#1a1c1e]/5`}>CANCEL</button>
                            <button disabled={creating} className={`${jetbrains.className} flex-1 bg-[#1a1c1e] text-[#f7f3ee] text-xs px-4 py-3 hover:shadow-lg transition-all`}>
                                {creating ? 'INITIALIZING...' : 'CONFIRM INITIALIZATION'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {showEditModal && (
                <div className="fixed inset-0 z-50 bg-[#1a1c1e]/10 backdrop-blur-sm flex items-center justify-center p-8">
                    <form onSubmit={handleUpdateTenant} className="bg-[#f7f3ee] border border-[#1a1c1e]/10 shadow-2xl w-full max-w-lg relative p-8">
                        <div className="absolute top-0 left-0 w-full h-1 bg-[#c5a059]" />
                        <h2 className="font-extrabold text-2xl mb-2 text-[#1a1c1e]">EDIT TENANT</h2>
                        <p className={`${jetbrains.className} text-xs text-[#8e9196] mb-8`}>MODIFY PARAMS FOR {selectedOrg?.name.toUpperCase()}</p>

                        <div className="space-y-6">
                            <div>
                                <label className={`${jetbrains.className} text-xs uppercase block mb-2 text-[#4a4d52]`}>Plan</label>
                                <select 
                                    value={editPlan} 
                                    onChange={e => setEditPlan(e.target.value)}
                                    className={`w-full bg-white/50 border border-[#1a1c1e]/20 p-3 text-[#1a1c1e] outline-none focus:border-[#c5a059] transition-colors ${jetbrains.className} text-sm`}
                                >
                                    <option value="free">FREE</option>
                                    <option value="pro">PRO</option>
                                    <option value="enterprise">ENTERPRISE</option>
                                </select>
                            </div>
                            <div>
                                <label className={`${jetbrains.className} text-xs uppercase block mb-2 text-[#4a4d52]`}>Storage Limit</label>
                                <input 
                                    type="number"
                                    value={editLimit}
                                    onChange={e => setEditLimit(Number(e.target.value))}
                                    className={`w-full bg-white/50 border border-[#1a1c1e]/20 p-3 text-[#1a1c1e] outline-none focus:border-[#c5a059] transition-colors ${jetbrains.className} text-sm`}
                                />
                            </div>
                        </div>

                        <div className="flex gap-4 mt-8 pt-6 border-t border-[#1a1c1e]/10">
                            <button type="button" onClick={() => setShowEditModal(false)} className={`${jetbrains.className} text-xs px-4 py-3 hover:bg-[#1a1c1e]/5`}>CANCEL</button>
                            <button disabled={updating} className={`${jetbrains.className} flex-1 bg-[#1a1c1e] text-[#f7f3ee] text-xs px-4 py-3 hover:shadow-lg transition-all`}>
                                SAVE CHANGES
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
