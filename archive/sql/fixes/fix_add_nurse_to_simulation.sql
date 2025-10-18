-- ============================================================================
-- FIX: Add Nurse to Simulation Participants
-- ============================================================================
-- Problem: Nurse is not in simulation_participants table
-- Solution: Add nurse to the active simulation they should be in
-- ============================================================================

-- Step 1: Find the active/running simulations
SELECT 
    id as simulation_id,
    name,
    status,
    tenant_id,
    created_at
FROM simulation_active
WHERE status = 'running'
ORDER BY created_at DESC;

-- Step 2: Find the nurse's user_id
-- Run this to get the nurse's user_id if you don't have it
SELECT 
    id as user_id,
    email,
    first_name || ' ' || last_name as full_name,
    role
FROM user_profiles
WHERE role = 'nurse' 
   OR role = 'student'
   OR email LIKE '%nurse%'
ORDER BY created_at DESC;

-- Step 3: Check current participants in the simulation
-- Replace '<simulation-id>' with actual simulation_id from Step 1
/*
SELECT 
    sp.id,
    sp.user_id,
    sp.role,
    up.email,
    up.first_name || ' ' || up.last_name as full_name
FROM simulation_participants sp
JOIN user_profiles up ON up.id = sp.user_id
WHERE sp.simulation_id = '<simulation-id>';
*/

-- ============================================================================
-- THE FIX: Add nurse to simulation
-- ============================================================================
-- Replace the placeholders:
-- - <simulation-id>: From Step 1 (the running simulation)
-- - <nurse-user-id>: From Step 2 (the nurse's user ID)
-- - <instructor-id>: The user who created/is managing the simulation

/*
INSERT INTO simulation_participants (
    simulation_id,
    user_id,
    role,
    granted_by,
    granted_at
)
VALUES (
    '<simulation-id>'::uuid,        -- The running simulation
    '<nurse-user-id>'::uuid,        -- The nurse who needs access
    'student',                       -- Role in simulation (or 'instructor' if appropriate)
    '<instructor-id>'::uuid,        -- Who granted access
    NOW()
)
ON CONFLICT (simulation_id, user_id) DO NOTHING;
*/

-- ============================================================================
-- EXAMPLE WITH REAL VALUES (uncomment and modify):
-- ============================================================================
-- Get the simulation ID and nurse ID first, then:
/*
INSERT INTO simulation_participants (
    simulation_id,
    user_id,
    role,
    granted_by
)
SELECT 
    sa.id as simulation_id,
    up.id as user_id,
    'student' as role,
    sa.created_by as granted_by
FROM simulation_active sa
CROSS JOIN user_profiles up
WHERE sa.status = 'running'
  AND up.email = 'nurse@example.com'  -- Replace with actual nurse email
LIMIT 1
ON CONFLICT (simulation_id, user_id) DO NOTHING;
*/

-- ============================================================================
-- ALTERNATIVE: Add ALL nurses from a tenant to a simulation
-- ============================================================================
-- If you want to add all nurses from the parent tenant to the simulation:
/*
INSERT INTO simulation_participants (
    simulation_id,
    user_id,
    role,
    granted_by
)
SELECT 
    '<simulation-id>'::uuid as simulation_id,
    tu.user_id,
    'student' as role,
    '<instructor-id>'::uuid as granted_by
FROM tenant_users tu
JOIN user_profiles up ON up.id = tu.user_id
WHERE tu.tenant_id = '<parent-tenant-id>'  -- The tenant the simulation belongs to
  AND up.role IN ('nurse', 'student')
  AND tu.is_active = true
ON CONFLICT (simulation_id, user_id) DO NOTHING;
*/

-- ============================================================================
-- VERIFY THE FIX
-- ============================================================================
-- After adding, verify the nurse is now in the simulation:
/*
SELECT 
    sp.id,
    sp.simulation_id,
    sp.user_id,
    sp.role,
    up.email,
    up.first_name || ' ' || up.last_name as full_name,
    sa.name as simulation_name,
    sa.status
FROM simulation_participants sp
JOIN user_profiles up ON up.id = sp.user_id
JOIN simulation_active sa ON sa.id = sp.simulation_id
WHERE sp.user_id = '<nurse-user-id>'::uuid;
*/

-- ============================================================================
-- TEST ACCESS
-- ============================================================================
-- After adding nurse to simulation_participants, test if they can now see doctors orders:
-- (Run this as the nurse user)
/*
SELECT 
    orders.id,
    orders.patient_id,
    orders.order_text,
    orders.tenant_id,
    p.first_name || ' ' || p.last_name as patient_name
FROM doctors_orders orders
JOIN patients p ON p.id = orders.patient_id
WHERE orders.tenant_id IN (
    SELECT sa.tenant_id 
    FROM simulation_active sa
    JOIN simulation_participants sp ON sp.simulation_id = sa.id
    WHERE sp.user_id = auth.uid()
    AND sa.status = 'running'
);
*/
