-- ============================================================================
-- FIX SIMULATION RLS POLICIES FOR PROGRAM-BASED ACCESS
-- ============================================================================
-- Migration: Update RLS policies to filter simulations by instructor programs
-- Author: GitHub Copilot
-- Date: 2026-02-01
-- Version: 2 (Fixed idempotency)
-- ============================================================================
-- Issue: Instructors currently see ALL templates/simulations regardless of
--        their program assignments. Need to filter by primary_categories.
-- ============================================================================

-- ============================================================================
-- 1. DROP ALL POLICIES (IDEMPOTENT)
-- ============================================================================

-- Drop old policy names
DROP POLICY IF EXISTS templates_select_instructor ON simulation_templates;
DROP POLICY IF EXISTS active_select_policy ON simulation_active;

-- Drop new policy names (in case migration was partially applied)
DROP POLICY IF EXISTS templates_select_instructor_programs ON simulation_templates;
DROP POLICY IF EXISTS templates_update_instructor_programs ON simulation_templates;
DROP POLICY IF EXISTS templates_delete_instructor_programs ON simulation_templates;
DROP POLICY IF EXISTS active_select_instructor_programs ON simulation_active;
DROP POLICY IF EXISTS active_insert_policy ON simulation_active;
DROP POLICY IF EXISTS active_update_policy ON simulation_active;
DROP POLICY IF EXISTS active_delete_policy ON simulation_active;
DROP POLICY IF EXISTS templates_select_student ON simulation_templates;

-- ============================================================================
-- 2. CREATE SIMULATION_TEMPLATES POLICIES
-- ============================================================================

-- SELECT: Instructors see only templates for their programs
CREATE POLICY templates_select_instructor_programs
  ON simulation_templates
  FOR SELECT
  TO authenticated
  USING (
    -- Super admins and coordinators see everything
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'coordinator')
    )
    OR
    -- Admins see templates in their tenant
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN tenant_users tu ON tu.user_id = up.id
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
        AND tu.tenant_id = simulation_templates.tenant_id
        AND tu.is_active = true
    )
    OR
    -- Instructors see templates tagged with their assigned programs
    (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
          AND up.role = 'instructor'
      )
      AND (
        -- If template has no categories, visible to all instructors
        simulation_templates.primary_categories IS NULL
        OR simulation_templates.primary_categories = '{}'
        OR
        -- Check if any template category matches user's programs
        EXISTS (
          SELECT 1 FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = auth.uid()
            AND prog.code = ANY(simulation_templates.primary_categories)
        )
      )
    )
  );

COMMENT ON POLICY templates_select_instructor_programs ON simulation_templates IS
'Instructors see templates tagged with their assigned program codes. Super admins and coordinators see all.';

-- UPDATE: Instructors can update templates for their programs
CREATE POLICY templates_update_instructor_programs
  ON simulation_templates
  FOR UPDATE
  TO authenticated
  USING (
    -- Super admins and coordinators can update everything
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'coordinator')
    )
    OR
    -- Admins can update templates in their tenant
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN tenant_users tu ON tu.user_id = up.id
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
        AND tu.tenant_id = simulation_templates.tenant_id
        AND tu.is_active = true
    )
    OR
    -- Instructors can update templates for their programs
    (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
          AND up.role = 'instructor'
      )
      AND (
        simulation_templates.primary_categories IS NULL
        OR simulation_templates.primary_categories = '{}'
        OR
        EXISTS (
          SELECT 1 FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = auth.uid()
            AND prog.code = ANY(simulation_templates.primary_categories)
        )
      )
    )
  )
  WITH CHECK (
    -- Same logic for WITH CHECK
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'coordinator')
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN tenant_users tu ON tu.user_id = up.id
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
        AND tu.tenant_id = simulation_templates.tenant_id
        AND tu.is_active = true
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
          AND up.role = 'instructor'
      )
      AND (
        simulation_templates.primary_categories IS NULL
        OR simulation_templates.primary_categories = '{}'
        OR
        EXISTS (
          SELECT 1 FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = auth.uid()
            AND prog.code = ANY(simulation_templates.primary_categories)
        )
      )
    )
  );

COMMENT ON POLICY templates_update_instructor_programs ON simulation_templates IS
'Instructors can update templates for their assigned programs.';

