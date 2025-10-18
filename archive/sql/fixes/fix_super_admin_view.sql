-- Fix recent_login_history view for super admin with NULL tenant

-- Drop and recreate the view with proper super admin handling
DROP VIEW IF EXISTS public.recent_login_history CASCADE;

CREATE OR REPLACE VIEW public.recent_login_history 
WITH (security_invoker = true) AS
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
  -- Apply RLS-style filtering for security
  (
    -- Super admin can see all sessions across all tenants
    (SELECT auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin'
    OR 
    -- Regular users can only see sessions from their tenant (handle NULL properly)
    (
      (SELECT public.get_user_tenant_id()) IS NOT NULL 
      AND us.tenant_id = (SELECT public.get_user_tenant_id())
    )
  )
ORDER BY us.user_id, us.login_time DESC;

-- Test the fix
SELECT 'Super admin test:' as test_type,
       (SELECT auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin' as is_super_admin,
       COUNT(*) as visible_sessions
FROM public.recent_login_history;

-- Show recent logins for super admin
SELECT 'Recent logins now visible:' as info;
SELECT 
  email,
  first_name || ' ' || last_name as full_name,
  login_time,
  status,
  tenant_name,
  ip_address
FROM public.recent_login_history 
ORDER BY login_time DESC 
LIMIT 10;

SELECT 'Fixed super admin access to recent_login_history view' AS result;