-- Multi-Org Admin Migration for Aura Pro
-- Phase 6: Allows admins to manage multiple studios
-- Run this in Supabase SQL Editor AFTER multitenant_schema.sql

-- ============================================
-- 1. PROFILE_ORGANIZATIONS (Junction Table)
-- ============================================
-- This replaces the single `profiles.org_id` for admins who own multiple studios.
-- Employees still use profiles.org_id (single studio).
-- Admins can have entries here for each studio they manage.

CREATE TABLE IF NOT EXISTS public.profile_organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'employee')),
    is_primary BOOLEAN DEFAULT false, -- Default org on login
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, org_id) -- Prevent duplicates
);

CREATE INDEX IF NOT EXISTS profile_orgs_user_idx ON public.profile_organizations(user_id);
CREATE INDEX IF NOT EXISTS profile_orgs_org_idx ON public.profile_organizations(org_id);

-- ============================================
-- 2. RLS POLICIES FOR profile_organizations
-- ============================================
ALTER TABLE public.profile_organizations ENABLE ROW LEVEL SECURITY;

-- SuperAdmin can see/manage all
CREATE POLICY "superadmin_all_profile_orgs" ON public.profile_organizations
    FOR ALL USING (public.get_my_role() = 'superadmin');

-- Users can see their own memberships
CREATE POLICY "users_view_own_memberships" ON public.profile_organizations
    FOR SELECT USING (user_id = auth.uid());

-- Admins can manage memberships for their orgs (invite employees)
CREATE POLICY "admins_manage_org_members" ON public.profile_organizations
    FOR ALL USING (
        org_id IN (
            SELECT po.org_id FROM public.profile_organizations po
            WHERE po.user_id = auth.uid() AND po.role = 'admin'
        )
    );

-- ============================================
-- 3. MIGRATION: Copy existing admin org_id to junction table
-- ============================================
-- This ensures existing admins don't lose access.
INSERT INTO public.profile_organizations (user_id, org_id, role, is_primary)
SELECT 
    p.id, 
    p.org_id, 
    p.role,
    true
FROM public.profiles p
WHERE p.org_id IS NOT NULL 
  AND p.role IN ('admin', 'employee')
ON CONFLICT (user_id, org_id) DO NOTHING;

-- ============================================
-- 4. HELPER FUNCTION: Get user's organizations
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_organizations(p_user_id UUID)
RETURNS TABLE (
    org_id UUID,
    org_name TEXT,
    org_slug TEXT,
    role TEXT,
    is_primary BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        o.id AS org_id,
        o.name AS org_name,
        o.slug AS org_slug,
        po.role,
        po.is_primary
    FROM public.profile_organizations po
    JOIN public.organizations o ON o.id = po.org_id
    WHERE po.user_id = p_user_id
    ORDER BY po.is_primary DESC, o.name ASC;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_organizations TO authenticated;

-- ============================================
-- 5. NOTE ON profiles.org_id
-- ============================================
-- We keep profiles.org_id for:
-- 1. Quick context lookups (current active org)
-- 2. Backward compatibility
-- 3. Employees who only belong to one org
-- The profile_organizations table is the source of truth for multi-org admins.
