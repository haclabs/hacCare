
SELECT 
  'Table: ' || table_name as info,
  'Count: ' || COUNT(*) as count,
  'Sample patient_id: ' || MAX(data->>'patient_id') as sample_patient_id,
  'Patient_id type: ' || pg_typeof(MAX((data->>'patient_id')::uuid)) as patient_id_type
FROM simulation_template_snapshots 
WHERE template_id = '124676b7-a6c8-4f8e-9ca9-5d6f8c086158'
  AND table_name = 'patient_vitals'
GROUP BY table_name
HAVING COUNT(*) > 0;
