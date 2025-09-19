-- Check if template tables exist and their structure
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name IN (
  'patient_vitals_templates',
  'patient_medications_templates', 
  'patient_notes_templates',
  'simulation_patient_templates',
  'scenario_templates'
) 
AND table_schema = 'public';

-- Check RLS policies on template tables
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN (
  'patient_vitals_templates',
  'patient_medications_templates',
  'patient_notes_templates'
);

-- Check if tenant_users table exists (referenced in new RLS policies)
SELECT table_name, table_schema 
FROM information_schema.tables 
WHERE table_name = 'tenant_users'
AND table_schema = 'public';