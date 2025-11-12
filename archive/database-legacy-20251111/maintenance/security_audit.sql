-- Comprehensive Security Audit and Fix Script
-- This script checks for and fixes common Supabase linter security warnings

-- 1. Check for any views with SECURITY DEFINER
SELECT 
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views 
WHERE definition ILIKE '%SECURITY DEFINER%'
   OR viewname = 'recent_login_history';

-- 2. List all SECURITY DEFINER functions (for audit purposes)
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_type,
  r.rolname as owner
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN pg_roles r ON p.proowner = r.oid
WHERE p.prosecdef = true  -- Only SECURITY DEFINER functions
  AND n.nspname NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY n.nspname, p.proname;

-- 3. Check for any potential RLS bypass issues
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  relowner::regrole as table_owner
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public'
  AND rowsecurity = false  -- Tables without RLS enabled
ORDER BY tablename;

-- 4. Check for policies on key tables
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
ORDER BY tablename, policyname;