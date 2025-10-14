-- Fix Materialized View Security Issue
-- Issue: user_tenant_cache materialized view is accessible by anon or authenticated roles
-- Solution: Revoke public access and grant only to service_role

-- Revoke all permissions from public and authenticated roles
REVOKE ALL ON public.user_tenant_cache FROM anon;
REVOKE ALL ON public.user_tenant_cache FROM authenticated;
REVOKE ALL ON public.user_tenant_cache FROM public;

-- Only service_role (server-side functions) should access this
-- Regular users don't need direct access to the cache
GRANT SELECT ON public.user_tenant_cache TO service_role;

-- Add comment explaining the security model
COMMENT ON MATERIALIZED VIEW public.user_tenant_cache IS 
'Cached user-tenant relationships for performance. Access restricted to service_role only. Regular users access through RLS-protected functions and views.';
