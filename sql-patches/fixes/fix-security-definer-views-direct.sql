-- Direct Fix: Remove SECURITY DEFINER from Views
-- This script directly addresses the Supabase security linter issues
-- by dropping and recreating the problematic views without SECURITY DEFINER

-- Query to check current view definitions
SELECT 
    schemaname,
    viewname,
    definition 
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname IN ('user_tenant_access', 'user_roles', 'tenant_statistics');

-- Fix 1: user_tenant_access view
DROP VIEW IF EXISTS public.user_tenant_access CASCADE;

CREATE VIEW public.user_tenant_access AS
SELECT DISTINCT
    tu.user_id,
    tu.tenant_id,
    up.role as user_role,
    tu.is_active
FROM tenant_users tu
JOIN user_profiles up ON tu.user_id = up.id;

GRANT SELECT ON public.user_tenant_access TO authenticated;

-- Fix 2: user_roles view
DROP VIEW IF EXISTS public.user_roles CASCADE;

CREATE VIEW public.user_roles AS
SELECT 
    up.id,
    up.email,
    up.role,
    up.first_name,
    up.last_name,
    up.created_at
FROM user_profiles up;

GRANT SELECT ON public.user_roles TO authenticated;

-- Fix 3: tenant_statistics view
DROP VIEW IF EXISTS public.tenant_statistics CASCADE;

CREATE VIEW public.tenant_statistics AS
SELECT 
    t.id,
    t.name,
    t.created_at,
    COUNT(DISTINCT tu.user_id) as user_count,
    COUNT(DISTINCT p.id) as patient_count
FROM tenants t
LEFT JOIN tenant_users tu ON t.id = tu.tenant_id AND tu.is_active = true
LEFT JOIN patients p ON t.id = p.tenant_id
GROUP BY t.id, t.name, t.created_at;

GRANT SELECT ON public.tenant_statistics TO authenticated;

-- Verify the views are now created without SECURITY DEFINER
SELECT 'Views recreated without SECURITY DEFINER' as status;
