-- ===========================================================================
-- Clean up old user sessions
-- ===========================================================================
-- This script will:
-- 1. Mark sessions older than 24 hours as 'logged_out'
-- 2. Delete sessions older than 30 days
-- ===========================================================================

-- Step 1: Mark old active sessions as logged_out
UPDATE user_sessions
SET 
  status = 'logged_out',
  logout_time = last_activity
WHERE 
  status = 'active'
  AND logout_time IS NULL
  AND last_activity < NOW() - INTERVAL '24 hours';

-- Step 2: Delete very old sessions (older than 30 days) to keep table clean
DELETE FROM user_sessions
WHERE last_activity < NOW() - INTERVAL '30 days';

-- Show what's left
SELECT 
  status,
  COUNT(*) as count,
  MIN(last_activity) as oldest,
  MAX(last_activity) as newest
FROM user_sessions
GROUP BY status
ORDER BY status;

SELECT '✅ Old sessions cleaned up! Sessions older than 24 hours marked as logged_out.' as result;
