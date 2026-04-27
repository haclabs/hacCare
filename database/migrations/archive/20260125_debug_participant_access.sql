-- ============================================================================
-- DEBUG: Check if participants have tenant access
-- ============================================================================
-- Run this to verify participants were added to tenant_users table
-- ============================================================================

-- 1. Find the most recent active simulation
SELECT 
    sa.id as simulation_id,
    sa.name as simulation_name,
    sa.tenant_id as simulation_tenant_id,
    sa.created_at,
    sa.status
FROM simulation_active sa
ORDER BY sa.created_at DESC
LIMIT 1;

-- 2. Check participants in simulation_participants table
SELECT 
    sp.simulation_id,
    sp.user_id,
    sp.role as simulation_role,
    up.email,
    up.first_name,
    up.last_name,
    up.role as user_profile_role
FROM simulation_participants sp
JOIN user_profiles up ON sp.user_id = up.id
WHERE sp.simulation_id IN (
    SELECT id FROM simulation_active ORDER BY created_at DESC LIMIT 1
);

-- 3. Check if participants are in tenant_users (THIS IS THE CRITICAL CHECK)
SELECT 
    tu.user_id,
    tu.tenant_id,
    tu.is_active,
    tu.role as tenant_role,
    up.email,
    up.first_name,
    up.last_name
FROM tenant_users tu
JOIN user_profiles up ON tu.user_id = up.id
WHERE tu.tenant_id IN (
    SELECT tenant_id FROM simulation_active ORDER BY created_at DESC LIMIT 1
)
ORDER BY tu.created_at DESC;

-- 4. Check medications in the simulation tenant
SELECT 
    pm.id,
    pm.name,
    pm.dosage,
    pm.route,
    pm.tenant_id,
    p.first_name || ' ' || p.last_name as patient_name
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
WHERE pm.tenant_id IN (
    SELECT tenant_id FROM simulation_active ORDER BY created_at DESC LIMIT 1
);

-- 5. Check RLS policy on patient_medications
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
WHERE tablename = 'patient_medications';
