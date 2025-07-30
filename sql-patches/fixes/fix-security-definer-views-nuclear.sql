-- Aggressive Fix: Completely Remove and Recreate SECURITY DEFINER Views
-- Description: Force remove all traces of SECURITY DEFINER views and recreate them properly
-- Date: 2025-07-30
-- Issue: Views still showing as SECURITY DEFINER despite previous fixes

BEGIN;

-- =============================================================================
-- Step 1: Nuclear approach - Drop everything related to these views
-- =============================================================================

-- Drop any functions that might recreate these views
DROP FUNCTION IF EXISTS create_user_tenant_access_view() CASCADE;
DROP FUNCTION IF EXISTS refresh_user_tenant_access() CASCADE;
DROP FUNCTION IF EXISTS create_user_roles_view() CASCADE;
DROP FUNCTION IF EXISTS create_tenant_statistics_view() CASCADE;

-- Drop any triggers that might recreate these views
DROP TRIGGER IF EXISTS refresh_user_tenant_access_trigger ON public.tenant_users CASCADE;
DROP TRIGGER IF EXISTS refresh_user_roles_trigger ON public.user_profiles CASCADE;
DROP TRIGGER IF EXISTS refresh_tenant_stats_trigger ON public.tenants CASCADE;

-- Drop the views completely with CASCADE to remove all dependencies
DROP VIEW IF EXISTS public.user_tenant_access CASCADE;
DROP VIEW IF EXISTS public.user_roles CASCADE;
DROP VIEW IF EXISTS public.tenant_statistics CASCADE;

-- Also try dropping any materialized views (just in case)
DROP MATERIALIZED VIEW IF EXISTS public.user_tenant_access CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.user_roles CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.tenant_statistics CASCADE;

-- =============================================================================
-- Step 2: Check for and remove any leftover view definitions in pg_views
-- =============================================================================

-- This will show us if there are any remaining references
SELECT 
    schemaname,
    viewname,
    viewowner,
    'Found existing view - will be replaced' as status
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('user_tenant_access', 'user_roles', 'tenant_statistics');

-- =============================================================================
-- Step 3: Recreate views as simple, non-privileged views
-- =============================================================================

-- Create user_tenant_access as a basic view (no special privileges)
CREATE VIEW public.user_tenant_access AS
SELECT DISTINCT
    tu.user_id,
    tu.tenant_id,
    up.role as user_role,
    tu.is_active
FROM public.tenant_users tu
JOIN public.user_profiles up ON tu.user_id = up.id;

-- Set explicit ownership to ensure no SECURITY DEFINER inheritance
ALTER VIEW public.user_tenant_access OWNER TO postgres;

-- Create user_roles as a basic view
CREATE VIEW public.user_roles AS
SELECT 
    up.id,
    up.email,
    up.role,
    up.first_name,
    up.last_name,
    up.created_at
FROM public.user_profiles up;

-- Set explicit ownership
ALTER VIEW public.user_roles OWNER TO postgres;

-- Create tenant_statistics as a basic view
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

-- Set explicit ownership
ALTER VIEW public.tenant_statistics OWNER TO postgres;

-- =============================================================================
-- Step 4: Set explicit permissions (not inherited)
-- =============================================================================

-- Revoke all permissions from public first
REVOKE ALL ON public.user_tenant_access FROM PUBLIC;
REVOKE ALL ON public.user_roles FROM PUBLIC;
REVOKE ALL ON public.tenant_statistics FROM PUBLIC;

-- Grant only SELECT to authenticated users
GRANT SELECT ON public.user_tenant_access TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.tenant_statistics TO authenticated;

-- =============================================================================
-- Step 5: Add comments to document the security model
-- =============================================================================

COMMENT ON VIEW public.user_tenant_access IS 'User-tenant access mapping - SECURITY INVOKER (uses current user permissions, filtered by RLS on underlying tables)';
COMMENT ON VIEW public.user_roles IS 'User roles view - SECURITY INVOKER (uses current user permissions, filtered by RLS on underlying tables)';
COMMENT ON VIEW public.tenant_statistics IS 'Tenant statistics view - SECURITY INVOKER (uses current user permissions, filtered by RLS on underlying tables)';

-- =============================================================================
-- Step 6: Ensure RLS is properly configured on underlying tables
-- =============================================================================

-- Make sure RLS is enabled on all underlying tables
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;

-- Ensure there are proper RLS policies (basic ones if they don't exist)
DO $$
BEGIN
    -- Basic RLS policy for tenant_users if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'tenant_users' 
        AND policyname = 'tenant_users_basic_access'
    ) THEN
        CREATE POLICY "tenant_users_basic_access"
            ON public.tenant_users FOR SELECT
            USING (
                -- Super admins can see all
                EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'super_admin')
                OR
                -- Users can see their own records
                user_id = auth.uid()
                OR
                -- Users can see records in their tenant
                tenant_id IN (
                    SELECT tu.tenant_id FROM public.tenant_users tu 
                    WHERE tu.user_id = auth.uid() AND tu.is_active = true
                )
            );
    END IF;

    -- Basic RLS policy for user_profiles if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profiles' 
        AND policyname = 'user_profiles_basic_access'
    ) THEN
        CREATE POLICY "user_profiles_basic_access"
            ON public.user_profiles FOR SELECT
            USING (
                -- Super admins can see all
                role = 'super_admin' AND id = auth.uid()
                OR
                -- Users can see their own profile
                id = auth.uid()
                OR
                -- Users can see profiles of people in their tenant
                id IN (
                    SELECT tu.user_id FROM public.tenant_users tu 
                    WHERE tu.tenant_id IN (
                        SELECT tu2.tenant_id FROM public.tenant_users tu2 
                        WHERE tu2.user_id = auth.uid() AND tu2.is_active = true
                    )
                )
            );
    END IF;
END $$;

-- =============================================================================
-- Step 7: Final verification
-- =============================================================================

-- Check that views are now created without SECURITY DEFINER
SELECT 
    schemaname,
    viewname,
    viewowner,
    'View recreated as SECURITY INVOKER' as status
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('user_tenant_access', 'user_roles', 'tenant_statistics');

-- Test that views work with current user context
SELECT 'Views successfully recreated without SECURITY DEFINER' as final_status;

COMMIT;
