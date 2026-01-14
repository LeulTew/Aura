-- RUN THIS IN SUPABASE SQL EDITOR
-- Replace 'your_email@example.com' with the email you used to sign up
-- or use 'superadmin@aura.dev' if that's what you used.

UPDATE public.profiles
SET role = 'superadmin'
WHERE email = 'superadmin@aura.dev'; -- CHANGE THIS TO YOUR EMAIL IF DIFFERENT

-- Verify the change
SELECT * FROM public.profiles WHERE role = 'superadmin';
