-- Fix John Doe's tenant assignment
-- First let's identify which tenant the current ID belongs to

-- 1. Check which tenant John Doe is currently assigned to
SELECT 'JOHN DOE CURRENT TENANT:' as section;
SELECT 
  p.first_name,
  p.last_name,
  p.tenant_id as current_tenant_id,
  t.name as current_tenant_name,
  t.subdomain as current_tenant_subdomain
FROM patients p
JOIN tenants t ON p.tenant_id = t.id
WHERE p.first_name ILIKE '%john%' AND p.last_name ILIKE '%doe%';

-- 2. Verify the tenant ID f6774e78-5c9b-47fc-b09c-c81cb0a481c5
SELECT 'TENANT ID LOOKUP:' as section;
SELECT 
  id,
  name,
  subdomain,
  status
FROM tenants 
WHERE id = 'f6774e78-5c9b-47fc-b09c-c81cb0a481c5';

-- 3. Get the Lethpoly tenant ID
SELECT 'LETHPOLY TENANT:' as section;
SELECT 
  id,
  name,
  subdomain,
  status
FROM tenants 
WHERE name ILIKE '%lethpoly%' OR subdomain ILIKE '%lethpoly%';

-- 4. Get John Doe's patient ID for the update
SELECT 'JOHN DOE PATIENT ID:' as section;
SELECT 
  id as patient_id,
  first_name,
  last_name,
  tenant_id as current_tenant_id
FROM patients 
WHERE first_name ILIKE '%john%' AND last_name ILIKE '%doe%';

-- ===================================================
-- FIXES (uncomment after verifying the data above)
-- ===================================================

-- After you identify the correct Lethpoly tenant ID, replace 'LETHPOLY_TENANT_ID_HERE' 
-- with the actual Lethpoly tenant ID and uncomment these statements:

/*
-- Fix 1: Update John Doe's patient record to belong to Lethpoly
UPDATE patients 
SET tenant_id = 'LETHPOLY_TENANT_ID_HERE',
    updated_at = NOW()
WHERE first_name ILIKE '%john%' AND last_name ILIKE '%doe%';

-- Fix 2: Update John Doe's vitals to match the new tenant
UPDATE patient_vitals 
SET tenant_id = 'LETHPOLY_TENANT_ID_HERE'
WHERE patient_id IN (
  SELECT id FROM patients 
  WHERE first_name ILIKE '%john%' AND last_name ILIKE '%doe%'
);

-- Fix 3: Update John Doe's alerts to match the new tenant
UPDATE patient_alerts 
SET tenant_id = 'LETHPOLY_TENANT_ID_HERE'
WHERE patient_id IN (
  SELECT id FROM patients 
  WHERE first_name ILIKE '%john%' AND last_name ILIKE '%doe%'
);

-- Fix 4: Update John Doe's notes to match the new tenant (if any)
UPDATE patient_notes 
SET tenant_id = 'LETHPOLY_TENANT_ID_HERE'
WHERE patient_id IN (
  SELECT id FROM patients 
  WHERE first_name ILIKE '%john%' AND last_name ILIKE '%doe%'
);

-- Fix 5: Update John Doe's medications to match the new tenant (if any)
UPDATE patient_medications 
SET tenant_id = 'LETHPOLY_TENANT_ID_HERE'
WHERE patient_id IN (
  SELECT id FROM patients 
  WHERE first_name ILIKE '%john%' AND last_name ILIKE '%doe%'
);
*/

-- ===================================================
-- VERIFICATION
-- ===================================================

-- Verify the fix worked
SELECT 'VERIFICATION - John Doe after fix:' as section;
SELECT 
  p.first_name,
  p.last_name,
  p.tenant_id as new_tenant_id,
  t.name as new_tenant_name,
  t.subdomain as new_tenant_subdomain
FROM patients p
JOIN tenants t ON p.tenant_id = t.id
WHERE p.first_name ILIKE '%john%' AND p.last_name ILIKE '%doe%';
