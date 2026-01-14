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
            // 1. Fetch Organizations (Server-Side)
            const orgRes = await fetch('/api/superadmin/organizations');
            const orgResult = await orgRes.json();
            if (orgResult.error) throw new Error(orgResult.error);
            setOrgs(orgResult.data || []);
            
            // 2. Fetch Stats (Server-Side)
            const statRes = await fetch('/api/superadmin/stats');
            const statResult = await statRes.json();
            if (statResult.error) throw new Error(statResult.error);
            setStats(statResult.data); // Fixed structure in API

            // 3. Fetch Logs (Server-Side)
            const logRes = await fetch('/api/superadmin/logs');
            const logResult = await logRes.json();
            if (logResult.error) throw new Error(logResult.error);
            setLogs(logResult.data || []);
            
        } catch (err: any) {
            console.error("Fetch error:", err);
            setError("Failed to load dashboard data: " + err.message);
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

    // --- RENDER (Vellum Edition) ---
    if (!token) return <div className="min-h-screen bg-[#f7f3ee]" />;

    return (
        <div className="vellum-wrapper min-h-screen relative flex flex-col font-sans text-[#1a1c1e] overflow-x-hidden selection:bg-[#c5a059] selection:text-white">
            {/* 1. CSS VARIABLES & STYLES (User Provided) */}
            <style dangerouslySetInnerHTML={{ __html: `
                :root {
                    --vellum-base: #f7f3ee;
                    --ink-deep: #1a1c1e;
                    --ink-medium: #4a4d52;
                    --ink-light: #8e9196;
                    --accent-gold: #c5a059;
                    --status-green: #4f772d;
                    --paper-texture: url("https://www.transparenttextures.com/patterns/felt.png");
                    --grain: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
                }

                .vellum-wrapper {
                    background-color: var(--vellum-base);
                    background-image: var(--paper-texture);
                }

                /* The Grain Overlay */
                .vellum-wrapper::before {
                    content: "";
                    position: fixed;
                    top: 0; left: 0; width: 100%; height: 100%;
                    opacity: 0.04;
                    pointer-events: none;
                    z-index: 9999;
                    background-image: var(--grain);
                }

                /* Force headers to ink color to override global dark theme */
                .vellum-wrapper h1, .vellum-wrapper h2, .vellum-wrapper h3, .vellum-wrapper h4 {
                    color: var(--ink-deep) !important;
                }
                .vellum-wrapper p, .vellum-wrapper span, .vellum-wrapper div, .vellum-wrapper label {
                    color: var(--ink-medium);
                }

                /* Allow utility classes to override the defaults */
                .vellum-wrapper .text-red-600 { color: #dc2626 !important; }
                .vellum-wrapper .text-green-600 { color: #16a34a !important; }
                .vellum-wrapper .bg-red-400 { background-color: #f87171 !important; }
                .vellum-wrapper .bg-[#4f772d] { background-color: #4f772d !important; }
                
                /* Vellum Etched Header */
                .vellum-nav {
                    padding: 2rem 4rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    border-bottom: 1px solid rgba(26, 28, 30, 0.08);
                    position: relative;
                }

                .logo-area {
                    display: flex;
                    flex-direction: column;
                }

                .logo-area h1 {
                    font-family: ${inter.style.fontFamily};
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: -0.04em;
                    font-size: 2.5rem;
                    line-height: 0.9;
                    color: var(--ink-deep);
                }

                .logo-area span {
                    font-family: ${jetbrains.style.fontFamily};
                    font-size: 0.75rem;
                    color: var(--accent-gold);
                    text-transform: uppercase;
                    letter-spacing: 0.2em;
                    margin-top: 0.5rem;
                }

                .logout-btn {
                    font-family: ${jetbrains.style.fontFamily};
                    background: none;
                    border: none;
                    text-decoration: none;
                    color: var(--ink-light);
                    font-size: 0.8rem;
                    border-bottom: 1px solid transparent;
                    transition: all 0.3s ease;
                    cursor: pointer;
                }

                .logout-btn:hover {
                    color: var(--ink-deep);
                    border-color: var(--ink-deep);
                }

                /* Dashboard Grid */
                .dashboard-main {
                    display: grid;
                    grid-template-columns: 1.5fr 1fr;
                    gap: 4rem;
                    padding: 4rem;
                    flex-grow: 1;
                }

                @media (max-width: 1024px) {
                    .dashboard-main { grid-template-columns: 1fr; padding: 2rem; }
                    .stats-grid { grid-template-columns: 1fr 1fr !important; }
                    .vellum-nav { padding: 2rem; }
                }

                /* Stats Layer */
                .stats-grid {
                    grid-column: 1 / -1;
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 2rem;
                    margin-bottom: 2rem;
                }

                .stat-card {
                    position: relative;
                    padding: 1.5rem 0;
                    border-top: 1px solid rgba(26, 28, 30, 0.1);
                    opacity: 0;
                    animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .stat-card:nth-child(1) { animation-delay: 0.1s; }
                .stat-card:nth-child(2) { animation-delay: 0.2s; }
                .stat-card:nth-child(3) { animation-delay: 0.3s; }
                .stat-card:nth-child(4) { animation-delay: 0.4s; }

                .stat-label {
                    font-family: ${jetbrains.style.fontFamily};
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    color: var(--ink-light);
                    margin-bottom: 1rem;
                    display: block;
                }

                .stat-value {
                    font-family: ${inter.style.fontFamily};
                    font-size: 3rem;
                    font-weight: 300;
                    letter-spacing: -0.05em;
                    color: var(--ink-deep);
                }

                .stat-unit {
                    font-size: 1rem;
                    margin-left: 0.5rem;
                    color: var(--ink-medium);
                }

                /* Management Sector */
                .management-sector {
                    display: flex;
                    flex-direction: column;
                }

                .sector-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 3rem;
                }

                .sector-title {
                    font-weight: 800;
                    font-size: 1.2rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--ink-deep);
                }

                .btn-new {
                    background: var(--ink-deep);
                    color: var(--vellum-base);
                    padding: 0.8rem 1.5rem;
                    font-family: ${jetbrains.style.fontFamily};
                    font-size: 0.75rem;
                    border: none;
                    cursor: pointer;
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                }
                .btn-new:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                }

                .empty-state {
                    border: 1px dashed rgba(26, 28, 30, 0.2);
                    height: 300px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.2);
                    backdrop-filter: blur(4px);
                    position: relative;
                }
                .empty-state::after {
                    content: "VOID";
                    position: absolute;
                    font-size: 8rem;
                    font-weight: 900;
                    opacity: 0.02;
                    pointer-events: none;
                    color: #000;
                }
                .empty-state p {
                    font-family: ${jetbrains.style.fontFamily};
                    font-size: 0.9rem;
                    color: var(--ink-light);
                    margin-bottom: 1.5rem;
                }

                /* Sidebar */
                .sidebar {
                    display: flex;
                    flex-direction: column;
                    gap: 4rem;
                }
                .sidebar-group h3 {
                    font-family: ${jetbrains.style.fontFamily};
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    color: var(--accent-gold);
                    margin-bottom: 2rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 1px solid rgba(197, 160, 89, 0.3);
                }
                .activity-item {
                    padding: 1.5rem 0;
                    border-bottom: 1px solid rgba(26, 28, 30, 0.05);
                    font-size: 0.9rem;
                    color: var(--ink-medium);
                }
                .activity-item .meta {
                    display: block;
                    font-family: ${jetbrains.style.fontFamily};
                    font-size: 0.7rem;
                    color: var(--ink-light);
                    margin-top: 0.5rem;
                }
                .view-all {
                    margin-top: 1.5rem;
                    display: inline-block;
                    font-family: ${jetbrains.style.fontFamily};
                    font-size: 0.7rem;
                    color: var(--ink-deep);
                    text-decoration: underline;
                    text-underline-offset: 4px;
                    cursor: pointer;
                }

                /* Health Nodes */
                .health-grid { display: grid; gap: 1.5rem; }
                .health-node {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem;
                    background: rgba(255, 255, 255, 0.3);
                    border-left: 3px solid var(--accent-gold);
                    opacity: 0; 
                    animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                .node-name {
                    font-family: ${jetbrains.style.fontFamily};
                    font-size: 0.8rem;
                    font-weight: 500;
                    color: var(--ink-deep);
                }
                .node-status {
                    font-size: 0.7rem;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--status-green);
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                .node-status::before {
                    content: "";
                    width: 6px;
                    height: 6px;
                    background: var(--status-green);
                    border-radius: 50%;
                    display: inline-block;
                    box-shadow: 0 0 10px var(--status-green);
                    animation: pulse 2s infinite;
                }

                @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}} />

            <nav className="vellum-nav">
                <div className="logo-area">
                    <h1>Aura</h1>
                    <span>Platform Control</span>
                </div>
                <button onClick={handleLogout} className="logout-btn">/ Logout</button>
            </nav>

            <main className="dashboard-main">
                {/* STATUS BAR */}
                <section className="stats-grid">
                    {[
                        { label: 'Total Tenants', value: stats?.total_tenants || 0},
                        { label: 'Active Now', value: stats?.active_tenants || 0 },
                        { label: 'Total Photos', value: stats?.total_photos?.toLocaleString() || 0 },
                        { label: 'Storage', value: stats?.total_storage_gb.toFixed(1) || '0.0', unit: 'GB' }
                    ].map((stat, i) => (
                        <div key={i} className="stat-card">
                            <span className="stat-label">{stat.label}</span>
                            <div className="stat-value">
                                {stat.value}
                                {stat.unit && <span className="stat-unit">{stat.unit}</span>}
                            </div>
                        </div>
                    ))}
                </section>

                {/* MANAGEMENT */}
                <section className="management-sector">
                    <header className="sector-header">
                        <h2 className="sector-title">Organizations</h2>
                        <button onClick={() => setShowCreateModal(true)} className="btn-new">CREATE FIRST TENANT</button>
                    </header>
                    
                    {orgs.length === 0 ? (
                        <div className="empty-state">
                            <p>No tenants created yet</p>
                            <span style={{ fontFamily: jetbrains.style.fontFamily, fontSize: '0.6rem', color: 'var(--accent-gold)' }}>SYSTEM IDLE : WAITING FOR INPUT</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {orgs.map((org) => (
                                <div key={org.id} className="bg-white/40 border border-[#1a1c1e]/5 p-6 flex justify-between items-center hover:bg-white/60 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className="font-bold text-lg text-[#1a1c1e]">{org.name}</span>
                                            {org.is_active 
                                                ? <div className="w-2 h-2 rounded-full bg-[#4f772d] shadow-[0_0_8px_#4f772d]" /> 
                                                : <div className="w-2 h-2 rounded-full bg-red-400" />
                                            }
                                        </div>
                                        <div className={`text-xs text-[#8e9196] ${jetbrains.className}`}>
                                            {org.slug} • {org.plan.toUpperCase()} • {formatBytes(org.storage_used_bytes)} / {org.storage_limit_gb}GB
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => { setSelectedOrg(org); setEditPlan(org.plan); setEditLimit(org.storage_limit_gb); setShowEditModal(true); }} className={`text-xs underline decoration-[#1a1c1e]/30 hover:decoration-[#1a1c1e] text-[#1a1c1e] ${jetbrains.className}`}>EDIT</button>
                                        <button onClick={() => toggleStatus(org)} className={`text-xs text-[#8e9196] hover:text-[#1a1c1e] ${jetbrains.className}`}>{org.is_active ? 'SUSPEND' : 'ACTIVATE'}</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* SIDEBAR */}
                <aside className="sidebar">
                    <div className="sidebar-group">
                        <h3>Platform Activity</h3>
                        <ul className="activity-log">
                            {logs.length === 0 ? (
                                <li className="activity-item">
                                    System environment initialized.
                                    <span className="meta">Just now // [SYS]</span>
                                </li>
                            ) : logs.map(log => (
                                <li key={log.id} className="activity-item">
                                    {log.action.toUpperCase()} - {log.organizations?.name || 'Unknown'}
                                    <span className="meta">
                                        {new Date(log.created_at).toLocaleTimeString()} // [ID:{log.id.slice(0,4)}]
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <Link href="/superadmin/logs" className="view-all">View Full Audit Log</Link>
                    </div>

                    <div className="sidebar-group">
                        <h3>System Health</h3>
                        <div className="health-grid">
                            {[
                                { name: 'API Core', status: 'Operational' },
                                { name: 'Supabase DB', status: 'Normal' },
                                { name: 'Storage Bucket', status: 'Active' }
                            ].map((node, i) => (
                                <div key={i} className="health-node" style={{ animationDelay: `${0.5 + (i * 0.1)}s` }}>
                                    <span className="node-name">{node.name}</span>
                                    <span className="node-status">{node.status}</span>
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
                        <h2 className={`font-extrabold text-2xl mb-2 text-[#1a1c1e] ${inter.className}`}>NEW TENANT</h2>
                        <p className={`text-xs text-[#8e9196] mb-8 ${jetbrains.className}`}>INITIALIZE NEW ORGANIZATION SPACE</p>

                        <div className="space-y-6">
                            <div>
                                <label className={`text-xs uppercase block mb-2 text-[#4a4d52] ${jetbrains.className}`}>Organization Name</label>
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
                                <label className={`text-xs uppercase block mb-2 text-[#4a4d52] ${jetbrains.className}`}>Slug</label>
                                <input 
                                    value={newTenantSlug}
                                    onChange={e => setNewTenantSlug(e.target.value)}
                                    className={`w-full bg-white/50 border border-[#1a1c1e]/20 p-3 text-[#1a1c1e] outline-none focus:border-[#c5a059] transition-colors ${jetbrains.className} text-sm`}
                                />
                                <div className={`text-[0.65rem] text-[#c5a059] mt-2 ${jetbrains.className}`}>aura.app/{newTenantSlug}</div>
                            </div>
                        </div>

                        {error && <div className={`text-xs text-red-600 mt-4 ${jetbrains.className}`}>ERROR: {error}</div>}

                        <div className="flex gap-4 mt-8 pt-6 border-t border-[#1a1c1e]/10">
                            <button type="button" onClick={() => setShowCreateModal(false)} className={`text-xs px-4 py-3 hover:bg-[#1a1c1e]/5 text-[#1a1c1e] ${jetbrains.className}`}>CANCEL</button>
                            <button disabled={creating} className={`flex-1 bg-[#1a1c1e] text-[#f7f3ee] text-xs px-4 py-3 hover:shadow-lg transition-all ${jetbrains.className}`}>
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
                            <button type="button" onClick={() => setShowEditModal(false)} className={`${jetbrains.className} text-xs px-4 py-3 hover:bg-[#1a1c1e]/5 text-[#1a1c1e]`}>CANCEL</button>
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
