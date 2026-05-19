-- =====================================================
-- AUTO-CLEANUP OLD USER SESSIONS
-- =====================================================
-- Automatically deletes user_sessions older than 7 days
-- Runs daily via pg_cron extension
-- =====================================================

-- Create function to cleanup old sessions
CREATE OR REPLACE FUNCTION cleanup_old_user_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_date TIMESTAMPTZ;
BEGIN
  -- Calculate cutoff date (7 days ago)
  cutoff_date := NOW() - INTERVAL '7 days';
  
  -- Delete sessions older than 7 days
  WITH deleted AS (
    DELETE FROM user_sessions
    WHERE login_time < cutoff_date
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  -- Log the cleanup
  RAISE NOTICE 'Cleaned up % old user_sessions (older than %)', deleted_count, cutoff_date;
END;
$$;

COMMENT ON FUNCTION cleanup_old_user_sessions() IS 
'Deletes user_sessions older than 7 days to prevent table bloat';

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup to run daily at 2 AM UTC
-- Note: pg_cron may not be available in all Supabase plans
-- If this fails, you can run the function manually or via a scheduled edge function
SELECT cron.schedule(
  'cleanup-old-sessions',           -- job name
  '0 2 * * *',                      -- cron schedule: 2 AM daily
  $$SELECT cleanup_old_user_sessions()$$
);

-- Grant execute permission to authenticated users (for manual runs if needed)
GRANT EXECUTE ON FUNCTION cleanup_old_user_sessions() TO authenticated;

-- Verify the scheduled job
SELECT * FROM cron.job WHERE jobname = 'cleanup-old-sessions';
