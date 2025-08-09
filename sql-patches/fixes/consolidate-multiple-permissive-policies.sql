-- =============================================================================
-- CONSOLIDATE MULTIPLE PERMISSIVE POLICIES
-- =============================================================================
-- This script consolidates overlapping permissive policies to improve performance
-- Multiple permissive policies for the same role/action force PostgreSQL to 
-- evaluate ALL policies, causing significant performance degradation.
-- =============================================================================

BEGIN;

-- =============================================================================
-- AUDIT_LOGS TABLE - Consolidate multiple SELECT policies
-- =============================================================================

-- Drop existing overlapping policies
DROP POLICY IF EXISTS "Admins can read all audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Users can read their own audit logs" ON public.audit_logs;

-- Create consolidated policy for audit logs access
CREATE POLICY "audit_logs_consolidated_select" ON public.audit_logs
    FOR SELECT 
    USING (
        -- Admin access: users with admin role can read all
        (SELECT auth.uid()) IN (
            SELECT id FROM public.user_profiles 
            WHERE role IN ('admin', 'super_admin')
        )
        OR
        -- User access: users can read their own audit logs
        user_id = (SELECT auth.uid())
    );

-- =============================================================================
-- PATIENT_ALERTS TABLE - Consolidate multiple policies per action
-- =============================================================================

-- DROP overlapping DELETE policies
DROP POLICY IF EXISTS "Admins can delete alerts" ON public.patient_alerts;
DROP POLICY IF EXISTS "Strict tenant isolation for patient_alerts" ON public.patient_alerts CASCADE;

-- DROP overlapping INSERT policies  
DROP POLICY IF EXISTS "Authenticated users can insert alerts" ON public.patient_alerts;

-- DROP overlapping SELECT policies
DROP POLICY IF EXISTS "Authenticated users can read all alerts" ON public.patient_alerts;

-- DROP overlapping UPDATE policies
DROP POLICY IF EXISTS "Authenticated users can update alerts" ON public.patient_alerts;

