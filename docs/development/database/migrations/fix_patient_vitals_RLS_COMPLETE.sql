-- ============================================================================
-- COMPLETE FIX: All Patient Vitals RLS Policies for Simulations
-- ============================================================================
-- Run this entire file in one go to ensure all policies are properly set
-- ============================================================================

-- Step 1: Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "patient_vitals_insert_policy" ON patient_vitals;
DROP POLICY IF EXISTS "patient_vitals_select_policy" ON patient_vitals;
DROP POLICY IF EXISTS "patient_vitals_update_policy" ON patient_vitals;
DROP POLICY IF EXISTS "patient_vitals_delete_policy" ON patient_vitals;
DROP POLICY IF EXISTS "patient_vitals_simulation_insert_policy" ON patient_vitals;
DROP POLICY IF EXISTS "patient_vitals_simulation_select_policy" ON patient_vitals;
DROP POLICY IF EXISTS "Users can insert vitals for their tenant" ON patient_vitals;
DROP POLICY IF EXISTS "patient_vitals_insert" ON patient_vitals;
DROP POLICY IF EXISTS "patient_vitals_select" ON patient_vitals;
DROP POLICY IF EXISTS "patient_vitals_insert_with_simulation" ON patient_vitals;
DROP POLICY IF EXISTS "patient_vitals_select_with_simulation" ON patient_vitals;
DROP POLICY IF EXISTS "patient_vitals_update_with_simulation" ON patient_vitals;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON patient_vitals;
DROP POLICY IF EXISTS "Enable read access for all users" ON patient_vitals;
DROP POLICY IF EXISTS "tenant_isolation" ON patient_vitals;

-- Step 2: Create comprehensive policies with simulation support

-- INSERT POLICY
CREATE POLICY "patient_vitals_all_insert" ON patient_vitals
FOR INSERT WITH CHECK (
    -- Super admin
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin' 
        AND is_active = true
    )
    OR 
    -- Tenant users
    EXISTS (
        SELECT 1 FROM tenant_users 
        WHERE user_id = auth.uid() 
        AND tenant_id = patient_vitals.tenant_id 
        AND is_active = true
    )
    OR
    -- User tenant access
    EXISTS (
        SELECT 1 FROM user_tenant_access
        WHERE user_id = auth.uid()
        AND tenant_id = patient_vitals.tenant_id
        AND is_active = true
    )
    OR
    -- Simulation participants
    has_simulation_tenant_access(patient_vitals.tenant_id)
);

-- SELECT POLICY (CRITICAL - This is what was missing!)
CREATE POLICY "patient_vitals_all_select" ON patient_vitals
FOR SELECT USING (
    -- Super admin
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin' 
        AND is_active = true
    )
    OR 
    -- Tenant users
    EXISTS (
        SELECT 1 FROM tenant_users 
        WHERE user_id = auth.uid() 
        AND tenant_id = patient_vitals.tenant_id 
        AND is_active = true
    )
    OR
    -- User tenant access  
    EXISTS (
        SELECT 1 FROM user_tenant_access
        WHERE user_id = auth.uid()
        AND tenant_id = patient_vitals.tenant_id
        AND is_active = true
    )
    OR
    -- Simulation participants (THIS IS THE KEY FIX!)
    has_simulation_tenant_access(patient_vitals.tenant_id)
);

-- UPDATE POLICY
CREATE POLICY "patient_vitals_all_update" ON patient_vitals
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

-- DELETE POLICY (admin only)
CREATE POLICY "patient_vitals_all_delete" ON patient_vitals
FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'super_admin')
        AND is_active = true
    )
);

-- Step 3: Add helpful comments
COMMENT ON POLICY "patient_vitals_all_insert" ON patient_vitals IS 
'Allows inserting vitals for tenant users and simulation participants';

COMMENT ON POLICY "patient_vitals_all_select" ON patient_vitals IS 
'Allows viewing vitals for tenant users and simulation participants';

COMMENT ON POLICY "patient_vitals_all_update" ON patient_vitals IS 
'Allows updating vitals for tenant users and simulation participants';

COMMENT ON POLICY "patient_vitals_all_delete" ON patient_vitals IS 
'Only admins and super admins can delete vitals';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check all policies are created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    cmd as "Command",
    CASE 
        WHEN cmd = 'SELECT' THEN '🔍 Read'
        WHEN cmd = 'INSERT' THEN '➕ Create'
        WHEN cmd = 'UPDATE' THEN '✏️ Edit'
        WHEN cmd = 'DELETE' THEN '🗑️ Delete'
        ELSE cmd
    END as operation
FROM pg_policies 
WHERE tablename = 'patient_vitals'
ORDER BY cmd, policyname;

-- ============================================================================
-- TEST AS NURSE USER
-- ============================================================================
-- After running this, switch to nurse user and run these tests:

/*
-- Test 1: Can nurse see the vitals they just inserted?
SELECT 
    'Test: Can see vitals?' as test,
    COUNT(*) as count,
    CASE WHEN COUNT(*) > 0 THEN '✅ SUCCESS' ELSE '❌ FAILED' END as result
FROM patient_vitals 
WHERE id = 'e0aed020-0657-4388-81e0-c7f6f8e60e87';

-- Test 2: Can nurse see all vitals for their simulation patient?
SELECT 
    'Test: All patient vitals' as test,
    COUNT(*) as count,
    MAX(recorded_at) as latest_vital
FROM patient_vitals
WHERE patient_id = '56666f95-4c58-4787-be01-51e45db43eba';

-- Test 3: Verify simulation access function works
SELECT 
    'Test: Simulation access' as test,
    has_simulation_tenant_access('b388cac5-094e-4208-91b0-b34258aaaffe') as has_access,
    CASE 
        WHEN has_simulation_tenant_access('b388cac5-094e-4208-91b0-b34258aaaffe') 
        THEN '✅ Function works' 
        ELSE '❌ Function returns false' 
    END as result;
*/

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
SELECT 
    '✅ ALL POLICIES UPDATED!' as status,
    'Now test in the UI - vitals should save without spinner hanging' as next_step;
