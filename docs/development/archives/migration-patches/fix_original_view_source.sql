-- Fix the original view definition source
-- This applies the corrected view definition from enhance_session_tracking.sql

-- Drop the existing view completely first
DROP VIEW IF EXISTS public.recent_login_history CASCADE;

-- Recreate with explicit SECURITY INVOKER and proper RLS filtering
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

-- Verify the view properties
SELECT 
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views 
WHERE viewname = 'recent_login_history';

-- Check for any remaining SECURITY DEFINER views
SELECT 
    schemaname,
    viewname,
    viewowner
FROM pg_views 
WHERE definition ILIKE '%SECURITY%DEFINER%' 
   OR viewname LIKE '%recent_login%';

SELECT 'Fixed original view source - recent_login_history now uses SECURITY INVOKER' AS result;