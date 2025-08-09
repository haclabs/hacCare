-- =============================================================================
-- COMPLETE FIX FOR SPECIFIC DATABASE LINTER WARNINGS
-- =============================================================================
-- This addresses the exact issues from your linter report:
-- 1. auth_rls_initplan: medication_administrations_tenant_access policy
-- 2. multiple_permissive_policies: user_profiles DELETE policies
-- =============================================================================

BEGIN;

-- =============================================================================
-- DIAGNOSTIC: Check current state before fixes
-- =============================================================================

-- Check current medication_administrations policy
SELECT 
    'CURRENT MEDICATION_ADMINISTRATIONS POLICY' as diagnostic,
    policyname,
    qual
FROM pg_policies 
WHERE tablename = 'medication_administrations' 
AND policyname = 'medication_administrations_tenant_access';

-- Check current user_profiles DELETE policies
SELECT 
    'CURRENT USER_PROFILES DELETE POLICIES' as diagnostic,
    policyname,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'user_profiles' 
AND cmd = 'DELETE'
ORDER BY policyname;

-- Check medication_administrations table structure
SELECT 
    'MEDICATION_ADMINISTRATIONS STRUCTURE' as diagnostic,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'medication_administrations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- =============================================================================
-- FIX 1: auth_rls_initplan for medication_administrations_tenant_access
-- =============================================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "medication_administrations_tenant_access" ON public.medication_administrations;

-- Create optimized policy with (SELECT auth.uid()) to prevent re-evaluation
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medication_administrations' AND table_schema = 'public') THEN
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medication_administrations' AND column_name = 'tenant_id') THEN
            -- Policy with tenant_id relationship (with proper UUID type casting)
            EXECUTE 'CREATE POLICY "medication_administrations_tenant_access" ON public.medication_administrations
                FOR ALL
                USING (
                    tenant_id::text IN (
                        SELECT tenant_id::text 
                        FROM tenant_users 
                        WHERE user_id::text = (SELECT auth.uid())::text
                        AND is_active = true
                    )
                    OR
                    (SELECT auth.uid())::text IN (
                        SELECT id::text FROM user_profiles WHERE role = ''super_admin'' AND is_active = true
                    )
                )';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medication_administrations' AND column_name = 'patient_id') THEN
            -- Policy with patient_id relationship (with proper UUID type casting)
            EXECUTE 'CREATE POLICY "medication_administrations_tenant_access" ON public.medication_administrations
                FOR ALL
                USING (
                    patient_id::text IN (
                        SELECT p.id::text 
                        FROM patients p
                        JOIN tenant_users tu ON p.tenant_id = tu.tenant_id
                        WHERE tu.user_id::text = (SELECT auth.uid())::text
                        AND tu.is_active = true
                    )
                    OR
                    (SELECT auth.uid())::text IN (
                        SELECT id::text FROM user_profiles WHERE role = ''super_admin'' AND is_active = true
                    )
                )';
        ELSE
            -- Fallback: basic authenticated access
            EXECUTE 'CREATE POLICY "medication_administrations_tenant_access" ON public.medication_administrations
                FOR ALL
                USING ((SELECT auth.uid()) IS NOT NULL)';
        END IF;
        
        RAISE NOTICE 'Fixed auth_rls_initplan: Created optimized medication_administrations_tenant_access policy';
    ELSE
        RAISE NOTICE 'medication_administrations table does not exist - skipping policy creation';
    END IF;
END $$;

-- =============================================================================
-- FIX 2: multiple_permissive_policies for user_profiles DELETE
-- =============================================================================

-- Remove all existing DELETE policies that are causing the multiple policies warning
DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_auth_delete" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_simple_delete" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_consolidated_delete" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_protection" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_single_delete" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_single_delete_typed" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_safe_delete" ON public.user_profiles;

-- Create single consolidated DELETE policy
CREATE POLICY "user_profiles_consolidated_delete_final" ON public.user_profiles
    FOR DELETE
    USING (
        -- Users can delete their own profile
        id::text = (SELECT auth.uid())::text
        OR
        -- Super admins can delete any profile (optimized with SELECT auth.uid())
        (SELECT auth.uid())::text IN (
            SELECT id::text
            FROM user_profiles up2
            WHERE up2.role = 'super_admin' 
            AND up2.is_active = true
            AND up2.id::text = (SELECT auth.uid())::text
        )
    );

-- =============================================================================
-- VERIFICATION: Confirm fixes resolved the linter warnings
-- =============================================================================

-- Verify medication_administrations policy uses optimized auth calls
SELECT 
    'MEDICATION_ADMINISTRATIONS FIX VERIFICATION' as verification,
    policyname,
    CASE 
        WHEN qual LIKE '%(SELECT auth.uid())%' THEN '✓ FIXED: Uses (SELECT auth.uid())'
        WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%' THEN '⚠️ STILL NEEDS FIX: Uses direct auth.uid()'
        ELSE 'No auth calls found'
    END as optimization_status
FROM pg_policies 
WHERE tablename = 'medication_administrations' 
AND policyname = 'medication_administrations_tenant_access';

-- Verify only one DELETE policy exists for user_profiles
SELECT 
    'USER_PROFILES DELETE POLICY VERIFICATION' as verification,
    COUNT(*) as delete_policy_count,
    string_agg(policyname, ', ') as policy_names,
    CASE 
        WHEN COUNT(*) = 1 THEN '✓ FIXED: Single DELETE policy'
        WHEN COUNT(*) > 1 THEN '⚠️ STILL MULTIPLE: ' || COUNT(*) || ' policies'
        ELSE '⚠️ NO DELETE POLICIES'
    END as status
FROM pg_policies 
WHERE tablename = 'user_profiles' 
AND cmd = 'DELETE';

-- Show all remaining policies for verification
SELECT 
    'ALL USER_PROFILES POLICIES' as verification,
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY cmd, policyname;

COMMIT;

-- =============================================================================
-- SUMMARY: Linter Warning Fixes Applied
-- =============================================================================

SELECT 
    'LINTER WARNING FIXES SUMMARY' as summary,
    'auth_rls_initplan: Replaced auth.uid() with (SELECT auth.uid())' as fix_1,
    'multiple_permissive_policies: Consolidated DELETE policies into one' as fix_2,
    'Both performance warnings should now be resolved' as result;

-- Performance impact explanation
SELECT 
    'PERFORMANCE IMPROVEMENTS' as impact,
    'medication_administrations: No more per-row auth.uid() evaluation' as improvement_1,
    'user_profiles: Single DELETE policy instead of multiple evaluations' as improvement_2,
    'Queries should be significantly faster on large datasets' as benefit;
