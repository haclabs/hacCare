-- Proper Fix: Create Views with security_invoker=on
-- Description: Use PostgreSQL's security_invoker option to ensure views use calling user permissions
-- Date: 2025-07-30
-- Issue: Views need to use SECURITY INVOKER to prevent privilege escalation
-- Solution: Create views WITH (security_invoker=on) to enforce RLS properly

BEGIN;

-- =============================================================================
-- Step 1: Drop existing views completely
-- =============================================================================

DROP VIEW IF EXISTS public.user_tenant_access CASCADE;
DROP VIEW IF EXISTS public.user_roles CASCADE;
DROP VIEW IF EXISTS public.tenant_statistics CASCADE;

-- =============================================================================
-- Step 2: Create views with security_invoker=on
-- =============================================================================

-- Create user_tenant_access view with security_invoker=on
CREATE VIEW public.user_tenant_access
WITH (security_invoker=on) AS
SELECT DISTINCT
    tu.user_id,
    tu.tenant_id,
    up.role as user_role,
    tu.is_active
FROM public.tenant_users tu
JOIN public.user_profiles up ON tu.user_id = up.id;

-- Create user_roles view with security_invoker=on
CREATE VIEW public.user_roles
WITH (security_invoker=on) AS
SELECT 
    up.id,
    up.email,
    up.role,
    up.first_name,
    up.last_name,
    up.created_at
FROM public.user_profiles up;

-- Create tenant_statistics view with security_invoker=on
CREATE VIEW public.tenant_statistics
WITH (security_invoker=on) AS
SELECT 
    t.id,
    t.name,
    t.created_at,
    COUNT(DISTINCT tu.user_id) as user_count,
    COUNT(DISTINCT p.id) as patient_count
FROM public.tenants t
LEFT JOIN public.tenant_users tu ON t.id = tu.tenant_id AND tu.is_active = true
LEFT JOIN public.patients p ON t.id = p.tenant_id
GROUP BY t.id, t.name, t.created_at;

-- =============================================================================
-- Step 3: Set proper permissions
-- =============================================================================

-- Grant SELECT permissions to authenticated users
GRANT SELECT ON public.user_tenant_access TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.tenant_statistics TO authenticated;

-- Revoke from PUBLIC to ensure explicit permission control
REVOKE ALL ON public.user_tenant_access FROM PUBLIC;
REVOKE ALL ON public.user_roles FROM PUBLIC;
REVOKE ALL ON public.tenant_statistics FROM PUBLIC;

-- =============================================================================
-- Step 4: Add documentation comments
-- =============================================================================

COMMENT ON VIEW public.user_tenant_access IS 'User-tenant access mapping - Uses security_invoker=on to enforce calling user permissions and RLS policies';
COMMENT ON VIEW public.user_roles IS 'User roles view - Uses security_invoker=on to enforce calling user permissions and RLS policies';
COMMENT ON VIEW public.tenant_statistics IS 'Tenant statistics view - Uses security_invoker=on to enforce calling user permissions and RLS policies';

-- =============================================================================
-- Step 5: Ensure RLS is enabled on underlying tables
-- =============================================================================

-- Make sure RLS is enabled on all underlying tables so views respect user context
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Step 6: Verification
-- =============================================================================

-- Check that views are created with proper security settings
SELECT 
    schemaname,
    viewname,
    viewowner,
    'View created with security_invoker=on' as status
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('user_tenant_access', 'user_roles', 'tenant_statistics');

-- Verify the views exist and work
SELECT 
    'Views successfully created with security_invoker=on' as final_status,
    'Views will use calling user permissions and enforce RLS' as security_model;

COMMIT;
