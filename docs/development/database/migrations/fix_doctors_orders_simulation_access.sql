-- ============================================================================
-- FIX: Doctors Orders Simulation Access
-- ============================================================================
-- Issue: Nurses in simulations cannot see doctors orders
-- Cause: doctors_orders RLS policy only checks tenant_users table
--        Simulation participants are in simulation_participants table
-- Solution: Add simulation access check using has_simulation_tenant_access()
-- ============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "doctors_orders_access" ON "public"."doctors_orders";

-- Recreate with simulation support
CREATE POLICY "doctors_orders_access" ON "public"."doctors_orders"
FOR ALL USING (
    -- Super admin users can access all orders across all tenants
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin' 
        AND is_active = true
    )
    OR 
    -- Regular users can access orders from their assigned tenants
    EXISTS (
        SELECT 1 FROM tenant_users 
        WHERE user_id = auth.uid() 
        AND tenant_id = "doctors_orders".tenant_id 
        AND is_active = true
    )
    OR
    -- Simulation participants can access orders for their simulation tenant
    -- This uses the has_simulation_tenant_access() function from 003_create_simulation_rls_policies.sql
    has_simulation_tenant_access("doctors_orders".tenant_id)
)
WITH CHECK (
    -- Super admin users can modify all orders across all tenants
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin' 
        AND is_active = true
    )
    OR 
    -- Regular users can modify orders from their assigned tenants
    EXISTS (
        SELECT 1 FROM tenant_users 
        WHERE user_id = auth.uid() 
        AND tenant_id = "doctors_orders".tenant_id 
        AND is_active = true
    )
    OR
    -- Simulation participants can modify orders for their simulation tenant
    has_simulation_tenant_access("doctors_orders".tenant_id)
);

-- Add comment
COMMENT ON POLICY "doctors_orders_access" ON "public"."doctors_orders" IS 
'Allows access to doctors orders for tenant users and simulation participants. Super admins have full access.';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- 1. Check if function exists
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname = 'has_simulation_tenant_access';

-- 2. Verify the policy was created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'doctors_orders'
AND policyname = 'doctors_orders_access';

-- 3. Test query (as a simulation participant)
-- This should return orders if you're in an active simulation
-- SELECT * FROM doctors_orders 
-- WHERE patient_id = '<test-patient-id-from-simulation>';

-- ============================================================================
-- NOTES
-- ============================================================================
/*
This fix applies the same pattern used for other patient data tables like:
- patient_vitals
- patient_medications
- patients

The has_simulation_tenant_access() function checks if:
1. User is in simulation_participants table
2. Linked to a simulation_active record
3. That simulation's tenant_id matches the data being queried
4. The simulation status is 'running'

This ensures:
✅ Nurses can see doctors orders when in active simulations
✅ Instructors can see doctors orders when in active simulations
✅ Regular tenant access still works (production use)
✅ Super admins still have full access
✅ Data isolation is maintained between simulations
*/
