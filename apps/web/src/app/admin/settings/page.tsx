/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Settings, Save, Loader2, Building2, Users, HardDrive, Bell, Shield } from 'lucide-react';

import { parseJwt } from '@/utils/auth';

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
    const [userId, setUserId] = useState<string | null>(null);
    const [preferences, setPreferences] = useState({ email_alerts: true, weekly_report: true });
    
    useEffect(() => {
        const token = sessionStorage.getItem('admin_token');
        if (token) {
            const claims = parseJwt(token);
            if (claims) {
                setOrgId(claims.org_id || null);
                setDisplayName(claims.display_name || '');
                setUserId(claims.sub);
            }
        }
    }, []);

    useEffect(() => {
        if (orgId) fetchSettings();
        if (userId) fetchPreferences();
    }, [orgId, userId]);

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

    const fetchPreferences = async () => {
        if (!userId) return;
        try {
            const { data } = await supabase
                .from('profiles')
                .select('preferences')
                .eq('id', userId)
                .single();
            
            if (data?.preferences) {
                setPreferences({ ...preferences, ...data.preferences });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleSavePreferences = async (newPrefs: typeof preferences) => {
        if (!userId) return;
        setPreferences(newPrefs); // Optimistic update
        try {
            await supabase
                .from('profiles')
                .update({ preferences: newPrefs })
                .eq('id', userId);
        } catch (err) {
            console.error("Failed to save prefs", err);
            // Revert would go here
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
                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                <div>
                                    <h3 className="font-medium text-sm text-white">Email Alerts</h3>
                                    <p className="text-xs text-white/40 mt-1">Receive immediate emails for critical errors</p>
                                </div>
                                <button 
                                    onClick={() => handleSavePreferences({ ...preferences, email_alerts: !preferences.email_alerts })}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${preferences.email_alerts ? 'bg-[#7C3AED]' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${preferences.email_alerts ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                            
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                                <div>
                                    <h3 className="font-medium text-sm text-white">Weekly Report</h3>
                                    <p className="text-xs text-white/40 mt-1">Summary of storage usage and activity</p>
                                </div>
                                <button 
                                    onClick={() => handleSavePreferences({ ...preferences, weekly_report: !preferences.weekly_report })}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${preferences.weekly_report ? 'bg-[#7C3AED]' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${preferences.weekly_report ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6">
                             <div className="p-4 bg-white/5 rounded-xl border border-white/5 opacity-50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-medium text-sm text-white flex items-center gap-2">
                                            Two-Factor Authentication
                                            <span className="px-2 py-0.5 bg-[#7C3AED]/20 text-[#7C3AED] text-[10px] rounded uppercase font-bold">Pro</span>
                                        </h3>
                                        <p className="text-xs text-white/40 mt-1">Secure your account with 2FA</p>
                                    </div>
                                    <div className="w-12 h-6 rounded-full bg-white/10 relative cursor-not-allowed">
                                        <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white/20" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end">
                                <button className="text-xs text-red-400 hover:text-red-300">
                                    Log out invalid sessions (Coming Soon)
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
