-- Revert Materialized View Security Changes
-- This reverts the security restrictions temporarily until we can properly refactor
-- the code to not rely on direct materialized view access

-- Grant access back to authenticated users
GRANT SELECT ON public.user_tenant_cache TO authenticated;

-- Add comment explaining this is temporary
COMMENT ON MATERIALIZED VIEW public.user_tenant_cache IS 
'Cached user-tenant relationships for performance. Currently accessible to authenticated users. TODO: Refactor application code to use RLS-protected functions instead of direct access.';
