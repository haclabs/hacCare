-- =============================================================================
-- ENHANCED RLS PERFORMANCE OPTIMIZATION SCRIPT
-- =============================================================================
-- This script handles the complex auth.uid() patterns that the previous script missed
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: HANDLE FUNCTION-BASED POLICIES
-- =============================================================================

-- First, let's optimize the function-based policies
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.user_profiles;
CREATE POLICY "Admins can read all profiles" ON public.user_profiles
    FOR SELECT USING (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins can create profiles" ON public.user_profiles;
CREATE POLICY "Admins can create profiles" ON public.user_profiles
    FOR INSERT WITH CHECK (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "Admins can update profiles" ON public.user_profiles;
CREATE POLICY "Admins can update profiles" ON public.user_profiles
    FOR UPDATE USING (is_admin_user((SELECT auth.uid())));

DROP POLICY IF EXISTS "Super admins can delete profiles" ON public.user_profiles;
CREATE POLICY "Super admins can delete profiles" ON public.user_profiles
    FOR DELETE USING (is_super_admin_user((SELECT auth.uid())));

-- =============================================================================
-- SECTION 2: HANDLE SIMPLE ID-BASED POLICIES
-- =============================================================================

-- User profile self-access policies
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles
    FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile" ON public.user_profiles
    FOR SELECT USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING ((SELECT auth.uid()) = id);

-- Profiles table policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "profiles_simple_access" ON public.profiles;
CREATE POLICY "profiles_simple_access" ON public.profiles
    FOR SELECT USING ((id = (SELECT auth.uid())) OR is_super_admin_direct() OR (auth.role() = 'service_role'::text));

DROP POLICY IF EXISTS "profiles_simple_update" ON public.profiles;
CREATE POLICY "profiles_simple_update" ON public.profiles
    FOR UPDATE USING ((id = (SELECT auth.uid())) OR is_super_admin_direct() OR (auth.role() = 'service_role'::text));

-- =============================================================================
-- SECTION 3: HANDLE TENANT-BASED POLICIES
-- =============================================================================

-- Tenants table policies
DROP POLICY IF EXISTS "Users can create tenants they will admin" ON public.tenants;
CREATE POLICY "Users can create tenants they will admin" ON public.tenants
    FOR INSERT WITH CHECK (admin_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Tenant owners can update their tenant" ON public.tenants;
CREATE POLICY "Tenant owners can update their tenant" ON public.tenants
    FOR UPDATE USING (admin_user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "allow_authenticated_insert_tenants" ON public.tenants;
CREATE POLICY "allow_authenticated_insert_tenants" ON public.tenants
    FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- Tenant users policies
DROP POLICY IF EXISTS "simple_tenant_users_access" ON public.tenant_users;
CREATE POLICY "simple_tenant_users_access" ON public.tenant_users
    FOR ALL USING ((user_id = (SELECT auth.uid())) OR (auth.role() = 'service_role'::text));

-- =============================================================================
-- SECTION 4: HANDLE COMPLEX TENANT ISOLATION POLICIES
-- =============================================================================

-- Patient alerts
DROP POLICY IF EXISTS "Admins can delete alerts" ON public.patient_alerts;
CREATE POLICY "Admins can delete alerts" ON public.patient_alerts
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
        )
    );

DROP POLICY IF EXISTS "Strict tenant isolation for patient_alerts" ON public.patient_alerts;
CREATE POLICY "Strict tenant isolation for patient_alerts" ON public.patient_alerts
    FOR ALL USING (
        (EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = 'super_admin'::user_role 
            AND user_profiles.is_active = true
        )) 
        OR 
        (
            tenant_id IN (
                SELECT tenant_users.tenant_id
                FROM tenant_users
                WHERE tenant_users.user_id = (SELECT auth.uid()) 
                AND tenant_users.is_active = true
            ) 
            AND EXISTS (
                SELECT 1 FROM user_profiles
                WHERE user_profiles.id = (SELECT auth.uid()) 
                AND user_profiles.is_active = true
            )
        )
    );

-- Patient images
DROP POLICY IF EXISTS "Admins can delete patient images" ON public.patient_images;
CREATE POLICY "Admins can delete patient images" ON public.patient_images
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = ANY (ARRAY['admin'::user_role, 'super_admin'::user_role])
        )
    );

DROP POLICY IF EXISTS "tenant_isolation_policy" ON public.patient_images;
CREATE POLICY "tenant_isolation_policy" ON public.patient_images
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_users.tenant_id
            FROM tenant_users
            WHERE tenant_users.user_id = (SELECT auth.uid()) 
            AND tenant_users.is_active = true
        ) 
        OR 
        (SELECT auth.uid()) IN (
            SELECT user_profiles.id
            FROM user_profiles
            WHERE user_profiles.role = 'super_admin'::user_role 
            AND user_profiles.is_active = true
        )
    );

