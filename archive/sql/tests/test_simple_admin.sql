-- Simple Admin Dashboard Test - Login Sessions Only
-- Test the simplified admin dashboard that only tracks login sessions

-- Check if the user_sessions table was created
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'user_sessions'
ORDER BY ordinal_position;

-- Create test session data for the admin dashboard
-- Insert a sample session with a real user ID for testing
INSERT INTO user_sessions (user_id, ip_address, user_agent, tenant_id, status) 
VALUES 
  ((SELECT id FROM user_profiles WHERE is_active = true LIMIT 1), 
   '192.168.1.100'::inet, 
   'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 
   (SELECT tenant_id FROM tenant_users WHERE is_active = true LIMIT 1),
   'active')
ON CONFLICT DO NOTHING;

-- Insert another test session from a different IP
INSERT INTO user_sessions (user_id, ip_address, user_agent, tenant_id, status) 
VALUES 
  ((SELECT id FROM user_profiles WHERE is_active = true ORDER BY created_at DESC LIMIT 1 OFFSET 1), 
   '10.0.0.50'::inet, 
   'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 
   (SELECT tenant_id FROM tenant_users WHERE is_active = true LIMIT 1),
   'active')
ON CONFLICT DO NOTHING;

-- View sample sessions
SELECT 
  us.id,
  us.user_id,
  us.ip_address,
  us.login_time,
  us.last_activity,
  us.status,
  up.email,
  up.first_name,
  up.last_name
FROM user_sessions us
LEFT JOIN user_profiles up ON us.user_id = up.id
ORDER BY us.login_time DESC
LIMIT 5;

-- Clean up any sessions with null user_id (they're invalid)
DELETE FROM user_sessions WHERE user_id IS NULL;

-- Test the RLS policy by checking what current user can see
SELECT COUNT(*) as visible_sessions FROM user_sessions;

-- Show the simplified functions that were created
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_user_tenant_id', 'create_user_session', 'end_user_session', 'cleanup_old_sessions')
ORDER BY routine_name;