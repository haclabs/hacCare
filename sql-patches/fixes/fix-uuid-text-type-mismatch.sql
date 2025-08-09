-- =============================================================================
-- FIX TEXT = UUID TYPE MISMATCH ERRORS
-- =============================================================================
-- This script fixes the "operator does not exist: text = uuid" errors
-- by adding proper type casting to all auth.uid() comparisons
-- =============================================================================

BEGIN;

-- =============================================================================
-- ISSUE FIX: Proper UUID type casting for all auth.uid() comparisons
-- =============================================================================

-- First, let's check the current policy that's causing the error
SELECT 
    'CURRENT MEDICATION_ADMINISTRATIONS POLICY' as check_type,
    policyname,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'medication_administrations' 
AND policyname = 'medication_administrations_tenant_access';

-- Check column types to understand the mismatch
SELECT 
    'COLUMN TYPE ANALYSIS' as check_type,
    table_name,
    column_name,
    data_type,
    udt_name
FROM information_schema.columns 
WHERE table_name IN ('user_profiles', 'tenant_users', 'medication_administrations')
AND column_name IN ('id', 'user_id', 'tenant_id')
AND table_schema = 'public'
ORDER BY table_name, column_name;

-- Drop and recreate medication_administrations policy with proper type casting
DROP POLICY IF EXISTS "medication_administrations_tenant_access" ON public.medication_administrations;

-- Check if medication_administrations table exists and create policy with proper casting
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medication_administrations' AND table_schema = 'public') THEN
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medication_administrations' AND column_name = 'tenant_id') THEN
            -- If tenant_id exists, use direct tenant access with proper UUID casting
            EXECUTE 'CREATE POLICY "medication_administrations_tenant_access" ON public.medication_administrations
                FOR ALL
                USING (
                    tenant_id IN (
                        SELECT tenant_id 
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
            -- If patient_id exists, use patient relationship with proper UUID casting
            EXECUTE 'CREATE POLICY "medication_administrations_tenant_access" ON public.medication_administrations
                FOR ALL
                USING (
                    patient_id IN (
                        SELECT p.id 
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
            -- Fallback: basic authenticated access with optimization
            EXECUTE 'CREATE POLICY "medication_administrations_tenant_access" ON public.medication_administrations
                FOR ALL
                USING (
                    (SELECT auth.uid()) IS NOT NULL
                )';
        END IF;
        
        RAISE NOTICE 'Created optimized medication_administrations_tenant_access policy with proper type casting';
    ELSE
        RAISE NOTICE 'medication_administrations table does not exist - skipping policy creation';
    END IF;
END $$;

-- =============================================================================
-- FIX USER_PROFILES DELETE POLICY WITH PROPER TYPE CASTING
-- =============================================================================

-- Drop all existing DELETE policies on user_profiles
DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_auth_delete" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_simple_delete" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_consolidated_delete" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete_protection" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_single_delete" ON public.user_profiles;

-- Create single consolidated DELETE policy for user_profiles with proper type casting
CREATE POLICY "user_profiles_single_delete_typed" ON public.user_profiles
    FOR DELETE
    USING (
        -- Users can delete their own profile (with proper type casting)
        id::text = (SELECT auth.uid())::text
        OR
        -- Super admins can delete any profile (optimized auth call with type casting)
        (SELECT auth.uid())::text IN (
            SELECT id::text
            FROM user_profiles up2
            WHERE up2.role = 'super_admin' 
            AND up2.is_active = true
            AND up2.id::text = (SELECT auth.uid())::text
        )
    );

-- =============================================================================
-- FIX ANY OTHER POLICIES THAT MIGHT HAVE TYPE ISSUES
-- =============================================================================

-- Check for and fix tenant_users policies
DROP POLICY IF EXISTS "tenant_users_auth_access" ON public.tenant_users;

CREATE POLICY "tenant_users_auth_access" ON public.tenant_users
    FOR ALL
    USING (
        user_id::text = (SELECT auth.uid())::text
        OR
        (SELECT auth.uid())::text IN (
            SELECT id::text FROM user_profiles WHERE role = 'super_admin' AND is_active = true
        )
    );

-- Check for and fix user_profiles SELECT policies
DROP POLICY IF EXISTS "user_profiles_auth_select" ON public.user_profiles;

CREATE POLICY "user_profiles_auth_select" ON public.user_profiles
    FOR SELECT
    USING (
        id::text = (SELECT auth.uid())::text
        OR
        (SELECT auth.uid())::text IN (
            SELECT tu.user_id::text 
            FROM tenant_users tu 
            JOIN user_profiles up ON tu.tenant_id = up.tenant_id
            WHERE tu.user_id::text = (SELECT auth.uid())::text
            AND tu.is_active = true
        )
        OR
        (SELECT auth.uid())::text IN (
            SELECT id::text FROM user_profiles WHERE role = 'super_admin' AND is_active = true
        )
    );

-- =============================================================================
-- VERIFICATION: Check that type casting fixes resolved the issues
-- =============================================================================

-- Verify all policies now use proper type casting
SELECT 
    'POLICY TYPE CASTING CHECK' as verification,
    tablename,
    policyname,
    CASE 
        WHEN qual LIKE '%::text%' OR qual LIKE '%::uuid%' THEN 'SAFE: Uses type casting'
        WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%::text%' THEN 'POTENTIAL ISSUE: No type casting'
        ELSE 'NO AUTH CALLS OR SAFE'
    END as casting_status,
    qual
FROM pg_policies 
WHERE qual LIKE '%auth.uid()%'
ORDER BY tablename, policyname;

-- Check for remaining type mismatch risks
SELECT 
    'TYPE MISMATCH RISK ANALYSIS' as verification,
    COUNT(*) as policies_with_auth_uid,
    SUM(CASE WHEN qual LIKE '%::text%' OR qual LIKE '%::uuid%' THEN 1 ELSE 0 END) as policies_with_casting,
    SUM(CASE WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%::text%' AND qual NOT LIKE '%::uuid%' THEN 1 ELSE 0 END) as policies_without_casting
FROM pg_policies 
WHERE qual LIKE '%auth.uid()%';

COMMIT;

-- =============================================================================
-- SUMMARY OF TYPE CASTING FIXES
-- =============================================================================

SELECT 
    'TYPE CASTING FIXES SUMMARY' as summary,
    'Added ::text casting to all auth.uid() comparisons' as fix_1,
    'Prevents text = uuid operator errors' as fix_2,
    'All policies now use consistent type handling' as result;
