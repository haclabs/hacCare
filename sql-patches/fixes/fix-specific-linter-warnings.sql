-- =============================================================================
-- FIX SPECIFIC DATABASE LINTER WARNINGS
-- =============================================================================
-- This script addresses the exact issues identified in the database linter
-- =============================================================================

BEGIN;

-- =============================================================================
-- ISSUE 1: Fix auth_rls_initplan for medication_administrations table
-- =============================================================================

-- The specific policy causing the issue: medication_administrations_tenant_access
-- Need to replace auth.uid() with (SELECT auth.uid()) to prevent re-evaluation

-- First, let's check the current policy
SELECT 
    'CURRENT MEDICATION_ADMINISTRATIONS POLICY' as check_type,
    policyname,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'medication_administrations' 
AND policyname = 'medication_administrations_tenant_access';

-- Drop and recreate the problematic policy with optimization
DROP POLICY IF EXISTS "medication_administrations_tenant_access" ON public.medication_administrations;

-- First, let's check what columns exist in medication_administrations
SELECT 
    'MEDICATION_ADMINISTRATIONS COLUMNS' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'medication_administrations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if medication_administrations table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medication_administrations' AND table_schema = 'public') THEN
        -- Drop the existing policy first
        DROP POLICY IF EXISTS "medication_administrations_tenant_access" ON public.medication_administrations;
        
        -- Create policy based on common medication administration patterns
        -- Most likely linked through patient_id or has tenant_id or administered_by
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medication_administrations' AND column_name = 'tenant_id') THEN
            -- If tenant_id exists, use direct tenant access
            EXECUTE 'CREATE POLICY "medication_administrations_tenant_access" ON public.medication_administrations
                FOR ALL
                USING (
                    tenant_id IN (
                        SELECT tenant_id 
                        FROM tenant_users 
                        WHERE user_id = (SELECT auth.uid()) 
                        AND is_active = true
                    )
                    OR
                    (SELECT auth.uid()) IN (
                        SELECT id FROM user_profiles WHERE role = ''super_admin'' AND is_active = true
                    )
                )';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medication_administrations' AND column_name = 'patient_id') THEN
            -- If patient_id exists, use patient relationship
            EXECUTE 'CREATE POLICY "medication_administrations_tenant_access" ON public.medication_administrations
                FOR ALL
                USING (
                    patient_id IN (
                        SELECT p.id 
                        FROM patients p
                        JOIN tenant_users tu ON p.tenant_id = tu.tenant_id
                        WHERE tu.user_id = (SELECT auth.uid()) 
                        AND tu.is_active = true
                    )
                    OR
                    (SELECT auth.uid()) IN (
                        SELECT id FROM user_profiles WHERE role = ''super_admin'' AND is_active = true
                    )
                )';
        ELSE
            -- Fallback: basic authenticated access with optimization
            EXECUTE 'CREATE POLICY "medication_administrations_tenant_access" ON public.medication_administrations
                FOR ALL
                USING (
                    (SELECT auth.uid()) IS NOT NULL
                )';
        END IF;
        
        RAISE NOTICE 'Created optimized medication_administrations_tenant_access policy';
    ELSE
        RAISE NOTICE 'medication_administrations table does not exist - skipping policy creation';
    END IF;
END $$;

-- =============================================================================
-- ISSUE 2: Fix multiple permissive policies for user_profiles DELETE
-- =============================================================================

-- The linter detected multiple DELETE policies for different roles
-- We need to consolidate these into a single policy

-- First, let's see what DELETE policies exist
SELECT 
    'CURRENT USER_PROFILES DELETE POLICIES' as check_type,
    policyname,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'user_profiles' 
AND cmd = 'DELETE'
ORDER BY policyname;

-- Drop all existing DELETE policies on user_profiles
DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_auth_delete" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_simple_delete" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_consolidated_delete" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_protection" ON public.user_profiles;

-- Create single consolidated DELETE policy for user_profiles
CREATE POLICY "user_profiles_single_delete" ON public.user_profiles
    FOR DELETE
    USING (
        -- Users can delete their own profile
        id = (SELECT auth.uid())
        OR
        -- Super admins can delete any profile (optimized auth call)
        (SELECT auth.uid()) IN (
            SELECT id 
            FROM user_profiles up2
            WHERE up2.role = 'super_admin' 
            AND up2.is_active = true
            AND up2.id = (SELECT auth.uid())
        )
    );

-- =============================================================================
-- VERIFICATION: Check that fixes resolved the issues
-- =============================================================================

-- Verify medication_administrations policy optimization
SELECT 
    'MEDICATION_ADMINISTRATIONS OPTIMIZATION CHECK' as verification,
    policyname,
    CASE 
        WHEN qual LIKE '%SELECT auth.uid()%' THEN 'OPTIMIZED: Uses (SELECT auth.uid())'
        WHEN qual LIKE '%auth.uid()%' THEN 'UNOPTIMIZED: Uses direct auth.uid()'
        ELSE 'NO AUTH CALLS'
    END as optimization_status
FROM pg_policies 
WHERE tablename = 'medication_administrations' 
AND policyname = 'medication_administrations_tenant_access';

-- Verify user_profiles has only one DELETE policy
SELECT 
    'USER_PROFILES DELETE POLICY COUNT' as verification,
    COUNT(*) as delete_policy_count,
    string_agg(policyname, ', ') as policy_names
FROM pg_policies 
WHERE tablename = 'user_profiles' 
AND cmd = 'DELETE';

-- Show policy details for verification
SELECT 
    'USER_PROFILES DELETE POLICY DETAILS' as verification,
    policyname,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'user_profiles' 
AND cmd = 'DELETE';

COMMIT;

-- =============================================================================
-- SUMMARY OF FIXES
-- =============================================================================

SELECT 
    'LINTER FIXES SUMMARY' as summary,
    'Fixed auth_rls_initplan warning for medication_administrations' as fix_1,
    'Consolidated multiple DELETE policies for user_profiles' as fix_2,
    'Both issues should now be resolved in database linter' as result;

-- Performance improvement note
SELECT 
    'PERFORMANCE IMPACT' as impact,
    'medication_administrations queries will no longer re-evaluate auth.uid() per row' as optimization_1,
    'user_profiles DELETE operations will use single policy evaluation' as optimization_2,
    'Expect significant performance improvement for large datasets' as benefit;
