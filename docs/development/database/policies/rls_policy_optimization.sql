-- RLS Policy Optimization and Security Hardening
-- This script addresses potential Supabase linter warnings about RLS policies

-- 1. OPTIMIZATION: Consolidate redundant policies for better performance
-- Some tables have multiple overlapping policies that can be simplified

-- Example: active_simulations has 3 policies that could be consolidated
DROP POLICY IF EXISTS "Users can access their simulations" ON public.active_simulations;
DROP POLICY IF EXISTS "Users can manage simulations for their tenant" ON public.active_simulations;
DROP POLICY IF EXISTS "Users can view active simulations for their tenant" ON public.active_simulations;

CREATE POLICY "active_simulations_unified_access" ON public.active_simulations
FOR ALL USING (
  auth.role() = 'authenticated' AND (
    -- User is admin/instructor in tenant with simulation access
    tenant_id IN (
      SELECT tenant_users.tenant_id
      FROM tenant_users
      WHERE tenant_users.user_id = auth.uid() 
        AND tenant_users.role::text = ANY(ARRAY['admin'::varchar, 'instructor'::varchar]::text[])
    )
    OR
    -- User is participant in simulation
    id IN (
      SELECT t.simulation_id
      FROM tenants t
      JOIN simulation_users su ON su.simulation_tenant_id = t.id
      WHERE su.user_id = auth.uid() 
        AND t.tenant_type = 'simulation'
    )
  )
);

-- 2. SECURITY ENHANCEMENT: Fix overly permissive policies
-- Some policies use "true" which bypasses security entirely

-- Fix bowel_records - remove "true" policy and use proper nurse-based access
-- Note: bowel_records uses nurse_id, not tenant_id for access control
DROP POLICY IF EXISTS "Users can read all bowel records" ON public.bowel_records;

CREATE POLICY "bowel_records_nurse_access" ON public.bowel_records
FOR SELECT USING (
  -- Nurse can see their own records
  nurse_id = auth.uid()
  OR
  -- Super admin can see all records
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role = 'super_admin'
      AND user_profiles.is_active = true
  )
  OR
  -- Nurses in the same tenant can see each other's records
  EXISTS (
    SELECT 1 FROM tenant_users tu1
    JOIN tenant_users tu2 ON tu1.tenant_id = tu2.tenant_id
    WHERE tu1.user_id = auth.uid() 
      AND tu2.user_id = bowel_records.nurse_id
      AND tu1.is_active = true 
      AND tu2.is_active = true
  )
);

-- 3. PERFORMANCE OPTIMIZATION: Simplify complex COALESCE patterns
-- Replace complex COALESCE null-checking with simpler conditions

-- Example: medication_administrations policy optimization
DROP POLICY IF EXISTS "medication_administrations_tenant_access" ON public.medication_administrations;

CREATE POLICY "medication_administrations_secure_access" ON public.medication_administrations
FOR ALL USING (
  -- Super admin access
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
      AND role = 'super_admin' 
      AND is_active = true
  )
  OR
  -- Tenant user access to patients in their tenant
  patient_id IN (
    SELECT p.id::text
    FROM patients p
    JOIN tenant_users tu ON p.tenant_id = tu.tenant_id
    WHERE tu.user_id = auth.uid() 
      AND tu.is_active = true
  )
);

-- 4. CONSISTENCY: Standardize policy naming and structure
-- Ensure all tenant-based policies follow the same pattern

-- Example: Standardize patient_* table policies
-- All these tables should have consistent tenant isolation patterns

