-- Fix lab_panels RLS policies to allow super admins to work with any tenant
-- This fixes the 403 error when super admins switch to simulation templates

-- Drop existing policies
DROP POLICY IF EXISTS "lab_panels_insert" ON lab_panels;
DROP POLICY IF EXISTS "lab_panels_update" ON lab_panels;
DROP POLICY IF EXISTS "lab_panels_delete" ON lab_panels;

-- Recreate with super admin bypass
-- lab_panels: insert for admins in same tenant OR super admins
CREATE POLICY "lab_panels_insert" ON lab_panels
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Super admins can insert into any tenant
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
    OR
    -- Regular admins can only insert into their assigned tenants
    (
      tenant_id IN (
        SELECT tenant_id FROM user_tenant_cache
        WHERE user_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'admin'
      )
    )
  );

CREATE POLICY "lab_panels_update" ON lab_panels
  FOR UPDATE TO authenticated
  USING (
    -- Super admins can update in any tenant
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
    OR
    -- Regular admins can only update in their assigned tenants
    (
      tenant_id IN (
        SELECT tenant_id FROM user_tenant_cache
        WHERE user_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'admin'
      )
    )
  );

CREATE POLICY "lab_panels_delete" ON lab_panels
  FOR DELETE TO authenticated
  USING (
    -- Super admins can delete from any tenant
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
    OR
    -- Regular admins can only delete from their assigned tenants
    (
      tenant_id IN (
        SELECT tenant_id FROM user_tenant_cache
        WHERE user_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'admin'
      )
    )
  );

-- Also update lab_results policies for consistency
DROP POLICY IF EXISTS "lab_results_insert" ON lab_results;
DROP POLICY IF EXISTS "lab_results_update" ON lab_results;
DROP POLICY IF EXISTS "lab_results_delete" ON lab_results;

CREATE POLICY "lab_results_insert" ON lab_results
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Super admins can insert into any tenant
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
    OR
    -- Regular admins can only insert into their assigned tenants
    (
      tenant_id IN (
        SELECT tenant_id FROM user_tenant_cache
        WHERE user_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'admin'
      )
    )
  );

CREATE POLICY "lab_results_update" ON lab_results
  FOR UPDATE TO authenticated
  USING (
    -- Super admins can update in any tenant
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
    OR
    -- Regular admins can update in their assigned tenants
    (
      tenant_id IN (
        SELECT tenant_id FROM user_tenant_cache
        WHERE user_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'admin'
      )
    )
    OR
    -- Nurses/students can only update their own acknowledgements
    (
      tenant_id IN (
        SELECT tenant_id FROM user_tenant_cache
        WHERE user_id = auth.uid()
      )
      AND ack_by = auth.uid()
      AND ack_at IS NOT NULL
    )
  );

CREATE POLICY "lab_results_delete" ON lab_results
  FOR DELETE TO authenticated
  USING (
    -- Super admins can delete from any tenant
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
    OR
    -- Regular admins can only delete from their assigned tenants
    (
      tenant_id IN (
        SELECT tenant_id FROM user_tenant_cache
        WHERE user_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'admin'
      )
    )
  );

-- Update lab_ack_events for super admin as well
DROP POLICY IF EXISTS "lab_ack_events_insert" ON lab_ack_events;

CREATE POLICY "lab_ack_events_insert" ON lab_ack_events
  FOR INSERT TO authenticated
  WITH CHECK (
    -- Super admins can insert into any tenant
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
    OR
    -- Regular users can only insert into their assigned tenants
    (
      tenant_id IN (
        SELECT tenant_id FROM user_tenant_cache
        WHERE user_id = auth.uid()
      )
      AND ack_by = auth.uid()
    )
  );

COMMENT ON POLICY "lab_panels_insert" ON lab_panels IS 'Super admins can insert into any tenant, regular admins only their assigned tenants';
COMMENT ON POLICY "lab_results_insert" ON lab_results IS 'Super admins can insert into any tenant, regular admins only their assigned tenants';
