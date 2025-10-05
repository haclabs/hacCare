-- Check which tables have tenant_id column
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND column_name = 'tenant_id'
  AND table_name IN (
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
ORDER BY table_name;
