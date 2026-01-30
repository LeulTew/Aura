-- Migration: 007_fix_profile_role_security.sql
-- Purpose: Prevent users from escalating their own privileges (changing role/org_id)
-- Date: 2026-01-31

-- Function to check for privilege escalation attempts
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if role is being changed
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    -- Allow only if the user is ALREADY a superadmin
    -- (We check the *current* state in the DB, not the OLD record, to be safe, 
    -- though OLD.role is usually sufficient. Here we stick to checking auth.uid() 
    -- against profiles if we wanted to be strict about "who is performing the action",
    -- but usually standard RLS is for the *user* executing the query.
    -- However, triggers run with the privileges of the user.
    
    -- If the current user (auth.uid()) is NOT a superadmin, they cannot change roles.
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'superadmin'
    ) THEN
      RAISE EXCEPTION 'Access Denied: Only superadmins can modify user roles.';
    END IF;
  END IF;
  
  -- Check if org_id is being changed
  IF OLD.org_id IS DISTINCT FROM NEW.org_id THEN
    -- Same logic: only superadmin can move users between orgs
    IF NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'superadmin'
    ) THEN
      RAISE EXCEPTION 'Access Denied: Only superadmins can modify organization membership.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to allow idempotent runs
DROP TRIGGER IF EXISTS enforce_role_security ON profiles;

-- Attach trigger to profiles table
CREATE TRIGGER enforce_role_security
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();
