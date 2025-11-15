-- =====================================================
-- DEBUG MEDICATION BARCODE MISMATCH
-- =====================================================
-- Issue: Printed label shows MZ30512 but active simulation has MZ65956
-- Tenant: 2f466ac2-96b1-4911-87db-9a86176c2d11
-- Medication: ZOFRAN
-- =====================================================
--
-- INSTRUCTIONS:
-- 1. Copy this entire file
-- 2. Run in Supabase SQL Editor (or psql)
-- 3. Review the results to understand the mismatch
-- =====================================================

-- Step 1: Check what medications exist in the simulation tenant
SELECT 
  'MEDICATIONS IN SIMULATION TENANT' as check_type,
  pm.id,
  pm.name as medication_name,
  pm.dosage,
  pm.status,
  pm.patient_id,
  p.first_name || ' ' || p.last_name as patient_name,
  p.tenant_id,
  pm.created_at
FROM patient_medications pm
JOIN patients p ON p.id = pm.patient_id
WHERE p.tenant_id = '2f466ac2-96b1-4911-87db-9a86176c2d11'
  AND pm.name ILIKE '%ZOFRAN%'
ORDER BY pm.created_at;

-- Step 2: Check the patient's home tenant (where labels might have been printed from)
-- First, let's see if this is a simulation tenant
SELECT 
  'TENANT INFORMATION' as check_type,
  t.id,
  t.name,
  t.subdomain,
  t.tenant_type
FROM tenants t
WHERE t.id = '2f466ac2-96b1-4911-87db-9a86176c2d11';

-- Step 3: Check if there's a simulation_active record
SELECT 
  'SIMULATION ACTIVE RECORD' as check_type,
  sa.id as simulation_id,
  sa.tenant_id as simulation_tenant_id,
  sa.template_id,
  sa.starts_at,
  sa.ends_at,
  sa.status,
  st.name as template_name
FROM simulation_active sa
LEFT JOIN simulation_templates st ON st.id = sa.template_id
WHERE sa.tenant_id = '2f466ac2-96b1-4911-87db-9a86176c2d11';

-- Step 4: Check all ZOFRAN medications in ALL tenants (to find the one that matches MZ30512)
SELECT 
  'ALL ZOFRAN MEDICATIONS (ALL TENANTS)' as check_type,
  pm.id,
  pm.name as medication_name,
  pm.dosage,
  pm.status,
  pm.patient_id,
  p.first_name || ' ' || p.last_name as patient_name,
  p.tenant_id,
  t.name as tenant_name,
  t.tenant_type,
  pm.created_at
FROM patient_medications pm
JOIN patients p ON p.id = pm.patient_id
JOIN tenants t ON t.id = p.tenant_id
WHERE pm.name ILIKE '%ZOFRAN%'
ORDER BY pm.created_at DESC
LIMIT 20;

-- Step 5: Check simulation template snapshot for ZOFRAN medications
WITH sim_info AS (
  SELECT sa.template_id
  FROM simulation_active sa
  WHERE sa.tenant_id = '2f466ac2-96b1-4911-87db-9a86176c2d11'
  LIMIT 1
)
SELECT 
  'TEMPLATE SNAPSHOT MEDICATIONS' as check_type,
  st.id as template_id,
  st.name as template_name,
  jsonb_pretty(
    (
      SELECT jsonb_agg(med)
      FROM jsonb_array_elements(st.snapshot_data->'medications') AS med
      WHERE med->>'name' ILIKE '%ZOFRAN%'
    )
  ) as zofran_medications_in_snapshot
FROM simulation_templates st
JOIN sim_info si ON si.template_id = st.id;

