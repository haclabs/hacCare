-- Temporary: Check RLS Policies Causing Timeout
-- Run this to see what's blocking the queries

-- Check user_profiles RLS policies
SELECT 
  'user_profiles' as table_name,
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check as check_expression
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles'
ORDER BY policyname;

-- Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('user_profiles', 'tenant_users', 'tenants');

-- TEMPORARY FIX: Disable RLS on user_profiles to test
-- WARNING: This removes security - only for testing!
-- ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- After testing, re-enable with:
-- ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
