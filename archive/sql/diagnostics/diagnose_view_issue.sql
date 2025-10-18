-- Diagnose Security Definer View Issue
-- This script checks the current state of the recent_login_history view

-- 1. Check if the view exists and its current definition
SELECT 
  schemaname,
  viewname,
  viewowner,
  definition
FROM pg_views 
WHERE viewname = 'recent_login_history'
  AND schemaname = 'public';

-- 2. Check for any SECURITY DEFINER in the view definition
SELECT 
  viewname,
  CASE 
    WHEN definition ILIKE '%SECURITY DEFINER%' THEN 'HAS SECURITY DEFINER'
    ELSE 'NO SECURITY DEFINER FOUND'
  END as security_definer_status,
  definition
FROM pg_views 
WHERE viewname = 'recent_login_history'
  AND schemaname = 'public';

-- 3. Check the view's relkind and other properties
SELECT 
  c.relname,
  c.relkind,
  c.relowner,
  r.rolname as owner_name,
  c.relacl
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
LEFT JOIN pg_roles r ON c.relowner = r.oid
WHERE n.nspname = 'public' 
  AND c.relname = 'recent_login_history';

-- 4. Check if there are any functions with the same name that might be causing confusion
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname ILIKE '%recent_login_history%'
ORDER BY n.nspname, p.proname;