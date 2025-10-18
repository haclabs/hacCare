-- Check what diabetic_records.patient_id actually contains
SELECT 
  dr.id,
  dr.patient_id as diabetic_record_patient_id,
  p.id as patients_uuid_id,
  p.patient_id as patients_text_patient_id,
  p.name
FROM diabetic_records dr
LEFT JOIN patients p ON p.patient_id = dr.patient_id
LIMIT 10;

-- Also check the foreign key constraints
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'diabetic_records' 
  AND tc.constraint_type = 'FOREIGN KEY';
