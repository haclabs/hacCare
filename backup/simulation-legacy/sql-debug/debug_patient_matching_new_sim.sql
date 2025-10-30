-- DEBUG: Check patient matching between template and new simulation
-- Simulation: 19cee8db-d076-4d57-b765-b43f306b2d02
-- Tenant: d0ac6b21-5a66-401f-a718-7646ee4174f6

-- 1. Get the template tenant ID for this simulation
SELECT 'TEMPLATE TENANT FOR THIS SIMULATION:' as debug_info;
SELECT 
    st.tenant_id as template_tenant_id,
    sa.tenant_id as simulation_tenant_id
FROM simulation_active sa
JOIN simulation_templates st ON st.id = sa.template_id
WHERE sa.id = '19cee8db-d076-4d57-b765-b43f306b2d02';

-- 2. Show template patients with names
SELECT 'TEMPLATE PATIENTS:' as debug_info;
SELECT 
    CONCAT(p.first_name, ' ', p.last_name) as patient_name,
    p.first_name,
    p.last_name,
    p.id as patient_uuid
FROM patients p
WHERE p.tenant_id = (
    SELECT st.tenant_id 
    FROM simulation_active sa
    JOIN simulation_templates st ON st.id = sa.template_id
    WHERE sa.id = '19cee8db-d076-4d57-b765-b43f306b2d02'
)
ORDER BY patient_name;

-- 3. Show simulation patients with names  
SELECT 'SIMULATION PATIENTS:' as debug_info;
SELECT 
    CONCAT(p.first_name, ' ', p.last_name) as patient_name,
    p.first_name,
    p.last_name,
    p.id as patient_uuid
FROM patients p
WHERE p.tenant_id = 'd0ac6b21-5a66-401f-a718-7646ee4174f6'
ORDER by patient_name;

-- 4. Test exact name matching
SELECT 'NAME MATCHING RESULTS:' as debug_info;
SELECT 
    tp_names.name as template_name,
    sp_names.name as simulation_name,
    tp_names.template_uuid,
    sp_names.simulation_uuid
FROM (
    SELECT 
        CONCAT(p.first_name, ' ', p.last_name) as name,
        p.id as template_uuid
    FROM patients p
    WHERE p.tenant_id = (
        SELECT st.tenant_id 
        FROM simulation_active sa
        JOIN simulation_templates st ON st.id = sa.template_id
        WHERE sa.id = '19cee8db-d076-4d57-b765-b43f306b2d02'
    )
) tp_names
JOIN (
    SELECT 
        CONCAT(p.first_name, ' ', p.last_name) as name,
        p.id as simulation_uuid
    FROM patients p
    WHERE p.tenant_id = 'd0ac6b21-5a66-401f-a718-7646ee4174f6'
) sp_names ON tp_names.name = sp_names.name;

-- 5. Check if there are vitals in the template
SELECT 'TEMPLATE VITALS COUNT:' as debug_info;
SELECT COUNT(*) as template_vitals_count
FROM patient_vitals pv
WHERE pv.tenant_id = (
    SELECT st.tenant_id 
    FROM simulation_active sa
    JOIN simulation_templates st ON st.id = sa.template_id
    WHERE sa.id = '19cee8db-d076-4d57-b765-b43f306b2d02'
);