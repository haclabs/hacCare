-- =====================================================
-- FIND ORPHANED PATIENTS
-- =====================================================
-- Purpose: Identify patients not tied to active tenants
-- Date: January 12, 2026
-- =====================================================

-- 0. Check tenants table structure (to understand what columns are available)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
ORDER BY ordinal_position;

-- 1. Find patients with NULL tenant_id
SELECT 
    id,
    patient_id,
    first_name,
    last_name,
    tenant_id,
    created_at,
    'NULL tenant_id' as issue
FROM patients
WHERE tenant_id IS NULL
ORDER BY created_at DESC;

-- 2. Find patients with tenant_id that doesn't exist in tenants table
SELECT 
    p.id,
    p.patient_id,
    p.first_name,
    p.last_name,
    p.tenant_id,
    p.created_at,
    'Invalid tenant_id' as issue
FROM patients p
LEFT JOIN tenants t ON p.tenant_id = t.id
WHERE t.id IS NULL AND p.tenant_id IS NOT NULL
ORDER BY p.created_at DESC;

-- 3. Find all patients and their tenant info (to see tenant status)
SELECT 
    p.id,
    p.patient_id,
    p.first_name,
    p.last_name,
    p.tenant_id,
    t.name as tenant_name,
    t.created_at as tenant_created_at,
    p.created_at as patient_created_at
FROM patients p
LEFT JOIN tenants t ON p.tenant_id = t.id
ORDER BY p.created_at DESC
LIMIT 50;

-- 4. Find duplicate patients (same patient_id, different IDs)
SELECT 
    patient_id,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as patient_ids,
    STRING_AGG(tenant_id::text, ', ') as tenant_ids
FROM patients
GROUP BY patient_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 5. Find patients with duplicate names in same tenant
SELECT 
    tenant_id,
    first_name,
    last_name,
    COUNT(*) as duplicate_count,
    STRING_AGG(id::text, ', ') as patient_ids,
    STRING_AGG(patient_id, ', ') as patient_id_list
FROM patients
WHERE tenant_id IS NOT NULL
GROUP BY tenant_id, first_name, last_name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- 6. Summary stats
SELECT 
    'Total patients' as metric,
    COUNT(*) as count
FROM patients
UNION ALL
SELECT 
    'Patients with NULL tenant_id' as metric,
    COUNT(*) as count
FROM patients
WHERE tenant_id IS NULL
UNION ALL
SELECT 
    'Patients with invalid tenant_id' as metric,
    COUNT(*) as count
FROM patients p
LEFT JOIN tenants t ON p.tenant_id = t.id
WHERE t.id IS NULL AND p.tenant_id IS NOT NULL
UNION ALL
SELECT 
    'Duplicate patient_ids' as metric,
    COUNT(*) as count
FROM (
    SELECT patient_id
    FROM patients
    GROUP BY patient_id
    HAVING COUNT(*) > 1
) duplicates;

-- =====================================================
-- TO DELETE ORPHANED PATIENTS (USE WITH CAUTION!)
-- =====================================================

-- STEP 1: Review the results from queries above first!

-- STEP 2: Backup before deleting (if needed)
-- CREATE TABLE patients_backup_20260112 AS SELECT * FROM patients WHERE tenant_id IS NULL OR ...;

-- STEP 3: Delete patients with NULL tenant_id (UNCOMMENT TO EXECUTE)
-- DELETE FROM patients WHERE tenant_id IS NULL;

-- STEP 4: Delete patients with invalid tenant_id (UNCOMMENT TO EXECUTE)
-- DELETE FROM patients p
-- WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = p.tenant_id);

-- =====================================================
-- NOTES:
-- - Run diagnostic queries first to see what will be deleted
-- - Always backup before mass deletions
-- - Duplicate patient_ids across tenants might be intentional (different simulations)
-- =====================================================