-- DELETE: Instructors can delete templates for their programs
CREATE POLICY templates_delete_instructor_programs
  ON simulation_templates
  FOR DELETE
  TO authenticated
  USING (
    -- Super admins and coordinators can delete everything
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'coordinator')
    )
    OR
    -- Admins can delete templates in their tenant
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN tenant_users tu ON tu.user_id = up.id
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
        AND tu.tenant_id = simulation_templates.tenant_id
        AND tu.is_active = true
    )
    OR
    -- Instructors can delete templates for their programs
    (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
          AND up.role = 'instructor'
      )
      AND (
        simulation_templates.primary_categories IS NULL
        OR simulation_templates.primary_categories = '{}'
        OR
        EXISTS (
          SELECT 1 FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = auth.uid()
            AND prog.code = ANY(simulation_templates.primary_categories)
        )
      )
    )
  );

COMMENT ON POLICY templates_delete_instructor_programs ON simulation_templates IS
'Instructors can delete templates for their assigned programs.';

-- ============================================================================
-- 3. CREATE SIMULATION_ACTIVE POLICIES
-- ============================================================================

-- SELECT: Instructors see only active simulations for their programs
CREATE POLICY active_select_instructor_programs
  ON simulation_active
  FOR SELECT
  TO authenticated
  USING (
    -- Creator can see their own simulations
    created_by = auth.uid()
    OR
    -- Super admins and coordinators see everything
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'coordinator')
    )
    OR
    -- Admins see simulations in their tenant
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN tenant_users tu ON tu.user_id = up.id
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
        AND tu.tenant_id = simulation_active.tenant_id
        AND tu.is_active = true
    )
    OR
    -- Participants can see simulations they're part of
    EXISTS (
      SELECT 1 FROM simulation_participants sp
      WHERE sp.simulation_id = simulation_active.id
        AND sp.user_id = auth.uid()
    )
    OR
    -- Instructors see simulations tagged with their assigned programs
    (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
          AND up.role = 'instructor'
      )
      AND (
        -- If simulation has no categories, visible to all instructors
        simulation_active.primary_categories IS NULL
        OR simulation_active.primary_categories = '{}'
        OR
        -- Check if any simulation category matches user's programs
        EXISTS (
          SELECT 1 FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = auth.uid()
            AND prog.code = ANY(simulation_active.primary_categories)
        )
      )
    )
  );

COMMENT ON POLICY active_select_instructor_programs ON simulation_active IS
'Instructors see active simulations tagged with their assigned program codes. Super admins, coordinators, creators, and participants see relevant sims.';

-- INSERT: Super admins, coordinators, admins, and instructors can create simulations
CREATE POLICY active_insert_policy
  ON simulation_active
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin', 'instructor', 'coordinator')
    )
  );

COMMENT ON POLICY active_insert_policy ON simulation_active IS
'Super admins, coordinators, admins, and instructors can create simulations. Categories are validated by application logic.';

-- UPDATE: Instructors can update (start/stop/pause) simulations for their programs
CREATE POLICY active_update_policy
  ON simulation_active
  FOR UPDATE
  TO authenticated
  USING (
    -- Creator can update their own simulations
    created_by = auth.uid()
    OR
    -- Super admins and coordinators can update everything
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'coordinator')
    )
    OR
    -- Admins can update simulations in their tenant
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN tenant_users tu ON tu.user_id = up.id
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
        AND tu.tenant_id = simulation_active.tenant_id
        AND tu.is_active = true
    )
    OR
    -- Instructors can update simulations for their programs
    (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
          AND up.role = 'instructor'
      )
      AND (
        -- If simulation has no categories, allow update
        simulation_active.primary_categories IS NULL
        OR simulation_active.primary_categories = '{}'
        OR
        -- Check if any simulation category matches user's programs
        EXISTS (
          SELECT 1 FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = auth.uid()
            AND prog.code = ANY(simulation_active.primary_categories)
        )
      )
    )
  )
  WITH CHECK (
    -- Same logic for WITH CHECK - user must have access to the simulation after update
    created_by = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'coordinator', 'admin')
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
          AND up.role = 'instructor'
      )
      AND (
        simulation_active.primary_categories IS NULL
        OR simulation_active.primary_categories = '{}'
        OR
        EXISTS (
          SELECT 1 FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = auth.uid()
            AND prog.code = ANY(simulation_active.primary_categories)
        )
      )
    )
  );

