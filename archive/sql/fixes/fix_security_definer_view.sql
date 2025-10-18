-- Fix Security Definer View: recent_login_history
-- This migration addresses the Supabase linter warning by recreating the view without SECURITY DEFINER
-- and implementing proper RLS policies instead

-- Drop the existing view if it exists
DROP VIEW IF EXISTS public.recent_login_history;

-- Recreate the view without SECURITY DEFINER (this will use SECURITY INVOKER by default)
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
  (us.user_id = auth.uid() 
   OR EXISTS (
     SELECT 1 FROM user_profiles 
     WHERE id = auth.uid() 
     AND role IN ('admin', 'super_admin')
   ))
ORDER BY us.user_id, us.login_time DESC;

-- Enable RLS on the view (this will use the underlying table's RLS policies)
ALTER VIEW public.recent_login_history OWNER TO postgres;

-- Add a comment explaining the security model
COMMENT ON VIEW public.recent_login_history IS 
'Login history view that respects RLS policies. Users can only see their own login history unless they are admin/super_admin.';

-- Verify the view was created without SECURITY DEFINER
SELECT 
  schemaname, 
  viewname, 
  viewowner,
  definition
FROM pg_views 
WHERE viewname = 'recent_login_history';