-- Check the data types of patient_id columns across all tables
SELECT 
  t.table_name,
  c.column_name,
  c.data_type,
  c.udt_name
FROM information_schema.columns c
JOIN information_schema.tables t ON c.table_name = t.table_name
WHERE t.table_schema = 'public'
  AND c.column_name IN ('patient_id', 'id')
  AND t.table_name IN (
    'patients',
    'patient_medications',
    'patient_vitals', 
    'patient_notes',
    'patient_alerts',
    'patient_admission_records',
    'patient_advanced_directives',
    'diabetic_records',
    'bowel_records',
    'patient_wounds',
    'wound_assessments',
    'handover_notes',
    'doctors_orders',
    'patient_images'
  )
ORDER BY t.table_name, c.column_name;
