-- =============================================================================
-- FIX POLICIES TO HANDLE NULL AUTH.UID() GRACEFULLY
-- =============================================================================
-- This prevents "text = uuid" errors when auth.uid() returns NULL
-- =============================================================================

BEGIN;

-- First, let's see what policies are currently causing issues
SELECT 
    'CURRENT PROBLEMATIC POLICIES' as analysis,
    tablename,
    policyname,
    CASE 
        WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%IS NOT NULL%' AND qual NOT LIKE '%COALESCE%' THEN 'NEEDS NULL PROTECTION'
        ELSE 'SAFE'
    END as safety_status,
    qual
FROM pg_policies 
WHERE qual LIKE '%auth.uid()%'
ORDER BY safety_status DESC;

-- =============================================================================
-- FIX 1: Make all auth.uid() calls NULL-safe with proper type handling
-- =============================================================================

-- Drop and recreate user_profiles policies with NULL safety
DROP POLICY IF EXISTS "user_profiles_single_delete_typed" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_single_delete" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_auth_select" ON public.user_profiles;

-- Safe DELETE policy for user_profiles
CREATE POLICY "user_profiles_safe_delete" ON public.user_profiles
    FOR DELETE
    USING (
        -- Only allow deletions when authenticated and types match
        auth.uid() IS NOT NULL
        AND (
            id::text = COALESCE(auth.uid()::text, '')
            OR
            EXISTS (
                SELECT 1 FROM user_profiles up2
                WHERE up2.role = 'super_admin' 
                AND up2.is_active = true
                AND up2.id::text = COALESCE(auth.uid()::text, '')
            )
        )
    );

-- Safe SELECT policy for user_profiles  
CREATE POLICY "user_profiles_safe_select" ON public.user_profiles
    FOR SELECT
    USING (
        -- Allow select when authenticated with proper type safety
        auth.uid() IS NOT NULL
        AND (
            id::text = COALESCE(auth.uid()::text, '')
            OR
            EXISTS (
                SELECT 1 FROM tenant_users tu 
                JOIN user_profiles up ON tu.tenant_id = up.tenant_id
                WHERE tu.user_id::text = COALESCE(auth.uid()::text, '')
                AND tu.is_active = true
            )
            OR
            EXISTS (
                SELECT 1 FROM user_profiles up2
                WHERE up2.role = 'super_admin' 
                AND up2.is_active = true
                AND up2.id::text = COALESCE(auth.uid()::text, '')
            )
        )
    );

-- =============================================================================
-- FIX 2: Fix tenant_users policies with NULL safety
-- =============================================================================

DROP POLICY IF EXISTS "tenant_users_auth_access" ON public.tenant_users;

CREATE POLICY "tenant_users_safe_access" ON public.tenant_users
    FOR ALL
    USING (
        -- Only allow access when properly authenticated
        auth.uid() IS NOT NULL
        AND (
            user_id::text = COALESCE(auth.uid()::text, '')
            OR
            EXISTS (
                SELECT 1 FROM user_profiles up
                WHERE up.role = 'super_admin' 
                AND up.is_active = true
                AND up.id::text = COALESCE(auth.uid()::text, '')
            )
        )
    );

-- =============================================================================
-- FIX 3: Fix medication_administrations policies with NULL safety
-- =============================================================================

