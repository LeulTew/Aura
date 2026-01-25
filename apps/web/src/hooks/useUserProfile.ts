import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface UserPreferences {
    email_alerts: boolean;
    weekly_report: boolean;
}

export function useUserProfile(userId: string | null) {
    const [preferences, setPreferences] = useState<UserPreferences>({ email_alerts: true, weekly_report: true });
    const [profileSaving, setProfileSaving] = useState(false);
    const [logoutLoading, setLogoutLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchPreferences = useCallback(async () => {
        if (!userId) return;
        try {
            const { data } = await supabase
                .from('profiles')
                .select('preferences')
                .eq('id', userId)
                .single();
            
            if (data?.preferences) {
                setPreferences(prev => ({ ...prev, ...data.preferences }));
            }
        } catch (err) {
            console.error(err);
        }
    }, [userId]);

    useEffect(() => {
        fetchPreferences();
    }, [fetchPreferences]);

    const savePreferences = async (newPrefs: UserPreferences) => {
        if (!userId) return;
        setPreferences(newPrefs); // Optimistic update
        try {
            await supabase
                .from('profiles')
                .update({ preferences: newPrefs })
                .eq('id', userId);
        } catch (err) {
            console.error("Failed to save prefs", err);
            // Revert logic could be added here
        }
    };

    const updateProfile = async (displayName: string) => {
        setProfileSaving(true);
        setError(null);
        setSuccess(null);
        try {
            const token = sessionStorage.getItem('admin_token');
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
            const res = await fetch(`${backendUrl}/api/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ display_name: displayName })
            });
            const data = await res.json();
            if (data.success) {
                setSuccess('Profile updated successfully');
                return true;
            } else {
                throw new Error(data.detail || 'Update failed');
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to update profile');
            return false;
        } finally {
            setProfileSaving(false);
        }
    };

    const logoutAllSessions = async () => {
        setLogoutLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const token = sessionStorage.getItem('admin_token');
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
            const res = await fetch(`${backendUrl}/api/logout-sessions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(data.message);
                setTimeout(() => {
                    sessionStorage.removeItem('admin_token');
                    window.location.href = '/login';
                }, 2000);
                return true;
            } else {
                throw new Error(data.detail || 'Logout failed');
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to logout sessions');
            return false;
        } finally {
            setLogoutLoading(false);
        }
    };

    return { 
        preferences, 
        savePreferences, 
        profileSaving, 
        logoutLoading, 
        updateProfile, 
        logoutAllSessions,
        error,
        success,
        clearMessages: () => { setError(null); setSuccess(null); }
    };
}
