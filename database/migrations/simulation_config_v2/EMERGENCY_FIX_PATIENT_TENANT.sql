-- ============================================================================
-- EMERGENCY FIX: Move Patients to Correct Tenant
-- ============================================================================
-- 
-- ISSUE: Patients being created in wrong tenant due to stale React context
-- - Created in: 4590329e-6619-4b74-9024-421c4931316d (wrong)
-- - Should be in: 6ced4f99-0a51-4e68-b373-53f55ebedc41 (correct - "Dev Test")
--
-- AFFECTED PATIENTS:
-- - PT39898 - Chuggs The Bug (0d37f769-b1ea-44f5-8bbc-b1cb91779047)
-- - PT20001 - Chugg Two (3055dc99-5f51-423e-ba88-c9545ac03d07)
--
-- SOLUTION: Move patients to correct tenant manually
-- ============================================================================

-- First, verify which patients need to be moved
SELECT 
  id, 
  patient_id, 
  first_name, 
  last_name, 
  tenant_id,
  CASE 
    WHEN tenant_id = '4590329e-6619-4b74-9024-421c4931316d' THEN '❌ WRONG TENANT'
    WHEN tenant_id = '6ced4f99-0a51-4e68-b373-53f55ebedc41' THEN '✅ CORRECT TENANT'
    ELSE '⚠️ OTHER TENANT'
  END as status
FROM patients 
WHERE id IN (
  '0d37f769-b1ea-44f5-8bbc-b1cb91779047',
  '3055dc99-5f51-423e-ba88-c9545ac03d07'
)
ORDER BY created_at;

-- Move patients to correct tenant
UPDATE patients
SET tenant_id = '6ced4f99-0a51-4e68-b373-53f55ebedc41'
WHERE id IN (
  '0d37f769-b1ea-44f5-8bbc-b1cb91779047',
  '3055dc99-5f51-423e-ba88-c9545ac03d07'
)
AND tenant_id = '4590329e-6619-4b74-9024-421c4931316d';

-- Verify the move
SELECT 
  id, 
  patient_id, 
  first_name, 
  last_name, 
  tenant_id,
  '✅ MOVED TO CORRECT TENANT' as status
FROM patients 
WHERE id IN (
  '0d37f769-b1ea-44f5-8bbc-b1cb91779047',
  '3055dc99-5f51-423e-ba88-c9545ac03d07'
);

-- ============================================================================
-- ROOT CAUSE DIAGNOSIS
-- ============================================================================

-- Check what tenants exist
SELECT 
  id,
  name,
  subdomain,
  tenant_type,
  is_simulation,
  CASE 
    WHEN id = '4590329e-6619-4b74-9024-421c4931316d' THEN '← OLD/WRONG TENANT'
    WHEN id = '6ced4f99-0a51-4e68-b373-53f55ebedc41' THEN '← NEW/CORRECT TENANT (Dev Test)'
  END as notes
FROM tenants
WHERE id IN (
  '4590329e-6619-4b74-9024-421c4931316d',
  '6ced4f99-0a51-4e68-b373-53f55ebedc41'
)
ORDER BY created_at DESC;

-- ============================================================================
-- NOTES
-- ============================================================================

/*

ROOT CAUSE:
- React context (PatientContext) has stale value of currentTenant
- When super admin switches tenants in TenantContext, PatientContext doesn't re-render
- PatientContext.addPatient() uses old currentTenant.id from closure
- Result: Patient created in old tenant even though UI shows new tenant

CODE FIX NEEDED (in PatientContext.tsx):
- Use selectedTenantId as primary source instead of currentTenant.id
- OR force re-mount of PatientContext when currentTenant changes
- OR use ref instead of state for currentTenant to avoid closure issues

IMMEDIATE WORKAROUND:
- Move patients manually with this SQL
- Restart dev server to load updated code
- Or use direct database operation for patient creation (bypass React context)

*/
