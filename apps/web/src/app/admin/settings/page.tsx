/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, Save, Loader2, Building2, Users, HardDrive, Bell, Shield } from 'lucide-react';

function parseJwt(token: string): any {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
    } catch { return null; }
}

interface OrgSettings {
    name: string;
    slug: string;
    plan: string;
    storage_limit_gb: number;
    storage_used_bytes: number;
}

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [settings, setSettings] = useState<OrgSettings | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [activeTab, setActiveTab] = useState('organization');

    useEffect(() => {
        const token = sessionStorage.getItem('admin_token');
        if (token) {
            const claims = parseJwt(token);
            if (claims) {
                setOrgId(claims.org_id);
                setDisplayName(claims.display_name || '');
            }
        }
    }, []);

    useEffect(() => {
        if (orgId) fetchSettings();
    }, [orgId]);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('organizations')
                .select('name, slug, plan, storage_limit_gb, storage_used_bytes')
                .eq('id', orgId)
                .single();
            
            if (error) throw error;
            setSettings(data);
        } catch (err) {
            console.error('Failed to load settings:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!settings || !orgId) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from('organizations')
                .update({ name: settings.name })
                .eq('id', orgId);
            
            if (error) throw error;
            alert('Settings saved!');
        } catch (err: any) {
            alert('Failed to save: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const tabs = [
        { id: 'organization', label: 'Organization', icon: Building2 },
        { id: 'storage', label: 'Storage', icon: HardDrive },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-[#7C3AED] animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold uppercase tracking-wider">Settings</h1>
                <p className="text-white/40 text-sm mt-1 font-mono">Manage your organization settings</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* Tabs */}
                <div className="lg:w-48 flex lg:flex-col gap-2">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                                activeTab === tab.id
                                    ? 'bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20'
                                    : 'text-white/50 hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-6">
                    {activeTab === 'organization' && settings && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-xs font-mono text-white/40 uppercase tracking-wider mb-2">
                                    Organization Name
                                </label>
                                <input
                                    type="text"
                                    value={settings.name}
                                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-[#7C3AED]/50 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-mono text-white/40 uppercase tracking-wider mb-2">
                                    Slug (URL)
                                </label>
                                <input
                                    type="text"
                                    value={settings.slug}
                                    disabled
                                    className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed"
                                />
                                <p className="text-[10px] text-white/30 mt-1">Contact support to change your URL slug</p>
                            </div>
                            <div>
                                <label className="block text-xs font-mono text-white/40 uppercase tracking-wider mb-2">
                                    Plan
                                </label>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                                        settings.plan === 'pro' ? 'bg-[#7C3AED]/20 text-[#7C3AED]' : 'bg-white/10 text-white/50'
                                    }`}>
                                        {settings.plan}
                                    </span>
                                    <button className="text-xs text-[#7C3AED] hover:underline">Upgrade</button>
                                </div>
                            </div>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-6 py-3 bg-[#7C3AED] rounded-xl font-medium hover:bg-[#7C3AED]/80 transition-colors flex items-center gap-2"
                            >
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    )}

                    {activeTab === 'storage' && settings && (
                        <div className="space-y-6">
                            <div className="p-4 bg-white/5 rounded-xl">
                                <div className="flex justify-between text-sm mb-2">
                                    <span>Storage Used</span>
                                    <span>{(settings.storage_used_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB / {settings.storage_limit_gb} GB</span>
                                </div>
                                <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-[#7C3AED]"
                                        style={{ width: `${(settings.storage_used_bytes / (settings.storage_limit_gb * 1024 * 1024 * 1024)) * 100}%` }}
                                    />
                                </div>
                            </div>
                            <p className="text-white/40 text-sm">Upgrade your plan to get more storage space.</p>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="text-white/40 text-sm">
                            Notification settings coming soon.
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="text-white/40 text-sm">
                            Security settings coming soon. This will include 2FA and session management.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
