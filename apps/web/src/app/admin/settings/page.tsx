/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, Building2, Users, HardDrive, Bell, Shield, User, LogOut, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useOrganization } from '@/hooks/useOrganization';
import { useUserProfile } from '@/hooks/useUserProfile';

export default function SettingsPage() {
    const { orgId, userId, displayName: initialDisplayName, role } = useAdminAuth();
    const { settings, loading: orgLoading, saving: orgSaving, error: orgError, saveSettings } = useOrganization(orgId);
    const { 
        preferences, 
        savePreferences, 
        profileSaving, 
        logoutLoading, 
        updateProfile, 
        logoutAllSessions, 
        error: profileError, 
        success: profileSuccess,
        clearMessages 
    } = useUserProfile(userId);

    const [activeTab, setActiveTab] = useState('organization');
    const [editDisplayName, setEditDisplayName] = useState('');
    const [currentDisplayName, setCurrentDisplayName] = useState('');
    const [orgName, setOrgName] = useState('');

    useEffect(() => {
        if (initialDisplayName) {
            setEditDisplayName(initialDisplayName);
            setCurrentDisplayName(initialDisplayName);
        }
    }, [initialDisplayName]);

    useEffect(() => {
        if (settings) {
            setOrgName(settings.name);
        }
    }, [settings]);

    // Handle tab change to clear messages
    useEffect(() => {
        clearMessages();
    }, [activeTab]);

    const handleSaveOrganization = async () => {
        if (!settings) return;
        const success = await saveSettings(orgName);
        if (success) {
            alert('Settings saved!');
        } else if (orgError) {
             alert('Failed to save: ' + orgError);
        }
    };

    const handleSaveProfile = async () => {
        if (!editDisplayName.trim()) return;
        const success = await updateProfile(editDisplayName);
        if (success) {
            setCurrentDisplayName(editDisplayName);
        }
    };

    const handleLogout = async () => {
        if (!confirm('This will log you out of all devices. Continue?')) return;
        await logoutAllSessions();
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'organization', label: 'Organization', icon: Building2 },
        { id: 'storage', label: 'Storage', icon: HardDrive },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    if (orgId && orgLoading) {
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
                    {/* Alerts */}
                    {(profileError || orgError) && (
                        <div className="mb-6 p-4 border border-red-500/20 bg-red-500/5 flex items-center gap-4 text-red-500 rounded-xl">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <span className="font-mono text-xs">{profileError || orgError}</span>
                        </div>
                    )}
                    {profileSuccess && (
                        <div className="mb-6 p-4 border border-green-500/20 bg-green-500/5 flex items-center gap-4 text-green-500 rounded-xl">
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            <span className="font-mono text-xs">{profileSuccess}</span>
                        </div>
                    )}

                    {activeTab === 'profile' && (
                        <div className="space-y-8">
                            <div>
                                <label className="block text-xs font-mono text-gray-500 dark:text-white/40 uppercase tracking-wider mb-3">
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    value={editDisplayName}
                                    onChange={(e) => setEditDisplayName(e.target.value)}
                                    className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-4 text-sm font-medium focus:border-[#7C3AED] dark:focus:border-[#7C3AED] outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-white/20"
                                    placeholder="Your display name"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-mono text-gray-500 dark:text-white/40 uppercase tracking-wider mb-3">
                                    User ID
                                </label>
                                <input
                                    type="text"
                                    value={userId || ''}
                                    disabled
                                    className="w-full bg-gray-100 dark:bg-black/20 border border-gray-200 dark:border-white/5 rounded-xl px-4 py-4 text-sm text-gray-400 dark:text-white/30 cursor-not-allowed font-mono"
                                />
                            </div>
                            <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={profileSaving || editDisplayName === currentDisplayName}
                                    className="px-8 py-4 bg-[#7C3AED] text-white rounded-xl font-bold uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-2 text-xs disabled:opacity-50"
                                >
                                    {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Profile
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'organization' && settings && (
                        <div className="space-y-8">
                            <div>
                                <label className="block text-xs font-mono text-gray-500 dark:text-white/40 uppercase tracking-wider mb-3">
                                    Organization Name
                                </label>
                                <input
                                    type="text"
                                    value={orgName}
                                    onChange={(e) => setOrgName(e.target.value)}
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
                                    onClick={handleSaveOrganization}
                                    disabled={orgSaving || orgName === settings.name}
                                    className="px-8 py-4 bg-[#7C3AED] text-white rounded-xl font-bold uppercase tracking-wider hover:opacity-90 transition-all flex items-center gap-2 text-xs disabled:opacity-50"
                                >
                                    {orgSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
                                    onClick={() => savePreferences({ ...preferences, email_alerts: !preferences.email_alerts })}
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
                                    onClick={() => savePreferences({ ...preferences, weekly_report: !preferences.weekly_report })}
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
                            <div className="pt-6 border-t border-gray-100 dark:border-white/5">
                                <h3 className="font-bold text-sm mb-3 uppercase tracking-wider">Session Management</h3>
                                <p className="text-xs text-gray-500 dark:text-white/40 font-mono mb-4">
                                    Signing out will invalidate all active sessions across all devices.
                                </p>
                                <button 
                                    onClick={handleLogout}
                                    disabled={logoutLoading}
                                    className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-red-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    {logoutLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                                    Log Out All Sessions
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
