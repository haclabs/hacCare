-- ============================================================================
-- DEBUG ACTIVE SIMULATION LAB DATA
-- Simulation ID: a2e4063c-04cc-4d1d-bfe4-220b6056cf81
-- ============================================================================

-- Get simulation details
SELECT 
    id,
    name,
    tenant_id,
    starts_at,
    status,
    created_at
FROM simulation_active
WHERE id = 'a2e4063c-04cc-4d1d-bfe4-220b6056cf81';

-- Get the tenant_id from the simulation
-- Then check what lab panels exist in that tenant

-- Check lab panels for this simulation's tenant
SELECT 
    lp.id,
    lp.patient_id,
    lp.panel_time,
    lp.status,
    lp.source,
    lp.created_at,
    lp.entered_by,
    p.first_name || ' ' || p.last_name as patient_name
FROM lab_panels lp
JOIN patients p ON p.id = lp.patient_id
WHERE lp.tenant_id = (
    SELECT tenant_id 
    FROM simulation_active 
    WHERE id = 'a2e4063c-04cc-4d1d-bfe4-220b6056cf81'
)
ORDER BY lp.created_at DESC;

-- Check lab results count for this tenant
SELECT 
    COUNT(*) as total_lab_results,
    MIN(lr.created_at) as oldest_result,
    MAX(lr.created_at) as newest_result
FROM lab_results lr
WHERE lr.tenant_id = (
    SELECT tenant_id 
    FROM simulation_active 
    WHERE id = 'a2e4063c-04cc-4d1d-bfe4-220b6056cf81'
);

-- ============================================================================
-- ANALYSIS:
-- ============================================================================
-- If lab panels have created_at dates BEFORE the simulation starts_at,
-- they are from the template baseline (expected).
-- 
-- If lab panels have created_at dates from PREVIOUS sessions (days ago),
-- they should have been deleted during reset but weren't.
-- ============================================================================