-- Create consolidated policies for patient_alerts
CREATE POLICY "patient_alerts_consolidated_select" ON public.patient_alerts
    FOR SELECT
    USING (
        -- Tenant isolation: user must belong to same tenant as alert
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "patient_alerts_consolidated_insert" ON public.patient_alerts
    FOR INSERT
    WITH CHECK (
        -- Users can insert alerts for patients in their tenant
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "patient_alerts_consolidated_update" ON public.patient_alerts
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "patient_alerts_consolidated_delete" ON public.patient_alerts
    FOR DELETE
    USING (
        -- Admin users can delete alerts, or users in same tenant
        (SELECT auth.uid()) IN (
            SELECT id FROM public.user_profiles 
            WHERE role IN ('admin', 'super_admin')
        )
        OR
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

-- =============================================================================
-- PATIENT_IMAGES TABLE - Consolidate multiple policies
-- =============================================================================

-- Drop overlapping policies
DROP POLICY IF EXISTS "Admins can delete patient images" ON public.patient_images;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON public.patient_images CASCADE;
DROP POLICY IF EXISTS "Authenticated users can insert patient images" ON public.patient_images;
DROP POLICY IF EXISTS "Authenticated users can read patient images" ON public.patient_images;
DROP POLICY IF EXISTS "Authenticated users can update patient images" ON public.patient_images;

-- Create consolidated policies
CREATE POLICY "patient_images_consolidated_select" ON public.patient_images
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "patient_images_consolidated_insert" ON public.patient_images
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "patient_images_consolidated_update" ON public.patient_images
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "patient_images_consolidated_delete" ON public.patient_images
    FOR DELETE
    USING (
        (SELECT auth.uid()) IN (
            SELECT user_id FROM public.user_profiles 
            WHERE user_role = 'admin'
        )
        OR
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

-- =============================================================================
-- PATIENT_MEDICATIONS TABLE - Consolidate multiple policies
-- =============================================================================

-- Drop overlapping policies
DROP POLICY IF EXISTS "Strict tenant isolation for patient_medications" ON public.patient_medications CASCADE;
DROP POLICY IF EXISTS "patient_medications_simple_access" ON public.patient_medications CASCADE;
DROP POLICY IF EXISTS "Authenticated users can manage patient medications" ON public.patient_medications;
DROP POLICY IF EXISTS "Authenticated users can read patient medications" ON public.patient_medications;
DROP POLICY IF EXISTS "Users can insert medications for their tenant" ON public.patient_medications;

-- Create consolidated policies
CREATE POLICY "patient_medications_consolidated_select" ON public.patient_medications
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "patient_medications_consolidated_insert" ON public.patient_medications
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "patient_medications_consolidated_update" ON public.patient_medications
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "patient_medications_consolidated_delete" ON public.patient_medications
    FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

-- =============================================================================
-- PATIENT_NOTES TABLE - Consolidate multiple policies
-- =============================================================================

-- Drop overlapping policies
DROP POLICY IF EXISTS "Admins can delete patient notes" ON public.patient_notes;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON public.patient_notes CASCADE;
DROP POLICY IF EXISTS "Authenticated users can insert patient notes" ON public.patient_notes;
DROP POLICY IF EXISTS "Authenticated users can read patient notes" ON public.patient_notes;

-- Create consolidated policies
CREATE POLICY "patient_notes_consolidated_select" ON public.patient_notes
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "patient_notes_consolidated_insert" ON public.patient_notes
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "patient_notes_consolidated_update" ON public.patient_notes
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "patient_notes_consolidated_delete" ON public.patient_notes
    FOR DELETE
    USING (
        (SELECT auth.uid()) IN (
            SELECT user_id FROM public.user_profiles 
            WHERE user_role = 'admin'
        )
        OR
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

-- =============================================================================
-- PATIENT_VITALS TABLE - Consolidate multiple policies
-- =============================================================================

-- Drop overlapping policies
DROP POLICY IF EXISTS "Strict tenant isolation for patient_vitals" ON public.patient_vitals CASCADE;
DROP POLICY IF EXISTS "Super admins can delete patient vitals" ON public.patient_vitals;
DROP POLICY IF EXISTS "tenant_isolation_policy" ON public.patient_vitals CASCADE;
DROP POLICY IF EXISTS "Authenticated users can insert patient vitals" ON public.patient_vitals;
DROP POLICY IF EXISTS "Authenticated users can read patient vitals" ON public.patient_vitals;
DROP POLICY IF EXISTS "Authenticated users can update patient vitals" ON public.patient_vitals;

-- Create consolidated policies
CREATE POLICY "patient_vitals_consolidated_select" ON public.patient_vitals
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "patient_vitals_consolidated_insert" ON public.patient_vitals
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "patient_vitals_consolidated_update" ON public.patient_vitals
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "patient_vitals_consolidated_delete" ON public.patient_vitals
    FOR DELETE
    USING (
        (SELECT auth.uid()) IN (
            SELECT user_id FROM public.user_profiles 
            WHERE user_role = 'admin'
        )
        OR
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

-- =============================================================================
-- PATIENTS TABLE - Consolidate multiple policies
-- =============================================================================

-- Drop overlapping policies
DROP POLICY IF EXISTS "Strict tenant isolation for patients" ON public.patients CASCADE;
DROP POLICY IF EXISTS "Super admins can delete patients" ON public.patients;
DROP POLICY IF EXISTS "patients_simple_access" ON public.patients CASCADE;
DROP POLICY IF EXISTS "Admins can insert patients" ON public.patients;
DROP POLICY IF EXISTS "Admins can update patients" ON public.patients;
DROP POLICY IF EXISTS "Authenticated users can read patients" ON public.patients;

-- Create consolidated policies
CREATE POLICY "patients_consolidated_select" ON public.patients
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "patients_consolidated_insert" ON public.patients
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "patients_consolidated_update" ON public.patients
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "patients_consolidated_delete" ON public.patients
    FOR DELETE
    USING (
        (SELECT auth.uid()) IN (
            SELECT user_id FROM public.user_profiles 
            WHERE user_role = 'admin'
        )
        OR
        tenant_id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

-- =============================================================================
-- PROFILES TABLE - Consolidate multiple policies
-- =============================================================================

-- Drop overlapping policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_simple_access" ON public.profiles CASCADE;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_simple_update" ON public.profiles CASCADE;

-- Create consolidated policies
CREATE POLICY "profiles_consolidated_select" ON public.profiles
    FOR SELECT
    USING (id = (SELECT auth.uid()));

CREATE POLICY "profiles_consolidated_update" ON public.profiles
    FOR UPDATE
    USING (id = (SELECT auth.uid()))
    WITH CHECK (id = (SELECT auth.uid()));

-- =============================================================================
-- TENANT_USERS TABLE - Consolidate multiple policies
-- =============================================================================

-- Drop overlapping policies
DROP POLICY IF EXISTS "Super admins can delete tenant_users" ON public.tenant_users;
DROP POLICY IF EXISTS "simple_tenant_users_access" ON public.tenant_users CASCADE;

-- Create consolidated policies
CREATE POLICY "tenant_users_consolidated_select" ON public.tenant_users
    FOR SELECT
    USING (
        user_id = (SELECT auth.uid())
        OR
        (SELECT auth.uid()) IN (
            SELECT user_id FROM public.user_profiles 
            WHERE user_role = 'admin'
        )
    );

CREATE POLICY "tenant_users_consolidated_insert" ON public.tenant_users
    FOR INSERT
    WITH CHECK (
        (SELECT auth.uid()) IN (
            SELECT user_id FROM public.user_profiles 
            WHERE user_role = 'admin'
        )
    );

CREATE POLICY "tenant_users_consolidated_update" ON public.tenant_users
    FOR UPDATE
    USING (
        (SELECT auth.uid()) IN (
            SELECT user_id FROM public.user_profiles 
            WHERE user_role = 'admin'
        )
    )
    WITH CHECK (
        (SELECT auth.uid()) IN (
            SELECT user_id FROM public.user_profiles 
            WHERE user_role = 'admin'
        )
    );

CREATE POLICY "tenant_users_consolidated_delete" ON public.tenant_users
    FOR DELETE
    USING (
        (SELECT auth.uid()) IN (
            SELECT user_id FROM public.user_profiles 
            WHERE user_role = 'admin'
        )
    );

-- =============================================================================
-- TENANTS TABLE - Consolidate multiple policies
-- =============================================================================

-- Drop overlapping policies
DROP POLICY IF EXISTS "Super admins can delete tenants" ON public.tenants;
DROP POLICY IF EXISTS "System can manage tenants" ON public.tenants;
DROP POLICY IF EXISTS "Super admins can create tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can create tenants they will admin" ON public.tenants;
DROP POLICY IF EXISTS "allow_authenticated_insert_tenants" ON public.tenants;
DROP POLICY IF EXISTS "Super admins can view all tenants" ON public.tenants;
DROP POLICY IF EXISTS "tenant_select_simple" ON public.tenants CASCADE;
DROP POLICY IF EXISTS "Super admins can update tenants" ON public.tenants;
DROP POLICY IF EXISTS "Tenant owners can update their tenant" ON public.tenants;

-- Create consolidated policies
CREATE POLICY "tenants_consolidated_select" ON public.tenants
    FOR SELECT
    USING (
        -- Admin users can see all tenants
        (SELECT auth.uid()) IN (
            SELECT user_id FROM public.user_profiles 
            WHERE user_role = 'admin'
        )
        OR
        -- Users can see tenants they belong to
        id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "tenants_consolidated_insert" ON public.tenants
    FOR INSERT
    WITH CHECK (
        (SELECT auth.uid()) IN (
            SELECT user_id FROM public.user_profiles 
            WHERE user_role = 'admin'
        )
    );

CREATE POLICY "tenants_consolidated_update" ON public.tenants
    FOR UPDATE
    USING (
        (SELECT auth.uid()) IN (
            SELECT user_id FROM public.user_profiles 
            WHERE user_role = 'admin'
        )
        OR
        -- Tenant owners can update their tenant
        id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid()) AND user_role = 'admin'
        )
    )
    WITH CHECK (
        (SELECT auth.uid()) IN (
            SELECT user_id FROM public.user_profiles 
            WHERE user_role = 'admin'
        )
        OR
        id IN (
            SELECT tenant_id FROM public.tenant_users 
            WHERE user_id = (SELECT auth.uid()) AND user_role = 'admin'
        )
    );

CREATE POLICY "tenants_consolidated_delete" ON public.tenants
    FOR DELETE
    USING (
        (SELECT auth.uid()) IN (
            SELECT user_id FROM public.user_profiles 
            WHERE user_role = 'admin'
        )
    );

-- =============================================================================
-- USER_PROFILES TABLE - Consolidate multiple policies
-- =============================================================================

-- Drop overlapping policies
DROP POLICY IF EXISTS "Admins can create profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Create consolidated policies
CREATE POLICY "user_profiles_consolidated_select" ON public.user_profiles
    FOR SELECT
    USING (
        user_id = (SELECT auth.uid())
        OR
        (SELECT auth.uid()) IN (
            SELECT user_id FROM public.user_profiles 
            WHERE user_role = 'admin'
        )
    );

CREATE POLICY "user_profiles_consolidated_insert" ON public.user_profiles
    FOR INSERT
    WITH CHECK (
        user_id = (SELECT auth.uid())
        OR
        (SELECT auth.uid()) IN (
            SELECT user_id FROM public.user_profiles 
            WHERE user_role = 'admin'
        )
    );

CREATE POLICY "user_profiles_consolidated_update" ON public.user_profiles
    FOR UPDATE
    USING (
        user_id = (SELECT auth.uid())
        OR
        (SELECT auth.uid()) IN (
            SELECT user_id FROM public.user_profiles 
            WHERE user_role = 'admin'
        )
    )
    WITH CHECK (
        user_id = (SELECT auth.uid())
        OR
        (SELECT auth.uid()) IN (
            SELECT user_id FROM public.user_profiles 
            WHERE user_role = 'admin'
        )
    );

CREATE POLICY "user_profiles_consolidated_delete" ON public.user_profiles
    FOR DELETE
    USING (
        (SELECT auth.uid()) IN (
            SELECT user_id FROM public.user_profiles 
            WHERE user_role = 'admin'
        )
    );

-- =============================================================================
-- FIX DUPLICATE INDEX ISSUE
-- =============================================================================

-- Drop the duplicate index on tenants.subdomain
DROP INDEX IF EXISTS tenants_subdomain_key;
-- Keep unique_subdomain as it's likely the constraint-backed index

-- =============================================================================
-- VERIFICATION
-- =============================================================================

COMMIT;

-- Verify that we've eliminated multiple permissive policies
SELECT 
    'POLICY CONSOLIDATION RESULTS' as status,
    tablename,
    COUNT(*) as policy_count,
    string_agg(DISTINCT cmd, ', ') as commands
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
HAVING COUNT(*) > 4  -- Tables with more than 4 policies (one per CRUD operation)
ORDER BY policy_count DESC, tablename;

-- Show remaining policies per table
SELECT 
    'FINAL POLICY SUMMARY' as summary,
    tablename,
    COUNT(*) as total_policies,
    COUNT(CASE WHEN cmd = 'SELECT' THEN 1 END) as select_policies,
    COUNT(CASE WHEN cmd = 'INSERT' THEN 1 END) as insert_policies,
    COUNT(CASE WHEN cmd = 'UPDATE' THEN 1 END) as update_policies,
    COUNT(CASE WHEN cmd = 'DELETE' THEN 1 END) as delete_policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

SELECT 
    'PERFORMANCE OPTIMIZATION COMPLETE' as status,
    'Consolidated multiple permissive policies into single policies per action' as optimization,
    'This eliminates the need for PostgreSQL to evaluate multiple policies per query' as benefit,
    'Expected: Significant reduction in RLS performance warnings' as impact;
