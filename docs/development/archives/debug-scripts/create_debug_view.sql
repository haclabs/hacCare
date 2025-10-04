-- Temporarily create an unrestricted view to see recent logins

-- Create a debug version without security filtering
CREATE OR REPLACE VIEW public.recent_login_history_debug 
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
  us.tenant_id,
  ROW_NUMBER() OVER (PARTITION BY us.user_id ORDER BY us.login_time DESC) as login_rank
FROM user_sessions us
LEFT JOIN user_profiles up ON us.user_id = up.id
LEFT JOIN tenants t ON us.tenant_id = t.id
ORDER BY us.login_time DESC;

-- Show recent logins from debug view
SELECT 'Recent logins (debug - no security filter):' as info;
SELECT 
  email,
  first_name,
  last_name,
  login_time,
  status,
  tenant_name,
  tenant_id,
  user_id
FROM public.recent_login_history_debug 
WHERE login_time > NOW() - INTERVAL '7 days'
ORDER BY login_time DESC 
LIMIT 10;

-- Check current user info
SELECT 'Current user info:' as info,
       auth.uid() as current_user_id,
       public.get_user_tenant_id() as current_tenant_id,
       auth.jwt() -> 'user_metadata' ->> 'role' as current_role;

SELECT 'Filtering debug complete - check results above' as result;