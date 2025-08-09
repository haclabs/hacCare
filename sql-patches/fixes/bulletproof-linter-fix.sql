-- =============================================================================
-- BULLETPROOF FIX FOR DATABASE LINTER WARNINGS WITH PROPER TYPE CASTING
-- =============================================================================
-- This fixes the "text = uuid" errors by ensuring ALL comparisons use consistent types
-- =============================================================================

BEGIN;

-- =============================================================================
-- DIAGNOSTIC: Check current state and column types
-- =============================================================================

-- Check current policies
SELECT 
    'CURRENT POLICIES DIAGNOSTIC' as diagnostic,
    tablename,
    policyname,
    cmd,
    LEFT(qual, 100) as policy_excerpt
FROM pg_policies 
WHERE tablename IN ('medication_administrations', 'user_profiles')
ORDER BY tablename, policyname;

-- Check exact column types to avoid type mismatches
SELECT 
    'COLUMN TYPES DIAGNOSTIC' as diagnostic,
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name IN ('medication_administrations', 'patients', 'tenant_users', 'user_profiles')
AND column_name IN ('id', 'user_id', 'tenant_id', 'patient_id')
AND table_schema = 'public'
ORDER BY table_name, column_name;

-- =============================================================================
-- FIX 1: medication_administrations policy with bulletproof type casting
-- =============================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "medication_administrations_tenant_access" ON public.medication_administrations;

-- Create policy with universal text casting to avoid any type conflicts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medication_administrations' AND table_schema = 'public') THEN
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medication_administrations' AND column_name = 'tenant_id') THEN
            -- Policy using tenant_id with universal text casting
            CREATE POLICY "medication_administrations_tenant_access" ON public.medication_administrations
                FOR ALL
                USING (
                    COALESCE(tenant_id::text, '') IN (
                        SELECT COALESCE(tenant_id::text, '') 
                        FROM tenant_users 
                        WHERE COALESCE(user_id::text, '') = COALESCE((SELECT auth.uid())::text, '')
                        AND is_active = true
                    )
                    OR
                    COALESCE((SELECT auth.uid())::text, '') IN (
                        SELECT COALESCE(id::text, '') 
                        FROM user_profiles 
                        WHERE role = 'super_admin' 
                        AND is_active = true
                    )
                );
                
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medication_administrations' AND column_name = 'patient_id') THEN
            -- Policy using patient_id with universal text casting
            CREATE POLICY "medication_administrations_tenant_access" ON public.medication_administrations
                FOR ALL
                USING (
                    COALESCE(patient_id::text, '') IN (
                        SELECT COALESCE(p.id::text, '') 
                        FROM patients p
                        JOIN tenant_users tu ON COALESCE(p.tenant_id::text, '') = COALESCE(tu.tenant_id::text, '')
                        WHERE COALESCE(tu.user_id::text, '') = COALESCE((SELECT auth.uid())::text, '')
                        AND tu.is_active = true
                    )
                    OR
                    COALESCE((SELECT auth.uid())::text, '') IN (
                        SELECT COALESCE(id::text, '') 
                        FROM user_profiles 
                        WHERE role = 'super_admin' 
                        AND is_active = true
                    )
                );
                
        ELSE
            -- Fallback: basic authenticated access
            CREATE POLICY "medication_administrations_tenant_access" ON public.medication_administrations
                FOR ALL
                USING ((SELECT auth.uid()) IS NOT NULL);
        END IF;
        
        RAISE NOTICE 'Fixed auth_rls_initplan: Created type-safe medication_administrations_tenant_access policy';
    ELSE
        RAISE NOTICE 'medication_administrations table does not exist - skipping policy creation';
    END IF;
END $$;

-- =============================================================================
-- FIX 2: user_profiles DELETE policy with bulletproof type casting
-- =============================================================================

-- Remove all existing DELETE policies
DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_auth_delete" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_simple_delete" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_consolidated_delete" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_protection" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_single_delete" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_single_delete_typed" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_safe_delete" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_consolidated_delete_final" ON public.user_profiles;

-- Create single DELETE policy with bulletproof type casting
CREATE POLICY "user_profiles_bulletproof_delete" ON public.user_profiles
    FOR DELETE
    USING (
        -- Users can delete their own profile (with safe type casting)
        COALESCE(id::text, '') = COALESCE((SELECT auth.uid())::text, '')
        OR
        -- Super admins can delete any profile (optimized with SELECT auth.uid())
        COALESCE((SELECT auth.uid())::text, '') IN (
            SELECT COALESCE(id::text, '')
            FROM user_profiles up2
            WHERE up2.role = 'super_admin' 
            AND up2.is_active = true
            AND COALESCE(up2.id::text, '') = COALESCE((SELECT auth.uid())::text, '')
        )
    );

-- =============================================================================
-- VERIFICATION: Confirm all type issues are resolved
-- =============================================================================

-- Verify medication_administrations policy is optimized and type-safe
SELECT 
    'MEDICATION_ADMINISTRATIONS VERIFICATION' as check,
    policyname,
    CASE 
        WHEN qual LIKE '%(SELECT auth.uid())%' THEN '✓ OPTIMIZED: Uses (SELECT auth.uid())'
        WHEN qual LIKE '%auth.uid()%' THEN '⚠️ NOT OPTIMIZED: Uses direct auth.uid()'
        ELSE 'No auth calls'
    END as optimization_status,
    CASE 
        WHEN qual LIKE '%COALESCE%::text%' THEN '✓ TYPE-SAFE: Uses COALESCE and ::text'
        WHEN qual LIKE '%::text%' THEN '✓ TYPE-SAFE: Uses ::text casting'
        ELSE 'May have type issues'
    END as type_safety
FROM pg_policies 
WHERE tablename = 'medication_administrations' 
AND policyname = 'medication_administrations_tenant_access';

-- Verify single DELETE policy exists for user_profiles
SELECT 
    'USER_PROFILES DELETE VERIFICATION' as check,
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

-- Check for any remaining type issues in policies
SELECT 
    'REMAINING TYPE ISSUES CHECK' as check,
    tablename,
    policyname,
    CASE 
        WHEN qual ~ '(id|user_id|tenant_id|patient_id)\s*=\s*auth\.uid\(\)' THEN '⚠️ DIRECT COMPARISON'
        WHEN qual ~ '(id|user_id|tenant_id|patient_id)\s*IN.*auth\.uid\(\)' AND qual NOT LIKE '%::text%' THEN '⚠️ NO TYPE CASTING'
        WHEN qual LIKE '%::text%' OR qual LIKE '%COALESCE%' THEN '✓ TYPE-SAFE'
        ELSE 'OK'
    END as type_status
FROM pg_policies 
WHERE qual LIKE '%auth.uid()%'
ORDER BY type_status DESC;

COMMIT;

-- =============================================================================
-- FINAL SUMMARY
-- =============================================================================

SELECT 
    'BULLETPROOF FIXES SUMMARY' as summary,
    'auth_rls_initplan: Fixed with (SELECT auth.uid()) optimization' as fix_1,
    'multiple_permissive_policies: Consolidated to single DELETE policy' as fix_2,
    'text = uuid errors: Prevented with COALESCE and ::text casting' as fix_3,
    'All database linter warnings should now be resolved' as result;