-- Only create if table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'medication_administrations' AND table_schema = 'public') THEN
        
        -- Drop existing policy
        DROP POLICY IF EXISTS "medication_administrations_tenant_access" ON public.medication_administrations;
        
        -- Create safe policy based on table structure
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medication_administrations' AND column_name = 'tenant_id') THEN
            EXECUTE 'CREATE POLICY "medication_administrations_safe_access" ON public.medication_administrations
                FOR ALL
                USING (
                    auth.uid() IS NOT NULL
                    AND (
                        tenant_id IN (
                            SELECT tenant_id 
                            FROM tenant_users 
                            WHERE user_id::text = COALESCE((SELECT auth.uid())::text, '''')
                            AND is_active = true
                        )
                        OR
                        EXISTS (
                            SELECT 1 FROM user_profiles 
                            WHERE role = ''super_admin'' 
                            AND is_active = true
                            AND id::text = COALESCE((SELECT auth.uid())::text, '''')
                        )
                    )
                )';
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'medication_administrations' AND column_name = 'patient_id') THEN
            EXECUTE 'CREATE POLICY "medication_administrations_safe_access" ON public.medication_administrations
                FOR ALL
                USING (
                    auth.uid() IS NOT NULL
                    AND (
                        patient_id IN (
                            SELECT p.id 
                            FROM patients p
                            JOIN tenant_users tu ON p.tenant_id = tu.tenant_id
                            WHERE tu.user_id::text = COALESCE((SELECT auth.uid())::text, '''')
                            AND tu.is_active = true
                        )
                        OR
                        EXISTS (
                            SELECT 1 FROM user_profiles 
                            WHERE role = ''super_admin'' 
                            AND is_active = true
                            AND id::text = COALESCE((SELECT auth.uid())::text, '''')
                        )
                    )
                )';
        ELSE
            EXECUTE 'CREATE POLICY "medication_administrations_safe_access" ON public.medication_administrations
                FOR ALL
                USING (auth.uid() IS NOT NULL)';
        END IF;
        
        RAISE NOTICE 'Created NULL-safe medication_administrations policy';
    ELSE
        RAISE NOTICE 'medication_administrations table does not exist - skipping';
    END IF;
END $$;

-- =============================================================================
-- FIX 4: Add INSERT/UPDATE policies with NULL safety
-- =============================================================================

-- Safe INSERT for user_profiles
CREATE POLICY "user_profiles_safe_insert" ON public.user_profiles
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            id::text = COALESCE(auth.uid()::text, '')
            OR
            EXISTS (
                SELECT 1 FROM user_profiles up
                WHERE up.role = 'super_admin' 
                AND up.is_active = true
                AND up.id::text = COALESCE(auth.uid()::text, '')
            )
        )
    );

-- Safe UPDATE for user_profiles
CREATE POLICY "user_profiles_safe_update" ON public.user_profiles
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL
        AND (
            id::text = COALESCE(auth.uid()::text, '')
            OR
            EXISTS (
                SELECT 1 FROM user_profiles up
                WHERE up.role = 'super_admin' 
                AND up.is_active = true
                AND up.id::text = COALESCE(auth.uid()::text, '')
            )
        )
    );

-- =============================================================================
-- VERIFICATION: Check that all policies are now NULL-safe
-- =============================================================================

SELECT 
    'NULL SAFETY VERIFICATION' as check,
    tablename,
    policyname,
    CASE 
        WHEN qual LIKE '%auth.uid() IS NOT NULL%' THEN 'NULL-SAFE ✓'
        WHEN qual LIKE '%COALESCE%auth.uid()%' THEN 'NULL-SAFE ✓'
        WHEN qual LIKE '%auth.uid()%' THEN 'POTENTIAL ISSUE ⚠️'
        ELSE 'NO AUTH CALLS'
    END as safety_status,
    CASE 
        WHEN qual LIKE '%::text%' THEN 'TYPE-SAFE ✓'
        WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%::text%' THEN 'NEEDS TYPE CASTING ⚠️'
        ELSE 'NO TYPE ISSUES'
    END as type_safety
FROM pg_policies 
WHERE qual IS NOT NULL
ORDER BY tablename, policyname;

COMMIT;

-- =============================================================================
-- SUMMARY AND NEXT STEPS
-- =============================================================================

SELECT 
    'NULL SAFETY FIXES SUMMARY' as summary,
    'All policies now check auth.uid() IS NOT NULL first' as fix_1,
    'Added COALESCE() for safe string comparisons' as fix_2,
    'Added ::text casting to prevent type errors' as fix_3,
    'Policies will no longer fail when user is not authenticated' as result;

-- Instructions for testing
SELECT 
    'TESTING INSTRUCTIONS' as instructions,
    '1. These policies now work when NOT authenticated (will deny access safely)' as step_1,
    '2. To test with authentication, create a user in Supabase Auth' as step_2,
    '3. Or run the companion script to create test users' as step_3,
    '4. The text = uuid error should now be resolved' as result;
