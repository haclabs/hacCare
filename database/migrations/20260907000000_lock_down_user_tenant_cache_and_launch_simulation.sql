-- ============================================================================
-- SECURITY FIX: Lock down user_tenant_cache + pin launch_simulation search_path
-- ============================================================================
-- Found via Supabase Security Advisor (2026-09-07).
--
-- 1. user_tenant_cache (materialized view) had anon+authenticated GRANT ALL,
--    meaning ANY caller (even unauthenticated, with just the public anon key)
--    could read /rest/v1/user_tenant_cache and get every user's
--    user_id/tenant_id/role/is_active mapping across the entire platform.
--    Verified before applying: no client code and no live function query this
--    view (get_user_current_tenant queries tenant_users directly instead) —
--    only refresh_user_tenant_cache()/its trigger touch it, and those run as
--    the view owner regardless of these grants. Revoking is a no-op for the
--    app, it only removes public API exposure.
--
--    GOTCHA: materialized views have no RLS. If this view is ever DROPped and
--    recreated (not just REFRESHed) by a future migration, default grants
--    return and silently re-expose it — re-run this REVOKE if that happens.
--
-- 2. launch_simulation() had a mutable search_path (none set), flagged by the
--    "function_search_path_mutable" lint. Pinning to `public` is safe here —
--    its only unqualified call is gen_random_uuid(), which resolves via
--    pg_catalog (always implicitly searched) regardless of search_path.
-- ============================================================================

REVOKE ALL ON public.user_tenant_cache FROM anon, authenticated;

ALTER FUNCTION public.launch_simulation(
  uuid, text, integer, uuid[], text[], text[], text[]
) SET search_path = public;
