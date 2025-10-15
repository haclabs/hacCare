-- ============================================================================
-- DIAGNOSE: Why UI Spinner Keeps Running After Vitals Insert
-- ============================================================================
-- The vitals ARE being inserted, but the UI is stuck loading
-- This suggests the SELECT query after insert is failing or timing out
-- ============================================================================

-- Test 1: Can the nurse SELECT vitals they just inserted?
-- Run this AS THE NURSE USER
SELECT 
    'Test 1: Can nurse see vitals?' as test,
    COUNT(*) as vitals_count,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ Can see vitals'
        ELSE '❌ Cannot see vitals (SELECT policy issue)'
    END as result
FROM patient_vitals
WHERE patient_id = '56666f95-4c58-4787-be01-51e45db43eba';

-- Test 2: Check the tenant_id of the vitals just inserted
SELECT 
    'Test 2: Vitals tenant_id check' as test,
    id,
    patient_id,
    tenant_id,
    temperature,
    recorded_at
FROM patient_vitals
WHERE patient_id = '56666f95-4c58-4787-be01-51e45db43eba'
ORDER BY recorded_at DESC
LIMIT 3;

-- Test 3: Check if nurse has access to this tenant
-- Run AS THE NURSE USER
SELECT 
    'Test 3: Nurse tenant access' as test,
    sa.tenant_id as simulation_tenant_id,
    sa.status,
    sp.role as nurse_role
FROM simulation_active sa
JOIN simulation_participants sp ON sp.simulation_id = sa.id
WHERE sp.user_id = auth.uid()
AND sa.status = 'running';

-- Test 4: Does the patient's tenant_id match the simulation tenant_id?
SELECT 
    'Test 4: Patient vs Simulation tenant match' as test,
    p.id as patient_id,
    p.tenant_id as patient_tenant_id,
    sa.tenant_id as simulation_tenant_id,
    CASE 
        WHEN p.tenant_id = sa.tenant_id THEN '✅ Match'
        ELSE '❌ MISMATCH - This is the problem!'
    END as match_status
FROM patients p
CROSS JOIN simulation_active sa
JOIN simulation_participants sp ON sp.simulation_id = sa.id
WHERE p.id = '56666f95-4c58-4787-be01-51e45db43eba'
AND sp.user_id = auth.uid()
AND sa.status = 'running';

-- Test 5: Manual test of has_simulation_tenant_access with the patient's tenant
-- Run AS THE NURSE USER
SELECT 
    'Test 5: Simulation access function' as test,
    p.tenant_id,
    has_simulation_tenant_access(p.tenant_id) as has_access,
    CASE 
        WHEN has_simulation_tenant_access(p.tenant_id) THEN '✅ Has access'
        ELSE '❌ No access (function returns false)'
    END as result
FROM patients p
WHERE p.id = '56666f95-4c58-4787-be01-51e45db43eba';

-- ============================================================================
-- LIKELY ISSUES
-- ============================================================================

-- Issue A: Vitals inserted with wrong tenant_id
-- The vitals might have nurse's home tenant_id instead of simulation tenant_id
-- Check: Do the inserted vitals have the same tenant_id as the patient?

-- Issue B: SELECT policy not applied yet
-- The INSERT policy was fixed but SELECT policy might still be blocking
-- Check: Did you run the SELECT policy fix from the previous SQL file?

-- Issue C: Patient has wrong tenant_id
-- The patient might not have the simulation's tenant_id
-- Check: Does patient.tenant_id match simulation.tenant_id?

-- ============================================================================
-- POTENTIAL FIXES
-- ============================================================================

-- Fix A: If vitals have wrong tenant_id, update them
-- (Only run if Test 4 shows mismatch)
/*
UPDATE patient_vitals pv
SET tenant_id = (
    SELECT sa.tenant_id 
    FROM simulation_active sa
    JOIN simulation_participants sp ON sp.simulation_id = sa.id
    WHERE sp.user_id = 'db8cb615-b411-40e3-847a-7dfa574407b4'
    AND sa.status = 'running'
    LIMIT 1
)
WHERE pv.patient_id = '56666f95-4c58-4787-be01-51e45db43eba'
AND pv.recorded_at > NOW() - INTERVAL '10 minutes'; -- Only recent vitals
*/

-- Fix B: Ensure SELECT policy is applied (run the policy creation from previous file)
-- See: fix_patient_vitals_simulation_access_URGENT.sql

-- Fix C: If patient has wrong tenant_id, update it
-- (Only run if patient is supposed to be in simulation)
/*
UPDATE patients p
SET tenant_id = (
    SELECT sa.tenant_id 
    FROM simulation_active sa
    WHERE sa.id = '8155df2e-a2f1-4c56-9bb0-6732a4560e8b'
)
WHERE p.id = '56666f95-4c58-4787-be01-51e45db43eba';
*/
