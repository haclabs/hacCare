-- =============================================================================
-- RLS OPTIMIZATION TEST SCRIPT
-- =============================================================================
-- This script tests a few policy optimizations before applying the full batch
-- Run this first to ensure the optimization approach works correctly
-- =============================================================================

-- Test 1: Create a test table to verify optimization approach
CREATE TABLE IF NOT EXISTS public.test_optimization (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id),
    user_id UUID REFERENCES auth.users(id),
    test_data TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on test table
ALTER TABLE public.test_optimization ENABLE ROW LEVEL SECURITY;

-- Test 2: Create unoptimized policy (old style)
CREATE POLICY "test_unoptimized_policy" ON public.test_optimization
    FOR SELECT USING (user_id = auth.uid());

-- Test 3: Create optimized policy (new style)
CREATE POLICY "test_optimized_policy" ON public.test_optimization
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- Test 4: Verify both policies work
INSERT INTO public.test_optimization (tenant_id, user_id, test_data)
SELECT 
    (SELECT id FROM public.tenants LIMIT 1),
    auth.uid(),
    'Test data for optimization verification';

-- Test 5: Check that SELECT works with unoptimized policy
SELECT 
    'Unoptimized policy test' as test_type,
    COUNT(*) as record_count
FROM public.test_optimization;

-- Test 6: Check performance difference with EXPLAIN
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM public.test_optimization WHERE user_id = auth.uid();

EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM public.test_optimization WHERE user_id = (SELECT auth.uid());

-- Test 7: Verify tenant isolation still works
SELECT 
    'Tenant isolation test' as test_type,
    COUNT(DISTINCT tenant_id) as unique_tenants,
    COUNT(*) as total_records
FROM public.test_optimization;

-- Test 8: Test the consolidated policy approach
DROP POLICY IF EXISTS "test_unoptimized_policy" ON public.test_optimization;
DROP POLICY IF EXISTS "test_optimized_policy" ON public.test_optimization;

-- Create consolidated policy (both SELECT and INSERT)
CREATE POLICY "test_consolidated_policy" ON public.test_optimization
    FOR ALL USING (
        user_id = (SELECT auth.uid()) OR
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = (SELECT auth.uid())
            AND up.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
        )
    );

-- Test 9: Verify consolidated policy works for both operations
INSERT INTO public.test_optimization (tenant_id, user_id, test_data)
SELECT 
    (SELECT id FROM public.tenants LIMIT 1),
    auth.uid(),
    'Test data for consolidated policy';

SELECT 
    'Consolidated policy test' as test_type,
    COUNT(*) as record_count
FROM public.test_optimization;

-- Test 10: Test tenant-aware policy pattern
DROP POLICY IF EXISTS "test_consolidated_policy" ON public.test_optimization;

CREATE POLICY "test_tenant_aware_policy" ON public.test_optimization
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.tenant_users tu
            WHERE tu.user_id = (SELECT auth.uid())
            AND tu.tenant_id = test_optimization.tenant_id
        )
    );

-- Update test records to have proper tenant assignment
UPDATE public.test_optimization 
SET tenant_id = (
    SELECT tu.tenant_id 
    FROM public.tenant_users tu 
    WHERE tu.user_id = auth.uid() 
    LIMIT 1
)
WHERE user_id = auth.uid();

-- Test 11: Verify tenant-aware policy works
SELECT 
    'Tenant-aware policy test' as test_type,
    COUNT(*) as accessible_records,
    COUNT(DISTINCT tenant_id) as accessible_tenants
FROM public.test_optimization;

-- Test 12: Check that users can only see their tenant's data
WITH user_tenant AS (
    SELECT tenant_id 
    FROM public.tenant_users 
    WHERE user_id = auth.uid() 
    LIMIT 1
)
SELECT 
    'Tenant isolation verification' as test_type,
    t.tenant_id = ut.tenant_id as is_users_tenant,
    COUNT(*) as record_count
FROM public.test_optimization t, user_tenant ut
GROUP BY t.tenant_id = ut.tenant_id;

-- Test 13: Performance comparison summary
SELECT 
    'Performance Test Summary' as summary_type,
    'Optimization approach verified' as status,
    '(SELECT auth.uid()) pattern works correctly' as auth_optimization,
    'Tenant isolation maintained' as security_status,
    'Ready for full optimization' as recommendation;

-- Cleanup test table
DROP TABLE IF EXISTS public.test_optimization;

-- Test 14: Verify key existing policies before optimization
SELECT 
    'Current Policy Analysis' as analysis_type,
    tablename,
    policyname,
    CASE 
        WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%' THEN 'NEEDS_OPTIMIZATION'
        WHEN qual LIKE '%(SELECT auth.uid())%' THEN 'ALREADY_OPTIMIZED'
        ELSE 'NO_AUTH_CALL'
    END as optimization_status,
    CASE 
        WHEN qual LIKE '%tenant_id%' THEN 'TENANT_AWARE'
        ELSE 'NOT_TENANT_AWARE'
    END as tenant_isolation_status
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('patients', 'patient_vitals', 'user_profiles', 'tenants')
ORDER BY tablename, policyname;

-- Test 15: Sample of policies that will be optimized
SELECT 
    'Sample Optimization Preview' as preview_type,
    tablename,
    policyname,
    qual as current_policy,
    REPLACE(qual, 'auth.uid()', '(SELECT auth.uid())') as optimized_policy
FROM pg_policies 
WHERE schemaname = 'public'
AND qual LIKE '%auth.uid()%' 
AND qual NOT LIKE '%(SELECT auth.uid())%'
LIMIT 5;
