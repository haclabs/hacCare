-- Debug Admin Dashboard Sessions
-- Quick check to see what's happening with sessions

-- Check if user_sessions table exists and has data
SELECT 
  'user_sessions' as table_name,
  COUNT(*) as total_records,
  COUNT(CASE WHEN status = 'active' AND logout_time IS NULL THEN 1 END) as active_sessions,
  COUNT(CASE WHEN status = 'idle' THEN 1 END) as idle_sessions,
  COUNT(CASE WHEN status = 'logged_out' OR logout_time IS NOT NULL THEN 1 END) as logged_out_sessions
FROM user_sessions;

-- Show recent sessions with details
SELECT 
  us.id,
  us.user_id,
  up.email,
  up.first_name,
  up.last_name,
  us.ip_address,
  us.status,
  us.login_time,
  us.last_activity,
  us.logout_time,
  us.created_at
FROM user_sessions us
LEFT JOIN user_profiles up ON us.user_id = up.id
ORDER BY us.created_at DESC
LIMIT 10;

-- Check RLS policies on user_sessions
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'user_sessions';

-- Test if current user can see sessions (may return different results based on RLS)
SELECT COUNT(*) as visible_to_current_user FROM user_sessions;

-- Check if we have any user_profiles
SELECT COUNT(*) as total_user_profiles FROM user_profiles WHERE is_active = true;