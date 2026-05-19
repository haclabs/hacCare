-- ============================================================================
-- FIX MATERIALIZED VIEW IN API (Supabase Security Advisor)
-- ============================================================================
-- Warning: public.user_tenant_cache is accessible over the Data APIs.
--
-- Root cause:
--   The user_tenant_cache materialized view has GRANT SELECT TO authenticated,
--   which PostgREST exposes as GET /rest/v1/user_tenant_cache. Any authenticated
--   user can query it and see all user-tenant mappings across all tenants.
--
-- Why we can't simply revoke and be done:
--   All RLS policies on lab tables use USING (tenant_id IN (SELECT tenant_id
--   FROM user_tenant_cache WHERE user_id = auth.uid())). RLS USING expressions
--   run in the current user's security context (authenticated role), so
--   revoking SELECT breaks those policies.
--
-- Fix:
--   1. Replace every user_tenant_cache subquery in lab RLS policies with an
--      equivalent direct query against tenant_users (the source of truth).
--   2. Revoke SELECT on user_tenant_cache from anon and authenticated.
--
-- The replacement subquery:
--   SELECT tenant_id FROM tenant_users
--   WHERE user_id = auth.uid() AND is_active = true
--
-- This is semantically identical (user_tenant_cache is a projection of
-- tenant_users) and adds the is_active = true filter that the cache policies
-- were missing.
-- ============================================================================

-- ============================================================================
-- 1. LAB_PANELS — drop and replace all policies
-- ============================================================================
DROP POLICY IF EXISTS "lab_panels_select" ON public.lab_panels;
DROP POLICY IF EXISTS "lab_panels_insert" ON public.lab_panels;
DROP POLICY IF EXISTS "lab_panels_update" ON public.lab_panels;
DROP POLICY IF EXISTS "lab_panels_delete" ON public.lab_panels;

CREATE POLICY lab_panels_select
  ON public.lab_panels
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY lab_panels_insert
  ON public.lab_panels
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role = ANY(ARRAY['admin'::user_role, 'super_admin'::user_role])
    )
  );

CREATE POLICY lab_panels_update
  ON public.lab_panels
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role = ANY(ARRAY['admin'::user_role, 'super_admin'::user_role])
    )
  );

CREATE POLICY lab_panels_delete
  ON public.lab_panels
  FOR DELETE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role = ANY(ARRAY['admin'::user_role, 'super_admin'::user_role])
    )
  );

-- ============================================================================
-- 2. LAB_RESULTS — drop and replace all policies
-- ============================================================================
DROP POLICY IF EXISTS "lab_results_select" ON public.lab_results;
DROP POLICY IF EXISTS "lab_results_insert" ON public.lab_results;
DROP POLICY IF EXISTS "lab_results_update" ON public.lab_results;
DROP POLICY IF EXISTS "lab_results_delete" ON public.lab_results;

CREATE POLICY lab_results_select
  ON public.lab_results
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY lab_results_insert
  ON public.lab_results
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role = ANY(ARRAY['admin'::user_role, 'super_admin'::user_role])
    )
  );

CREATE POLICY lab_results_update
  ON public.lab_results
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND (
      -- Admins can update everything
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
          AND role = ANY(ARRAY['admin'::user_role, 'super_admin'::user_role])
      )
      -- Nurses/students can only update ack fields
      OR (ack_by = auth.uid() AND ack_at IS NOT NULL)
    )
  );

CREATE POLICY lab_results_delete
  ON public.lab_results
  FOR DELETE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
        AND role = ANY(ARRAY['admin'::user_role, 'super_admin'::user_role])
    )
  );

-- ============================================================================
-- 3. LAB_ACK_EVENTS — drop and replace all policies
-- ============================================================================
DROP POLICY IF EXISTS "lab_ack_events_select" ON public.lab_ack_events;
DROP POLICY IF EXISTS "lab_ack_events_insert" ON public.lab_ack_events;

CREATE POLICY lab_ack_events_select
  ON public.lab_ack_events
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY lab_ack_events_insert
  ON public.lab_ack_events
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    AND ack_by = auth.uid()
  );

-- ============================================================================
-- 4. LAB_ORDERS — create tenant-isolated policies
--    (has tenant_id, created after the original labs schema;
--     DROP IF EXISTS handles any user_tenant_cache-based policies safely)
-- ============================================================================
DROP POLICY IF EXISTS "lab_orders_select" ON public.lab_orders;
DROP POLICY IF EXISTS "lab_orders_insert" ON public.lab_orders;
DROP POLICY IF EXISTS "lab_orders_update" ON public.lab_orders;
DROP POLICY IF EXISTS "lab_orders_delete" ON public.lab_orders;
DROP POLICY IF EXISTS lab_orders_select ON public.lab_orders;
DROP POLICY IF EXISTS lab_orders_insert ON public.lab_orders;
DROP POLICY IF EXISTS lab_orders_update ON public.lab_orders;
DROP POLICY IF EXISTS lab_orders_delete ON public.lab_orders;
DROP POLICY IF EXISTS lab_orders_tenant_isolation ON public.lab_orders;

CREATE POLICY lab_orders_tenant_isolation
  ON public.lab_orders
  FOR ALL TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users
      WHERE user_id = auth.uid() AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ============================================================================
-- 5. REVOKE direct API access to user_tenant_cache
--    Now safe to do — no RLS policies reference it anymore.
-- ============================================================================
REVOKE SELECT ON public.user_tenant_cache FROM authenticated;
REVOKE SELECT ON public.user_tenant_cache FROM anon;

-- The cache is still owned by postgres and usable for internal functions
-- (SECURITY DEFINER functions run as postgres and don't need a GRANT).
-- If refresh_user_tenant_cache() or trigger_refresh_user_tenant_cache() are
-- affected, they run as SECURITY DEFINER so they bypass this revocation.

-- ============================================================================
-- VERIFY (run manually after applying)
-- ============================================================================
-- Confirm no remaining user_tenant_cache grants:
-- SELECT grantee, privilege_type
-- FROM information_schema.role_table_grants
-- WHERE table_name = 'user_tenant_cache';
-- Expected: 0 rows (or only postgres / service_role)
--
-- Confirm lab table policies were updated:
-- SELECT tablename, policyname, qual
-- FROM pg_policies
-- WHERE tablename IN ('lab_panels', 'lab_results', 'lab_ack_events', 'lab_orders')
-- ORDER BY tablename, policyname;
-- Expected: no 'user_tenant_cache' in qual column
