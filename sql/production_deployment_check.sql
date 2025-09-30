-- Production Database Setup Checklist
-- Run these queries in your PRODUCTION Supabase instance

-- 1. Check if user_sessions table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public'
   AND table_name = 'user_sessions'
) as user_sessions_table_exists;

-- 2. Check if create_user_session function exists
SELECT EXISTS (
   SELECT FROM information_schema.routines 
   WHERE routine_schema = 'public'
   AND routine_name = 'create_user_session'
   AND routine_type = 'FUNCTION'
) as create_user_session_function_exists;

-- 3. Check if end_user_session function exists  
SELECT EXISTS (
   SELECT FROM information_schema.routines 
   WHERE routine_schema = 'public'
   AND routine_name = 'end_user_session'
   AND routine_type = 'FUNCTION'
) as end_user_session_function_exists;

-- 4. Check RLS policies on user_sessions
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'user_sessions';

-- 5. Test basic session creation (this should work if everything is set up)
-- Note: This will only work if you run it while authenticated in Supabase
-- SELECT create_user_session('127.0.0.1', 'Test Agent', null);

-- If any of the above return FALSE, you need to run the admin_dashboard_schema.sql 
-- in your production database to create the missing tables/functions.