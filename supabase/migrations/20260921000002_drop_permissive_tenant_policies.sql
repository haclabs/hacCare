-- ============================================================================
-- SECURITY FIX, PART 2 of 2: close the hole
-- ============================================================================
-- Prerequisites, in order:
--   1. 20260921000000_add_tenant_access_functions.sql applied.
--   2. The client that calls rpc('ensure_tenant_access') is DEPLOYED and
--      verified. Before that deploy, TenantContext.tsx and
--      useActiveSimulations.ts still self-upsert into tenant_users, and this
--      migration removes the policy that permits it -- instructors would lose
--      template-edit and simulation access until the deploy lands.
--
-- This is the migration that actually revokes the escalation described in
-- 20260921000000. See that file's header for the full mechanism.
--
-- ROLLBACK: re-create tenant_users_auth_select / tenant_users_auth_insert with
-- `USING (auth.uid() IS NOT NULL)`. That restores the vulnerability, so only do
-- it to recover a broken teaching session, and re-apply immediately after.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3. Replace the tenant_users policies
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS tenant_users_auth_select ON public.tenant_users;
DROP POLICY IF EXISTS tenant_users_auth_insert ON public.tenant_users;
DROP POLICY IF EXISTS tenant_users_auth_update ON public.tenant_users;
DROP POLICY IF EXISTS tenant_users_auth_delete ON public.tenant_users;

-- SELECT: own rows, co-members of tenants you belong to (so admin user-management
-- lists keep working), and everything for super_admin/coordinator.
-- Uses caller_tenant_ids() (SECURITY DEFINER) rather than a self-join on
-- tenant_users, which would recurse.
CREATE POLICY tenant_users_select ON public.tenant_users
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR tenant_id IN (SELECT public.caller_tenant_ids())
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.role IN ('super_admin', 'coordinator')
        AND up.is_active
    )
  );

-- Writes are administrative only. Ordinary self-enrolment goes through
-- ensure_tenant_access(), which is SECURITY DEFINER and bypasses these.
-- Covers: UserForm.tsx:181, tenantService.ts:203/408/474, programService.ts:380/396.
CREATE POLICY tenant_users_admin_insert ON public.tenant_users
  FOR INSERT TO authenticated
  WITH CHECK (public.caller_may_administer_tenant(tenant_id));

CREATE POLICY tenant_users_admin_update ON public.tenant_users
  FOR UPDATE TO authenticated
  USING (public.caller_may_administer_tenant(tenant_id))
  WITH CHECK (public.caller_may_administer_tenant(tenant_id));

CREATE POLICY tenant_users_admin_delete ON public.tenant_users
  FOR DELETE TO authenticated
  USING (public.caller_may_administer_tenant(tenant_id));

-- ----------------------------------------------------------------------------
-- 4. Drop the identical hole on `tenants`
-- ----------------------------------------------------------------------------
-- tenants_auth_insert/update/delete were all `TO public USING (auth.uid() IS
-- NOT NULL)`, sitting alongside correct tenants_super_admin_* policies. Postgres
-- ORs permissive policies together, so the super_admin restriction was
-- decorative: any authenticated user could create, rename or delete a tenant.
-- 20260415000003 dropped the matching tenants_auth_select and left these behind.
-- The tenants_super_admin_{insert,update,delete} policies already cover every
-- legitimate write, so these are pure removals.

DROP POLICY IF EXISTS tenants_auth_insert ON public.tenants;
DROP POLICY IF EXISTS tenants_auth_update ON public.tenants;
DROP POLICY IF EXISTS tenants_auth_delete ON public.tenants;
