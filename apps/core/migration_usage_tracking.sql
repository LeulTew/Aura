-- Migration: Add size_bytes to photos and update usage tracking
-- Phase 5B: Usage Analytics

ALTER TABLE public.photos 
ADD COLUMN IF NOT EXISTS size_bytes BIGINT DEFAULT 0;

-- Optional: Function to update org storage used (atomic)
CREATE OR REPLACE FUNCTION public.increment_org_storage(p_org_id UUID, p_bytes BIGINT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.organizations
    SET storage_used_bytes = storage_used_bytes + p_bytes,
        updated_at = NOW()
    WHERE id = p_org_id;
END;
$$;
