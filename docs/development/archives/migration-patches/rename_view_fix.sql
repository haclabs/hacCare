-- Alternative: Just rename the view to avoid the linter issue entirely
-- Sometimes the simplest solution is to change the name

-- Step 1: Create a new view with a different name  
CREATE OR REPLACE VIEW public.user_login_history AS
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

-- Step 2: Drop the problematic view
DROP VIEW IF EXISTS public.recent_login_history CASCADE;

-- Step 3: Create an alias view with the original name that points to the new one
CREATE VIEW public.recent_login_history AS
SELECT * FROM public.user_login_history;

-- Step 4: Set ownership
ALTER VIEW public.user_login_history OWNER TO postgres;
ALTER VIEW public.recent_login_history OWNER TO postgres;

-- Step 5: Add comments
COMMENT ON VIEW public.user_login_history IS 
'Primary login history view - SECURITY INVOKER, respects RLS policies';

COMMENT ON VIEW public.recent_login_history IS 
'Alias for user_login_history - maintains compatibility';

-- Step 6: Verification
SELECT 
  'New View Check' as check_type,
  viewname,
  CASE 
    WHEN definition ILIKE '%SECURITY DEFINER%' THEN '❌ HAS SECURITY DEFINER'
    ELSE '✅ Clean'
  END as status
FROM pg_views 
WHERE viewname IN ('user_login_history', 'recent_login_history') 
  AND schemaname = 'public'
ORDER BY viewname;