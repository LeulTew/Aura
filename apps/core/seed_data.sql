-- Aura Pro: Seed Data for Testing Multi-Tenant Auth
-- Run this in Supabase SQL Editor AFTER multitenant_schema.sql
-- This creates test accounts for all roles

-- ============================================
-- 1. CREATE TEST ORGANIZATION
-- ============================================
INSERT INTO public.organizations (id, name, slug, plan, storage_limit_gb, is_active)
VALUES 
    ('11111111-1111-1111-1111-111111111111', 'Addis Studio', 'addis-studio', 'pro', 50, true),
    ('22222222-2222-2222-2222-222222222222', 'Gondar Photos', 'gondar-photos', 'free', 5, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. CREATE TEST USERS IN SUPABASE AUTH
-- ============================================
-- NOTE: These users must be created via Supabase Dashboard or API
-- Go to: Authentication > Users > Add User
-- 
-- For testing, create these users with the passwords shown:
--
-- Email: superadmin@aura.dev        Password: AuraSuper2026!
-- Email: admin@addis-studio.com     Password: AddisAdmin2026!
-- Email: admin2@addis-studio.com    Password: AddisAdmin2026!
-- Email: photo1@addis-studio.com    Password: AddisPhoto2026!
-- Email: photo2@addis-studio.com    Password: AddisPhoto2026!
-- Email: editor@addis-studio.com    Password: AddisEdit2026!
-- Email: admin@gondar-photos.com    Password: GondarAdmin2026!
--
-- After creating users, get their UUIDs from the auth.users table
-- and run the INSERT statements below with the correct UUIDs.

-- ============================================
-- 3. LINK PROFILES TO AUTH USERS
-- ============================================
-- Replace the UUIDs below with actual auth.users IDs after creating them

-- SuperAdmin Profile (no org)
-- INSERT INTO public.profiles (id, email, display_name, role, org_id)
-- VALUES ('SUPERADMIN-UUID-HERE', 'superadmin@aura.dev', 'Platform Admin', 'superadmin', NULL);

-- Addis Studio Team
-- INSERT INTO public.profiles (id, email, display_name, role, org_id)
-- VALUES 
--     ('ADMIN1-UUID', 'admin@addis-studio.com', 'Studio Owner', 'admin', '11111111-1111-1111-1111-111111111111'),
--     ('ADMIN2-UUID', 'admin2@addis-studio.com', 'Operations Manager', 'admin', '11111111-1111-1111-1111-111111111111'),
--     ('PHOTO1-UUID', 'photo1@addis-studio.com', 'Lead Photographer', 'employee', '11111111-1111-1111-1111-111111111111'),
--     ('PHOTO2-UUID', 'photo2@addis-studio.com', 'Event Photographer', 'employee', '11111111-1111-1111-1111-111111111111'),
--     ('EDITOR-UUID', 'editor@addis-studio.com', 'Photo Editor', 'employee', '11111111-1111-1111-1111-111111111111');

-- Gondar Photos Team
-- INSERT INTO public.profiles (id, email, display_name, role, org_id)
-- VALUES 
--     ('GONDAR-ADMIN-UUID', 'admin@gondar-photos.com', 'Gondar Owner', 'admin', '22222222-2222-2222-2222-222222222222');

-- ============================================
-- 4. HELPER: Auto-create profile on signup (Trigger)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, role, org_id)
    VALUES (
        NEW.id, 
        NEW.email, 
        split_part(NEW.email, '@', 1), -- Default display name from email
        'employee', -- Default role
        NULL -- No org until assigned
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
