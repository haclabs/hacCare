-- ============================================================================
-- DETAILED DIAGNOSIS: Why Simulation Access is FALSE
-- ============================================================================
-- We know: Simulation Access = false
-- Now we need to find out WHY
-- ============================================================================

-- Test 1: Is the nurse in simulation_participants at all?
SELECT 
    'Step 1: Check simulation_participants' as test_name,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ PROBLEM: User not in simulation_participants table'
        ELSE '✅ User IS in simulation_participants'
    END as result,
    COUNT(*) as participant_count
FROM simulation_participants
WHERE user_id = auth.uid();

-- Test 2: Show all simulation participations for this user
SELECT 
    'Step 2: User participations' as test_name,
    sp.id,
    sp.simulation_id,
    sp.role,
    sp.granted_at
FROM simulation_participants sp
WHERE sp.user_id = auth.uid();

-- Test 3: Check simulation_active records linked to user's participations
SELECT 
    'Step 3: Check simulation_active records' as test_name,
    sa.id as simulation_id,
    sa.name,
    sa.status,
    sa.tenant_id,
    CASE 
        WHEN sa.status = 'running' THEN '✅ Status is running'
        ELSE '❌ PROBLEM: Status is ' || sa.status || ' (should be running)'
    END as status_check
FROM simulation_participants sp
JOIN simulation_active sa ON sa.id = sp.simulation_id
WHERE sp.user_id = auth.uid();

-- Test 4: Check if has_simulation_tenant_access function exists
SELECT 
    'Step 4: Function check' as test_name,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ PROBLEM: has_simulation_tenant_access function does not exist'
        ELSE '✅ Function exists'
    END as result
FROM pg_proc 
WHERE proname = 'has_simulation_tenant_access';

-- Test 5: Manually test the logic of has_simulation_tenant_access
-- This simulates what the function should return
SELECT 
    'Step 5: Manual simulation access check' as test_name,
    EXISTS (
        SELECT 1 
        FROM simulation_active sa
        JOIN simulation_participants sp ON sp.simulation_id = sa.id
        WHERE sp.user_id = auth.uid()
        AND sa.status = 'running'
    ) as should_have_simulation_access;

-- Test 6: Show the breakdown of what's needed for simulation access
WITH user_sims AS (
    SELECT 
        sa.id as simulation_id,
        sa.tenant_id,
        sa.status,
        sp.user_id,
        sp.role
    FROM simulation_active sa
    JOIN simulation_participants sp ON sp.simulation_id = sa.id
    WHERE sp.user_id = auth.uid()
)
SELECT 
    'Step 6: Detailed breakdown' as test_name,
    simulation_id,
    tenant_id,
    status,
    role,
    CASE WHEN status = 'running' THEN '✅' ELSE '❌' END as status_ok,
    CASE WHEN user_id IS NOT NULL THEN '✅' ELSE '❌' END as user_linked,
    CASE WHEN status = 'running' AND user_id IS NOT NULL THEN '✅ Should have access' 
         ELSE '❌ Missing requirements' 
    END as access_result
FROM user_sims;

-- Test 7: Check if there are ANY running simulations at all
SELECT 
    'Step 7: Any running simulations?' as test_name,
    COUNT(*) as running_simulation_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '❌ PROBLEM: No simulations with status=running'
        ELSE '✅ There are running simulations'
    END as result
FROM simulation_active
WHERE status = 'running';

-- Test 8: Check all simulation statuses
SELECT 
    'Step 8: All simulation statuses' as test_name,
    status,
    COUNT(*) as count
FROM simulation_active
GROUP BY status;

-- ============================================================================
-- LIKELY ISSUES AND FIXES
-- ============================================================================

-- Issue A: Nurse not in simulation_participants
-- Fix: INSERT INTO simulation_participants (simulation_id, user_id, role, granted_by)
--      VALUES ('<simulation-id>', auth.uid(), 'student', '<instructor-id>');

-- Issue B: Simulation status is not 'running' (might be 'pending', 'paused', 'completed')
-- Fix: UPDATE simulation_active SET status = 'running' WHERE id = '<simulation-id>';

-- Issue C: Function doesn't exist
-- Fix: Run /workspaces/hacCare/docs/development/simulation-v2/003_create_simulation_rls_policies.sql

-- ============================================================================
-- DIAGNOSTIC SUMMARY
-- ============================================================================
SELECT 
    'SUMMARY' as section,
    (SELECT COUNT(*) FROM simulation_participants WHERE user_id = auth.uid()) as "In simulation_participants?",
    (SELECT COUNT(*) FROM simulation_active WHERE status = 'running') as "Running simulations exist?",
    (SELECT COUNT(*) 
     FROM simulation_active sa
     JOIN simulation_participants sp ON sp.simulation_id = sa.id
     WHERE sp.user_id = auth.uid() AND sa.status = 'running'
    ) as "User in RUNNING simulation?",
    EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'has_simulation_tenant_access') as "Function exists?";
