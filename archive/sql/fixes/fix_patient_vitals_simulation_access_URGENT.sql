-- ============================================================================
-- FIX: Patient Vitals Simulation Access (URGENT)
-- ============================================================================
-- Issue: Nurses in simulations get 403 Forbidden when inserting vitals
-- Error: "new row violates row-level security policy for table patient_vitals"
-- Cause: patient_vitals RLS policy doesn't include simulation access
-- Solution: Add simulation access check like doctors_orders table
-- ============================================================================

-- STEP 1: Check current policies (run first to see what exists)
SELECT 
    policyname,
    cmd,
    qual as using_clause,
    with_check
FROM pg_policies 
WHERE tablename = 'patient_vitals';

-- ============================================================================
-- THE FIX: Update patient_vitals RLS policies to include simulation access
-- ============================================================================

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "patient_vitals_insert_policy" ON patient_vitals;
DROP POLICY IF EXISTS "patient_vitals_simulation_insert_policy" ON patient_vitals;
DROP POLICY IF EXISTS "Users can insert vitals for their tenant" ON patient_vitals;
DROP POLICY IF EXISTS "patient_vitals_insert" ON patient_vitals;

-- Create comprehensive INSERT policy with simulation support
CREATE POLICY "patient_vitals_insert_with_simulation" ON patient_vitals
FOR INSERT WITH CHECK (
    -- Super admin users can insert vitals anywhere
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin' 
        AND is_active = true
    )
    OR 
    -- Regular users can insert vitals in their assigned tenants
    EXISTS (
        SELECT 1 FROM tenant_users 
        WHERE user_id = auth.uid() 
        AND tenant_id = patient_vitals.tenant_id 
        AND is_active = true
    )
    OR
    -- Alternative: user_tenant_access table (if used in your deployment)
    EXISTS (
        SELECT 1 FROM user_tenant_access
        WHERE user_id = auth.uid()
        AND tenant_id = patient_vitals.tenant_id
        AND is_active = true
    )
    OR
    -- Simulation participants can insert vitals for their simulation tenant
    has_simulation_tenant_access(patient_vitals.tenant_id)
);

-- Update SELECT policy to include simulation access (if not already present)
DROP POLICY IF EXISTS "patient_vitals_select_policy" ON patient_vitals;

CREATE POLICY "patient_vitals_select_with_simulation" ON patient_vitals
FOR SELECT USING (
    -- Super admin users can see all vitals
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin' 
        AND is_active = true
    )
    OR 
    -- Regular users can see vitals from their assigned tenants
    EXISTS (
        SELECT 1 FROM tenant_users 
        WHERE user_id = auth.uid() 
        AND tenant_id = patient_vitals.tenant_id 
        AND is_active = true
    )
    OR
    -- Alternative: user_tenant_access table
    EXISTS (
        SELECT 1 FROM user_tenant_access
        WHERE user_id = auth.uid()
        AND tenant_id = patient_vitals.tenant_id
        AND is_active = true
    )
    OR
    -- Simulation participants can see vitals for their simulation
    has_simulation_tenant_access(patient_vitals.tenant_id)
);

-- Update UPDATE policy to include simulation access
DROP POLICY IF EXISTS "patient_vitals_update_policy" ON patient_vitals;

CREATE POLICY "patient_vitals_update_with_simulation" ON patient_vitals
FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin' 
        AND is_active = true
    )
    OR 
    EXISTS (
        SELECT 1 FROM tenant_users 
        WHERE user_id = auth.uid() 
        AND tenant_id = patient_vitals.tenant_id 
        AND is_active = true
    )
    OR
    EXISTS (
        SELECT 1 FROM user_tenant_access
        WHERE user_id = auth.uid()
        AND tenant_id = patient_vitals.tenant_id
        AND is_active = true
    )
    OR
    has_simulation_tenant_access(patient_vitals.tenant_id)
);

-- Add comment
COMMENT ON POLICY "patient_vitals_insert_with_simulation" ON patient_vitals IS 
'Allows inserting vitals for tenant users and simulation participants. Super admins have full access.';

COMMENT ON POLICY "patient_vitals_select_with_simulation" ON patient_vitals IS 
'Allows viewing vitals for tenant users and simulation participants. Super admins have full access.';

COMMENT ON POLICY "patient_vitals_update_with_simulation" ON patient_vitals IS 
'Allows updating vitals for tenant users and simulation participants. Super admins have full access.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'patient_vitals'
ORDER BY policyname;

-- ============================================================================
-- TEST AS NURSE (run this query as the nurse user after applying fix)
-- ============================================================================
/*
-- This should return true if nurse is in active simulation
SELECT 
    'Can insert vitals?' as test,
    EXISTS (
        SELECT 1 FROM simulation_active sa
        JOIN simulation_participants sp ON sp.simulation_id = sa.id
        WHERE sp.user_id = auth.uid()
        AND sa.status = 'running'
    ) as has_access;
*/

-- ============================================================================
-- NOTES
-- ============================================================================
/*
This fix applies the same pattern used for doctors_orders:
1. Check if user is super admin
2. Check if user is in tenant_users for this tenant
3. Check if user is in user_tenant_access for this tenant  
4. Check if user is simulation participant with has_simulation_tenant_access()

The has_simulation_tenant_access() function checks:
- User is in simulation_participants table
- Linked to a simulation_active record
- That simulation's tenant_id matches the vitals being inserted
- The simulation status is 'running'

This ensures:
✅ Nurses can insert vitals when in active simulations
✅ Regular tenant access still works (production use)
✅ Super admins still have full access
✅ Data isolation is maintained between simulations
*/
