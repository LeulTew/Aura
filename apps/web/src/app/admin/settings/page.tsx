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
            <div className="pb-6 border-b border-gray-200 dark:border-white/5">
                <h1 className="text-2xl font-black uppercase tracking-tight font-sans">Settings</h1>
                <p className="text-gray-500 dark:text-white/40 text-sm mt-1 font-mono uppercase tracking-wider">Manage your organization settings</p>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                {/* Tabs */}
                <div className="lg:w-64 flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-3 px-4 py-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20'
                                    : 'border-transparent text-gray-500 dark:text-white/50 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 bg-white dark:bg-white/[0.02] border border-gray-200 dark:border-white/5 rounded-2xl p-8 shadow-sm">
                    {activeTab === 'organization' && settings && (
                        <div className="space-y-8">
                            <div>
                                <label className="block text-xs font-mono text-gray-500 dark:text-white/40 uppercase tracking-wider mb-3">
                                    Organization Name
                                </label>
                                <input
                                    type="text"
                                    value={settings.name}
                                    onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-4 text-sm font-medium focus:border-[#7C3AED] dark:focus:border-[#7C3AED] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-mono text-gray-500 dark:text-white/40 uppercase tracking-wider mb-3">
                                    Slug (URL)
                                </label>
                                <input
                                    type="text"
                                    value={settings.slug}
                                    disabled
                                    className="w-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-xl px-4 py-4 text-sm text-gray-400 dark:text-white/30 cursor-not-allowed"
                                />
                                <p className="text-[10px] text-gray-400 dark:text-white/30 mt-2 uppercase tracking-wider">Contact support to change your URL slug</p>
                            </div>
                            <div>
                                <label className="block text-xs font-mono text-gray-500 dark:text-white/40 uppercase tracking-wider mb-3">
                                    Plan
                                </label>
                                <div className="flex items-center gap-4">
                                    <span className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider ${
                                        settings.plan === 'pro' ? 'bg-[#7C3AED]/10 text-[#7C3AED] border border-[#7C3AED]/20' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50'
                                    }`}>
                                        {settings.plan}
                                    </span>
                                    <button className="text-xs text-[#7C3AED] hover:underline uppercase tracking-wider font-bold">Upgrade Plan</button>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="px-8 py-4 bg-[#7C3AED] text-white rounded-xl font-bold uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-2 text-xs"
                                >
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'storage' && settings && (
                        <div className="space-y-8">
                            <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                <div className="flex justify-between text-sm mb-4 font-mono">
                                    <span className="opacity-60 uppercase tracking-wider text-xs">Storage Used</span>
                                    <span className="font-bold">{(settings.storage_used_bytes / (1024 * 1024 * 1024)).toFixed(2)} GB / {settings.storage_limit_gb} GB</span>
                                </div>
                                <div className="h-3 bg-gray-200 dark:bg-black/40 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-[#7C3AED] transition-all duration-500"
                                        style={{ width: `${(settings.storage_used_bytes / (settings.storage_limit_gb * 1024 * 1024 * 1024)) * 100}%` }}
                                    />
                                </div>
                            </div>
                            <p className="text-gray-500 dark:text-white/40 text-xs font-mono uppercase tracking-wider">Upgrade your plan to get more storage space.</p>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                <div>
                                    <h3 className="font-bold text-sm uppercase tracking-wider mb-1">Email Alerts</h3>
                                    <p className="text-xs text-gray-500 dark:text-white/40 font-mono">Receive immediate emails for critical errors</p>
                                </div>
                                <button 
                                    onClick={() => handleSavePreferences({ ...preferences, email_alerts: !preferences.email_alerts })}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${preferences.email_alerts ? 'bg-[#7C3AED]' : 'bg-gray-200 dark:bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${preferences.email_alerts ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                            
                            <div className="flex items-center justify-between p-6 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                <div>
                                    <h3 className="font-bold text-sm uppercase tracking-wider mb-1">Weekly Report</h3>
                                    <p className="text-xs text-gray-500 dark:text-white/40 font-mono">Summary of storage usage and activity</p>
                                </div>
                                <button 
                                    onClick={() => handleSavePreferences({ ...preferences, weekly_report: !preferences.weekly_report })}
                                    className={`w-12 h-6 rounded-full transition-colors relative ${preferences.weekly_report ? 'bg-[#7C3AED]' : 'bg-gray-200 dark:bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${preferences.weekly_report ? 'left-7' : 'left-1'}`} />
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-8">
                             <div className="p-6 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 opacity-60">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-sm mb-1 flex items-center gap-2 uppercase tracking-wider">
                                            Two-Factor Authentication
                                            <span className="px-2 py-0.5 bg-[#7C3AED]/10 text-[#7C3AED] text-[10px] rounded border border-[#7C3AED]/20 uppercase font-black">Pro</span>
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-white/40 font-mono">Secure your account with 2FA</p>
                                    </div>
                                    <div className="w-12 h-6 rounded-full bg-gray-200 dark:bg-white/10 relative cursor-not-allowed">
                                        <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-gray-400 dark:bg-white/20" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-white/5">
                                <button className="text-xs font-mono uppercase tracking-wider text-red-500 hover:text-red-600 hover:underline">
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