-- Patient vitals
DROP POLICY IF EXISTS "Super admins can delete patient vitals" ON public.patient_vitals;
CREATE POLICY "Super admins can delete patient vitals" ON public.patient_vitals
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = 'super_admin'::user_role
        )
    );

DROP POLICY IF EXISTS "Strict tenant isolation for patient_vitals" ON public.patient_vitals;
CREATE POLICY "Strict tenant isolation for patient_vitals" ON public.patient_vitals
    FOR ALL USING (
        (EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = 'super_admin'::user_role 
            AND user_profiles.is_active = true
        )) 
        OR 
        (
            tenant_id IN (
                SELECT tenant_users.tenant_id
                FROM tenant_users
                WHERE tenant_users.user_id = (SELECT auth.uid()) 
                AND tenant_users.is_active = true
            ) 
            AND EXISTS (
                SELECT 1 FROM user_profiles
                WHERE user_profiles.id = (SELECT auth.uid()) 
                AND user_profiles.is_active = true
            )
        )
    );

DROP POLICY IF EXISTS "tenant_isolation_policy" ON public.patient_vitals;
CREATE POLICY "tenant_isolation_policy" ON public.patient_vitals
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_users.tenant_id
            FROM tenant_users
            WHERE tenant_users.user_id = (SELECT auth.uid()) 
            AND tenant_users.is_active = true
        ) 
        OR 
        (SELECT auth.uid()) IN (
            SELECT user_profiles.id
            FROM user_profiles
            WHERE user_profiles.role = 'super_admin'::user_role 
            AND user_profiles.is_active = true
        )
    );

-- Patient notes
DROP POLICY IF EXISTS "tenant_isolation_policy" ON public.patient_notes;
CREATE POLICY "tenant_isolation_policy" ON public.patient_notes
    FOR ALL USING (
        tenant_id IN (
            SELECT tenant_users.tenant_id
            FROM tenant_users
            WHERE tenant_users.user_id = (SELECT auth.uid()) 
            AND tenant_users.is_active = true
        ) 
        OR 
        (SELECT auth.uid()) IN (
            SELECT user_profiles.id
            FROM user_profiles
            WHERE user_profiles.role = 'super_admin'::user_role 
            AND user_profiles.is_active = true
        )
    );

-- =============================================================================
-- SECTION 5: HANDLE PATIENT MEDICATIONS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Users can insert medications for their tenant" ON public.patient_medications;
CREATE POLICY "Users can insert medications for their tenant" ON public.patient_medications
    FOR INSERT WITH CHECK (
        (EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = 'super_admin'::user_role
        )) 
        OR 
        (EXISTS (
            SELECT 1 FROM tenant_users
            WHERE tenant_users.user_id = (SELECT auth.uid()) 
            AND tenant_users.tenant_id = patient_medications.tenant_id 
            AND tenant_users.is_active = true
        ))
    );

DROP POLICY IF EXISTS "Strict tenant isolation for patient_medications" ON public.patient_medications;
CREATE POLICY "Strict tenant isolation for patient_medications" ON public.patient_medications
    FOR ALL USING (
        (EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = 'super_admin'::user_role 
            AND user_profiles.is_active = true
        )) 
        OR 
        (
            tenant_id IN (
                SELECT tenant_users.tenant_id
                FROM tenant_users
                WHERE tenant_users.user_id = (SELECT auth.uid()) 
                AND tenant_users.is_active = true
            ) 
            AND EXISTS (
                SELECT 1 FROM user_profiles
                WHERE user_profiles.id = (SELECT auth.uid()) 
                AND user_profiles.is_active = true
            )
        )
    );

-- =============================================================================
-- SECTION 6: HANDLE PATIENTS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Strict tenant isolation for patients" ON public.patients;
CREATE POLICY "Strict tenant isolation for patients" ON public.patients
    FOR ALL USING (
        (EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = 'super_admin'::user_role 
            AND user_profiles.is_active = true
        )) 
        OR 
        (
            tenant_id IN (
                SELECT tenant_users.tenant_id
                FROM tenant_users
                WHERE tenant_users.user_id = (SELECT auth.uid()) 
                AND tenant_users.is_active = true
            ) 
            AND EXISTS (
                SELECT 1 FROM user_profiles
                WHERE user_profiles.id = (SELECT auth.uid()) 
                AND user_profiles.is_active = true
            )
        )
    );

