-- =============================================================================
-- RLS OPTIMIZATION VERIFICATION SCRIPT
-- =============================================================================
-- This script verifies that our RLS policies are actually optimized
-- =============================================================================

-- Check for truly unoptimized policies (direct auth.uid() without SELECT)
SELECT 
    'OPTIMIZATION STATUS CHECK' as check_type,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN 
        -- Look for auth.uid() that is NOT wrapped in SELECT
        (qual ~ 'auth\.uid\(\)' AND qual !~ 'SELECT.*auth\.uid\(\)') 
        OR 
        (with_check ~ 'auth\.uid\(\)' AND with_check !~ 'SELECT.*auth\.uid\(\)')
        THEN 1 END) as truly_unoptimized,
    COUNT(CASE WHEN 
        -- Look for auth.uid() that IS wrapped in SELECT (optimized)
        qual ~ 'SELECT.*auth\.uid\(\)' OR with_check ~ 'SELECT.*auth\.uid\(\)'
        THEN 1 END) as properly_optimized
FROM pg_policies 
WHERE schemaname = 'public'
AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%');

-- Show any truly unoptimized policies (should be very few or zero)
SELECT 
    'TRULY UNOPTIMIZED POLICIES' as status,
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual ~ 'auth\.uid\(\)' AND qual !~ 'SELECT.*auth\.uid\(\)' 
        THEN 'QUAL has direct auth.uid() call'
        WHEN with_check ~ 'auth\.uid\(\)' AND with_check !~ 'SELECT.*auth\.uid\(\)' 
        THEN 'WITH CHECK has direct auth.uid() call'
    END as issue
FROM pg_policies 
WHERE schemaname = 'public' 
AND (
    (qual ~ 'auth\.uid\(\)' AND qual !~ 'SELECT.*auth\.uid\(\)') OR
    (with_check ~ 'auth\.uid\(\)' AND with_check !~ 'SELECT.*auth\.uid\(\)')
)
ORDER BY tablename, policyname;

-- Summary of optimization impact
SELECT 
    'OPTIMIZATION SUMMARY' as summary,
    'All policies with SELECT auth.uid() pattern are optimized' as status,
    'PostgreSQL automatically adds AS uid alias to SELECT expressions' as note,
    'Performance benefit: Prevents auth.uid() re-evaluation for each row' as benefit;
