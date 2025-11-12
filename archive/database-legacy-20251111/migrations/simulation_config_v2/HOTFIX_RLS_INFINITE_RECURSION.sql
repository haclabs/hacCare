-- ============================================================================
-- HOTFIX: Fix Infinite Recursion in simulation_participants RLS Policies
-- ============================================================================
-- 
-- ISSUE: Phase 1 RLS policies caused infinite recursion:
-- - activity_log_select_policy queries simulation_participants
-- - simulation_participants policies query simulation_active
-- - This creates a circular dependency = infinite loop
-- 
-- EMERGENCY FIX APPLIED: Disabled RLS on simulation_participants
-- 
-- PERMANENT SOLUTION: Simplify policies to avoid cross-table recursion
-- ============================================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "participants_select_policy" ON simulation_participants;
DROP POLICY IF EXISTS "participants_insert_policy" ON simulation_participants;
DROP POLICY IF EXISTS "participants_update_policy" ON simulation_participants;
DROP POLICY IF EXISTS "participants_delete_policy" ON simulation_participants;

-- Re-enable RLS on simulation_participants
ALTER TABLE simulation_participants ENABLE ROW LEVEL SECURITY;

-- ===== SIMPLIFIED POLICIES (NO RECURSION) =====

-- Users can see participants in simulations they're part of OR created
CREATE POLICY "participants_select_policy" ON simulation_participants
  FOR SELECT
  USING (
    -- User is a participant
    user_id = auth.uid()
    -- OR user created the simulation (check simulation_active directly, no subquery)
    OR simulation_id IN (
      SELECT id FROM simulation_active WHERE created_by = auth.uid()
    )
    -- OR user has admin/instructor role
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin', 'instructor')
    )
  );

-- Only simulation creator or admins can add participants
CREATE POLICY "participants_insert_policy" ON simulation_participants
  FOR INSERT
  WITH CHECK (
    -- Simulation creator
    simulation_id IN (
      SELECT id FROM simulation_active WHERE created_by = auth.uid()
    )
    -- OR admin/instructor
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin', 'instructor')
    )
  );

-- Only simulation creator or admins can update participants
CREATE POLICY "participants_update_policy" ON simulation_participants
  FOR UPDATE
  USING (
    simulation_id IN (
      SELECT id FROM simulation_active WHERE created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin')
    )
  );

-- Only grantor or admins can remove participants
CREATE POLICY "participants_delete_policy" ON simulation_participants
  FOR DELETE
  USING (
    granted_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin')
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test that active simulations query works
-- SELECT sa.*, sp.user_id, sp.role
-- FROM simulation_active sa
-- LEFT JOIN simulation_participants sp ON sp.simulation_id = sa.id;

-- Should return results without infinite recursion error

-- ============================================================================
-- NOTES
-- ============================================================================

/*

ROOT CAUSE:
- activity_log_select_policy had this logic:
    simulation_id IN (
      SELECT simulation_id FROM simulation_participants WHERE user_id = auth.uid()
    )
- When querying simulation_participants, it triggered participants_select_policy
- Which then queries simulation_active
- Which might trigger activity_log queries
- = INFINITE LOOP

SOLUTION:
- Removed complex cross-table queries from simulation_participants policies
- Simplified to direct checks (user_id = auth.uid())
- Only query simulation_active directly (not through other tables)
- Admin checks use user_profiles only (no recursion)

LESSON LEARNED:
- RLS policies should avoid circular dependencies
- Keep policies simple and direct
- Test with real queries after deployment
- Have a rollback plan (DISABLE RLS as emergency)

*/
