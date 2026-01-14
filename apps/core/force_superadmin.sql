-- RUN THIS IN SUPABASE SQL EDITOR
-- This guarantees a profile exists for the current user and sets role to 'superadmin'
-- It handles cases where the user exists in auth.users but NOT in public.profiles

INSERT INTO public.profiles (id, email, role, display_name)
SELECT 
    id, 
    email, 
    'superadmin', 
    'Platform Admin'
FROM auth.users
WHERE id = auth.uid()
ON CONFLICT (id) DO UPDATE
SET 
    role = 'superadmin',
    email = EXCLUDED.email; -- Update email if it changed in auth

-- Verify result
SELECT * FROM public.profiles WHERE id = auth.uid();
