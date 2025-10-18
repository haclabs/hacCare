-- ===========================================================================
-- SECURITY HARDENING TEST SCRIPT
-- ===========================================================================
-- Purpose: Verify security hardening didn't break critical systems
-- Run this AFTER deploying 015_security_hardening.sql
-- ===========================================================================

\echo '============================================================================'
\echo 'SECURITY HARDENING TEST SUITE'
\echo '============================================================================'
\echo ''

-- ============================================================================
-- TEST 1: VERIFY CMS TABLES REMOVED
-- ============================================================================

\echo '📋 Test 1: CMS Tables Removed'
\echo '---'

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS: All CMS tables removed'
    ELSE '❌ FAIL: Found ' || COUNT(*) || ' CMS tables still present'
  END as result
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('cms_audit_log', 'landing_page_content', 'landing_page_content_history');

\echo ''

-- ============================================================================
-- TEST 2: VERIFY NO ORPHANED ALERTS
-- ============================================================================

\echo '📋 Test 2: No Orphaned Alerts (NULL tenant_id)'
\echo '---'

SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ PASS: No alerts with NULL tenant_id'
    ELSE '❌ FAIL: Found ' || COUNT(*) || ' orphaned alerts'
  END as result
FROM patient_alerts 
WHERE tenant_id IS NULL;

\echo ''

-- ============================================================================
-- TEST 3: VERIFY NEW POLICIES EXIST
-- ============================================================================

\echo '📋 Test 3: New RLS Policies Created'
\echo '---'

WITH expected_policies AS (
  SELECT unnest(ARRAY[
    'bowel_records::bowel_records_tenant_insert',
    'patient_admission_records::patient_admission_tenant_insert',
    'patient_advanced_directives::patient_advanced_directives_tenant_insert',
    'patient_wounds::patient_wounds_tenant_insert',
    'user_profiles::user_profiles_delete',
    'patient_alerts::patient_alerts_access'
  ]) as policy_key
),
actual_policies AS (
  SELECT tablename || '::' || policyname as policy_key
  FROM pg_policies
  WHERE schemaname = 'public'
)
SELECT 
  ep.policy_key,
  CASE 
    WHEN ap.policy_key IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM expected_policies ep
LEFT JOIN actual_policies ap ON ep.policy_key = ap.policy_key
ORDER BY ep.policy_key;

\echo ''

-- ============================================================================
-- TEST 4: VERIFY OLD POLICIES REMOVED
-- ============================================================================

\echo '📋 Test 4: Old Policies Removed'
\echo '---'

WITH removed_policies AS (
  SELECT unnest(ARRAY[
    'bowel_records::Users can insert bowel records',
    'patient_admission_records::Authenticated users can insert patient admission records',
    'patient_advanced_directives::Authenticated users can insert patient advanced directives',
    'patient_wounds::Authenticated users can insert patient wounds',
    'user_profiles::user_profiles_bulletproof_delete',
    'patient_alerts::super_admin_alert_access'
  ]) as policy_key
),
actual_policies AS (
  SELECT tablename || '::' || policyname as policy_key
  FROM pg_policies
  WHERE schemaname = 'public'
)
SELECT 
  rp.policy_key,
  CASE 
    WHEN ap.policy_key IS NULL THEN '✅ REMOVED'
    ELSE '❌ STILL EXISTS'
  END as status
FROM removed_policies rp
LEFT JOIN actual_policies ap ON rp.policy_key = ap.policy_key
ORDER BY rp.policy_key;

\echo ''

-- ============================================================================
-- TEST 5: SIMULATION POLICIES INTACT
-- ============================================================================

\echo '📋 Test 5: Simulation System Policies Intact'
\echo '---'

WITH simulation_policies AS (
  SELECT unnest(ARRAY[
    'simulation_templates',
    'simulation_active',
    'simulation_participants',
    'simulation_history',
    'simulation_activity_log'
  ]) as table_name
)
SELECT 
  sp.table_name,
  COUNT(p.policyname) as policy_count,
  CASE 
    WHEN COUNT(p.policyname) > 0 THEN '✅ PROTECTED'
    ELSE '❌ NO POLICIES'
  END as status
FROM simulation_policies sp
LEFT JOIN pg_policies p ON p.tablename = sp.table_name AND p.schemaname = 'public'
GROUP BY sp.table_name
ORDER BY sp.table_name;

\echo ''

-- ============================================================================
-- TEST 6: CRITICAL FUNCTIONS EXIST
-- ============================================================================

\echo '📋 Test 6: Critical Security Functions Exist'
\echo '---'

WITH required_functions AS (
  SELECT unnest(ARRAY[
    'has_simulation_tenant_access',
    'user_has_patient_access',
    'current_user_is_super_admin'
  ]) as function_name
)
SELECT 
  rf.function_name,
  CASE 
    WHEN p.proname IS NOT NULL THEN '✅ EXISTS (' || 
      CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END || ')'
    ELSE '❌ MISSING'
  END as status