-- Step 6: Simulate barcode generation for all ZOFRAN medications found
-- This recreates the JavaScript bcmaService.generateMedicationBarcode logic in SQL
WITH all_zofran AS (
  SELECT DISTINCT
    pm.id,
    pm.name,
    p.tenant_id,
    t.name as tenant_name
  FROM patient_medications pm
  JOIN patients p ON p.id = pm.patient_id
  JOIN tenants t ON t.id = p.tenant_id
  WHERE pm.name ILIKE '%ZOFRAN%'
)
SELECT 
  'BARCODE GENERATION SIMULATION' as check_type,
  id as medication_id,
  name as medication_name,
  tenant_id,
  tenant_name,
  -- Simulate the JavaScript barcode generation
  'M' || 
  UPPER(SUBSTRING(REGEXP_REPLACE(UPPER(name), '[^A-Z0-9]', '', 'g') FROM 1 FOR 1)) ||
  LPAD(
    (
      -- Hash the UUID to create 5-digit code
      -- This is a simple approximation of the JS hash function
      ABS(
        ('x' || SUBSTRING(MD5(REGEXP_REPLACE(UPPER(id::text), '[^A-Z0-9]', '', 'g')) FROM 1 FOR 8))::bit(32)::int
      ) % 100000
    )::text,
    5,
    '0'
  ) as generated_barcode,
  -- Additional debug info
  UPPER(SUBSTRING(REGEXP_REPLACE(UPPER(name), '[^A-Z0-9]', '', 'g') FROM 1 FOR 1)) as name_prefix,
  REGEXP_REPLACE(UPPER(id::text), '[^A-Z0-9]', '', 'g') as clean_id,
  -- Highlight matches
  CASE 
    WHEN 'M' || 
      UPPER(SUBSTRING(REGEXP_REPLACE(UPPER(name), '[^A-Z0-9]', '', 'g') FROM 1 FOR 1)) ||
      LPAD((ABS(('x' || SUBSTRING(MD5(REGEXP_REPLACE(UPPER(id::text), '[^A-Z0-9]', '', 'g')) FROM 1 FOR 8))::bit(32)::int) % 100000)::text, 5, '0')
      = 'MZ30512' THEN '🎯 MATCHES PRINTED LABEL!'
    WHEN 'M' || 
      UPPER(SUBSTRING(REGEXP_REPLACE(UPPER(name), '[^A-Z0-9]', '', 'g') FROM 1 FOR 1)) ||
      LPAD((ABS(('x' || SUBSTRING(MD5(REGEXP_REPLACE(UPPER(id::text), '[^A-Z0-9]', '', 'g')) FROM 1 FOR 8))::bit(32)::int) % 100000)::text, 5, '0')
      = 'MZ65956' THEN '🔴 MATCHES ACTIVE SIMULATION'
    ELSE ''
  END as match_status
FROM all_zofran
ORDER BY tenant_id, name;

-- Step 7: Check for any medication with ID that would generate MZ30512 or MZ65956
SELECT 
  'REVERSE BARCODE LOOKUP' as check_type,
  'Looking for medications that generate MZ30512 or MZ65956' as description;

-- Try to find the medication that generates MZ30512 (printed label)
WITH all_meds AS (
  SELECT 
    pm.id,
    pm.name,
    p.tenant_id
  FROM patient_medications pm
  JOIN patients p ON p.id = pm.patient_id
  WHERE pm.name ILIKE '%Z%'  -- Start with Z medications
)
SELECT 
  'BARCODE MZ30512 CANDIDATES' as check_type,
  id,
  name,
  tenant_id,
  'M' || 
  UPPER(SUBSTRING(REGEXP_REPLACE(UPPER(name), '[^A-Z0-9]', '', 'g') FROM 1 FOR 1)) ||
  LPAD(
    (
      ABS(
        ('x' || SUBSTRING(MD5(REGEXP_REPLACE(UPPER(id::text), '[^A-Z0-9]', '', 'g')) FROM 1 FOR 8))::bit(32)::int
      ) % 100000
    )::text,
    5,
    '0'
  ) as generated_barcode
FROM all_meds
WHERE 
  'M' || 
  UPPER(SUBSTRING(REGEXP_REPLACE(UPPER(name), '[^A-Z0-9]', '', 'g') FROM 1 FOR 1)) ||
  LPAD(
    (
      ABS(
        ('x' || SUBSTRING(MD5(REGEXP_REPLACE(UPPER(id::text), '[^A-Z0-9]', '', 'g')) FROM 1 FOR 8))::bit(32)::int
      ) % 100000
    )::text,
    5,
    '0'
  ) IN ('MZ30512', 'MZ65956');

-- Step 8: Summary and recommendations
SELECT 
  'SUMMARY' as check_type,
  '
ISSUE: Barcode mismatch between printed label and active simulation
- Printed label barcode: MZ30512
- Active simulation barcode: MZ65956
- Medication: ZOFRAN

LIKELY CAUSES:
1. Labels were printed from HOME tenant before simulation started
2. Simulation uses DIFFERENT medication UUIDs than home tenant
3. Reset function deletes medications and restores from snapshot with NEW UUIDs

SOLUTION:
The reset_simulation_for_next_session function needs to PRESERVE medication UUIDs,
not delete and restore them with new UUIDs.

SEE: backup/simulation-legacy/migrations/016_reset_simulation_preserve_meds.sql
This migration shows the old approach that preserved medication IDs.

RECOMMENDATION:
Modify reset_simulation_for_next_session to:
1. Update medications in place (not delete/restore)
2. Preserve medication UUIDs for barcode compatibility
3. Only delete student-added medications, not baseline medications
' as analysis;
