-- =============================================================================
-- DIAGNOSTIC: Database Linter Issues Check
-- =============================================================================
-- This script checks the current state of the specific linter warnings
-- =============================================================================

-- =============================================================================
-- CHECK 1: Auth RLS InitPlan Issues
-- =============================================================================

SELECT 
    'AUTH RLS INITPLAN CHECK' as check_type,
    tablename,
    policyname,
    CASE 
        WHEN qual ~ 'auth\.uid\(\)' AND qual !~ '\(SELECT auth\.uid\(\)\)' THEN 'UNOPTIMIZED: Direct auth.uid() call'
        WHEN qual ~ '\(SELECT auth\.uid\(\)\)' THEN 'OPTIMIZED: Uses (SELECT auth.uid())'
        WHEN qual ~ 'current_setting' THEN 'UNOPTIMIZED: Uses current_setting()'
        ELSE 'NO AUTH FUNCTIONS'
    END as optimization_status,
    LEFT(qual, 200) as policy_excerpt
FROM pg_policies 
WHERE schemaname = 'public'
AND (
    qual LIKE '%auth.uid()%' 
    OR qual LIKE '%current_setting%'
    OR with_check LIKE '%auth.uid()%'
    OR with_check LIKE '%current_setting%'
)
ORDER BY tablename, policyname;

-- =============================================================================
-- CHECK 2: Multiple Permissive Policies
-- =============================================================================

-- Find tables with multiple permissive policies for the same action
SELECT 
    'MULTIPLE PERMISSIVE POLICIES CHECK' as check_type,
    tablename,
    cmd as action,
    COUNT(*) as policy_count,
    string_agg(policyname, ', ') as policy_names
FROM pg_policies 
WHERE schemaname = 'public'
AND permissive = 'PERMISSIVE'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1
ORDER BY policy_count DESC, tablename, cmd;

-- =============================================================================
-- CHECK 3: Specific Issues from Linter Report
-- =============================================================================

-- Check medication_administrations table specifically
SELECT 
    'MEDICATION_ADMINISTRATIONS SPECIFIC CHECK' as check_type,
    policyname,
    cmd,
    permissive,
    CASE 
        WHEN policyname = 'medication_administrations_tenant_access' THEN 'TARGET POLICY FOUND'
        ELSE 'OTHER POLICY'
    END as relevance,
    CASE 
        WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%' THEN 'NEEDS OPTIMIZATION'
        WHEN qual LIKE '%(SELECT auth.uid())%' THEN 'ALREADY OPTIMIZED'
        ELSE 'NO AUTH CALLS'
    END as auth_optimization_status
FROM pg_policies 
WHERE tablename = 'medication_administrations'
ORDER BY policyname;

-- Check user_profiles DELETE policies specifically
SELECT 
    'USER_PROFILES DELETE POLICIES CHECK' as check_type,
    policyname,
    permissive,
    roles,
    CASE 
        WHEN policyname IN ('Super admins can delete profiles', 'user_profiles_auth_delete') THEN 'MENTIONED IN LINTER'
        ELSE 'OTHER POLICY'
    END as linter_relevance
FROM pg_policies 
WHERE tablename = 'user_profiles' 
AND cmd = 'DELETE'
ORDER BY policyname;

-- =============================================================================
-- CHECK 4: Overall Policy Health
-- =============================================================================

-- Summary of all policies by table
SELECT 
    'POLICY SUMMARY BY TABLE' as summary,
    tablename,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
    COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies,
    COUNT(CASE WHEN cmd = 'ALL' THEN 1 END) as all_policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY total_policies DESC, tablename;

-- =============================================================================
-- CHECK 5: Auth.uid() Optimization Status
-- =============================================================================

-- Count optimized vs unoptimized auth.uid() calls
SELECT 
    'AUTH UID OPTIMIZATION SUMMARY' as summary,
    COUNT(*) as total_policies_with_auth,
    COUNT(CASE WHEN 
        (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%') 
        OR 
        (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
        THEN 1 END) as unoptimized_count,
    COUNT(CASE WHEN 
        qual LIKE '%(SELECT auth.uid())%' OR with_check LIKE '%(SELECT auth.uid())%' 
        THEN 1 END) as optimized_count
FROM pg_policies 
WHERE schemaname = 'public'
AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%');

-- =============================================================================
-- RECOMMENDATIONS
-- =============================================================================

SELECT 
    'RECOMMENDATIONS' as recommendations,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'medication_administrations' 
            AND policyname = 'medication_administrations_tenant_access'
            AND (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%')
        ) THEN 'RUN: fix-specific-linter-warnings.sql to optimize medication_administrations'
        ELSE 'medication_administrations optimization: COMPLETE'
    END as medication_admin_fix,
    CASE 
        WHEN (
            SELECT COUNT(*) FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'user_profiles' 
            AND cmd = 'DELETE'
        ) > 1 THEN 'RUN: fix-specific-linter-warnings.sql to consolidate user_profiles DELETE policies'
        ELSE 'user_profiles DELETE policies: CONSOLIDATED'
    END as user_profiles_fix;