FROM required_functions rf
LEFT JOIN pg_proc p ON p.proname = rf.function_name
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid AND n.nspname = 'public'
ORDER BY rf.function_name;

\echo ''

-- ============================================================================
-- TEST 7: MULTI-TENANT ISOLATION
-- ============================================================================

\echo '📋 Test 7: Multi-Tenant Tables Have Proper Policies'
\echo '---'

WITH tenant_tables AS (
  SELECT unnest(ARRAY[
    'patients',
    'patient_vitals',
    'patient_medications',
    'patient_notes',
    'patient_alerts',
    'bowel_records',
    'diabetic_records'
  ]) as table_name
)
SELECT 
  tt.table_name,
  COUNT(p.policyname) as policy_count,
  CASE 
    WHEN COUNT(p.policyname) >= 4 THEN '✅ WELL PROTECTED (' || COUNT(p.policyname) || ' policies)'
    WHEN COUNT(p.policyname) > 0 THEN '⚠️  LIMITED (' || COUNT(p.policyname) || ' policies)'
    ELSE '❌ NO POLICIES'
  END as status
FROM tenant_tables tt
LEFT JOIN pg_policies p ON p.tablename = tt.table_name AND p.schemaname = 'public'
GROUP BY tt.table_name
ORDER BY tt.table_name;

\echo ''

-- ============================================================================
-- TEST 8: RLS ENABLED ON ALL TABLES
-- ============================================================================

\echo '📋 Test 8: RLS Enabled on All Public Tables'
\echo '---'

SELECT 
  COUNT(*) as total_tables,
  SUM(CASE WHEN c.relrowsecurity THEN 1 ELSE 0 END) as rls_enabled,
  SUM(CASE WHEN c.relrowsecurity THEN 0 ELSE 1 END) as rls_disabled,
  CASE 
    WHEN SUM(CASE WHEN c.relrowsecurity THEN 0 ELSE 1 END) = 0 
    THEN '✅ ALL TABLES PROTECTED'
    ELSE '⚠️  ' || SUM(CASE WHEN c.relrowsecurity THEN 0 ELSE 1 END) || ' TABLES WITHOUT RLS'
  END as status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE 'sql_%';

-- Show tables without RLS (if any)
SELECT 
  tablename,
  '❌ RLS NOT ENABLED' as status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE 'sql_%'
  AND c.relrowsecurity = false
ORDER BY tablename;

\echo ''

-- ============================================================================
-- TEST 9: SECURITY DEFINER FUNCTIONS AUDIT
-- ============================================================================

\echo '📋 Test 9: Security Definer Functions (Audit)'
\echo '---'
\echo 'These functions bypass RLS - verify each is necessary:'
\echo ''

SELECT 
  n.nspname as schema,
  p.proname as function_name,
  r.rolname as owner,
  CASE 
    WHEN p.proname LIKE '%simulation%' THEN '🎮 Simulation'
    WHEN p.proname LIKE '%backup%' THEN '💾 Backup'
    WHEN p.proname LIKE '%admin%' THEN '👑 Admin'
    ELSE '⚠️  Review Required'
  END as purpose
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
LEFT JOIN pg_roles r ON p.proowner = r.oid
WHERE p.prosecdef = true
  AND n.nspname = 'public'
ORDER BY p.proname;

\echo ''

-- ============================================================================
-- TEST 10: POLICY COUNT SUMMARY
-- ============================================================================

\echo '📋 Test 10: RLS Policy Count Summary'
\echo '---'

SELECT 
  COUNT(DISTINCT tablename) as tables_with_policies,
  COUNT(*) as total_policies,
  ROUND(AVG(policy_count), 2) as avg_policies_per_table
FROM (
  SELECT tablename, COUNT(*) as policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
  GROUP BY tablename
) subquery;

\echo ''

-- ============================================================================
-- FINAL SUMMARY
-- ============================================================================

\echo '============================================================================'
\echo 'TEST SUITE COMPLETE'
\echo '============================================================================'
\echo ''
\echo 'Review the results above. All tests should show ✅ PASS or ✅ status.'
\echo ''
\echo 'If any tests show ❌ FAIL or ⚠️  WARNING:'
\echo '  1. Review the specific failure'
\echo '  2. Check the migration logs'
\echo '  3. Consider rolling back if critical'
\echo ''
\echo 'Next Steps:'
\echo '  1. Run integration tests (simulation, alerts, multi-tenant)'
\echo '  2. Test in staging environment'
\echo '  3. Monitor production logs for 24 hours'
\echo '  4. Document any issues found'
\echo ''
\echo '============================================================================'
