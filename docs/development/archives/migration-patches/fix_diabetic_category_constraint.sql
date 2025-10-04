-- Fix for diabetic category constraint error
-- This updates the category check constraint to include the new 'diabetic' value

-- First, drop the existing constraint
ALTER TABLE patient_medications 
DROP CONSTRAINT IF EXISTS patient_medications_category_check;

-- Recreate the constraint with the diabetic category included
ALTER TABLE patient_medications 
ADD CONSTRAINT patient_medications_category_check 
CHECK (category IN ('scheduled', 'unscheduled', 'prn', 'continuous', 'diabetic'));

-- Verify the constraint was updated
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'patient_medications'::regclass 
  AND conname LIKE '%category%';