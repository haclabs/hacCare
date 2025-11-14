-- ============================================================================
-- DEBUG: Patient Duplication Issue
-- ============================================================================
-- Run this in Supabase SQL Editor to diagnose the issue
--
-- Issue: Patient duplication returns success but patient doesn't appear
-- Expected: new_patient_id should be a UUID, not null
-- ============================================================================

-- 1. Check if the function exists and its signature
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'duplicate_patient_to_tenant';

-- 2. Check the actual function definition
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'duplicate_patient_to_tenant';

-- 3. Test the function with your actual data
-- Replace with your actual values:
-- - Source patient: PT53873
-- - Target tenant: ac7aa13f-472a-4e99-ac16-2beeb7fe2d20

SELECT * FROM duplicate_patient_to_tenant(
  p_source_patient_id := 'PT53873',
  p_target_tenant_id := 'ac7aa13f-472a-4e99-ac16-2beeb7fe2d20'::uuid,
  p_new_patient_id := NULL,
  p_include_vitals := true,
  p_include_medications := true
);

-- 4. Check if patient was actually created
SELECT 
  id,
  patient_id,
  tenant_id,
  first_name,
  last_name,
  created_at
FROM patients
WHERE tenant_id = 'ac7aa13f-472a-4e99-ac16-2beeb7fe2d20'::uuid
ORDER BY created_at DESC
LIMIT 10;

-- 5. Look for any recent patients that might match
SELECT 
  id,
  patient_id,
  tenant_id,
  first_name,
  last_name,
  created_at
FROM patients
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;
