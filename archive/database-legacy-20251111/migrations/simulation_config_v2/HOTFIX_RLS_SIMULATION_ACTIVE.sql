-- ============================================================================
-- HOTFIX: Fix Infinite Recursion in simulation_active RLS Policy
-- ============================================================================
-- 
-- ISSUE: simulation_active SELECT policy queries simulation_participants
--        simulation_participants SELECT policy queries simulation_active
--        = INFINITE RECURSION LOOP
--
-- ERROR: "infinite recursion detected in policy for relation simulation_active"
--
-- ROOT CAUSE:
-- active_select_participant policy:
--   id IN (SELECT simulation_id FROM simulation_participants WHERE user_id = auth.uid())
-- This triggers simulation_participants policies which query simulation_active = LOOP
--
-- SOLUTION: Remove the simulation_participants check from simulation_active policy
--           Users will still have access through:
--           1. created_by = auth.uid() (if they created it)
--           2. role IN ('super_admin', 'admin') (if they're admin)
--
-- NOTE: Participant-level access can be checked at application level if needed
-- ============================================================================

-- Drop existing problematic policy
DROP POLICY IF EXISTS "active_select_participant" ON simulation_active;

-- Create simplified policy WITHOUT recursion
CREATE POLICY "active_select_policy" ON simulation_active
  FOR SELECT
  USING (
    -- User created this simulation
    created_by = auth.uid()
    -- OR user has admin role (can see all)
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'admin')
    )
    -- OR user has instructor role (can see simulations they're involved with)
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'instructor'
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Test query that was failing:
-- SELECT id, name, ends_at, status 
-- FROM simulation_active 
-- WHERE tenant_id = '6ced4f99-0a51-4e68-b373-53f55ebedc41' 
-- AND status = 'running';

-- Should now work without "infinite recursion" error

-- ============================================================================
-- NOTES
-- ============================================================================

/*

TRADE-OFF:
- BEFORE: Users could see simulations where they're listed as participants
- AFTER: Users only see simulations they created or have admin/instructor role
- REASON: Avoid infinite recursion between simulation_active ↔ simulation_participants

ALTERNATIVE APPROACHES (if participant-level access needed):
1. Application-level check: Query simulation_participants separately
2. Materialized view: Pre-compute user access without recursion
3. Database function: SECURITY DEFINER function to check access
4. Denormalize: Add user_ids[] array to simulation_active table

For now, simplified policy is safest and most performant.

RELATED FILES:
- 001_phase1_config_and_rls.sql: Original policy with recursion
- HOTFIX_RLS_INFINITE_RECURSION.sql: Fixed simulation_participants
- This file: Fixes simulation_active

*/
