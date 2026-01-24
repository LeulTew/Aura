/**
 * Phase 6C: Admin Trash Management Page
 * 
 * Allows admins to view, restore, and permanently delete trashed photos
 */
'use client';

import { useState, useEffect } from "react";
import { 
    Loader2, Trash2, RotateCcw, 
    AlertCircle, CheckCircle2, Clock, Image as ImageIcon
} from "lucide-react";

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
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#7C3AED]" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b border-gray-200 dark:border-white/5">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-black uppercase tracking-tight font-sans">Trash</h1>
                    <div className="h-6 w-px bg-gray-200 dark:bg-white/10" />
                    <span className="font-mono text-sm text-gray-400 dark:text-white/40">
                        {photos.length} item{photos.length !== 1 ? 's' : ''}
                    </span>
                </div>
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

            {/* Trash Grid */}
            <div>
                {photos.length === 0 ? (
                    <div className="border border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-[#050505] p-24 text-center rounded-2xl">
                        <Trash2 className="w-16 h-16 text-gray-300 dark:text-white/5 mx-auto mb-6" />
                        <p className="font-mono text-gray-400 dark:text-white/40 mb-2 uppercase tracking-wide">Trash is empty</p>
                        <p className="text-gray-500 dark:text-white/20 text-sm">Deleted photos will appear here for 30 days before permanent removal.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {photos.map((photo) => {
                            const daysRemaining = getDaysRemaining(photo.metadata?.trashed_at || photo.created_at);
                            const isLoading = actionLoading === photo.id;
                            
                            return (
                                <div 
                                    key={photo.id}
                                    className="border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050505] p-6 hover:border-gray-300 dark:hover:border-white/20 transition-all rounded-xl shadow-sm"
                                >
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-12 h-12 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center shrink-0 rounded-lg">
                                            <ImageIcon className="w-5 h-5 text-gray-400 dark:text-white/20" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-sm truncate mb-1 text-gray-900 dark:text-white">
                                                {photo.full_path.split('/').pop() || 'Unknown'}
                                            </h3>
                                            <p className="text-[10px] text-gray-400 dark:text-white/40 font-mono truncate">
                                                {photo.metadata?.original_path || photo.full_path}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 mb-4 text-xs">
                                        <Clock className="w-3 h-3 text-gray-400 dark:text-white/30" />
                                        <span className={`${daysRemaining <= 7 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-white/40'} font-mono`}>
                                            {daysRemaining} days remaining
                                        </span>
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleRestore(photo.id)}
                                            disabled={isLoading}
                                            className="flex-1 py-2 bg-[#7C3AED] hover:bg-[#6B2FD6] text-white text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 rounded-lg"
                                        >
                                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                                            Restore
                                        </button>
                                        <button
                                            onClick={() => handlePermanentDelete(photo.id)}
                                            disabled={isLoading}
                                            className="py-2 px-4 border border-red-500/30 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 text-xs uppercase tracking-widest font-bold transition-colors disabled:opacity-50 rounded-lg"
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
        </div>
    );
}
