-- Deep Dive Diagnosis for Security Definer Issue
-- Check for hidden SECURITY DEFINER functions or view properties

-- 1. Check if there's a function named recent_login_history that has SECURITY DEFINER
SELECT 
  'Function Check' as check_type,
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_type,
  p.oid
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'recent_login_history'
ORDER BY p.proname;

-- 2. Check the actual view definition for any hidden SECURITY DEFINER
SELECT 
  'View Definition Check' as check_type,
  pg_get_viewdef('public.recent_login_history'::regclass) as raw_definition;

-- 3. Look for any rewrite rules that might contain SECURITY DEFINER
SELECT 
  'Rewrite Rules Check' as check_type,
  r.rulename,
  r.ev_type,
  pg_get_ruledef(r.oid) as rule_definition
FROM pg_rewrite r
JOIN pg_class c ON r.ev_class = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
  AND c.relname = 'recent_login_history';

-- 4. Check if there are any triggers or dependencies that might recreate the view
SELECT 
  'Dependency Check' as check_type,
  d.classid,
  d.objid,
  d.objsubid,
  d.refclassid,
  d.refobjid,
  d.deptype
FROM pg_depend d
JOIN pg_class c ON d.refobjid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
  AND c.relname = 'recent_login_history';

-- 5. Most importantly - check if there's a SECURITY DEFINER function that shares the name
-- This could be what the linter is actually detecting
SELECT 
  'SECURITY DEFINER Functions in public schema' as check_type,
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER ⚠️' ELSE 'SECURITY INVOKER' END as security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.prosecdef = true  -- Only show SECURITY DEFINER functions
  AND (p.proname ILIKE '%login%' OR p.proname ILIKE '%history%' OR p.proname = 'recent_login_history')
ORDER BY p.proname;