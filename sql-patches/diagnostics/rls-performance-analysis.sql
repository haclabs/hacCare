-- =============================================================================
-- RLS PERFORMANCE OPTIMIZATION DIAGNOSTIC SCRIPT
-- =============================================================================
-- This script analyzes the performance impact of RLS optimizations
-- and provides before/after metrics for the optimization work
-- =============================================================================

-- Check current policy count and structure
SELECT 
    'POLICY ANALYSIS' as analysis_type,
    COUNT(*) as total_policies,
    COUNT(DISTINCT tablename) as tables_with_policies
FROM pg_policies 
WHERE schemaname = 'public';

-- Identify policies still using direct auth.uid() calls (need optimization)
SELECT 
    'REMAINING AUTH.UID() CALLS' as analysis_type,
    tablename,
    policyname,
    CASE 
        WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%' THEN 'QUAL needs optimization'
        WHEN with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%' THEN 'WITH_CHECK needs optimization'
        ELSE 'Already optimized'
    END as optimization_status,
    CASE 
        WHEN qual LIKE '%auth.uid()%' THEN qual
        ELSE with_check
    END as policy_expression
FROM pg_policies 
WHERE schemaname = 'public' 
AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%') OR
    (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
)
ORDER BY tablename, policyname;

-- Check for multiple permissive policies on same table/role/action
WITH policy_counts AS (
    SELECT 
        tablename,
        string_agg(DISTINCT roles::text, ',') as all_roles,
        cmd,
        COUNT(*) as policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND permissive = 'PERMISSIVE'
    GROUP BY tablename, cmd
    HAVING COUNT(*) > 1
)
SELECT 
    'MULTIPLE PERMISSIVE POLICIES' as analysis_type,
    tablename,
    cmd as operation,
    policy_count,
    all_roles
FROM policy_counts
ORDER BY policy_count DESC, tablename;

-- Check duplicate indexes
WITH index_info AS (
    SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
    FROM pg_indexes 
    WHERE schemaname = 'public'
),
duplicate_groups AS (
    SELECT 
        indexdef,
        COUNT(*) as duplicate_count,
        string_agg(indexname, ', ') as duplicate_indexes
    FROM index_info
    GROUP BY indexdef
    HAVING COUNT(*) > 1
)
SELECT 
    'DUPLICATE INDEXES' as analysis_type,
    duplicate_count,
    duplicate_indexes,
    indexdef
FROM duplicate_groups
ORDER BY duplicate_count DESC;

-- Performance impact analysis
SELECT 
    'PERFORMANCE IMPACT ANALYSIS' as analysis_type,
    tablename,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN qual LIKE '%(SELECT auth.uid())%' OR with_check LIKE '%(SELECT auth.uid())%' THEN 1 END) as optimized_policies,
    COUNT(CASE WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%' THEN 1 END) as unoptimized_qual,
    COUNT(CASE WHEN with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%' THEN 1 END) as unoptimized_check,
    ROUND(
        (COUNT(CASE WHEN qual LIKE '%(SELECT auth.uid())%' OR with_check LIKE '%(SELECT auth.uid())%' THEN 1 END)::numeric / 
         COUNT(*)::numeric) * 100, 2
    ) as optimization_percentage
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY optimization_percentage ASC;

-- Check tenant isolation effectiveness
SELECT 
    'TENANT ISOLATION ANALYSIS' as analysis_type,
    tablename,
    COUNT(*) as policies_with_tenant_check,
    string_agg(policyname, ', ') as tenant_policies
FROM pg_policies 
WHERE schemaname = 'public'
AND (qual LIKE '%tenant_id%' OR with_check LIKE '%tenant_id%')
GROUP BY tablename
ORDER BY tablename;

-- Index efficiency check
SELECT 
    'INDEX EFFICIENCY ANALYSIS' as analysis_type,
    schemaname,
    tablename,
    COUNT(*) as total_indexes,
    string_agg(indexname, ', ') as all_indexes
FROM pg_indexes 
WHERE schemaname = 'public'
AND tablename IN (
    'tenants', 'tenant_users', 'user_profiles', 'patients', 
    'patient_vitals', 'patient_medications', 'patient_alerts',
    'patient_images', 'patient_notes', 'profiles'
)
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Security policy coverage analysis
SELECT 
    'SECURITY COVERAGE ANALYSIS' as analysis_type,
    t.table_name,
    COALESCE(p.policy_count, 0) as rls_policies,
    CASE 
        WHEN COALESCE(p.policy_count, 0) = 0 THEN 'NO RLS PROTECTION'
        WHEN COALESCE(p.policy_count, 0) < 3 THEN 'MINIMAL PROTECTION'
        ELSE 'GOOD PROTECTION'
    END as security_level
FROM information_schema.tables t
LEFT JOIN (
    SELECT 
        tablename,
        COUNT(*) as policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    GROUP BY tablename
) p ON t.table_name = p.tablename
WHERE t.table_schema = 'public'
AND t.table_type = 'BASE TABLE'
AND t.table_name NOT LIKE 'pg_%'
AND t.table_name NOT LIKE 'sql_%'
ORDER BY COALESCE(p.policy_count, 0) ASC;

-- Query to check if RLS is enabled on all tables
SELECT 
    'RLS ENABLEMENT CHECK' as analysis_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED'
        ELSE 'RLS DISABLED - SECURITY RISK'
    END as security_status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename NOT LIKE 'pg_%'
ORDER BY rowsecurity ASC, tablename;

-- Summary optimization recommendations
WITH optimization_summary AS (
    SELECT 
        COUNT(*) as total_policies,
        COUNT(CASE WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%' THEN 1 END) as unoptimized_qual,
        COUNT(CASE WHEN with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%' THEN 1 END) as unoptimized_check
    FROM pg_policies 
    WHERE schemaname = 'public'
)
SELECT 
    'OPTIMIZATION SUMMARY' as analysis_type,
    total_policies,
    (unoptimized_qual + unoptimized_check) as remaining_optimizations_needed,
    ROUND(
        ((total_policies - (unoptimized_qual + unoptimized_check))::numeric / total_policies::numeric) * 100, 2
    ) as optimization_completion_percentage,
    CASE 
        WHEN (unoptimized_qual + unoptimized_check) = 0 THEN 'OPTIMIZATION COMPLETE'
        WHEN (unoptimized_qual + unoptimized_check) < 5 THEN 'NEARLY COMPLETE'
        ELSE 'MORE WORK NEEDED'
    END as optimization_status
FROM optimization_summary;
