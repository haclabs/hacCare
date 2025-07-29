-- Comprehensive debugging for medication visibility issue
-- Run each section one by one and share the results

-- ============================================================================
-- SECTION 1: Basic Environment Check
-- ============================================================================
SELECT '=== SECTION 1: Environment Check ===' as debug_section;

-- Check current user
SELECT 'Current authenticated user' as check_type;
SELECT auth.uid() as user_id, auth.email() as user_email;

-- Check user profile
SELECT 'User profile' as check_type;
SELECT id, email, role FROM user_profiles WHERE id = auth.uid();

-- Check tenant assignment
SELECT 'Tenant assignment' as check_type;
SELECT 
  tu.user_id,
  tu.tenant_id, 
  tu.role,
  tu.is_active,
  t.name as tenant_name
FROM tenant_users tu
JOIN tenants t ON tu.tenant_id = t.id
WHERE tu.user_id = auth.uid();

-- ============================================================================
-- SECTION 2: Raw Data Check
-- ============================================================================
SELECT '=== SECTION 2: Raw Data Check ===' as debug_section;

-- Turn off RLS completely for this session
SET row_security = OFF;

SELECT 'Raw medications in database' as check_type;
SELECT 
  id,
  patient_id,
  name,
  dosage,
  tenant_id,
  created_at
FROM patient_medications 
ORDER BY created_at DESC 
LIMIT 10;

-- Turn RLS back on
SET row_security = ON;

-- ============================================================================
-- SECTION 3: RLS Status Check
-- ============================================================================
SELECT '=== SECTION 3: RLS Status ===' as debug_section;

SELECT 'Table RLS status' as check_type;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('patients', 'patient_medications');

SELECT 'Active RLS policies' as check_type;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd,
  roles,
  qual
FROM pg_policies 
WHERE tablename = 'patient_medications';

-- ============================================================================
-- SECTION 4: Access Test
-- ============================================================================
SELECT '=== SECTION 4: Access Test ===' as debug_section;

SELECT 'Medications visible with RLS ON' as check_type;
SELECT COUNT(*) as visible_count FROM patient_medications;

SELECT 'Patients visible (for comparison)' as check_type;
SELECT COUNT(*) as visible_count FROM patients;

-- ============================================================================
-- SECTION 5: Specific Policy Tests
-- ============================================================================
SELECT '=== SECTION 5: Policy Component Tests ===' as debug_section;

-- Test super admin check
SELECT 'Super admin check result' as check_type;
SELECT EXISTS (
  SELECT 1 FROM user_profiles 
  WHERE id = auth.uid() AND role = 'super_admin'
) as is_super_admin;

-- Test tenant check
SELECT 'Tenant access check result' as check_type;
SELECT EXISTS (
  SELECT 1 FROM tenant_users 
  WHERE user_id = auth.uid() 
  AND is_active = true
) as has_tenant_access;

-- Test specific tenant match
SELECT 'Tenant match test' as check_type;
SELECT 
  pm.tenant_id as medication_tenant,
  tu.tenant_id as user_tenant,
  pm.tenant_id = tu.tenant_id as tenant_match
FROM patient_medications pm
CROSS JOIN tenant_users tu
WHERE tu.user_id = auth.uid() AND tu.is_active = true
LIMIT 5;
