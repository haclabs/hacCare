-- Fix: Change diabetic_records.patient_id from text to uuid
-- This will allow proper joins with the patients table

BEGIN;

-- First, check if there's any data that would break the conversion
SELECT 
  id,
  patient_id,
  CASE 
    WHEN patient_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
    THEN 'Valid UUID'
    ELSE 'INVALID - Will cause conversion to fail!'
  END as validation_status
FROM diabetic_records
WHERE patient_id IS NOT NULL;

-- If all rows show "Valid UUID", proceed with the conversion:
-- (Comment out the ROLLBACK and uncomment the COMMIT after verifying)

-- Step 1: Drop the foreign key constraint if it exists
ALTER TABLE diabetic_records 
DROP CONSTRAINT IF EXISTS diabetic_records_patient_id_fkey;

-- Step 2: Convert the column type
ALTER TABLE diabetic_records 
ALTER COLUMN patient_id TYPE uuid USING patient_id::uuid;

-- Step 3: Re-add the foreign key constraint
ALTER TABLE diabetic_records
ADD CONSTRAINT diabetic_records_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

-- Verify the change
SELECT 
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'diabetic_records' 
  AND column_name = 'patient_id';

COMMIT;
-- ROLLBACK;  -- Use this instead if you want to test first
