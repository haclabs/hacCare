-- Check for patient ID mismatch between template and simulation
SELECT 'TEMPLATE PATIENT IDS:' as info;
SELECT 
    p.id as patient_id,
    p.patient_id as patient_number,
    p.first_name,
    p.last_name
FROM simulation_templates st
JOIN patients p ON p.tenant_id = st.tenant_id
WHERE st.id = 'fdd2f3c1-b248-4a1f-8bca-f376b291b134'
ORDER BY p.patient_id;

SELECT 'SIMULATION PATIENT IDS:' as info;
SELECT 
    p.id as patient_id,
    p.patient_id as patient_number,
    p.first_name,
    p.last_name
FROM patients p
WHERE p.tenant_id = '3efea920-ac9e-4d04-8d36-b1e44649dcc4'
ORDER BY p.patient_id;

-- Check if there are matching patient_ids (not UUIDs) that we could use
SELECT 'MATCHING PATIENT NUMBERS:' as info;
SELECT 
    t_p.patient_id as template_patient_number,
    t_p.id as template_uuid,
    s_p.id as simulation_uuid,
    CASE 
        WHEN t_p.id = s_p.id THEN 'SAME UUID' 
        ELSE 'DIFFERENT UUID'
    END as uuid_match
FROM simulation_templates st
JOIN patients t_p ON t_p.tenant_id = st.tenant_id
JOIN patients s_p ON s_p.patient_id = t_p.patient_id
WHERE st.id = 'fdd2f3c1-b248-4a1f-8bca-f376b291b134'
  AND s_p.tenant_id = '3efea920-ac9e-4d04-8d36-b1e44649dcc4'
ORDER BY t_p.patient_id;