-- Multi-Tenant Schema Migration for Aura Pro
-- Run this in the Supabase SQL Editor AFTER supa_schema.sql
-- Phase 5A: Organizations, Profiles, RLS

-- ============================================
-- 1. ORGANIZATIONS TABLE (Tenants)
-- ============================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL, -- e.g., "studio-xyz"
    plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
    storage_limit_gb INTEGER DEFAULT 5,
    storage_used_bytes BIGINT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS organizations_slug_idx ON public.organizations(slug);

-- ============================================
-- 2. PROFILES TABLE (Users with Roles)
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT,
    role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('superadmin', 'admin', 'employee')),
    org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL, -- NULL for superadmins
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for org lookups
CREATE INDEX IF NOT EXISTS profiles_org_id_idx ON public.profiles(org_id);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- ============================================
-- 3. ALTER PHOTOS TABLE (Add org_id)
-- ============================================
ALTER TABLE public.photos 
    ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

ALTER TABLE public.photos 
    ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'cloud' CHECK (source_type IN ('cloud', 'local_sync', 'event_temp'));

ALTER TABLE public.photos 
    ADD COLUMN IF NOT EXISTS full_path TEXT; -- Renamed from 'path' for clarity

-- Migrate existing path data if needed
UPDATE public.photos SET full_path = path WHERE full_path IS NULL AND path IS NOT NULL;

-- Create index for org lookups on photos
CREATE INDEX IF NOT EXISTS photos_org_id_idx ON public.photos(org_id);

-- ============================================
-- 4. BUNDLES TABLE (Add org_id if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS public.bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    photo_ids UUID[] DEFAULT '{}',
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS bundles_org_id_idx ON public.bundles(org_id);

-- ============================================
-- 5. USAGE LOGS TABLE (Tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id),
    action TEXT NOT NULL, -- 'upload', 'index', 'search', 'download', 'bundle_create'
    bytes_processed BIGINT DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS usage_logs_org_id_idx ON public.usage_logs(org_id);
CREATE INDEX IF NOT EXISTS usage_logs_created_at_idx ON public.usage_logs(created_at);

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Helper function to get current user's org_id
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT org_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ============================================
-- ORGANIZATIONS POLICIES
-- ============================================

-- SuperAdmin can see all organizations
CREATE POLICY "superadmin_all_orgs" ON public.organizations
    FOR ALL USING (public.get_my_role() = 'superadmin');

-- Admin/Employee can only see their own org
CREATE POLICY "tenant_view_own_org" ON public.organizations
    FOR SELECT USING (id = public.get_my_org_id());

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- SuperAdmin can manage all profiles
CREATE POLICY "superadmin_all_profiles" ON public.profiles
    FOR ALL USING (public.get_my_role() = 'superadmin');

-- Users can see profiles in their org
CREATE POLICY "tenant_view_profiles" ON public.profiles
    FOR SELECT USING (org_id = public.get_my_org_id() OR id = auth.uid());

-- Users can update their own profile
CREATE POLICY "users_update_own_profile" ON public.profiles
    FOR UPDATE USING (id = auth.uid());

-- ============================================
-- PHOTOS POLICIES
-- ============================================

-- SuperAdmin can manage all photos
CREATE POLICY "superadmin_all_photos" ON public.photos
    FOR ALL USING (public.get_my_role() = 'superadmin');

-- Tenant members can view their org's photos
CREATE POLICY "tenant_view_photos" ON public.photos
    FOR SELECT USING (org_id = public.get_my_org_id());

-- Admin can manage their org's photos
CREATE POLICY "admin_manage_photos" ON public.photos
    FOR ALL USING (
        org_id = public.get_my_org_id() 
        AND public.get_my_role() IN ('admin', 'superadmin')
    );

-- Employee can insert photos to their org
CREATE POLICY "employee_insert_photos" ON public.photos
    FOR INSERT WITH CHECK (
        org_id = public.get_my_org_id()
        AND public.get_my_role() IN ('admin', 'employee')
    );

-- ============================================
-- BUNDLES POLICIES
-- ============================================

-- SuperAdmin can manage all bundles
CREATE POLICY "superadmin_all_bundles" ON public.bundles
    FOR ALL USING (public.get_my_role() = 'superadmin');

-- Tenant members can view their org's bundles
CREATE POLICY "tenant_view_bundles" ON public.bundles
    FOR SELECT USING (org_id = public.get_my_org_id());

-- Admin/Employee can create bundles for their org
CREATE POLICY "tenant_create_bundles" ON public.bundles
    FOR INSERT WITH CHECK (
        org_id = public.get_my_org_id()
        AND public.get_my_role() IN ('admin', 'employee')
    );

-- ============================================
-- USAGE LOGS POLICIES
-- ============================================

-- SuperAdmin can see all usage logs
CREATE POLICY "superadmin_all_usage" ON public.usage_logs
    FOR ALL USING (public.get_my_role() = 'superadmin');

-- Admin can see their org's usage logs
CREATE POLICY "admin_view_usage" ON public.usage_logs
    FOR SELECT USING (
        org_id = public.get_my_org_id()
        AND public.get_my_role() = 'admin'
    );

-- ============================================
-- 7. UPDATED match_faces FUNCTION (Org-Scoped)
-- ============================================
-- ============================================
-- 7. SECURE MATCHING FUNCTION (Backend Only)
-- ============================================

-- Function for Service Role (Python Backend) to search specific tenant
CREATE OR REPLACE FUNCTION public.match_faces_tenant (
    query_embedding vector(512),
    p_org_id UUID,
    match_threshold float DEFAULT 0.6,
    match_count int DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    path TEXT,
    full_path TEXT,
    photo_date DATE,
    metadata JSONB,
    similarity DOUBLE PRECISION
)
LANGUAGE plpgsql
-- NO SECURITY DEFINER needed if called by service_role (which has bypass RLS)
-- But we use it to be explicit about privileges if needed.
-- Actually standard PLPGSQL is fine.
AS $$
BEGIN
    RETURN QUERY
    SELECT
        photos.id,
        photos.path,
        photos.full_path,
        photos.photo_date,
        photos.metadata,
        1 - (photos.embedding <=> query_embedding) AS similarity
    FROM public.photos
    WHERE 
        photos.org_id = p_org_id
        AND 1 - (photos.embedding <=> query_embedding) > match_threshold
    ORDER BY photos.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- REVOKE EXECUTE from normal users to prevent spoofing
REVOKE EXECUTE ON FUNCTION public.match_faces_tenant FROM public;
REVOKE EXECUTE ON FUNCTION public.match_faces_tenant FROM anon;
REVOKE EXECUTE ON FUNCTION public.match_faces_tenant FROM authenticated;
-- Service role has all privileges by default

-- ============================================
-- 8. SEED SUPERADMIN (Run manually with your user ID)
-- ============================================
-- After creating your Supabase auth user, run:
-- INSERT INTO public.profiles (id, email, role, org_id)
-- VALUES ('YOUR-AUTH-USER-UUID', 'your@email.com', 'superadmin', NULL);
