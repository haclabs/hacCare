-- COMPREHENSIVE DEBUG: Test the patient name matching logic
-- This will show us exactly what's happening in the restore process

-- 1. Show template vitals with patient names
SELECT 'TEMPLATE VITALS WITH PATIENT NAMES:' as debug_info;
SELECT 
    pv.id as vitals_id,
    pv.patient_id as patient_uuid,
    CONCAT(p.first_name, ' ', p.last_name) as patient_name,
    pv.temperature,
    pv.heart_rate,
    pv.respiratory_rate,
    pv.recorded_at
FROM simulation_templates st
JOIN patients p ON p.tenant_id = st.tenant_id  
JOIN patient_vitals pv ON pv.patient_id = p.id
WHERE st.id = 'fdd2f3c1-b248-4a1f-8bca-f376b291b134'
ORDER BY patient_name, pv.recorded_at
LIMIT 10;

-- 2. Show simulation patients with names
SELECT 'SIMULATION PATIENTS WITH NAMES:' as debug_info;
SELECT 
    p.id as patient_uuid,
    CONCAT(p.first_name, ' ', p.last_name) as patient_name,
    p.first_name,
    p.last_name
FROM patients p
WHERE p.tenant_id = '3efea920-ac9e-4d04-8d36-b1e44649dcc4'
ORDER BY patient_name;

-- 3. Test the exact matching logic we use in the function
SELECT 'NAME MATCHING TEST:' as debug_info;
SELECT 
    template_name,
    sim_name,
    CASE WHEN template_name = sim_name THEN 'MATCH' ELSE 'NO MATCH' END as match_result
FROM (
    SELECT DISTINCT CONCAT(tp.first_name, ' ', tp.last_name) as template_name
    FROM simulation_templates st
    JOIN patients tp ON tp.tenant_id = st.tenant_id  
    WHERE st.id = 'fdd2f3c1-b248-4a1f-8bca-f376b291b134'
) template_names
CROSS JOIN (
    SELECT DISTINCT CONCAT(sp.first_name, ' ', sp.last_name) as sim_name
    FROM patients sp
    WHERE sp.tenant_id = '3efea920-ac9e-4d04-8d36-b1e44649dcc4'
) sim_names
WHERE CONCAT(template_names.template_name) = CONCAT(sim_names.sim_name);

-- 4. Check if there are any vitals currently in simulation
SELECT 'CURRENT SIMULATION VITALS COUNT:' as debug_info;
SELECT COUNT(*) as current_vitals_count
FROM patient_vitals pv
WHERE pv.tenant_id = '3efea920-ac9e-4d04-8d36-b1e44649dcc4';

-- 5. Test one specific patient mapping manually
SELECT 'MANUAL PATIENT MAPPING TEST - Jordan Marr:' as debug_info;
SELECT 
    'Template Jordan' as type,
    p.id as patient_uuid,
    CONCAT(p.first_name, ' ', p.last_name) as full_name,
    p.tenant_id
FROM simulation_templates st
JOIN patients p ON p.tenant_id = st.tenant_id  
WHERE st.id = 'fdd2f3c1-b248-4a1f-8bca-f376b291b134'
AND CONCAT(p.first_name, ' ', p.last_name) = 'Jordan Marr'

UNION ALL

SELECT 
    'Simulation Jordan' as type,
    p.id as patient_uuid,
    CONCAT(p.first_name, ' ', p.last_name) as full_name,
    p.tenant_id
FROM patients p
WHERE p.tenant_id = '3efea920-ac9e-4d04-8d36-b1e44649dcc4'
AND CONCAT(p.first_name, ' ', p.last_name) = 'Jordan Marr';