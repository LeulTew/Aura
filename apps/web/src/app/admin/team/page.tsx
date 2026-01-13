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
            // In a real implementation, this would:
            // 1. Create a Supabase Auth user
            // 2. Create a profile with org_id
            // 3. Send an invite email
            
            // For now, we'll just insert into profiles (simulating invite)
            const { data, error } = await supabase
                .from('profiles')
                .insert({
                    email: inviteEmail,
                    role: inviteRole,
                    org_id: orgId,
                    display_name: inviteEmail.split('@')[0]
                })
                .select()
                .single();
            
            if (error) throw error;
            
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
                            <Users className="w-5 h-5 text-[#7C3AED]" />
                            <span className={`${fontDisplay} text-xl`}>Team</span>
                        </div>
                    </div>
                    
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="flex items-center gap-2 bg-[#7C3AED] text-white px-6 py-3 text-xs font-bold uppercase tracking-widest hover:bg-[#6D28D9] transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Member
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

            {/* Team Table */}
            <div className="max-w-6xl mx-auto px-8 py-8">
                <div className="border border-white/10 bg-[#050505]">
                    {/* Table Header */}
                    <div className="grid grid-cols-4 gap-4 p-6 border-b border-white/10 bg-black/50">
                        <div className={`${fontMono} text-white/40`}>Member</div>
                        <div className={`${fontMono} text-white/40`}>Email</div>
                        <div className={`${fontMono} text-white/40`}>Role</div>
                        <div className={`${fontMono} text-white/40 text-right`}>Actions</div>
                    </div>
                    
                    {/* Table Body */}
                    {members.length === 0 ? (
                        <div className="p-12 text-center">
                            <Users className="w-12 h-12 text-white/10 mx-auto mb-4" />
                            <p className={`${fontMono} text-white/40`}>No team members yet</p>
                            <p className="text-white/20 text-sm mt-2">Click "Add Member" to invite your first employee</p>
                        </div>
                    ) : (
                        members.map((member) => (
                            <div 
                                key={member.id}
                                className="grid grid-cols-4 gap-4 p-6 border-b border-white/5 hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center">
                                        <Camera className="w-5 h-5 text-[#7C3AED]" />
                                    </div>
                                    <span className="font-medium">{member.display_name || 'Unnamed'}</span>
                                </div>
                                <div className="flex items-center text-white/60 font-mono text-sm">
                                    {member.email}
                                </div>
                                <div className="flex items-center">
                                    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-widest ${
                                        member.role === 'admin' 
                                            ? 'bg-[#7C3AED]/20 text-[#7C3AED] border border-[#7C3AED]/30' 
                                            : 'bg-white/10 text-white/60 border border-white/10'
                                    }`}>
                                        {member.role}
                                    </span>
                                </div>
                                <div className="flex items-center justify-end">
                                    <button
                                        onClick={() => handleRemoveMember(member.id)}
                                        disabled={deletingId === member.id}
                                        className="p-2 text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
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
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-8">
                    <div className="bg-[#0A0A0A] border border-white/10 max-w-md w-full p-8">
                        <h2 className={`${fontDisplay} text-2xl mb-2`}>Add Team Member</h2>
                        <p className="text-white/40 font-mono text-xs mb-8">
                            INVITE A NEW MEMBER TO YOUR ORGANIZATION
                        </p>
                        
                        <form onSubmit={handleInvite} className="space-y-6">
                            <div>
                                <label className={`${fontMono} text-white/40 block mb-3`}>
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    placeholder="employee@studio.com"
                                    className="w-full h-14 px-5 bg-transparent border-2 border-white/10 focus:border-[#7C3AED] outline-none transition-all text-white placeholder:text-white/20 font-mono"
                                    required
                                />
                            </div>
                            
                            <div>
                                <label className={`${fontMono} text-white/40 block mb-3`}>
                                    Role
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        type="button"
                                        onClick={() => setInviteRole('employee')}
                                        className={`p-4 border-2 text-left transition-all ${
                                            inviteRole === 'employee'
                                                ? 'border-[#7C3AED] bg-[#7C3AED]/10'
                                                : 'border-white/10 hover:border-white/20'
                                        }`}
                                    >
                                        <Camera className="w-5 h-5 mb-2 text-white/60" />
                                        <div className="font-bold">Employee</div>
                                        <div className="text-xs text-white/40 mt-1">Can upload and search</div>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInviteRole('admin')}
                                        className={`p-4 border-2 text-left transition-all ${
                                            inviteRole === 'admin'
                                                ? 'border-[#7C3AED] bg-[#7C3AED]/10'
                                                : 'border-white/10 hover:border-white/20'
                                        }`}
                                    >
                                        <Shield className="w-5 h-5 mb-2 text-[#7C3AED]" />
                                        <div className="font-bold">Admin</div>
                                        <div className="text-xs text-white/40 mt-1">Full management access</div>
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
                                    className="flex-1 h-14 border-2 border-white/10 text-white font-bold uppercase tracking-widest hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={inviting}
                                    className="flex-1 h-14 bg-[#7C3AED] text-white font-bold uppercase tracking-widest hover:bg-[#6D28D9] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {inviting ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Mail className="w-4 h-4" />
                                            Send Invite
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
