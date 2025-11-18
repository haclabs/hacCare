-- ============================================================================
-- ALLOW STUDENTS TO SEE ASSIGNED SIMULATIONS
-- ============================================================================
-- Break infinite recursion by fixing BOTH policies
-- The issue: participants_select_policy checks simulation_active.created_by,
-- which triggers active_select_policy, which checks simulation_participants
-- ============================================================================

-- Fix simulation_participants policy to NOT check simulation_active
DROP POLICY IF EXISTS participants_select_policy ON simulation_participants;

CREATE POLICY participants_select_policy ON simulation_participants
  FOR SELECT
  USING (
    -- Allow users to see their own participant records
    user_id = auth.uid()
    -- Allow admins/instructors/super_admins to see all participant records
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role IN ('super_admin', 'admin', 'instructor')
    )
  );

-- Fix simulation_active policy to include participants
DROP POLICY IF EXISTS active_select_policy ON simulation_active;

CREATE POLICY active_select_policy ON simulation_active
  FOR SELECT
  USING (
    -- Allow creator to see their simulations
    created_by = auth.uid()
    -- Allow admins/instructors/super_admins to see all simulations
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() 
      AND up.role IN ('super_admin', 'admin', 'instructor')
    )
    -- Allow participants to see simulations they're assigned to
    OR EXISTS (
      SELECT 1 
      FROM simulation_participants sp
      WHERE sp.simulation_id = simulation_active.id 
      AND sp.user_id = auth.uid()
    )
  );

COMMENT ON POLICY participants_select_policy ON simulation_participants IS 
  'Allow users to see their own participant records or admins/instructors to see all';

COMMENT ON POLICY active_select_policy ON simulation_active IS 
  'Allow users to see simulations they created, admins/instructors, or simulations they are assigned to as participants';
