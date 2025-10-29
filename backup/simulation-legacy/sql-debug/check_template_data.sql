-- Check what's in the template tenant vs simulation tenant
-- Template tenant (where snapshot should be taken from)
SELECT 'TEMPLATE TENANT DATA:' as info;
SELECT 
    t.id as template_tenant_id,
    t.name as template_name,
    COUNT(p.*) as patient_count,
    COUNT(pv.*) as vitals_count,
    COUNT(pm.*) as medication_count
FROM simulation_templates st
JOIN tenants t ON t.id = st.tenant_id
LEFT JOIN patients p ON p.tenant_id = t.id
LEFT JOIN patient_vitals pv ON pv.tenant_id = t.id  
LEFT JOIN patient_medications pm ON pm.tenant_id = t.id
WHERE st.id = 'fdd2f3c1-b248-4a1f-8bca-f376b291b134'
GROUP BY t.id, t.name;

-- Check what's actually in the template tenant
SELECT 'TEMPLATE TENANT VITALS:' as info;
SELECT 
    pv.id,
    pv.patient_id,
    pv.temperature,
    pv.heart_rate,
    pv.respiratory_rate,
    pv.recorded_at
FROM simulation_templates st
JOIN patients p ON p.tenant_id = st.tenant_id
JOIN patient_vitals pv ON pv.patient_id = p.id
WHERE st.id = 'fdd2f3c1-b248-4a1f-8bca-f376b291b134'
ORDER BY pv.recorded_at;

-- Show what tenant each patient belongs to for comparison
SELECT 'TENANT COMPARISON:' as info;
SELECT 
    'Template' as type,
    st.tenant_id,
    COUNT(p.*) as patient_count,
    COUNT(pv.*) as vitals_count
FROM simulation_templates st
LEFT JOIN patients p ON p.tenant_id = st.tenant_id
LEFT JOIN patient_vitals pv ON pv.tenant_id = st.tenant_id
WHERE st.id = 'fdd2f3c1-b248-4a1f-8bca-f376b291b134'
GROUP BY st.tenant_id

UNION ALL

SELECT 
    'Simulation' as type,
    '3efea920-ac9e-4d04-8d36-b1e44649dcc4' as tenant_id,
    COUNT(p.*) as patient_count,
    COUNT(pv.*) as vitals_count
FROM patients p
LEFT JOIN patient_vitals pv ON pv.tenant_id = p.tenant_id
WHERE p.tenant_id = '3efea920-ac9e-4d04-8d36-b1e44649dcc4'
GROUP BY p.tenant_id;