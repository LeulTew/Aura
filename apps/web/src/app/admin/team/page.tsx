/* eslint-disable */
'use client';

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
    Loader2, Users, Plus, ArrowLeft, Trash2, 
    Mail, Shield, Camera, AlertCircle, CheckCircle2 
} from "lucide-react";
import Link from 'next/link';

interface TeamMember {
    id: string;
    email: string;
    display_name: string | null;
    role: 'admin' | 'employee';
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

export default function TeamPage() {
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    
    // Invite modal state
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState<'admin' | 'employee'>('employee');
    const [inviting, setInviting] = useState(false);
    
    // Delete state
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // Design Tokens (Editorial Dark)
    const accentColor = '#7C3AED';
    const fontDisplay = "font-sans font-black uppercase leading-[0.85] tracking-[-0.04em]";
    const fontMono = "font-mono text-xs uppercase tracking-[0.2em] font-medium";

    useEffect(() => {
        const token = sessionStorage.getItem("admin_token");
        if (!token) {
            window.location.href = "/login";
            return;
        }
        
        const claims = parseJwt(token);
        if (claims) {
            setOrgId(claims.org_id || null);
            setUserRole(claims.role || null);
            
            // Only admins can access team management
            if (claims.role !== 'admin' && claims.role !== 'superadmin') {
                window.location.href = "/admin";
                return;
            }
        }
    }, []);

    useEffect(() => {
        if (orgId) fetchTeamMembers();
    }, [orgId]);

    const fetchTeamMembers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, display_name, role, created_at')
                .eq('org_id', orgId)
                .order('created_at', { ascending: true });
            
            if (error) throw error;
            setMembers(data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviting(true);
        setError("");
        setSuccess("");
        
        try {
            const token = sessionStorage.getItem("admin_token");
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
            
            const res = await fetch(`${backendUrl}/api/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    email: inviteEmail,
                    role: inviteRole
                })
            });
            
            const result = await res.json();
            
            if (!res.ok) {
                throw new Error(result.detail || 'Invitation failed');
            }
            
            setSuccess(`Invited ${inviteEmail} as ${inviteRole}`);
            setShowInviteModal(false);
            setInviteEmail("");
            setInviteRole('employee');
            fetchTeamMembers();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setInviting(false);
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        setDeletingId(memberId);
        setError("");
        
        try {
            const { error } = await supabase
                .from('profiles')
                .delete()
                .eq('id', memberId);
            
            if (error) throw error;
            
            setMembers(prev => prev.filter(m => m.id !== memberId));
            setSuccess("Team member removed");
        } catch (err: any) {
            setError(err.message);
        } finally {
            setDeletingId(null);
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
                                <Users className="w-5 h-5 text-black" />
                            </div>
                            <h1 className={`${fontDisplay} text-3xl`}>Team Management</h1>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="bg-white text-black px-8 py-3 text-xs font-bold uppercase tracking-[0.2em] hover:bg-[#7C3AED] hover:text-white transition-all duration-300"
                    >
                        <Plus className="w-4 h-4 inline-block mr-2 -mt-0.5" />
                        Add Member
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

            {/* Team Table */}
            <div className="max-w-[1400px] mx-auto px-8 py-12">
                <div className="border border-white/5 bg-[#050505]">
                    {/* Table Header */}
                    <div className="grid grid-cols-[1.5fr_1.5fr_1fr_0.5fr] gap-4 p-8 border-b border-white/10 bg-black/50">
                        <div className={`${fontMono} text-white/60`}>Member</div>
                        <div className={`${fontMono} text-white/60`}>Email</div>
                        <div className={`${fontMono} text-white/60`}>Access Level</div>
                        <div className={`${fontMono} text-white/60 text-right`}>Options</div>
                    </div>
                    
                    {/* Table Body */}
                    {members.length === 0 ? (
                        <div className="p-24 text-center">
                            <Users className="w-16 h-16 text-white/5 mx-auto mb-6" />
                            <p className={`${fontMono} text-white/40 mb-2`}>No personnel found</p>
                            <p className="text-white/20 text-sm">Add a team member to grant access to your studio database.</p>
                        </div>
                    ) : (
                        members.map((member) => (
                            <div 
                                key={member.id}
                                className="grid grid-cols-[1.5fr_1.5fr_1fr_0.5fr] gap-4 p-8 border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center group-hover:border-[#7C3AED]/40 transition-colors">
                                        <Camera className="w-5 h-5 text-white/40 group-hover:text-[#7C3AED] transition-colors" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold text-lg leading-none mb-1">{member.display_name || 'Anonymous User'}</span>
                                        <span className={`${fontMono} text-[10px] text-white/30`}>ID: {member.id.substring(0, 8)}</span>
                                    </div>
                                </div>
                                <div className="flex items-center text-white/60 font-mono text-sm tracking-tight">
                                    {member.email}
                                </div>
                                <div className="flex items-center">
                                    <span className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] border ${
                                        member.role === 'admin' 
                                            ? 'bg-white text-black border-white' 
                                            : 'bg-transparent text-white/60 border-white/20'
                                    }`}>
                                        {member.role}
                                    </span>
                                </div>
                                <div className="flex items-center justify-end">
                                    <button
                                        onClick={() => handleRemoveMember(member.id)}
                                        disabled={deletingId === member.id}
                                        className="w-10 h-10 flex items-center justify-center text-white/20 hover:text-red-500 hover:bg-red-500/10 transition-all disabled:opacity-50"
                                        title="Revoke Access"
                                    >
                                        {deletingId === member.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-8 animate-in fade-in duration-300">
                    <div className="bg-black border border-white/10 max-w-lg w-full p-12 relative overflow-hidden">
                        {/* Decorative Background Element */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[#7C3AED]/5 blur-3xl rounded-full -mr-16 -mt-16" />
                        
                        <div className="relative z-10">
                            <h2 className={`${fontDisplay} text-4xl mb-2`}>Add Personnel</h2>
                            <p className={`${fontMono} text-white/40 mb-12`}>
                                Grant access to the studio's digital assets.
                            </p>
                            
                            <form onSubmit={handleInvite} className="space-y-10">
                                <div>
                                    <label className={`${fontMono} text-white/60 block mb-4`}>
                                        Identification (Email)
                                    </label>
                                    <input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="employee@studio.aura"
                                        className="w-full h-16 px-6 bg-white/[0.03] border border-white/10 focus:border-[#7C3AED] outline-none transition-all text-white placeholder:text-white/10 font-mono text-sm"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className={`${fontMono} text-white/60 block mb-4`}>
                                        Permissions Tier
                                    </label>
                                    <div className="grid grid-cols-2 gap-6">
                                        <button
                                            type="button"
                                            onClick={() => setInviteRole('employee')}
                                            className={`p-6 border transition-all text-left group ${
                                                inviteRole === 'employee'
                                                    ? 'border-white bg-white text-black'
                                                    : 'border-white/10 hover:border-white/30 bg-white/5'
                                            }`}
                                        >
                                            <Camera className={`w-6 h-6 mb-3 ${inviteRole === 'employee' ? 'text-black' : 'text-white/40'}`} />
                                            <div className="font-black uppercase tracking-tighter text-lg leading-none">Employee</div>
                                            <div className={`text-[10px] uppercase tracking-widest mt-2 ${inviteRole === 'employee' ? 'text-black/60' : 'text-white/30'}`}>Capture & Sync</div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setInviteRole('admin')}
                                            className={`p-6 border transition-all text-left group ${
                                                inviteRole === 'admin'
                                                    ? 'border-[#7C3AED] bg-[#7C3AED] text-white'
                                                    : 'border-white/10 hover:border-white/30 bg-white/5'
                                            }`}
                                        >
                                            <Shield className={`w-6 h-6 mb-3 ${inviteRole === 'admin' ? 'text-white' : 'text-white/40'}`} />
                                            <div className="font-black uppercase tracking-tighter text-lg leading-none">Admin</div>
                                            <div className={`text-[10px] uppercase tracking-widest mt-2 ${inviteRole === 'admin' ? 'text-white/60' : 'text-white/30'}`}>System Control</div>
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="flex gap-4 pt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowInviteModal(false)}
                                        className="flex-1 h-16 border border-white/10 text-white font-bold uppercase tracking-[0.2em] hover:bg-white/5 transition-all text-xs"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={inviting}
                                        className="flex-1 h-16 bg-white text-black font-bold uppercase tracking-[0.2em] hover:bg-[#7C3AED] hover:text-white transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-xs"
                                    >
                                        {inviting ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                <Mail className="w-4 h-4" />
                                                Send Clearance
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
