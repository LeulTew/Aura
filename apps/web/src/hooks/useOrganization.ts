import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface OrgSettings {
    name: string;
    slug: string;
    plan: string;
    storage_limit_gb: number;
    storage_used_bytes: number;
}

export function useOrganization(orgId: string | null) {
    const [settings, setSettings] = useState<OrgSettings | null>(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = useCallback(async () => {
        if (!orgId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('organizations')
                .select('name, slug, plan, storage_limit_gb, storage_used_bytes')
                .eq('id', orgId)
                .single();
            
            if (error) throw error;
            setSettings(data);
        } catch (err: unknown) {
            console.error('Failed to load settings:', err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setLoading(false);
        }
    }, [orgId]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const saveSettings = async (name: string) => {
        if (!orgId) return;
        setSaving(true);
        setError(null);
        try {
            const { error } = await supabase
                .from('organizations')
                .update({ name })
                .eq('id', orgId);
            
            if (error) throw error;
            setSettings(prev => prev ? { ...prev, name } : null);
            return true;
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : String(err));
            return false;
        } finally {
            setSaving(false);
        }
    };

    return { settings, loading, saving, error, fetchSettings, saveSettings };
}
