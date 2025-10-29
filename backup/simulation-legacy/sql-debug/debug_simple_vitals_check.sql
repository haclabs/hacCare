-- Simple diagnostic to see what's in the snapshot vs what's being restored

SELECT 'SNAPSHOT DATA' as source,
  COUNT(*) as count,
  'patient_id: ' || MAX(data->>'patient_id') as sample_patient_id,
  'tenant_id: ' || MAX(data->>'tenant_id') as sample_tenant_id,
  'table: ' || table_name as table_info
FROM simulation_template_snapshots 
WHERE template_id = '124676b7-a6c8-4f8e-9ca9-5d6f8c086158'
  AND table_name = 'patient_vitals'
GROUP BY table_name

UNION ALL

SELECT 'CURRENT VITALS' as source,
  COUNT(*) as count,
  'patient_id: ' || MAX(patient_id::text) as sample_patient_id,
  'tenant_id: ' || MAX(tenant_id::text) as sample_tenant_id,
  'table: patient_vitals' as table_info
FROM patient_vitals 
WHERE tenant_id = '7c9121f0-90cb-4498-8fd0-f760b0c05dfe'

UNION ALL

SELECT 'CURRENT PATIENTS' as source,
  COUNT(*) as count,
  'patient_id: ' || MAX(id::text) as sample_patient_id,
  'tenant_id: ' || MAX(tenant_id::text) as sample_tenant_id,
  'table: patients' as table_info
FROM patients 
WHERE tenant_id = '7c9121f0-90cb-4498-8fd0-f760b0c05dfe';