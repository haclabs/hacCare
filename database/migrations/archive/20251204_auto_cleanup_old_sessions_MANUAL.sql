-- =====================================================
-- MANUAL: AUTO-CLEANUP OLD USER SESSIONS
-- =====================================================
-- Run this in Supabase Dashboard > SQL Editor
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
'Deletes user_sessions older than 7 days to prevent table bloat. Run manually or schedule via Edge Function.';

-- Run it now to clear existing old data
SELECT cleanup_old_user_sessions();

-- Check how many sessions remain
SELECT COUNT(*) as remaining_sessions FROM user_sessions;

-- See the date range of remaining sessions
SELECT 
  MIN(login_time) as oldest_session,
  MAX(login_time) as newest_session,
  COUNT(*) as total_sessions
FROM user_sessions;
