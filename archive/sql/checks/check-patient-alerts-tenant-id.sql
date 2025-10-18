-- ============================================================================
-- CHECK IF PATIENT_ALERTS HAS TENANT_ID COLUMN
-- ============================================================================

-- Method 1: Check via information_schema
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'patient_alerts'
ORDER BY ordinal_position;

-- Method 2: Try a direct query (this will fail if column doesn't exist)
SELECT tenant_id FROM patient_alerts LIMIT 1;

-- Method 3: Check if there are any constraints on tenant_id
SELECT
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'patient_alerts'
AND kcu.column_name = 'tenant_id';
