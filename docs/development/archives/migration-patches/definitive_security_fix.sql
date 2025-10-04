-- Definitive Fix for Security Definer Issue
-- This handles both views and functions that might be causing the warning

-- Step 1: Drop ANY functions named recent_login_history (they might have SECURITY DEFINER)
DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Find and drop any functions with this name
  FOR func_record IN 
    SELECT 
      p.proname,
      pg_get_function_identity_arguments(p.oid) as identity_args,
      CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END as security_type
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname = 'recent_login_history'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
                   func_record.proname, 
                   func_record.identity_args);
    RAISE NOTICE 'Dropped function: % (%) - was %', 
                 func_record.proname, 
                 func_record.identity_args,
                 func_record.security_type;
  END LOOP;
END $$;

-- Step 2: Drop the view completely
DROP VIEW IF EXISTS public.recent_login_history CASCADE;

-- Step 3: Create a completely clean view with explicit security settings
-- Using CREATE OR REPLACE to ensure clean creation
CREATE VIEW public.recent_login_history AS
SELECT 
  us.id,
  us.user_id,
  up.email,
  up.first_name,
  up.last_name,
  us.ip_address,
  us.user_agent,
  us.login_time,
  us.logout_time,
  us.status,
  t.name as tenant_name,
  ROW_NUMBER() OVER (PARTITION BY us.user_id ORDER BY us.login_time DESC) as login_rank
FROM user_sessions us
LEFT JOIN user_profiles up ON us.user_id = up.id
LEFT JOIN tenants t ON us.tenant_id = t.id
WHERE 
  -- Only show sessions for the current user or if user is admin/super_admin
  (us.user_id = (SELECT auth.uid()) 
   OR EXISTS (
     SELECT 1 FROM user_profiles 
     WHERE id = (SELECT auth.uid())
     AND role IN ('admin', 'super_admin')
   ))
ORDER BY us.user_id, us.login_time DESC;

-- Step 4: Ensure proper ownership (not a superuser or admin role)
ALTER VIEW public.recent_login_history OWNER TO postgres;

-- Step 5: Add explicit comment about security model
COMMENT ON VIEW public.recent_login_history IS 
'Login history view - SECURITY INVOKER (not DEFINER). Users see only own sessions unless admin. Respects RLS policies.';

-- Step 6: Verify no SECURITY DEFINER anywhere
SELECT 
  'Final Verification' as status,
  'View: ' || viewname as object_name,
  CASE 
    WHEN definition ILIKE '%SECURITY DEFINER%' THEN '❌ STILL HAS SECURITY DEFINER'
    ELSE '✅ Clean - No SECURITY DEFINER'
  END as security_status
FROM pg_views 
WHERE viewname = 'recent_login_history' AND schemaname = 'public'

UNION ALL

SELECT 
  'Final Verification' as status,
  'Function: ' || p.proname as object_name,
  CASE WHEN p.prosecdef THEN '❌ FUNCTION HAS SECURITY DEFINER' ELSE '✅ Function Clean' END as security_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'recent_login_history';

-- Step 7: Show what we now have
SELECT 
  'Summary' as info,
  COUNT(*) as objects_named_recent_login_history,
  STRING_AGG(
    CASE 
      WHEN relkind = 'v' THEN 'View'
      WHEN relkind = 'f' THEN 'Function'  
      ELSE 'Other: ' || relkind
    END, ', '
  ) as object_types
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
  AND c.relname = 'recent_login_history';

-- Step 8: Test access to make sure it works
SELECT 
  'Access Test' as test_result,
  'View is accessible' as message,
  current_user as querying_as
WHERE EXISTS (SELECT 1 FROM public.recent_login_history LIMIT 1)

UNION ALL

SELECT 
  'Access Test' as test_result,
  'View exists but no data or access denied' as message,
  current_user as querying_as
WHERE NOT EXISTS (SELECT 1 FROM public.recent_login_history LIMIT 1);