-- ============================================================================
-- FIX: programs and user_programs SELECT policies for super_admin
-- ============================================================================
-- Problem: Migration 20260416000001 dropped programs_management (FOR ALL)
-- and only replaced it with INSERT/UPDATE/DELETE policies. The only
-- remaining SELECT policy (programs_tenant_isolation) requires tenant_users
-- membership, which super_admins don't have for all tenants.
-- The same restriction affects user_programs_select when viewing other users.
-- ============================================================================

-- Add super_admin SELECT bypass for programs
CREATE POLICY programs_super_admin_select
  ON public.programs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
    )
  );

-- Fix user_programs_select to allow super_admin to see all assignments
-- (not just those in tenants they're a member of)
DROP POLICY IF EXISTS user_programs_select ON public.user_programs;

CREATE POLICY user_programs_select
  ON public.user_programs
  FOR SELECT TO authenticated
  USING (
    -- Users can always see their own program assignments
    user_id = (SELECT auth.uid())
    -- Super admins can see all program assignments
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = (SELECT auth.uid()) AND role = 'super_admin'
    )
    -- Coordinators can see assignments for programs in their tenants
    OR (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = (SELECT auth.uid())
          AND up.role = 'coordinator'
      )
      AND program_id IN (
        SELECT p.id FROM programs p
        WHERE p.tenant_id IN (
          SELECT tenant_id FROM tenant_users
          WHERE user_id = (SELECT auth.uid()) AND is_active = true
        )
      )
    )
  );
