-- CURRENT SIMULATION DEBUG: Using your current simulation tenant
-- Tenant: 2aeef624-0e09-4cf6-afa3-90947373fb5f

-- First, let's find your current active simulation
SELECT 'CURRENT SIMULATION INFO:' as debug_info;
SELECT 
    sa.id as simulation_id,
    sa.name as simulation_name,
    sa.tenant_id,
    sa.template_id,
    st.name as template_name
FROM simulation_active sa
JOIN simulation_templates st ON st.id = sa.template_id
WHERE sa.tenant_id = '2aeef624-0e09-4cf6-afa3-90947373fb5f'
AND sa.status = 'running';

-- Show current patients in this simulation
SELECT 'CURRENT SIMULATION PATIENTS:' as debug_info;
SELECT 
    p.id as patient_uuid,
    CONCAT(p.first_name, ' ', p.last_name) as patient_name,
    p.patient_id as patient_number
FROM patients p
WHERE p.tenant_id = '2aeef624-0e09-4cf6-afa3-90947373fb5f'
ORDER BY patient_name;

-- Show current vitals count
SELECT 'CURRENT VITALS COUNT:' as debug_info;
SELECT COUNT(*) as vitals_count
FROM patient_vitals pv
WHERE pv.tenant_id = '2aeef624-0e09-4cf6-afa3-90947373fb5f';

-- Now test the reset function with your current simulation
SELECT 'TESTING RESET WITH CURRENT SIMULATION:' as debug_info;
SELECT reset_simulation_for_next_session_v2(
    (SELECT sa.id FROM simulation_active sa 
     WHERE sa.tenant_id = '2aeef624-0e09-4cf6-afa3-90947373fb5f' 
     AND sa.status = 'running' 
     LIMIT 1)
);