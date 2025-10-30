-- DEBUG: Check if the patient UUID from vitals exists in template tenant
-- Patient from vitals: 53c1e28c-7724-40ad-8600-86d3dc111e8f

-- 1. Get template tenant ID for the simulation
SELECT 'TEMPLATE TENANT CHECK:' as debug_info;
SELECT 
    st.tenant_id as template_tenant_id,
    sa.tenant_id as simulation_tenant_id
FROM simulation_active sa
JOIN simulation_templates st ON st.id = sa.template_id
WHERE sa.id = '19cee8db-d076-4d57-b765-b43f306b2d02';

-- 2. Check if the vitals patient UUID exists in template tenant
SELECT 'PATIENT EXISTS IN TEMPLATE?:' as debug_info;
SELECT 
    p.id,
    CONCAT(p.first_name, ' ', p.last_name) as patient_name,
    p.created_at
FROM patients p
WHERE p.tenant_id = (
    SELECT st.tenant_id 
    FROM simulation_active sa
    JOIN simulation_templates st ON st.id = sa.template_id
    WHERE sa.id = '19cee8db-d076-4d57-b765-b43f306b2d02'
)
AND p.id = '53c1e28c-7724-40ad-8600-86d3dc111e8f';

-- 3. Show all patients in template tenant with positions
SELECT 'ALL TEMPLATE PATIENTS WITH POSITIONS:' as debug_info;
SELECT 
    ROW_NUMBER() OVER (ORDER BY p.created_at, p.id) as position,
    p.id,
    CONCAT(p.first_name, ' ', p.last_name) as patient_name,
    p.created_at
FROM patients p
WHERE p.tenant_id = (
    SELECT st.tenant_id 
    FROM simulation_active sa
    JOIN simulation_templates st ON st.id = sa.template_id
    WHERE sa.id = '19cee8db-d076-4d57-b765-b43f306b2d02'
)
ORDER BY p.created_at, p.id;

-- 4. Show all patients in simulation tenant with positions
SELECT 'ALL SIMULATION PATIENTS WITH POSITIONS:' as debug_info;
SELECT 
    ROW_NUMBER() OVER (ORDER BY p.created_at, p.id) as position,
    p.id,
    CONCAT(p.first_name, ' ', p.last_name) as patient_name,
    p.created_at
FROM patients p
WHERE p.tenant_id = 'd0ac6b21-5a66-401f-a718-7646ee4174f6'
ORDER BY p.created_at, p.id;