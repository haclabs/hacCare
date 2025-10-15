-- ============================================================================
-- ADD NURSE TO SIMULATION - Ready to Run
-- ============================================================================
-- Simulation ID: 8155df2e-a2f1-4c56-9bb0-6732a4560e8b
-- Nurse/Student ID: db8cb615-b411-40e3-847a-7dfa574407b4
-- ============================================================================

-- First, let's check who the instructor/creator of the simulation is
SELECT 
    id as simulation_id,
    name,
    created_by as instructor_id,
    status,
    tenant_id
FROM simulation_active
WHERE id = '8155df2e-a2f1-4c56-9bb0-6732a4560e8b';

-- Now add the nurse to the simulation
INSERT INTO simulation_participants (
    simulation_id,
    user_id,
    role,
    granted_by
)
SELECT 
    '8155df2e-a2f1-4c56-9bb0-6732a4560e8b'::uuid as simulation_id,
    'db8cb615-b411-40e3-847a-7dfa574407b4'::uuid as user_id,
    'student'::simulation_role as role,
    sa.created_by as granted_by
FROM simulation_active sa
WHERE sa.id = '8155df2e-a2f1-4c56-9bb0-6732a4560e8b'
ON CONFLICT (simulation_id, user_id) DO NOTHING;

-- Verify the nurse was added
SELECT 
    sp.id,
    sp.simulation_id,
    sp.user_id,
    sp.role,
    up.email,
    up.first_name || ' ' || up.last_name as full_name,
    sa.name as simulation_name,
    sa.status,
    sa.tenant_id as simulation_tenant_id
FROM simulation_participants sp
JOIN user_profiles up ON up.id = sp.user_id
JOIN simulation_active sa ON sa.id = sp.simulation_id
WHERE sp.user_id = 'db8cb615-b411-40e3-847a-7dfa574407b4';

-- ============================================================================
-- TEST: Verify nurse now has simulation access
-- ============================================================================
-- Run this query AS THE NURSE USER to test access
-- (Switch to nurse's session in Supabase SQL Editor)
/*
SELECT 
    'Has simulation access?' as test,
    EXISTS (
        SELECT 1 
        FROM simulation_active sa
        JOIN simulation_participants sp ON sp.simulation_id = sa.id
        WHERE sp.user_id = auth.uid()
        AND sa.status = 'running'
    ) as result;
*/

-- ============================================================================
-- TEST: Can nurse see doctors orders now?
-- ============================================================================
-- Run this query AS THE NURSE USER
/*
SELECT 
    orders.id,
    orders.patient_id,
    orders.order_text,
    orders.created_at,
    p.first_name || ' ' || p.last_name as patient_name
FROM doctors_orders orders
JOIN patients p ON p.id = orders.patient_id
WHERE orders.tenant_id IN (
    SELECT sa.tenant_id 
    FROM simulation_active sa
    JOIN simulation_participants sp ON sp.simulation_id = sa.id
    WHERE sp.user_id = auth.uid()
    AND sa.status = 'running'
)
ORDER BY orders.created_at DESC;
*/

-- ============================================================================
-- SUCCESS INDICATOR
-- ============================================================================
SELECT 
    '✅ Nurse added to simulation!' as status,
    'Now test by logging in as the nurse and viewing doctors orders' as next_step;
