-- ============================================================================
-- DIRECT FUNCTION TEST WITH VISIBLE RESULTS
-- ============================================================================

-- 1. Check if 'program' enum value exists
SELECT 
  '1. Enum Check' as test,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_enum 
      WHERE enumlabel = 'program' 
      AND enumtypid = 'tenant_type'::regtype
    ) THEN '✅ program enum exists'
    ELSE '❌ program enum MISSING'
  END as result;

-- 2. Call function for BNAD and capture result
WITH function_call AS (
  SELECT create_program_tenant(
    (SELECT id FROM programs WHERE code = 'BNAD'),
    '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8'::uuid
  ) as result
)
SELECT 
  '2. BNAD Function Call' as test,
  (result->>'success')::text as success,
  (result->>'message')::text as message,
  (result->>'error')::text as error,
  (result->>'tenant_id')::text as tenant_id
FROM function_call;

-- 3. Call function for NESA
WITH function_call AS (
  SELECT create_program_tenant(
    (SELECT id FROM programs WHERE code = 'NESA'),
    '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8'::uuid
  ) as result
)
SELECT 
  '3. NESA Function Call' as test,
  (result->>'success')::text as success,
  (result->>'message')::text as message,
  (result->>'error')::text as error,
  (result->>'tenant_id')::text as tenant_id
FROM function_call;

-- 4. Call function for PN
WITH function_call AS (
  SELECT create_program_tenant(
    (SELECT id FROM programs WHERE code = 'PN'),
    '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8'::uuid
  ) as result
)
SELECT 
  '4. PN Function Call' as test,
  (result->>'success')::text as success,
  (result->>'message')::text as message,
  (result->>'error')::text as error,
  (result->>'tenant_id')::text as tenant_id
FROM function_call;

-- 5. Call function for SIM Hub
WITH function_call AS (
  SELECT create_program_tenant(
    (SELECT id FROM programs WHERE code = 'SIM Hub'),
    '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8'::uuid
  ) as result
)
SELECT 
  '5. SIM Hub Function Call' as test,
  (result->>'success')::text as success,
  (result->>'message')::text as message,
  (result->>'error')::text as error,
  (result->>'tenant_id')::text as tenant_id
FROM function_call;

-- 6. Final verification
SELECT 
  '6. Final Verification' as test,
  p.code as program_code,
  t.name as tenant_name,
  t.subdomain,
  t.tenant_type,
  t.status
FROM programs p
LEFT JOIN tenants t ON t.program_id = p.id
WHERE p.is_active = true
ORDER BY p.code;
