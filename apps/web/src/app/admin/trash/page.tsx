/**
 * Phase 6C: Admin Trash Management Page
 * 
 * Allows admins to view, restore, and permanently delete trashed photos
 */
'use client';

import { useState, useEffect } from "react";
import { 
    Loader2, Trash2, ArrowLeft, RotateCcw, 
    AlertCircle, CheckCircle2, Clock, Image as ImageIcon
} from "lucide-react";
import Link from 'next/link';

interface TrashedPhoto {
    id: string;
    full_path: string;
    metadata: {
        trashed: boolean;
        trashed_at: string;
        original_path: string;
    };
    created_at: string;
}

// Helper to decode JWT and extract claims
interface JwtClaims {
    org_id: string | null;
    org_slug: string | null;
    role: string;
}

function parseJwt(token: string): JwtClaims | null {
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

export default function TrashPage() {
    const [loading, setLoading] = useState(true);
    const [photos, setPhotos] = useState<TrashedPhoto[]>([]);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Design Tokens (Editorial Dark)
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
            
            if (claims.role !== 'admin' && claims.role !== 'superadmin') {
                window.location.href = "/admin";
                return;
            }
        }
    }, []);

    useEffect(() => {
        if (orgId) fetchTrash();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orgId]);

    const fetchTrash = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/trash?orgId=${orgId}`);
            const data = await res.json();
            
            if (data.success) {
                setPhotos(data.photos || []);
            } else {
                setError(data.error || 'Failed to fetch trash');
            }
        } catch (_err) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (photoId: string) => {
        setActionLoading(photoId);
        setError('');
        setSuccess('');
        
        try {
            const res = await fetch('/api/trash', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ photoId })
            });
            const data = await res.json();
            
            if (data.success) {
                setSuccess(data.message);
                fetchTrash();
            } else {
                setError(data.error || 'Restore failed');
            }
        } catch (_err) {
            setError('Network error during restore');
        } finally {
            setActionLoading(null);
        }
    };

    const handlePermanentDelete = async (photoId: string) => {
        if (!confirm('Permanently delete this photo? This cannot be undone.')) return;
        
        setActionLoading(photoId);
        setError('');
        setSuccess('');
        
        try {
            const res = await fetch(`/api/trash?photoId=${photoId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            
            if (data.success) {
                setSuccess(data.message);
                fetchTrash();
            } else {
                setError(data.error || 'Delete failed');
            }
        } catch (_err) {
            setError('Network error during delete');
        } finally {
            setActionLoading(null);
        }
    };

    const getDaysRemaining = (trashedAt: string) => {
        const trashed = new Date(trashedAt);
        const expires = new Date(trashed.getTime() + 30 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const days = Math.ceil((expires.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
        return Math.max(0, days);
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
                            <div className="w-8 h-8 bg-red-500 flex items-center justify-center">
                                <Trash2 className="w-5 h-5 text-white" />
                            </div>
                            <h1 className={`${fontDisplay} text-3xl`}>Trash</h1>
                        </div>
                    </div>
                    <div>
                        <span className={`${fontMono} text-white/40`}>
                            {photos.length} item{photos.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            </header>

            {/* Alerts */}
            <div className="max-w-[1400px] mx-auto px-8 mt-8">
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

            {/* Trash Grid */}
            <div className="max-w-[1400px] mx-auto px-8 py-12">
                {photos.length === 0 ? (
                    <div className="border border-white/5 bg-[#050505] p-24 text-center">
                        <Trash2 className="w-16 h-16 text-white/5 mx-auto mb-6" />
                        <p className={`${fontMono} text-white/40 mb-2`}>Trash is empty</p>
                        <p className="text-white/20 text-sm">Deleted photos will appear here for 30 days before permanent removal.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {photos.map((photo) => {
                            const daysRemaining = getDaysRemaining(photo.metadata?.trashed_at || photo.created_at);
                            const isLoading = actionLoading === photo.id;
                            
                            return (
                                <div 
                                    key={photo.id}
                                    className="border border-white/10 bg-[#050505] p-6 hover:border-white/20 transition-colors"
                                >
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-12 h-12 bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                                            <ImageIcon className="w-5 h-5 text-white/20" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-sm truncate mb-1">
                                                {photo.full_path.split('/').pop() || 'Unknown'}
                                            </h3>
                                            <p className="text-[10px] text-white/40 font-mono truncate">
                                                {photo.metadata?.original_path || photo.full_path}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mb-4 text-xs">
                                        <Clock className="w-3 h-3 text-white/30" />
                                        <span className={`${daysRemaining <= 7 ? 'text-red-400' : 'text-white/40'} font-mono`}>
                                            {daysRemaining} days remaining
                                        </span>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleRestore(photo.id)}
                                            disabled={isLoading}
                                            className="flex-1 py-2 bg-[#7C3AED] hover:bg-[#6B2FD6] text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                        >
                                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                            Restore
                                        </button>
                                        <button
                                            onClick={() => handlePermanentDelete(photo.id)}
                                            disabled={isLoading}
                                            className="py-2 px-4 border border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs uppercase tracking-widest font-bold transition-colors disabled:opacity-50"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </main>
    );
}
