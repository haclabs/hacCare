-- ============================================================================
-- SECURITY FIX: Close anon full-table-read on tenants (branding lookup)
-- ============================================================================
-- `tenants` had a `FOR SELECT TO public USING (true)` policy ("Allow public
-- read access to tenant branding") -- flagged during the 2026-09-07 security
-- audit and left unfixed at the time since removing it outright would have
-- broken a real feature: TenantContext.tsx's `loadCurrentTenant()` runs its
-- subdomain-based tenant lookup (`getTenantBySubdomain`) on EVERY page load,
-- gated only on `authLoading` finishing -- NOT on `user` being present -- so
-- it genuinely executes as the `anon` role on the public login page (e.g.
-- visiting lethpoly.haccare.app while logged out).
--
-- The problem: `USING (true)` doesn't just allow the single-row subdomain
-- lookup the client performs, it allows ANY anon caller to `select('*')` the
-- ENTIRE tenants table with no filter at all -- including non-branding
-- columns like `settings` (jsonb, may hold arbitrary tenant config),
-- `admin_user_id`, `subscription_plan`, `max_users`, `max_patients`.
--
-- Fix: move the subdomain lookup behind a SECURITY DEFINER function that
-- requires an exact subdomain match (so it can never be used to enumerate
-- the whole table) and drop the wide-open policy. The existing
-- `tenants_authenticated_select` policy already covers all legitimate
-- authenticated-user table reads, so authenticated behavior is unaffected --
-- only the anon "read anything" path goes away.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_tenant_by_subdomain_public(p_subdomain text)
RETURNS SETOF public.tenants
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT * FROM public.tenants
  WHERE subdomain = p_subdomain AND status = 'active'
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_tenant_by_subdomain_public(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_tenant_by_subdomain_public(text) TO anon, authenticated;

DROP POLICY IF EXISTS "Allow public read access to tenant branding" ON public.tenants;
