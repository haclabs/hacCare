-- ============================================================================
-- Simulation Portal - Row-Level Security Policies
-- ============================================================================
-- Ensures users can only access their assigned simulations
-- Instructors can see all simulations they're teaching
-- ============================================================================

-- ============================================================================
-- SIMULATION PARTICIPANTS POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS simulation_participants_select ON simulation_participants;
DROP POLICY IF EXISTS simulation_participants_insert ON simulation_participants;
DROP POLICY IF EXISTS simulation_participants_update ON simulation_participants;
DROP POLICY IF EXISTS simulation_participants_delete ON simulation_participants;

-- Allow users to view their own assignments + instructors see all
CREATE POLICY simulation_participants_select ON simulation_participants
  FOR SELECT
  USING (
    -- User can see their own assignments
    auth.uid() = user_id
    OR
    -- Instructors and admins can see all assignments
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Only instructors/admins can add participants
CREATE POLICY simulation_participants_insert ON simulation_participants
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Users can update their own last_accessed_at
-- Instructors can update any participant
CREATE POLICY simulation_participants_update ON simulation_participants
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Only instructors/admins can remove participants
CREATE POLICY simulation_participants_delete ON simulation_participants
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- SIMULATION ACTIVE POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS simulation_active_select ON simulation_active;
DROP POLICY IF EXISTS simulation_active_insert ON simulation_active;
DROP POLICY IF EXISTS simulation_active_update ON simulation_active;
DROP POLICY IF EXISTS simulation_active_delete ON simulation_active;

-- Allow users to view simulations they're assigned to
CREATE POLICY simulation_active_select ON simulation_active
  FOR SELECT
  USING (
    -- User is a participant in this simulation
    EXISTS (
      SELECT 1 FROM simulation_participants
      WHERE simulation_participants.simulation_id = id
      AND simulation_participants.user_id = auth.uid()
    )
    OR
    -- User is an instructor/admin
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Only instructors/admins can create simulations
CREATE POLICY simulation_active_insert ON simulation_active
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Instructors can update simulations they're teaching
-- Admins can update any simulation
CREATE POLICY simulation_active_update ON simulation_active
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM simulation_participants
      WHERE simulation_participants.simulation_id = id
      AND simulation_participants.user_id = auth.uid()
      AND simulation_participants.role = 'instructor'
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Only admins can delete simulations
CREATE POLICY simulation_active_delete ON simulation_active
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- ============================================================================
-- SIMULATION TEMPLATES POLICIES
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS simulation_templates_select ON simulation_templates;
DROP POLICY IF EXISTS simulation_templates_insert ON simulation_templates;
DROP POLICY IF EXISTS simulation_templates_update ON simulation_templates;
DROP POLICY IF EXISTS simulation_templates_delete ON simulation_templates;

-- All authenticated users can view templates
CREATE POLICY simulation_templates_select ON simulation_templates
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only instructors/admins can create templates
CREATE POLICY simulation_templates_insert ON simulation_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Only template creator, instructors, or admins can update
CREATE POLICY simulation_templates_update ON simulation_templates
  FOR UPDATE
  USING (
    auth.uid() = created_by
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Only template creator or admins can delete
CREATE POLICY simulation_templates_delete ON simulation_templates
  FOR DELETE
  USING (
    auth.uid() = created_by
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- ============================================================================
-- ENABLE RLS ON ALL SIMULATION TABLES
-- ============================================================================

ALTER TABLE simulation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_active ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_activity_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant table access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON simulation_participants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON simulation_active TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON simulation_templates TO authenticated;
GRANT SELECT ON simulation_history TO authenticated;
GRANT SELECT, INSERT ON simulation_activity_log TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check policies are created
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE tablename IN ('simulation_participants', 'simulation_active', 'simulation_templates')
-- ORDER BY tablename, policyname;

-- Test as student (replace USER_ID)
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO 'USER_ID';
-- SELECT * FROM simulation_participants;  -- Should only see own assignments
-- SELECT * FROM simulation_active;  -- Should only see assigned simulations

-- Test as instructor (replace USER_ID)
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims.sub TO 'INSTRUCTOR_USER_ID';
-- SELECT * FROM simulation_participants;  -- Should see all
-- SELECT * FROM simulation_active;  -- Should see all
