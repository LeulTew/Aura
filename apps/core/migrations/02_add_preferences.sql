-- Phase 5.2: Add Preferences Column
-- Run this in Supabase SQL Editor

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"email_alerts": true, "weekly_report": true}';

-- Update RLS to allow users to update their own preferences
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;

CREATE POLICY "users_update_own_profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (id = auth.uid()); -- Ensure they can't change their ID (other cols allowed)
