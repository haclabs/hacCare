-- Quick check: Are patients actually copied with same UUIDs during launch?
SELECT 'PATIENTS IN BOTH TENANTS - UUID COMPARISON:' as info;
SELECT 
    'Template' as source,
    st.tenant_id as tenant_id,
    p.id as patient_uuid,
    p.patient_id as patient_number,
    p.first_name || ' ' || p.last_name as name
FROM simulation_templates st
JOIN patients p ON p.tenant_id = st.tenant_id
WHERE st.id = 'fdd2f3c1-b248-4a1f-8bca-f376b291b134'

UNION ALL

SELECT 
    'Simulation' as source,
    p.tenant_id,
    p.id as patient_uuid,
    p.patient_id as patient_number,
    p.first_name || ' ' || p.last_name as name
FROM patients p
WHERE p.tenant_id = '3efea920-ac9e-4d04-8d36-b1e44649dcc4'

ORDER BY patient_number, source;