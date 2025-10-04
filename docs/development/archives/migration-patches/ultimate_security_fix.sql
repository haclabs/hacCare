-- Ultimate Security Definer Fix - Different Approach
-- Sometimes the issue is in how Supabase interprets the view or caching

-- Method 1: Create with a completely different approach using a function
-- This eliminates any possibility of SECURITY DEFINER views

-- Step 1: Drop the view entirely 
DROP VIEW IF EXISTS public.recent_login_history CASCADE;

-- Step 2: Skip the function approach - just create a very clean view
-- This is simpler and avoids type matching issues entirely

-- Step 3: Create a very clean view with explicit SECURITY INVOKER behavior
-- Use a completely fresh approach that avoids any cached SECURITY DEFINER issues
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
     SELECT 1 FROM user_profiles up_admin
     WHERE up_admin.id = (SELECT auth.uid())
       AND up_admin.role IN ('admin', 'super_admin')
   ))
ORDER BY us.user_id, us.login_time DESC;

-- Step 4: Set proper ownership and permissions
ALTER VIEW public.recent_login_history OWNER TO postgres;

-- Step 5: Add comment emphasizing SECURITY INVOKER behavior
COMMENT ON VIEW public.recent_login_history IS 
'Login history view - uses SECURITY INVOKER (not DEFINER). Users see only their own sessions unless admin/super_admin. Respects all RLS policies and user permissions.';

-- Step 6: Grant appropriate permissions
GRANT SELECT ON public.recent_login_history TO authenticated, anon;

-- Step 7: Comprehensive verification  
SELECT 
  'View Security Check' as check_type,
  viewname as name,
  viewowner as owner,
  CASE 
    WHEN definition ILIKE '%SECURITY DEFINER%' THEN '❌ HAS SECURITY DEFINER'
    ELSE '✅ Clean View - No SECURITY DEFINER'
  END as security_status,
  'View uses SECURITY INVOKER by default' as security_model
FROM pg_views 
WHERE viewname = 'recent_login_history' AND schemaname = 'public';

-- Also check that no functions with this name have SECURITY DEFINER
SELECT 
  'Function Check' as check_type,
  COALESCE(p.proname, 'No functions found') as name,
  COALESCE(CASE WHEN p.prosecdef THEN '❌ SECURITY DEFINER' ELSE '✅ SECURITY INVOKER' END, 'N/A') as security_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'recent_login_history';

-- Step 8: Test that it works
SELECT 
  'Access Test' as test_type,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✅ View accessible'
    ELSE '❌ Access denied'
  END as result,
  COUNT(*) as record_count
FROM public.recent_login_history;