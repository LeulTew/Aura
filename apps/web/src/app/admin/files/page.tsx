/* eslint-disable */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { 
    Folder, File, UploadCloud, FolderPlus, Trash2, 
    ChevronRight, Home, Loader2, Image as ImageIcon,
    MoreVertical, Download, Move
} from 'lucide-react';

interface FileItem {
    name: string;
    type: 'folder' | 'file';
    path: string;
    size?: number;
    lastModified?: string;
}

// JWT Parser
function parseJwt(token: string): any {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
        );
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

export default function FilesPage() {
    const [currentPath, setCurrentPath] = useState<string>('');
    const [items, setItems] = useState<FileItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [orgSlug, setOrgSlug] = useState<string>('');
    const [showNewFolderModal, setShowNewFolderModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [creating, setCreating] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [thumbnails, setThumbnails] = useState<Record<string, string>>({});

    // Generate thumbnails for image files
    useEffect(() => {
        const generateThumbnails = async () => {
            const imageItems = items.filter(i => i.type === 'file' && /\.(jpg|jpeg|png|webp|gif)$/i.test(i.name));
            const newThumbnails: Record<string, string> = {};
            
            for (const item of imageItems.slice(0, 30)) { // Limit to first 30
                if (!thumbnails[item.path]) {
                    const { data } = await supabase.storage.from('photos').createSignedUrl(item.path, 3600);
                    if (data?.signedUrl) newThumbnails[item.path] = data.signedUrl;
                }
            }
            
            if (Object.keys(newThumbnails).length > 0) {
                setThumbnails(prev => ({ ...prev, ...newThumbnails }));
            }
        };
        
        if (items.length > 0) generateThumbnails();
    }, [items]);

    useEffect(() => {
        const token = sessionStorage.getItem('admin_token');
        if (token) {
            const claims = parseJwt(token);
            if (claims?.org_slug) {
                setOrgSlug(claims.org_slug);
                setCurrentPath(claims.org_slug);
            }
        }
    }, []);

    useEffect(() => {
        if (orgSlug) fetchItems();
    }, [currentPath, orgSlug]);

    const fetchItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.storage
                .from('photos')
                .list(currentPath || orgSlug, {
                    limit: 200,
                    sortBy: { column: 'name', order: 'asc' }
                });

            if (error) throw error;

            const fileItems: FileItem[] = (data || []).map(item => ({
                name: item.name,
                type: item.id === null ? 'folder' : 'file',
                path: `${currentPath}/${item.name}`,
                size: item.metadata?.size,
                lastModified: item.updated_at
            }));

            // Sort: folders first, then files
            fileItems.sort((a, b) => {
                if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                return a.name.localeCompare(b.name);
            });

            setItems(fileItems);
        } catch (err) {
            console.error('Failed to fetch items:', err);
        } finally {
            setLoading(false);
        }
    };

    const navigateTo = (path: string) => {
        setCurrentPath(path);
        setSelectedItems(new Set());
    };

    const navigateUp = () => {
        const parts = currentPath.split('/');
        if (parts.length > 1) {
            parts.pop();
            setCurrentPath(parts.join('/'));
        }
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        setCreating(true);
        
        try {
            // Supabase doesn't have "create folder" - we upload a placeholder file
            const folderPath = `${currentPath}/${newFolderName}/.keep`;
            const { error } = await supabase.storage
                .from('photos')
                .upload(folderPath, new Blob(['']));

            if (error && !error.message.includes('already exists')) throw error;

            setShowNewFolderModal(false);
            setNewFolderName('');
            await fetchItems();
        } catch (err: any) {
            alert('Failed to create folder: ' + err.message);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedItems.size === 0) return;
        if (!confirm(`Delete ${selectedItems.size} item(s)? This cannot be undone.`)) return;

        try {
            const paths = Array.from(selectedItems);
            const { error } = await supabase.storage.from('photos').remove(paths);
            if (error) throw error;
            
            setSelectedItems(new Set());
            await fetchItems();
        } catch (err: any) {
            alert('Delete failed: ' + err.message);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(true);
        setUploadProgress(0);

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const filePath = `${currentPath}/${file.name}`;
                
                setUploadProgress(Math.round((i / files.length) * 100));

                const { error } = await supabase.storage
                    .from('photos')
                    .upload(filePath, file, { upsert: true });

                if (error) console.error(`Failed to upload ${file.name}:`, error);
            }

            setUploadProgress(100);
            await fetchItems();
        } catch (err: any) {
            alert('Upload failed: ' + err.message);
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const toggleSelect = (path: string) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    // Breadcrumb
    const pathParts = currentPath.split('/').filter(Boolean);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold uppercase tracking-wider">File Manager</h1>
                    <p className="text-white/40 text-sm mt-1 font-mono">Browse and manage your storage</p>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => setShowNewFolderModal(true)}
                        className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors flex items-center gap-2"
                    >
                        <FolderPlus className="w-4 h-4" /> New Folder
                    </button>
                    <label className="px-4 py-2 bg-[#7C3AED] rounded-lg text-sm font-medium hover:bg-[#7C3AED]/80 transition-colors cursor-pointer flex items-center gap-2">
                        <UploadCloud className="w-4 h-4" /> Upload Files
                        <input 
                            type="file" 
                            multiple 
                            className="hidden" 
                            onChange={handleFileUpload}
                            accept="image/*"
                        />
                    </label>
                </div>
            </div>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm overflow-x-auto pb-2">
                <button 
                    onClick={() => navigateTo(orgSlug)}
                    className="text-white/40 hover:text-white flex items-center gap-1"
                >
                    <Home className="w-4 h-4" />
                </button>
                {pathParts.map((part, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                        <ChevronRight className="w-4 h-4 text-white/20" />
                        <button 
                            onClick={() => navigateTo(pathParts.slice(0, idx + 1).join('/'))}
                            className={`hover:text-white transition-colors ${idx === pathParts.length - 1 ? 'text-white font-medium' : 'text-white/40'}`}
                        >
                            {part}
                        </button>
                    </div>
                ))}
            </div>

            {/* Upload Progress */}
            {uploading && (
                <div className="bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-2">
                        <Loader2 className="w-5 h-5 text-[#7C3AED] animate-spin" />
                        <span className="text-sm">Uploading files...</span>
                    </div>
                    <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-[#7C3AED] transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Selection Actions */}
            {selectedItems.size > 0 && (
                <div className="flex items-center gap-4 p-4 bg-[#7C3AED]/10 border border-[#7C3AED]/20 rounded-xl">
                    <span className="text-sm font-medium">{selectedItems.size} selected</span>
                    <div className="flex-1" />
                    <button 
                        onClick={handleDeleteSelected}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                    <button 
                        onClick={() => setSelectedItems(new Set())}
                        className="px-4 py-2 text-white/40 hover:text-white text-sm"
                    >
                        Clear
                    </button>
                </div>
            )}

            {/* File Grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-20 border border-white/5 rounded-2xl bg-white/[0.01]">
                    <Folder className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <p className="text-white/30 text-sm">This folder is empty</p>
                    <p className="text-white/20 text-xs mt-1">Upload files or create a new folder</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {items.map(item => (
                        <div
                            key={item.path}
                            onClick={() => item.type === 'folder' ? navigateTo(item.path) : toggleSelect(item.path)}
                            className={`group relative p-4 rounded-xl border cursor-pointer transition-all ${
                                selectedItems.has(item.path)
                                    ? 'bg-[#7C3AED]/10 border-[#7C3AED]/30'
                                    : 'bg-white/[0.02] border-white/5 hover:border-white/20 hover:bg-white/[0.04]'
                            }`}
                        >
                            <div className="flex flex-col items-center text-center">
                                {item.type === 'folder' ? (
                                    <Folder className="w-12 h-12 text-[#7C3AED]/70 mb-3" />
                                ) : thumbnails[item.path] ? (
                                    <div className="w-full aspect-square rounded-lg overflow-hidden mb-2">
                                        <img 
                                            src={thumbnails[item.path]} 
                                            alt={item.name}
                                            className="w-full h-full object-cover"
                                            loading="lazy"
                                        />
                                    </div>
                                ) : (
                                    <ImageIcon className="w-12 h-12 text-white/30 mb-3" />
                                )}
                                <p className="text-sm font-medium truncate w-full">{item.name}</p>
                                {item.size && (
                                    <p className="text-[10px] text-white/30 mt-1">
                                        {(item.size / 1024).toFixed(1)} KB
                                    </p>
                                )}
                            </div>
                            
                            {/* Checkbox */}
                            <div 
                                onClick={(e) => { e.stopPropagation(); toggleSelect(item.path); }}
                                className={`absolute top-2 left-2 w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                    selectedItems.has(item.path)
                                        ? 'bg-[#7C3AED] border-[#7C3AED]'
                                        : 'border-white/20 opacity-0 group-hover:opacity-100'
                                }`}
                            >
                                {selectedItems.has(item.path) && (
                                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
                                    </svg>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* New Folder Modal */}
            {showNewFolderModal && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 w-full max-w-md">
                        <h2 className="text-xl font-bold uppercase tracking-wider mb-6">New Folder</h2>
                        <input
                            type="text"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            placeholder="Folder name"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 focus:border-[#7C3AED]/50 outline-none"
                            autoFocus
                        />
                        <div className="flex gap-4 mt-6">
                            <button
                                onClick={() => setShowNewFolderModal(false)}
                                className="flex-1 py-3 border border-white/10 rounded-xl text-white/40 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateFolder}
                                disabled={creating || !newFolderName.trim()}
                                className="flex-1 py-3 bg-[#7C3AED] rounded-xl font-medium hover:bg-[#7C3AED]/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
                                Create
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
