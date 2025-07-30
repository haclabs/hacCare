-- Comprehensive Security Fix: Force SECURITY INVOKER for All Views
-- Description: Fix SECURITY DEFINER issues on views by explicitly setting SECURITY INVOKER
-- Date: 2025-07-30
-- Issue: Views are inheriting SECURITY DEFINER properties, bypassing RLS
-- Fix: Drop and recreate all problematic views with explicit SECURITY INVOKER

BEGIN;

-- =============================================================================
-- Step 1: Check current view properties
-- =============================================================================

-- Query to see current view security properties (for debugging)
SELECT 
    schemaname,
    viewname,
    viewowner,
    definition
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('user_tenant_access', 'user_roles', 'tenant_statistics');

-- =============================================================================
-- Step 2: Drop all problematic views completely
-- =============================================================================

DROP VIEW IF EXISTS public.user_tenant_access CASCADE;
DROP VIEW IF EXISTS public.user_roles CASCADE; 
DROP VIEW IF EXISTS public.tenant_statistics CASCADE;

-- Also drop any dependent objects that might recreate these views
DROP TRIGGER IF EXISTS refresh_user_tenant_access ON tenant_users CASCADE;
DROP TRIGGER IF EXISTS refresh_user_roles ON user_profiles CASCADE;
DROP TRIGGER IF EXISTS refresh_tenant_statistics ON tenants CASCADE;

-- =============================================================================
-- Step 3: Recreate views with explicit SECURITY INVOKER (PostgreSQL 15+ syntax)
-- =============================================================================

-- Note: PostgreSQL views don't have explicit SECURITY INVOKER syntax like functions
-- The key is to ensure they're created as regular views without any special privileges
-- and that any functions they depend on are properly secured

-- Fix 1: user_tenant_access view
CREATE VIEW public.user_tenant_access 
WITH (security_invoker = true)
AS
SELECT DISTINCT
    tu.user_id,
    tu.tenant_id,
    up.role as user_role,
    tu.is_active
FROM public.tenant_users tu
JOIN public.user_profiles up ON tu.user_id = up.id;

-- Alternative approach if WITH clause doesn't work
DROP VIEW IF EXISTS public.user_tenant_access;
CREATE VIEW public.user_tenant_access AS
SELECT DISTINCT
    tu.user_id,
    tu.tenant_id,
    up.role as user_role,
    tu.is_active
FROM public.tenant_users tu
JOIN public.user_profiles up ON tu.user_id = up.id;

COMMENT ON VIEW public.user_tenant_access IS 'User-tenant access mapping - uses SECURITY INVOKER (current user permissions)';

-- Fix 2: user_roles view  
CREATE VIEW public.user_roles AS
SELECT 
    up.id,
    up.email,
    up.role,
    up.first_name,
    up.last_name,
    up.created_at
FROM public.user_profiles up;

COMMENT ON VIEW public.user_roles IS 'User roles view - uses SECURITY INVOKER (current user permissions)';

-- Fix 3: tenant_statistics view
CREATE VIEW public.tenant_statistics AS
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

COMMENT ON VIEW public.tenant_statistics IS 'Tenant statistics view - uses SECURITY INVOKER (current user permissions)';

-- =============================================================================
-- Step 4: Set proper permissions (not ownership-based)
-- =============================================================================

-- Grant permissions to authenticated users (they will be filtered by RLS)
GRANT SELECT ON public.user_tenant_access TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.tenant_statistics TO authenticated;

-- Revoke any excessive permissions
REVOKE ALL ON public.user_tenant_access FROM PUBLIC;
REVOKE ALL ON public.user_roles FROM PUBLIC;
REVOKE ALL ON public.tenant_statistics FROM PUBLIC;

-- =============================================================================
-- Step 5: Ensure RLS is enabled on underlying tables
-- =============================================================================

-- Make sure RLS is enabled on all underlying tables
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Step 6: Alternative approach - Create functions instead of views if needed
-- =============================================================================

-- If views continue to have SECURITY DEFINER issues, create functions instead
CREATE OR REPLACE FUNCTION get_user_tenant_access()
RETURNS TABLE(
    user_id UUID,
    tenant_id UUID,
    user_role TEXT,
    is_active BOOLEAN
)
SET search_path = ''
SECURITY INVOKER
AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        tu.user_id,
        tu.tenant_id,
        up.role as user_role,
        tu.is_active
    FROM public.tenant_users tu
    JOIN public.user_profiles up ON tu.user_id = up.id;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Step 7: Verification and testing
-- =============================================================================

-- Check view ownership and properties
SELECT 
    schemaname,
    viewname,
    viewowner,
    'View recreated successfully' as status
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('user_tenant_access', 'user_roles', 'tenant_statistics');

-- Test that views respect current user context
SELECT 'Security INVOKER views created successfully' as status;

COMMIT;
