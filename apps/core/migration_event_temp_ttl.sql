-- Migration: Phase 6A - Event Temp TTL Support
-- Adds expires_at column and auto-cleanup infrastructure

-- 1. Add expires_at column for TTL tracking
ALTER TABLE public.photos 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Create trigger to auto-set 30-day TTL for event_temp photos
CREATE OR REPLACE FUNCTION public.set_event_temp_expiry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.source_type = 'event_temp' AND NEW.expires_at IS NULL THEN
    NEW.expires_at = NOW() + INTERVAL '30 days';
  END IF;
  -- If source_type changes FROM event_temp to something else, clear expiry
  IF OLD IS NOT NULL AND OLD.source_type = 'event_temp' AND NEW.source_type != 'event_temp' THEN
    NEW.expires_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists (for idempotency)
DROP TRIGGER IF EXISTS event_temp_expiry_trigger ON public.photos;

-- Create trigger
CREATE TRIGGER event_temp_expiry_trigger
BEFORE INSERT OR UPDATE ON public.photos
FOR EACH ROW EXECUTE FUNCTION public.set_event_temp_expiry();

-- 3. Create function to cleanup expired photos (called by pg_cron or Edge Function)
CREATE OR REPLACE FUNCTION public.cleanup_expired_photos()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Move expired photos to trash (soft delete) or hard delete
  -- Option A: Soft delete (recommended) - set a deleted_at timestamp
  -- Option B: Hard delete (current implementation)
  
  WITH deleted AS (
    DELETE FROM public.photos
    WHERE expires_at IS NOT NULL 
      AND expires_at < NOW()
      AND source_type = 'event_temp'
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  -- Log the cleanup action
  INSERT INTO public.usage_logs (org_id, action, metadata)
  SELECT 
    (SELECT org_id FROM public.photos WHERE id = deleted.id LIMIT 1),
    'auto_cleanup',
    jsonb_build_object('expired_count', deleted_count, 'cleanup_time', NOW())
  FROM (SELECT 1 AS id WHERE deleted_count > 0) AS deleted
  LIMIT 1;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create index for efficient expiry queries
CREATE INDEX IF NOT EXISTS idx_photos_expires_at 
ON public.photos (expires_at) 
WHERE expires_at IS NOT NULL;

-- 5. Schedule daily cleanup (uncomment if pg_cron is available)
-- SELECT cron.schedule('cleanup-expired-photos', '0 3 * * *', 'SELECT public.cleanup_expired_photos()');

COMMENT ON COLUMN public.photos.expires_at IS 'Auto-set to 30 days from creation for event_temp photos. NULL means no expiration.';
