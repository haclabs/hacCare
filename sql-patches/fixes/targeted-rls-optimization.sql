-- =============================================================================
-- TARGETED RLS PERFORMANCE OPTIMIZATION SCRIPT
-- =============================================================================
-- Based on actual schema analysis, this script optimizes the specific patterns
-- found in your database to replace auth.uid() with (SELECT auth.uid())
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: OPTIMIZE EXISTING POLICIES WITH DIRECT REPLACEMENTS
-- =============================================================================

-- Pattern 1: Admin policies using user_profiles.id = auth.uid()
-- These need to be optimized to use (SELECT auth.uid())

-- PATIENT_ADMISSION_RECORDS
DROP POLICY IF EXISTS "Admins can delete patient admission records" ON public.patient_admission_records;
CREATE POLICY "Admins can delete patient admission records" ON public.patient_admission_records
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
        )
    );

-- PATIENT_WOUNDS  
DROP POLICY IF EXISTS "Admins can delete patient wounds" ON public.patient_wounds;
CREATE POLICY "Admins can delete patient wounds" ON public.patient_wounds
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
        )
    );

-- PATIENT_NOTES
DROP POLICY IF EXISTS "Admins can delete patient notes" ON public.patient_notes;
CREATE POLICY "Admins can delete patient notes" ON public.patient_notes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
        )
    );

-- PATIENT_ADVANCED_DIRECTIVES
DROP POLICY IF EXISTS "Admins can delete patient advanced directives" ON public.patient_advanced_directives;
CREATE POLICY "Admins can delete patient advanced directives" ON public.patient_advanced_directives
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
        )
    );

-- AUDIT_LOGS - Admin access
DROP POLICY IF EXISTS "Admins can read all audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read all audit logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
        )
    );

-- AUDIT_LOGS - User own access
DROP POLICY IF EXISTS "Users can read their own audit logs" ON public.audit_logs;
CREATE POLICY "Users can read their own audit logs" ON public.audit_logs
    FOR SELECT USING (user_id = (SELECT auth.uid()));

-- AUDIT_LOGS - Insert policy
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (user_id = (SELECT auth.uid()));

-- PATIENTS - Admin policies
DROP POLICY IF EXISTS "Admins can insert patients" ON public.patients;
CREATE POLICY "Admins can insert patients" ON public.patients
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
        )
    );

DROP POLICY IF EXISTS "Admins can update patients" ON public.patients;
CREATE POLICY "Admins can update patients" ON public.patients
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
        )
    );

DROP POLICY IF EXISTS "Super admins can delete patients" ON public.patients;
CREATE POLICY "Super admins can delete patients" ON public.patients
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = 'super_admin'::user_role
        )
    );

-- =============================================================================
-- SECTION 2: OPTIMIZE ALL REMAINING POLICIES WITH AUTH.UID() CALLS
-- =============================================================================

-- Get a comprehensive list of all policies that need optimization
-- This will be applied to all remaining policies with direct auth.uid() calls

-- USER_PROFILES policies
DO $$
DECLARE
    policy_record RECORD;
    new_qual TEXT;
    new_with_check TEXT;
BEGIN
    -- Iterate through all policies that use auth.uid() directly
    FOR policy_record IN 
        SELECT tablename, policyname, qual, with_check, cmd
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND (qual LIKE '%auth.uid()%' OR with_check LIKE '%auth.uid()%')
        AND NOT (qual LIKE '%(SELECT auth.uid())%' OR with_check LIKE '%(SELECT auth.uid())%')
    LOOP
        -- Prepare optimized versions
        new_qual := REPLACE(policy_record.qual, 'auth.uid()', '(SELECT auth.uid())');
        new_with_check := REPLACE(policy_record.with_check, 'auth.uid()', '(SELECT auth.uid())');
        
        -- Skip if already processed above
        CONTINUE WHEN policy_record.tablename IN (
            'patient_admission_records', 'patient_wounds', 'patient_notes', 
            'patient_advanced_directives', 'audit_logs', 'patients'
        ) AND policy_record.policyname IN (
            'Admins can delete patient admission records',
            'Admins can delete patient wounds', 
            'Admins can delete patient notes',
            'Admins can delete patient advanced directives',
            'Admins can read all audit logs',
            'Users can read their own audit logs',
            'Authenticated users can insert audit logs',
            'Admins can insert patients',
            'Admins can update patients',
            'Super admins can delete patients'
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
        
        RAISE NOTICE 'Optimized policy: %.% - %', 
                     policy_record.tablename, policy_record.policyname, policy_record.cmd;
    END LOOP;
END $$;

-- =============================================================================
-- SECTION 3: CLEANUP DUPLICATE INDEXES (from original CSV data)
-- =============================================================================

-- Remove duplicate tenant indexes (safe cleanup only)
DROP INDEX IF EXISTS public.idx_tenants_admin_user;
-- Keep: idx_tenants_admin_user_id

-- Skip unique_subdomain cleanup as it's a constraint-backed index
-- The main performance benefit comes from auth.uid() optimization anyway
-- Note: unique_subdomain and tenants_subdomain_key may be duplicates
-- but require careful constraint analysis to resolve safely

-- =============================================================================
-- SECTION 4: ADD PERFORMANCE INDEXES
-- =============================================================================

-- Add strategic indexes for optimized query patterns
CREATE INDEX IF NOT EXISTS idx_user_profiles_id_role ON public.user_profiles(id, role);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_tenant ON public.tenant_users(user_id, tenant_id);

-- =============================================================================
-- VERIFICATION AND COMPLETION
-- =============================================================================

COMMIT;

-- Verify optimization results
SELECT 
    'OPTIMIZATION COMPLETE' as status,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%' THEN 1 END) as unoptimized_qual,
    COUNT(CASE WHEN with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%' THEN 1 END) as unoptimized_check,
    COUNT(CASE WHEN qual LIKE '%(SELECT auth.uid())%' OR with_check LIKE '%(SELECT auth.uid())%' THEN 1 END) as optimized_policies
FROM pg_policies 
WHERE schemaname = 'public';

-- Show any remaining unoptimized policies
SELECT 
    'REMAINING UNOPTIMIZED' as status,
    tablename,
    policyname,
    CASE 
        WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%' THEN 'QUAL: ' || qual
        WHEN with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%' THEN 'CHECK: ' || with_check
    END as unoptimized_expression
FROM pg_policies 
WHERE schemaname = 'public' 
AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%') OR
    (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
);
