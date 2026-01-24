/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Loader2, Image as ImageIcon, Download, CheckCircle2, X, Search } from 'lucide-react';

interface Photo {
    id: string;
    full_path: string;
    photo_date: string;
    created_at: string;
    metadata?: any;
}

import { parseJwt } from '@/utils/auth';

export default function GalleryPage() {
    const [photos, setPhotos] = useState<Photo[]>([]);
    const [loading, setLoading] = useState(true);
    const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
    const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [orgId, setOrgId] = useState<string | null>(null);

    useEffect(() => {
        const token = sessionStorage.getItem('admin_token');
        if (token) {
            const claims = parseJwt(token);
            if (claims?.org_id) setOrgId(claims.org_id);
        }
    }, []);

    useEffect(() => {
        if (orgId) fetchPhotos();
    }, [orgId]);

    const fetchPhotos = async () => {
        setLoading(true);
        try {
            let query = supabase.from('photos').select('*').order('created_at', { ascending: false });
            if (orgId) query = query.eq('org_id', orgId);
            
            const { data, error } = await query;
            if (error) throw error;
            setPhotos(data || []);
        } catch (err) {
            console.error('Failed to fetch photos:', err);
        } finally {
            setLoading(false);
        }
    };

    // Generate signed URLs for thumbnails
    useEffect(() => {
        const generateUrls = async () => {
            const newUrls: Record<string, string> = {};
            for (const p of photos.slice(0, 50)) { // Limit to first 50
                if (!imageUrls[p.full_path]) {
                    const { data } = await supabase.storage.from('photos').createSignedUrl(p.full_path, 3600);
                    if (data?.signedUrl) newUrls[p.full_path] = data.signedUrl;
                }
            }
            if (Object.keys(newUrls).length > 0) {
                setImageUrls(prev => ({ ...prev, ...newUrls }));
            }
        };
        if (photos.length > 0) generateUrls();
    }, [photos]);

    const filteredPhotos = photos.filter(p => 
        p.full_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-wider">Gallery</h1>
                    <p className="text-white/40 text-sm mt-1 font-mono">{photos.length} photos indexed</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <input
                        type="text"
                        placeholder="Search photos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:border-[#7C3AED]/50 outline-none w-64"
                    />
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
                </div>
            ) : filteredPhotos.length === 0 ? (
                <div className="text-center py-20 border border-white/5 rounded-2xl bg-white/[0.01]">
                    <ImageIcon className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <p className="text-white/30 text-sm">No photos found</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {filteredPhotos.map(photo => (
                        <div
                            key={photo.id}
                            onClick={() => setSelectedPhoto(photo)}
                            className="group relative aspect-square bg-[#0a0a0a] rounded-xl overflow-hidden border border-white/5 hover:border-[#7C3AED]/30 cursor-pointer transition-all"
                        >
                            {imageUrls[photo.full_path] ? (
                                <img
                                    src={imageUrls[photo.full_path]}
                                    alt=""
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                                <p className="text-[10px] font-mono text-white/70 truncate">{photo.id.slice(0, 8)}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Lightbox */}
            {selectedPhoto && (
                <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
                    <button className="absolute top-4 right-4 p-2 text-white/40 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                    <img
                        src={imageUrls[selectedPhoto.full_path]}
                        alt=""
                        className="max-w-full max-h-[90vh] object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}
