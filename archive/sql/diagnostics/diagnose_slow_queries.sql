-- Diagnostic Script for Slow Login Queries
-- Run this in Supabase SQL Editor to diagnose performance issues

-- 1. Check if RPC function exists
SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_user_current_tenant';

-- 2. Check RLS policies on user_profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'user_profiles';

-- 3. Check RLS policies on tenant_users
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'tenant_users';

-- 4. Check RLS policies on tenants
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'tenants';

-- 5. Test direct query performance for a specific user
-- Replace 'cad2c60c-3466-4215-aebb-102e90ff91e9' with your user ID
EXPLAIN ANALYZE
SELECT * 
FROM user_profiles 
WHERE id = 'cad2c60c-3466-4215-aebb-102e90ff91e9';

-- 6. Test tenant lookup performance
EXPLAIN ANALYZE
SELECT 
  tu.tenant_id,
  t.name as tenant_name,
  tu.role as user_role,
  tu.is_active
FROM tenant_users tu
INNER JOIN tenants t ON t.id = tu.tenant_id
WHERE tu.user_id = 'cad2c60c-3466-4215-aebb-102e90ff91e9'
  AND tu.is_active = true
  AND t.status = 'active'
ORDER BY tu.created_at DESC
LIMIT 1;

-- 7. Check if materialized view is up to date
SELECT 
  schemaname,
  matviewname,
  matviewowner,
  tablespace,
  hasindexes,
  ispopulated
FROM pg_matviews
WHERE schemaname = 'public'
  AND matviewname = 'user_tenant_cache';

-- 8. Check for long-running queries
SELECT 
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
  AND state != 'idle';