COMMENT ON POLICY active_update_policy ON simulation_active IS
'Instructors can update (start/stop/pause) simulations for their assigned programs. Super admins, coordinators, admins, and creators have full access.';

-- DELETE: Instructors can delete simulations for their programs
CREATE POLICY active_delete_policy
  ON simulation_active
  FOR DELETE
  TO authenticated
  USING (
    -- Creator can delete their own simulations
    created_by = auth.uid()
    OR
    -- Super admins and coordinators can delete everything
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'coordinator')
    )
    OR
    -- Admins can delete simulations in their tenant
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN tenant_users tu ON tu.user_id = up.id
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
        AND tu.tenant_id = simulation_active.tenant_id
        AND tu.is_active = true
    )
    OR
    -- Instructors can delete simulations for their programs
    (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
          AND up.role = 'instructor'
      )
      AND (
        simulation_active.primary_categories IS NULL
        OR simulation_active.primary_categories = '{}'
        OR
        EXISTS (
          SELECT 1 FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = auth.uid()
            AND prog.code = ANY(simulation_active.primary_categories)
        )
      )
    )
  );

COMMENT ON POLICY active_delete_policy ON simulation_active IS
'Instructors can delete simulations for their assigned programs. Super admins, coordinators, admins, and creators have full access.';

-- ============================================================================
-- 4. CREATE STUDENT POLICY FOR TEMPLATES
-- ============================================================================

CREATE POLICY templates_select_student
  ON simulation_templates
  FOR SELECT
  TO authenticated
  USING (
    status = 'ready'
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
    )
  );

COMMENT ON POLICY templates_select_student ON simulation_templates IS
'Students can see ready templates. Program filtering handled by frontend.';

-- ============================================================================
-- 5. ADD HELPER FUNCTION FOR DEBUGGING
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_accessible_simulations(p_user_id UUID)
RETURNS TABLE(
  template_id UUID,
  template_name TEXT,
  simulation_id UUID,
  simulation_name TEXT,
  categories TEXT[],
  access_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    st.id as template_id,
    st.name as template_name,
    sa.id as simulation_id,
    sa.name as simulation_name,
    COALESCE(st.primary_categories, sa.primary_categories, '{}'::text[]) as categories,
    CASE
      WHEN up.role IN ('super_admin', 'coordinator') THEN 'Super admin/Coordinator access'
      WHEN up.role = 'admin' THEN 'Admin access'
      WHEN st.created_by = p_user_id OR sa.created_by = p_user_id THEN 'Creator'
      WHEN EXISTS (
        SELECT 1 FROM user_programs up_prog
        JOIN programs prog ON prog.id = up_prog.program_id
        WHERE up_prog.user_id = p_user_id
          AND prog.code = ANY(COALESCE(st.primary_categories, sa.primary_categories, '{}'::text[]))
      ) THEN 'Program match: ' || array_to_string(
        ARRAY(
          SELECT prog.code FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = p_user_id
        ), ', '
      )
      ELSE 'Unknown'
    END as access_reason
  FROM user_profiles up
  LEFT JOIN simulation_templates st ON true
  LEFT JOIN simulation_active sa ON true
  WHERE up.id = p_user_id
    AND (st.id IS NOT NULL OR sa.id IS NOT NULL);
END;
$$;

GRANT EXECUTE ON FUNCTION get_user_accessible_simulations TO authenticated;

COMMENT ON FUNCTION get_user_accessible_simulations IS
'Debug function to see what simulations a user can access and why';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify all policies created
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN '🔍 Read'
    WHEN cmd = 'INSERT' THEN '➕ Create'
    WHEN cmd = 'UPDATE' THEN '✏️ Modify'
    WHEN cmd = 'DELETE' THEN '🗑️ Remove'
    ELSE cmd
  END as operation
FROM pg_policies
WHERE tablename IN ('simulation_templates', 'simulation_active')
  AND (policyname LIKE '%instructor%programs%' OR policyname LIKE '%select_student%' OR policyname LIKE '%insert%' OR policyname LIKE '%update%' OR policyname LIKE '%delete%')
ORDER BY tablename, cmd, policyname;

-- Show summary
SELECT 
  '✅ Migration Complete' as status,
  'Added program-based filtering to simulation RLS policies' as description,
  'Instructors now see only simulations for their assigned programs' as result;
