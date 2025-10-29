-- DEBUG: Check patient_vitals table structure
-- This will tell us if patient_vitals has tenant_id or just patient_id

SELECT 'PATIENT_VITALS TABLE STRUCTURE:' as debug_info;

-- Check columns in patient_vitals table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'patient_vitals' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if it has tenant_id
SELECT 'HAS TENANT_ID:' as debug_info;
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patient_vitals' 
        AND column_name = 'tenant_id'
        AND table_schema = 'public'
    ) THEN 'YES - patient_vitals has tenant_id column'
    ELSE 'NO - patient_vitals only has patient_id' END as has_tenant_id;

-- Check if it has patient_id  
SELECT 'HAS PATIENT_ID:' as debug_info;
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'patient_vitals' 
        AND column_name = 'patient_id'
        AND table_schema = 'public'
    ) THEN 'YES - patient_vitals has patient_id column'
    ELSE 'NO - patient_vitals missing patient_id' END as has_patient_id;