-- =============================================================================
-- SECTION 7: HANDLE TENANT POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "tenant_select_simple" ON public.tenants;
CREATE POLICY "tenant_select_simple" ON public.tenants
    FOR SELECT USING (
        (SELECT auth.uid()) IS NOT NULL 
        AND (
            id IN (
                SELECT tenant_users.tenant_id
                FROM tenant_users
                WHERE tenant_users.user_id = (SELECT auth.uid()) 
                AND tenant_users.is_active = true
            ) 
            OR admin_user_id = (SELECT auth.uid()) 
            OR auth.role() = 'service_role'::text 
            OR true
        )
    );

DROP POLICY IF EXISTS "Super admins can view all tenants" ON public.tenants;
CREATE POLICY "Super admins can view all tenants" ON public.tenants
    FOR SELECT USING (
        (EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = 'super_admin'::user_role
        )) 
        OR 
        (id IN (
            SELECT tenant_users.tenant_id
            FROM tenant_users
            WHERE tenant_users.user_id = (SELECT auth.uid()) 
            AND tenant_users.is_active = true
        ))
    );

DROP POLICY IF EXISTS "Super admins can create tenants" ON public.tenants;
CREATE POLICY "Super admins can create tenants" ON public.tenants
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = 'super_admin'::user_role
        )
    );

DROP POLICY IF EXISTS "Super admins can delete tenants" ON public.tenants;
CREATE POLICY "Super admins can delete tenants" ON public.tenants
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = 'super_admin'::user_role
        )
    );

DROP POLICY IF EXISTS "Super admins can update tenants" ON public.tenants;
CREATE POLICY "Super admins can update tenants" ON public.tenants
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = 'super_admin'::user_role
        )
    );

-- =============================================================================
-- SECTION 8: HANDLE TENANT_USERS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Super admins can delete tenant_users" ON public.tenant_users;
CREATE POLICY "Super admins can delete tenant_users" ON public.tenant_users
    FOR DELETE USING (
        (EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = 'super_admin'::user_role
        )) 
        OR 
        (
            (EXISTS (
                SELECT 1 FROM user_profiles
                WHERE user_profiles.id = (SELECT auth.uid()) 
                AND user_profiles.role = 'admin'::user_role
            )) 
            AND tenant_id IN (
                SELECT tu.tenant_id
                FROM tenant_users tu
                WHERE tu.user_id = (SELECT auth.uid()) 
                AND tu.is_active = true
            )
        )
    );

-- =============================================================================
-- SECTION 9: HANDLE DIABETIC RECORDS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Users can view diabetic records for their tenant" ON public.diabetic_records;
CREATE POLICY "Users can view diabetic records for their tenant" ON public.diabetic_records
    FOR SELECT USING (
        tenant_id IN (
            SELECT diabetic_records.tenant_id
            FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert diabetic records for their tenant" ON public.diabetic_records;
CREATE POLICY "Users can insert diabetic records for their tenant" ON public.diabetic_records
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT diabetic_records.tenant_id
            FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update their own diabetic records within tenant" ON public.diabetic_records;
CREATE POLICY "Users can update their own diabetic records within tenant" ON public.diabetic_records
    FOR UPDATE USING (
        recorded_by = (SELECT auth.uid()) 
        AND tenant_id IN (
            SELECT diabetic_records.tenant_id
            FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Authorized users can delete diabetic records within tenant" ON public.diabetic_records;
CREATE POLICY "Authorized users can delete diabetic records within tenant" ON public.diabetic_records
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE user_profiles.id = (SELECT auth.uid()) 
            AND user_profiles.role = ANY (ARRAY['admin'::user_role, 'nurse'::user_role]) 
            AND diabetic_records.tenant_id = diabetic_records.tenant_id
        )
    );

-- =============================================================================
-- VERIFICATION AND COMPLETION
-- =============================================================================

COMMIT;

-- Verify optimization results
SELECT 
    'ENHANCED OPTIMIZATION COMPLETE' as status,
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
        WHEN qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%' THEN 'QUAL: ' || LEFT(qual, 200)
        WHEN with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%' THEN 'CHECK: ' || LEFT(with_check, 200)
    END as unoptimized_expression
FROM pg_policies 
WHERE schemaname = 'public' 
AND (
    (qual LIKE '%auth.uid()%' AND qual NOT LIKE '%(SELECT auth.uid())%') OR
    (with_check LIKE '%auth.uid()%' AND with_check NOT LIKE '%(SELECT auth.uid())%')
)
ORDER BY tablename, policyname;
