-- RUN THIS IN SUPABASE SQL EDITOR
-- This version uses auth.uid() so you don't need to know your email
-- It will update the profile of the CURRENTLY LOGGED IN user in the SQL Editor

UPDATE public.profiles
SET role = 'superadmin'
WHERE id = auth.uid();

-- Verify the result
SELECT email, role FROM public.profiles WHERE id = auth.uid();
