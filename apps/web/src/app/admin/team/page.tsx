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

import { parseJwt } from '@/utils/auth';

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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-gray-200 dark:border-white/5">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight font-sans">Team Management</h1>
                    <p className="text-gray-500 dark:text-white/40 text-sm mt-1 font-mono uppercase tracking-wider">Manage access and permissions</p>
                </div>
                
                <button
                    onClick={() => setShowInviteModal(true)}
                    className="bg-black dark:bg-white text-white dark:text-black px-6 py-3 text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-2 rounded-xl"
                >
                    <Plus className="w-4 h-4" />
                    Add Member
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

            {/* Team Table */}
            <div className="border border-gray-200 dark:border-white/5 bg-white dark:bg-[#050505] rounded-2xl overflow-hidden shadow-sm">
                {/* Table Header */}
                <div className="grid grid-cols-[1.5fr_1.5fr_1fr_0.5fr] gap-4 p-6 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02]">
                    <div className="font-mono text-xs uppercase tracking-wider text-gray-400 dark:text-white/40">Member</div>
                    <div className="font-mono text-xs uppercase tracking-wider text-gray-400 dark:text-white/40">Email</div>
                    <div className="font-mono text-xs uppercase tracking-wider text-gray-400 dark:text-white/40">Role</div>
                    <div className="font-mono text-xs uppercase tracking-wider text-gray-400 dark:text-white/40 text-right">Actions</div>
                </div>
                
                {/* Table Body */}
                {members.length === 0 ? (
                    <div className="p-24 text-center">
                        <Users className="w-12 h-12 text-gray-200 dark:text-white/5 mx-auto mb-4" />
                        <p className="font-mono text-gray-400 dark:text-white/40 text-sm">No personnel found</p>
                    </div>
                ) : (
                    members.map((member) => (
                        <div 
                            key={member.id}
                            className="grid grid-cols-[1.5fr_1.5fr_1fr_0.5fr] gap-4 p-6 border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors items-center group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center border border-gray-200 dark:border-white/10 group-hover:border-[#7C3AED]/30 transition-colors">
                                    <Camera className="w-4 h-4 text-gray-400 dark:text-white/40 group-hover:text-[#7C3AED] transition-colors" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-sm leading-none mb-1 text-gray-900 dark:text-white">{member.display_name || 'Anonymous User'}</span>
                                    <span className="font-mono text-[10px] text-gray-400 dark:text-white/30">ID: {member.id.substring(0, 8)}</span>
                                </div>
                            </div>
                            <div className="text-gray-500 dark:text-white/60 font-mono text-xs">
                                {member.email}
                            </div>
                            <div className="flex items-center">
                                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded border ${
                                    member.role === 'admin' 
                                        ? 'bg-black dark:bg-white text-white dark:text-black border-transparent' 
                                        : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/60 border-gray-200 dark:border-white/10'
                                }`}>
                                    {member.role}
                                </span>
                            </div>
                            <div className="flex items-center justify-end">
                                <button
                                    onClick={() => handleRemoveMember(member.id)}
                                    disabled={deletingId === member.id}
                                    className="w-8 h-8 flex items-center justify-center text-gray-400 dark:text-white/20 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50"
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

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/60 dark:bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-8 animate-in fade-in duration-300">
                    <div className="bg-white dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 max-w-lg w-full p-12 relative overflow-hidden rounded-3xl shadow-2xl">
                        
                        <div className="relative z-10">
                            <h2 className="font-sans font-black text-3xl mb-2 text-gray-900 dark:text-white uppercase tracking-tight">Add Personnel</h2>
                            <p className="font-mono text-gray-500 dark:text-white/40 text-xs mb-8 uppercase tracking-wider">
                                Grant access to the studio's digital assets.
                            </p>
                            
                            <form onSubmit={handleInvite} className="space-y-8">
                                <div>
                                    <label className="font-mono text-gray-500 dark:text-white/40 text-xs uppercase tracking-wider block mb-3">
                                        Identification (Email)
                                    </label>
                                    <input
                                        type="email"
                                        value={inviteEmail}
                                        onChange={(e) => setInviteEmail(e.target.value)}
                                        placeholder="employee@studio.aura"
                                        className="w-full h-14 px-6 bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/10 focus:border-[#7C3AED] dark:focus:border-[#7C3AED] outline-none transition-all text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/10 font-mono text-sm rounded-xl"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="font-mono text-gray-500 dark:text-white/40 text-xs uppercase tracking-wider block mb-3">
                                        Permissions Tier
                                    </label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            type="button"
                                            onClick={() => setInviteRole('employee')}
                                            className={`p-4 border rounded-xl transition-all text-left flex flex-col items-start gap-2 ${
                                                inviteRole === 'employee'
                                                    ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-black shadow-lg ring-2 ring-transparent'
                                                    : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/30 bg-white dark:bg-white/5'
                                            }`}
                                        >
                                            <Camera className={`w-5 h-5 ${inviteRole === 'employee' ? 'text-white dark:text-black' : 'text-gray-400 dark:text-white/40'}`} />
                                            <div>
                                                <div className="font-bold uppercase tracking-tight text-sm">Employee</div>
                                                <div className={`text-[10px] uppercase tracking-wider ${inviteRole === 'employee' ? 'opacity-60' : 'text-gray-400 dark:text-white/30'}`}>Capture & Sync</div>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setInviteRole('admin')}
                                            className={`p-4 border rounded-xl transition-all text-left flex flex-col items-start gap-2 ${
                                                inviteRole === 'admin'
                                                    ? 'border-[#7C3AED] bg-[#7C3AED] text-white shadow-lg ring-2 ring-transparent'
                                                    : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/30 bg-white dark:bg-white/5'
                                            }`}
                                        >
                                            <Shield className={`w-5 h-5 ${inviteRole === 'admin' ? 'text-white' : 'text-gray-400 dark:text-white/40'}`} />
                                            <div>
                                                <div className="font-bold uppercase tracking-tight text-sm">Admin</div>
                                                <div className={`text-[10px] uppercase tracking-wider ${inviteRole === 'admin' ? 'opacity-80' : 'text-gray-400 dark:text-white/30'}`}>System Control</div>
                                            </div>
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="flex gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setShowInviteModal(false)}
                                        className="flex-1 h-14 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/60 font-bold uppercase tracking-wider hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-xs rounded-xl"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={inviting}
                                        className="flex-1 h-14 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-wider hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3 text-xs rounded-xl"
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
        </div>
    );
}