CREATE OR REPLACE FUNCTION create_tenant_isolation_policy(table_name text, policy_suffix text DEFAULT 'tenant_access')
RETURNS void AS $$
BEGIN
  EXECUTE format('
    DROP POLICY IF EXISTS "%s_consolidated_select" ON public.%s;
    DROP POLICY IF EXISTS "%s_consolidated_insert" ON public.%s;
    DROP POLICY IF EXISTS "%s_consolidated_update" ON public.%s;
    DROP POLICY IF EXISTS "%s_consolidated_delete" ON public.%s;
    
    CREATE POLICY "%s_%s" ON public.%s
    FOR ALL USING (
      -- Super admin access
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
          AND role = ''super_admin'' 
          AND is_active = true
      )
      OR
      -- Tenant user access
      tenant_id IN (
        SELECT tenant_users.tenant_id
        FROM tenant_users
        WHERE tenant_users.user_id = auth.uid() 
          AND tenant_users.is_active = true
      )
    )
    WITH CHECK (
      -- Super admin can insert/update anywhere
      EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE id = auth.uid() 
          AND role = ''super_admin'' 
          AND is_active = true
      )
      OR
      -- Regular users can only insert/update in their tenant
      tenant_id IN (
        SELECT tenant_users.tenant_id
        FROM tenant_users
        WHERE tenant_users.user_id = auth.uid() 
          AND tenant_users.is_active = true
      )
    );
  ', table_name, table_name, table_name, table_name, table_name, table_name, table_name, table_name, table_name, policy_suffix, table_name);
END;
$$ LANGUAGE plpgsql;

-- Apply standardized policies to patient-related tables (commented out for safety)
-- These tables already have working consolidated policies
-- Uncomment and test individually if you want to standardize them further:
-- SELECT create_tenant_isolation_policy('patient_alerts');
-- SELECT create_tenant_isolation_policy('patient_images'); 
-- SELECT create_tenant_isolation_policy('patient_medications');
-- SELECT create_tenant_isolation_policy('patient_notes');
-- SELECT create_tenant_isolation_policy('patient_vitals');

-- 5. SECURITY HARDENING: Remove overly broad policies
-- Fix simulation tables that allow "true" for everything

-- Secure simulation_patient_medications
-- Note: Replacing overly permissive "true" policy with authenticated user access only
-- The original policy allowed unrestricted access, now we require authentication
DROP POLICY IF EXISTS "Allow all operations on simulation_patient_medications" ON public.simulation_patient_medications;

CREATE POLICY "simulation_patient_medications_authenticated_access" ON public.simulation_patient_medications
FOR ALL USING (
  -- Require authentication (much safer than "true")
  auth.role() = 'authenticated'
);

-- Apply similar pattern to other simulation tables
DROP POLICY IF EXISTS "Allow all operations on simulation_patient_notes" ON public.simulation_patient_notes;
CREATE POLICY "simulation_patient_notes_authenticated_access" ON public.simulation_patient_notes
FOR ALL USING (
  -- Require authentication (much safer than "true")
  auth.role() = 'authenticated'
);

DROP POLICY IF EXISTS "Allow all operations on simulation_patient_vitals" ON public.simulation_patient_vitals;
CREATE POLICY "simulation_patient_vitals_authenticated_access" ON public.simulation_patient_vitals
FOR ALL USING (
  -- Require authentication (much safer than "true")  
  auth.role() = 'authenticated'
);

-- 6. AUDIT: Check for potential policy gaps
-- Verify all tables have appropriate RLS policies

SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count,
  STRING_AGG(policyname, ', ') as policies
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY policy_count ASC, tablename;

-- Check for tables without any RLS policies (potential security gaps)
SELECT 
  t.schemaname,
  t.tablename,
  t.rowsecurity as rls_enabled
FROM pg_tables t
LEFT JOIN pg_policies p ON p.tablename = t.tablename AND p.schemaname = t.schemaname
WHERE t.schemaname = 'public'
  AND p.policyname IS NULL
ORDER BY t.tablename;

-- 7. PERFORMANCE: Add indexes for commonly used policy conditions
-- These indexes will speed up RLS policy evaluation
-- Note: Run these separately if you want CONCURRENTLY option

-- Index for tenant_users lookups (most common pattern)
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_tenant_active 
ON tenant_users (user_id, tenant_id, is_active) 
WHERE is_active = true;

-- Index for user_profiles role checks
CREATE INDEX IF NOT EXISTS idx_user_profiles_role_active 
ON user_profiles (id, role, is_active) 
WHERE is_active = true;

-- Index for simulation-related lookups
CREATE INDEX IF NOT EXISTS idx_simulation_users_user_tenant 
ON simulation_users (user_id, simulation_tenant_id);

-- Clean up the helper function
DROP FUNCTION IF EXISTS create_tenant_isolation_policy(text, text);

COMMENT ON SCHEMA public IS 'RLS policies optimized for security and performance - removes overly permissive policies and consolidates redundant ones';