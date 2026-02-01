-- ============================================================================
-- CHECK AND FIX SIMULATION_HISTORY RLS POLICIES
-- ============================================================================
-- Issue: Cannot delete debrief reports from history
-- Date: 2026-02-01
-- ============================================================================

-- ============================================================================
-- 1. CHECK CURRENT POLICIES
-- ============================================================================

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
  END as operation,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename = 'simulation_history'
ORDER BY cmd, policyname;

-- ============================================================================
-- 2. ADD DELETE POLICY FOR SIMULATION_HISTORY (IDEMPOTENT)
-- ============================================================================

-- Drop existing DELETE policies (all possible names)
DROP POLICY IF EXISTS simulation_history_delete_policy ON simulation_history;
DROP POLICY IF EXISTS history_delete_policy ON simulation_history;
DROP POLICY IF EXISTS simulation_history_delete_instructor_programs ON simulation_history;

-- Create comprehensive DELETE policy matching simulation_active pattern
CREATE POLICY simulation_history_delete_instructor_programs
  ON simulation_history
  FOR DELETE
  TO authenticated
  USING (
    -- Creator can delete their own history entries
    created_by = auth.uid()
    OR
    -- Super admins and coordinators can delete everything
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'coordinator')
    )
    OR
    -- Admins can delete history in their tenant
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN tenant_users tu ON tu.user_id = up.id
      WHERE up.id = auth.uid()
        AND up.role = 'admin'
        AND tu.tenant_id = simulation_history.tenant_id
        AND tu.is_active = true
    )
    OR
    -- Instructors can delete history for their programs
    (
      EXISTS (
        SELECT 1 FROM user_profiles up
        WHERE up.id = auth.uid()
          AND up.role = 'instructor'
      )
      AND (
        -- If history has no categories, allow delete
        simulation_history.primary_categories IS NULL
        OR simulation_history.primary_categories = '{}'
        OR
        -- Check if any category matches user's programs
        EXISTS (
          SELECT 1 FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = auth.uid()
            AND prog.code = ANY(simulation_history.primary_categories)
        )
      )
    )
  );

COMMENT ON POLICY simulation_history_delete_instructor_programs ON simulation_history IS
'Instructors can delete simulation history for their assigned programs. Super admins, coordinators, admins, and creators have full access.';

-- ============================================================================
-- 3. VERIFY DELETE POLICY CREATED
-- ============================================================================

SELECT 
  '✅ DELETE Policy Added' as status,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'simulation_history'
  AND cmd = 'DELETE';

-- ============================================================================
-- 4. CHECK IF UPDATE POLICY EXISTS (NEEDED FOR ARCHIVE/UNARCHIVE)
-- ============================================================================

SELECT 
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ UPDATE policy exists'
    ELSE '⚠️ UPDATE policy missing - add if archive/unarchive not working'
  END as update_status,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename = 'simulation_history'
  AND cmd = 'UPDATE';
