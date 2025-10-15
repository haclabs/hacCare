-- ============================================================================
-- DIAGNOSE: Why Nurses Can't See Doctors Orders in Simulations
-- ============================================================================
-- The RLS policy exists and looks correct, so we need to check:
-- 1. Is the has_simulation_tenant_access() function working?
-- 2. Are the simulation participants properly linked?
-- 3. Is the simulation status 'running'?
-- 4. Does the tenant_id match between doctors_orders and simulation?
-- ============================================================================

-- Step 1: Check if has_simulation_tenant_access function exists and its definition
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname = 'has_simulation_tenant_access';

-- Step 2: Check current user's simulation participation
-- Run this as the nurse user who can't see orders
SELECT 
    sp.id as participant_id,
    sp.simulation_id,
    sp.user_id,
    sp.role,
    sa.status as simulation_status,
    sa.tenant_id as simulation_tenant_id,
    sa.name as simulation_name
FROM simulation_participants sp
JOIN simulation_active sa ON sa.id = sp.simulation_id
WHERE sp.user_id = auth.uid();

-- Step 3: Check if there are any doctors orders in the simulation tenant
-- This will show what tenant_id the doctors orders have
SELECT 
    orders.id,
    orders.patient_id,
    orders.tenant_id,
    orders.order_text,
    orders.created_at,
    p.first_name || ' ' || p.last_name as patient_name,
    t.name as tenant_name,
    t.tenant_type
FROM doctors_orders orders
JOIN patients p ON p.id = orders.patient_id
JOIN tenants t ON t.id = orders.tenant_id
ORDER BY orders.created_at DESC
LIMIT 10;

-- Step 4: Check if simulation is 'running' status
SELECT 
    id,
    name,
    status,
    tenant_id,
    created_at
FROM simulation_active
WHERE status = 'running'
ORDER BY created_at DESC;

-- Step 5: Test the has_simulation_tenant_access function directly
-- Replace '<simulation-tenant-id>' with actual tenant_id from simulation
-- SELECT has_simulation_tenant_access('<simulation-tenant-id>');

-- Step 6: Check tenant_users table - maybe nurse IS in tenant_users?
SELECT 
    tu.user_id,
    tu.tenant_id,
    tu.is_active,
    up.first_name,
    up.last_name,
    up.role,
    t.name as tenant_name
FROM tenant_users tu
JOIN user_profiles up ON up.id = tu.user_id
JOIN tenants t ON t.id = tu.tenant_id
WHERE tu.user_id = auth.uid();

-- ============================================================================
-- COMMON ISSUES TO CHECK
-- ============================================================================

-- Issue 1: Simulation status is not 'running'
-- Fix: UPDATE simulation_active SET status = 'running' WHERE id = '<sim-id>';

-- Issue 2: Doctors orders created BEFORE entering simulation
-- Symptom: doctors_orders.tenant_id doesn't match simulation.tenant_id
-- The orders might have been created with instructor's tenant_id
-- Check: Are doctors_orders.tenant_id matching simulation.tenant_id?

-- Issue 3: has_simulation_tenant_access function checks wrong status
-- Check: Does function check for status = 'running' or something else?

-- Issue 4: Nurse not in simulation_participants table
-- Fix: Add nurse to simulation_participants

-- ============================================================================
-- POTENTIAL FIX: If doctors_orders have wrong tenant_id
-- ============================================================================
-- If instructor created orders before/outside simulation context,
-- they may have instructor's home tenant_id, not simulation tenant_id
-- 
-- To fix, update doctors_orders tenant_id to match simulation tenant:
-- 
-- UPDATE doctors_orders 
-- SET tenant_id = (SELECT tenant_id FROM simulation_active WHERE id = '<simulation-id>')
-- WHERE patient_id IN (
--     SELECT id FROM patients WHERE tenant_id = (
--         SELECT tenant_id FROM simulation_active WHERE id = '<simulation-id>'
--     )
-- );

-- ============================================================================
-- ALTERNATIVE: Check if user_tenant_access table is being used instead
-- ============================================================================
-- Some deployments might use user_tenant_access instead of tenant_users
SELECT 
    uta.user_id,
    uta.tenant_id,
    uta.is_active,
    t.name as tenant_name
FROM user_tenant_access uta
JOIN tenants t ON t.id = uta.tenant_id
WHERE uta.user_id = auth.uid();

-- ============================================================================
-- DEBUG: Manual check of what the RLS policy should allow
-- ============================================================================
-- This simulates the RLS policy logic for current user:

WITH current_user_context AS (
    SELECT 
        auth.uid() as user_id,
        up.role,
        up.is_active
    FROM user_profiles up
    WHERE up.id = auth.uid()
),
user_tenants AS (
    SELECT DISTINCT tenant_id
    FROM tenant_users
    WHERE user_id = auth.uid() AND is_active = true
    UNION
    SELECT DISTINCT tenant_id
    FROM user_tenant_access
    WHERE user_id = auth.uid() AND is_active = true
),
simulation_tenants AS (
    SELECT DISTINCT sa.tenant_id
    FROM simulation_active sa
    JOIN simulation_participants sp ON sp.simulation_id = sa.id
    WHERE sp.user_id = auth.uid()
    AND sa.status = 'running'
)
SELECT 
    'Super Admin Access' as access_type,
    (SELECT role = 'super_admin' AND is_active FROM current_user_context) as has_access
UNION ALL
SELECT 
    'Tenant User Access' as access_type,
    EXISTS(SELECT 1 FROM user_tenants) as has_access
UNION ALL
SELECT 
    'Simulation Access' as access_type,
    EXISTS(SELECT 1 FROM simulation_tenants) as has_access;
