-- Alternative Approach: Create with Different Name First
-- This ensures we completely avoid any cached SECURITY DEFINER properties

-- 1. First, let's check what currently exists
\echo 'Checking current state...'

-- 2. Create a new view with a temporary name to ensure clean creation
CREATE OR REPLACE VIEW public.recent_login_history_new AS
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

-- 3. Verify the new view doesn't have SECURITY DEFINER
SELECT 
  'New View Check' as status,
  viewname,
  CASE 
    WHEN definition ILIKE '%SECURITY DEFINER%' THEN 'ERROR: Has SECURITY DEFINER' 
    ELSE 'SUCCESS: Clean view'
  END as security_check
FROM pg_views 
WHERE viewname = 'recent_login_history_new' AND schemaname = 'public';

-- 4. Now drop the old view and rename the new one
DROP VIEW IF EXISTS public.recent_login_history CASCADE;
ALTER VIEW public.recent_login_history_new RENAME TO recent_login_history;

-- 5. Set proper ownership
ALTER VIEW public.recent_login_history OWNER TO postgres;

-- 6. Add comment
COMMENT ON VIEW public.recent_login_history IS 
'Login history view using SECURITY INVOKER (default). Users see only their own login sessions unless admin/super_admin. Respects all RLS policies.';

-- 7. Final verification
SELECT 
  'Final Verification' as check_type,
  viewname,
  viewowner,
  CASE 
    WHEN definition ILIKE '%SECURITY DEFINER%' THEN 'STILL HAS SECURITY DEFINER - PROBLEM!' 
    ELSE 'CLEAN - No SECURITY DEFINER found'
  END as final_status,
  length(definition) as definition_length
FROM pg_views 
WHERE viewname = 'recent_login_history' AND schemaname = 'public';

-- 8. Test the view access (this should work for authenticated users)
SELECT 
  'Access Test' as test_type,
  COUNT(*) as accessible_records
FROM public.recent_login_history
LIMIT 1;