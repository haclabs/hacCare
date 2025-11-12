-- ============================================================================
-- DEBUG: Patient Transfer to Template Issue
-- ============================================================================

-- ---------------------------------------------------------------------------
-- STEP 1: Check Your Templates
-- ---------------------------------------------------------------------------

SELECT 
  id,
  name,
  tenant_id,
  status,
  created_at
FROM simulation_templates
ORDER BY created_at DESC
LIMIT 5;

-- Copy the template_id and tenant_id you're trying to transfer to

-- ---------------------------------------------------------------------------
-- STEP 2: Check Source Patients (where you're copying FROM)
-- ---------------------------------------------------------------------------

-- Find patients in your main tenant (not template/simulation tenants)
SELECT 
  t.name as tenant_name,
  t.id as tenant_id,
  p.patient_id as mrn,
  p.name as patient_name,
  p.id as patient_uuid
FROM patients p
JOIN tenants t ON t.id = p.tenant_id
WHERE t.type != 'simulation'  -- Exclude simulation tenants
ORDER BY p.created_at DESC
LIMIT 10;

-- Copy the patient_id (MRN like "P001") you want to transfer

-- ---------------------------------------------------------------------------
-- STEP 3: Check If Patient Already Exists in Template Tenant
-- ---------------------------------------------------------------------------

-- Check if patient is already in the template tenant
SELECT 
  p.id,
  p.patient_id as mrn,
  p.name,
  p.tenant_id,
  t.name as tenant_name
FROM patients p
JOIN tenants t ON t.id = p.tenant_id
WHERE p.tenant_id = 'YOUR_TEMPLATE_TENANT_ID'  -- From Step 1
ORDER BY p.created_at;

-- If empty, patient hasn't transferred yet
-- If not empty, patient is already there

-- ---------------------------------------------------------------------------
-- STEP 4: Check Tenant Type
-- ---------------------------------------------------------------------------

-- Verify your template tenant is correct type
SELECT 
  id,
  name,
  type,
  created_at
FROM tenants
WHERE id = 'YOUR_TEMPLATE_TENANT_ID';

-- Should show type = 'simulation' or similar

-- ---------------------------------------------------------------------------
-- STEP 5: Test Transfer with Detailed Output
-- ---------------------------------------------------------------------------

-- Try transferring again and see the result JSON
SELECT duplicate_patient_to_tenant(
  'YOUR_SOURCE_PATIENT_MRN',  -- e.g., 'P001'
  'YOUR_TEMPLATE_TENANT_ID',   -- Template's tenant_id from Step 1
  NULL,  -- copy_mode (NULL = all data)
  true,  -- medications
  true,  -- vitals
  true,  -- notes
  true,  -- admission
  true,  -- advanced_directives
  true,  -- alerts
  true,  -- diabetic_records
  true,  -- bowel_records
  true,  -- wounds
  true,  -- labs
  true,  -- images
  true,  -- orders
  true   -- handover
);

-- Expected output: JSON with success=true and counts

-- ---------------------------------------------------------------------------
-- STEP 6: Check RLS Policies on Patients Table
-- ---------------------------------------------------------------------------

-- Check if RLS is blocking reads
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'patients';

-- Check policies on patients table
SELECT 
  policyname,
  cmd as command_type,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'patients';

-- ---------------------------------------------------------------------------
-- STEP 7: Check Your User Role
-- ---------------------------------------------------------------------------

-- What role do you have?
SELECT 
  id,
  email,
  role,
  created_at
FROM user_profiles
WHERE id = auth.uid();

-- If role is 'nurse' or 'student', you might not have permission to transfer

-- ---------------------------------------------------------------------------
-- STEP 8: Check Tenant Access
-- ---------------------------------------------------------------------------

-- Can you see ALL tenants or just yours?
SELECT 
  id,
  name,
  type,
  created_at
FROM tenants
ORDER BY created_at DESC;

-- If you only see 1-2 tenants, RLS might be limiting access

-- ---------------------------------------------------------------------------
-- STEP 9: Try Direct Insert (Admin Test)
-- ---------------------------------------------------------------------------

-- If you're an admin, try direct insert to test if it's a function issue
INSERT INTO patients (
  patient_id,
  name,
  date_of_birth,
  gender,
  tenant_id
)
VALUES (
  'TEST999',
  'Test Patient Transfer',
  '1990-01-01',
  'Other',
  'YOUR_TEMPLATE_TENANT_ID'
)
RETURNING id, patient_id, name;

-- If this works, function is the issue
-- If this fails, RLS or permissions are the issue

-- ---------------------------------------------------------------------------
-- STEP 10: Check Function Exists and Is Correct Version
-- ---------------------------------------------------------------------------

-- Verify function signature
SELECT 
  proname,
  pg_get_function_arguments(oid) as arguments,
  prosecdef as is_security_definer
FROM pg_proc
WHERE proname = 'duplicate_patient_to_tenant';

-- Should show the function with all the boolean parameters

-- ============================================================================
-- COMMON ISSUES
-- ============================================================================

/*

❌ ISSUE 1: Wrong tenant_id
   - Using template.id instead of template.tenant_id
   - Solution: Use template.tenant_id from simulation_templates table

❌ ISSUE 2: RLS blocking view
   - You can transfer but can't see the result due to RLS
   - Solution: Check patients table with correct tenant_id filter

❌ ISSUE 3: Function security
   - Function needs SECURITY DEFINER to bypass RLS during transfer
   - Solution: Check prosecdef = true in Step 10

❌ ISSUE 4: Patient already exists
   - Patient with that MRN already in template tenant
   - Solution: Check Step 3 results

❌ ISSUE 5: No permission
   - Your role doesn't allow patient creation
   - Solution: Check your role in Step 7

*/

-- After running these, paste the results and I'll help diagnose!
