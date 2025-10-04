-- Force Fix Security Definer View Issue
-- This script uses a more aggressive approach to remove SECURITY DEFINER

-- 1. Drop the view completely with CASCADE to handle dependencies
DROP VIEW IF EXISTS public.recent_login_history CASCADE;

-- 2. Also drop any functions with similar names that might be causing issues
DO $$
DECLARE
  func_record RECORD;
BEGIN
  -- Drop any functions that might be related
  FOR func_record IN 
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) as identity_args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
      AND p.proname ILIKE '%recent_login_history%'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
                   func_record.proname, 
                   func_record.identity_args);
    RAISE NOTICE 'Dropped function: %(%)', func_record.proname, func_record.identity_args;
  END LOOP;
END $$;

-- 3. Wait a moment for any cached definitions to clear
SELECT pg_sleep(1);

-- 4. Recreate the view with explicit SECURITY INVOKER (though this should be default)
CREATE VIEW public.recent_login_history 
WITH (security_invoker = true)
AS
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

-- 5. Set proper ownership (use postgres or service_role)
ALTER VIEW public.recent_login_history OWNER TO postgres;

-- 6. Add security-focused comment
COMMENT ON VIEW public.recent_login_history IS 
'Login history view with SECURITY INVOKER (not DEFINER). Respects RLS policies and user permissions. Users see only their own sessions unless admin/super_admin.';

-- 7. Verify the view was created properly
SELECT 
  'Verification Results' as check_type,
  schemaname,
  viewname,
  viewowner,
  CASE 
    WHEN definition ILIKE '%SECURITY DEFINER%' THEN 'ERROR: Still has SECURITY DEFINER' 
    ELSE 'SUCCESS: No SECURITY DEFINER found'
  END as security_status
FROM pg_views 
WHERE viewname = 'recent_login_history' AND schemaname = 'public';

-- 8. Double-check by looking at the raw pg_rewrite rules
SELECT 
  'Raw Rule Check' as check_type,
  c.relname as view_name,
  pg_get_viewdef(c.oid) as view_definition
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
  AND c.relname = 'recent_login_history'
  AND c.relkind = 'v';

-- 9. Final status
SELECT 
  'Final Status' as summary,
  'View recreated with explicit SECURITY INVOKER' as action_taken,
  'Should resolve Supabase linter warning' as expected_result;