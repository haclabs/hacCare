-- MEDICATION VISIBILITY DIAGNOSTIC: Find missing medications in MAR module
-- This script will help identify why medications show in console but not in MAR UI

-- ============================================================================
-- STEP 1: Check current user and tenant context
-- ============================================================================

SELECT 'CURRENT USER CONTEXT:' as section;
SELECT 
  'Current User:' as info,
  auth.uid() as user_id,
  up.email,
  up.role,
  up.is_active
FROM user_profiles up
WHERE up.id = auth.uid();

SELECT 
  'Current Tenant Assignment:' as info,
  tu.tenant_id,
  t.name as tenant_name,
  t.subdomain,
  tu.role as tenant_role
FROM tenant_users tu
JOIN tenants t ON tu.tenant_id = t.id
WHERE tu.user_id = auth.uid() AND tu.is_active = true;

-- ============================================================================
-- STEP 2: Check all medications in database
-- ============================================================================

SELECT 'ALL MEDICATIONS IN DATABASE:' as section;
SELECT 
  pm.id as medication_id,
  pm.patient_id,
  p.first_name || ' ' || p.last_name as patient_name,
  pm.medication_name,
  pm.dosage,
  pm.frequency,
  pm.start_date,
  pm.end_date,
  pm.status,
  pm.tenant_id as med_tenant_id,
  p.tenant_id as patient_tenant_id,
  t.name as tenant_name,
  pm.created_at,
  CASE 
    WHEN pm.tenant_id != p.tenant_id THEN '❌ TENANT MISMATCH'
    WHEN pm.tenant_id IS NULL THEN '❌ NO TENANT'
    WHEN p.tenant_id IS NULL THEN '❌ PATIENT NO TENANT'
    ELSE '✅ OK'
  END as tenant_status
FROM patient_medications pm
LEFT JOIN patients p ON pm.patient_id = p.id
LEFT JOIN tenants t ON pm.tenant_id = t.id
ORDER BY pm.created_at DESC
LIMIT 20;

-- ============================================================================
-- STEP 3: Check medications for current user's tenant only
-- ============================================================================

SELECT 'MEDICATIONS FOR YOUR TENANT:' as section;
SELECT 
  pm.id as medication_id,
  pm.patient_id,
  p.first_name || ' ' || p.last_name as patient_name,
  pm.medication_name,
  pm.dosage,
  pm.frequency,
  pm.start_date,
  pm.end_date,
  pm.status,
  pm.tenant_id,
  pm.created_at
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
WHERE pm.tenant_id IN (
  SELECT tenant_id 
  FROM tenant_users 
  WHERE user_id = auth.uid() AND is_active = true
)
ORDER BY pm.created_at DESC;

-- ============================================================================
-- STEP 4: Check overdue medications specifically
-- ============================================================================

SELECT 'OVERDUE MEDICATIONS:' as section;
SELECT 
  pm.id as medication_id,
  pm.patient_id,
  p.first_name || ' ' || p.last_name as patient_name,
  pm.medication_name,
  pm.dosage,
  pm.frequency,
  pm.start_date,
  pm.end_date,
  pm.status,
  pm.tenant_id,
  CASE 
    WHEN pm.end_date < CURRENT_DATE THEN 'OVERDUE'
    WHEN pm.start_date > CURRENT_DATE THEN 'FUTURE'
    ELSE 'CURRENT'
  END as medication_status,
  pm.created_at
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
WHERE pm.tenant_id IN (
  SELECT tenant_id 
  FROM tenant_users 
  WHERE user_id = auth.uid() AND is_active = true
)
  AND (pm.end_date < CURRENT_DATE OR pm.status = 'active')
ORDER BY pm.end_date DESC;

-- ============================================================================
-- STEP 5: Check medication administrations (MAR records)
-- ============================================================================

SELECT 'MEDICATION ADMINISTRATION RECORDS:' as section;
SELECT 
  ma.id as administration_id,
  ma.patient_id,
  p.first_name || ' ' || p.last_name as patient_name,
  ma.medication_name,
  ma.dosage,
  ma.administration_time,
  ma.administered_by,
  ma.status as admin_status,
  ma.tenant_id,
  ma.created_at
FROM medication_administrations ma
JOIN patients p ON ma.patient_id = p.id
WHERE ma.tenant_id IN (
  SELECT tenant_id 
  FROM tenant_users 
  WHERE user_id = auth.uid() AND is_active = true
)
ORDER BY ma.administration_time DESC
LIMIT 20;

-- ============================================================================
-- STEP 6: Check RLS policies on medication tables
-- ============================================================================

SELECT 'RLS POLICY CHECK:' as section;
SELECT 
  'Table: ' || tablename as table_info,
  COUNT(*) as policy_count,
  'Active RLS policies' as description
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('patient_medications', 'medication_administrations')
GROUP BY tablename;

-- Check if RLS is enabled
SELECT 
  'RLS Status:' as check_type,
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('patient_medications', 'medication_administrations');

-- ============================================================================
-- STEP 7: Test what MAR module query might be running
-- ============================================================================

SELECT 'SIMULATING MAR MODULE QUERY:' as section;

-- This simulates what the MAR module frontend might be querying
SELECT 
  pm.id,
  pm.patient_id,
  p.first_name,
  p.last_name,
  pm.medication_name,
  pm.dosage,
  pm.frequency,
  pm.route,
  pm.start_date,
  pm.end_date,
  pm.status,
  pm.instructions,
  COUNT(ma.id) as administration_count
FROM patient_medications pm
JOIN patients p ON pm.patient_id = p.id
LEFT JOIN medication_administrations ma ON pm.id = ma.medication_id
WHERE pm.status = 'active'
  AND pm.start_date <= CURRENT_DATE
  AND (pm.end_date IS NULL OR pm.end_date >= CURRENT_DATE)
  AND pm.tenant_id IN (
    SELECT tenant_id 
    FROM tenant_users 
    WHERE user_id = auth.uid() AND is_active = true
  )
GROUP BY pm.id, pm.patient_id, p.first_name, p.last_name, pm.medication_name, 
         pm.dosage, pm.frequency, pm.route, pm.start_date, pm.end_date, 
         pm.status, pm.instructions
ORDER BY p.last_name, p.first_name, pm.medication_name;

-- ============================================================================
-- POTENTIAL FIXES
-- ============================================================================

SELECT 'POTENTIAL MEDICATION VISIBILITY FIXES:' as fixes;
SELECT 'If medications are missing from MAR:' as issue1;
SELECT '1. Check tenant_id on patient_medications table' as fix1;
SELECT '2. Verify RLS policies allow access' as fix2;
SELECT '3. Check medication status is "active"' as fix3;
SELECT '4. Verify start_date/end_date ranges' as fix4;
SELECT '5. Check frontend filtering logic' as fix5;
