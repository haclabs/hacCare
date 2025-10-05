-- ===========================================================================
-- FIX: Infinite Recursion in simulation_participants Policy
-- ===========================================================================
-- The original policy had infinite recursion because it queried
-- simulation_participants from within the simulation_participants policy.
-- This fix simplifies it to check only the user_id directly.
-- ===========================================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "participants_select_policy" ON simulation_participants;

-- Create a simpler policy without recursion
CREATE POLICY "participants_select_policy" ON simulation_participants
FOR SELECT USING (
  -- Admins and Super Admins can see all
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('admin', 'super_admin')
  )
  OR
  -- Users can see their own participation records
  user_id = auth.uid()
);

-- Note: This allows users to see their own participation records directly
-- without needing to check if they're a participant (which caused the recursion)
