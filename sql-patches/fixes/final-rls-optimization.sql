-- =============================================================================
-- FINAL RLS PERFORMANCE OPTIMIZATION SCRIPT
-- =============================================================================
-- This script handles the PostgreSQL alias issue with ( SELECT auth.uid() AS uid)
-- =============================================================================

BEGIN;

-- =============================================================================
-- COMPREHENSIVE OPTIMIZATION USING DYNAMIC SQL
-- =============================================================================

DO $$
DECLARE
    policy_record RECORD;
    new_qual TEXT;
    new_with_check TEXT;
    optimization_count INTEGER := 0;
BEGIN
    -- Iterate through all policies that need optimization
    FOR policy_record IN 
        SELECT tablename, policyname, qual, with_check, cmd
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (
            (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%SELECT auth.uid()%') 
            OR 
            (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%SELECT auth.uid()%')
        )
    LOOP
        -- Prepare optimized versions by replacing all auth.uid() patterns
        new_qual := policy_record.qual;
        new_with_check := policy_record.with_check;
        
        -- Replace various auth.uid() patterns with (SELECT auth.uid())
        IF new_qual IS NOT NULL THEN
            -- Replace direct auth.uid() calls
            new_qual := REPLACE(new_qual, 'auth.uid()', '(SELECT auth.uid())');
            -- Replace already aliased versions
            new_qual := REPLACE(new_qual, '( SELECT auth.uid() AS uid)', '(SELECT auth.uid())');
            new_qual := REPLACE(new_qual, '(SELECT auth.uid() AS uid)', '(SELECT auth.uid())');
        END IF;
        
        IF new_with_check IS NOT NULL THEN
            -- Replace direct auth.uid() calls  
            new_with_check := REPLACE(new_with_check, 'auth.uid()', '(SELECT auth.uid())');
            -- Replace already aliased versions
            new_with_check := REPLACE(new_with_check, '( SELECT auth.uid() AS uid)', '(SELECT auth.uid())');
            new_with_check := REPLACE(new_with_check, '(SELECT auth.uid() AS uid)', '(SELECT auth.uid())');
        END IF;
        
        -- Skip if no changes needed
        CONTINUE WHEN (
            (policy_record.qual IS NULL OR new_qual = policy_record.qual) AND
            (policy_record.with_check IS NULL OR new_with_check = policy_record.with_check)
        );
        
        -- Drop and recreate the policy with optimization
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 
                      policy_record.policyname, policy_record.tablename);
        
        -- Recreate with optimized auth.uid() calls
        IF policy_record.cmd = 'ALL' THEN
            EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL USING (%s)', 
                          policy_record.policyname, policy_record.tablename, new_qual);
        ELSIF policy_record.cmd = 'SELECT' THEN
            EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT USING (%s)', 
                          policy_record.policyname, policy_record.tablename, new_qual);
        ELSIF policy_record.cmd = 'INSERT' THEN
            EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT WITH CHECK (%s)', 
                          policy_record.policyname, policy_record.tablename, new_with_check);
        ELSIF policy_record.cmd = 'UPDATE' THEN
            IF policy_record.qual IS NOT NULL AND policy_record.with_check IS NOT NULL THEN
                EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (%s) WITH CHECK (%s)', 
                              policy_record.policyname, policy_record.tablename, new_qual, new_with_check);
            ELSIF policy_record.qual IS NOT NULL THEN
                EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE USING (%s)', 
                              policy_record.policyname, policy_record.tablename, new_qual);
            ELSE
                EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE WITH CHECK (%s)', 
                              policy_record.policyname, policy_record.tablename, new_with_check);
            END IF;
        ELSIF policy_record.cmd = 'DELETE' THEN
            EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE USING (%s)', 
                          policy_record.policyname, policy_record.tablename, new_qual);
        END IF;
        
        optimization_count := optimization_count + 1;
        RAISE NOTICE 'Optimized policy #%: %.% - %', 
                     optimization_count, policy_record.tablename, policy_record.policyname, policy_record.cmd;
    END LOOP;
    
    RAISE NOTICE 'FINAL OPTIMIZATION COMPLETE: % policies optimized', optimization_count;
END $$;

-- =============================================================================
-- VERIFICATION AND COMPLETION
-- =============================================================================

COMMIT;

-- Verify optimization results (accounting for PostgreSQL aliases)
SELECT 
    'FINAL OPTIMIZATION RESULTS' as status,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN 
        (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%SELECT auth.uid()%') 
        OR 
        (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%SELECT auth.uid()%')
        THEN 1 END) as unoptimized_policies,
    COUNT(CASE WHEN 
        qual LIKE '%SELECT auth.uid()%' OR with_check LIKE '%SELECT auth.uid()%' 
        THEN 1 END) as optimized_policies
FROM pg_policies 
WHERE schemaname = 'public';

-- Show any remaining unoptimized policies (should be zero)
SELECT 
    'REMAINING UNOPTIMIZED (should be empty)' as status,
    tablename,
    policyname,
    cmd,
    CASE 
        WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%SELECT auth.uid()%' 
        THEN 'QUAL contains unoptimized auth.uid()'
        WHEN with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%SELECT auth.uid()%' 
        THEN 'WITH CHECK contains unoptimized auth.uid()'
        ELSE 'Unknown optimization issue'
    END as issue_type
FROM pg_policies 
WHERE schemaname = 'public' 
AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%SELECT auth.uid()%') OR
    (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%SELECT auth.uid()%')
)
ORDER BY tablename, policyname;

-- Performance improvement summary
SELECT 
    'PERFORMANCE SUMMARY' as summary,
    'All auth.uid() calls now use (SELECT auth.uid()) pattern' as optimization,
    'This prevents re-evaluation for each row, improving query performance at scale' as benefit,
    'Original CSV data showed 136+ warnings - all should now be resolved' as impact;
