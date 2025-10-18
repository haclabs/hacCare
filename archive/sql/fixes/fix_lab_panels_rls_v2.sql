-- Alternative fix: Simplified RLS for lab_panels with super admin support
-- This version uses simpler logic and ensures super admins have full access

-- First, let's completely drop and recreate ALL lab_panels policies
DROP POLICY IF EXISTS "lab_panels_select" ON lab_panels;
DROP POLICY IF EXISTS "lab_panels_insert" ON lab_panels;
DROP POLICY IF EXISTS "lab_panels_update" ON lab_panels;
DROP POLICY IF EXISTS "lab_panels_delete" ON lab_panels;

-- SELECT: Super admins see all, others see their tenant
CREATE POLICY "lab_panels_select" ON lab_panels
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
    OR
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_cache
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: Super admins and admins can insert
CREATE POLICY "lab_panels_insert" ON lab_panels
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (
          up.role = 'admin'
          AND tenant_id IN (
            SELECT tenant_id FROM user_tenant_cache
            WHERE user_id = auth.uid()
          )
        )
      )
    )
  );

-- UPDATE: Super admins and admins can update
CREATE POLICY "lab_panels_update" ON lab_panels
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (
          up.role = 'admin'
          AND tenant_id IN (
            SELECT tenant_id FROM user_tenant_cache
            WHERE user_id = auth.uid()
          )
        )
      )
    )
  );

-- DELETE: Super admins and admins can delete
CREATE POLICY "lab_panels_delete" ON lab_panels
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (
          up.role = 'admin'
          AND tenant_id IN (
            SELECT tenant_id FROM user_tenant_cache
            WHERE user_id = auth.uid()
          )
        )
      )
    )
  );

-- Do the same for lab_results
DROP POLICY IF EXISTS "lab_results_select" ON lab_results;
DROP POLICY IF EXISTS "lab_results_insert" ON lab_results;
DROP POLICY IF EXISTS "lab_results_update" ON lab_results;
DROP POLICY IF EXISTS "lab_results_delete" ON lab_results;

CREATE POLICY "lab_results_select" ON lab_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
    OR
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_cache
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "lab_results_insert" ON lab_results
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (
          up.role = 'admin'
          AND tenant_id IN (
            SELECT tenant_id FROM user_tenant_cache
            WHERE user_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "lab_results_update" ON lab_results
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (
          up.role = 'admin'
          AND tenant_id IN (
            SELECT tenant_id FROM user_tenant_cache
            WHERE user_id = auth.uid()
          )
        )
        OR (
          -- Allow nurses/students to update acknowledgements
          ack_by = auth.uid()
        )
      )
    )
  );

CREATE POLICY "lab_results_delete" ON lab_results
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (
          up.role = 'admin'
          AND tenant_id IN (
            SELECT tenant_id FROM user_tenant_cache
            WHERE user_id = auth.uid()
          )
        )
      )
    )
  );

-- Update lab_ack_events
DROP POLICY IF EXISTS "lab_ack_events_select" ON lab_ack_events;
DROP POLICY IF EXISTS "lab_ack_events_insert" ON lab_ack_events;

CREATE POLICY "lab_ack_events_select" ON lab_ack_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
    OR
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_cache
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "lab_ack_events_insert" ON lab_ack_events
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'super_admin'
    )
    OR
    (
      tenant_id IN (
        SELECT tenant_id FROM user_tenant_cache
        WHERE user_id = auth.uid()
      )
      AND ack_by = auth.uid()
    )
  );

-- Add helpful comments
COMMENT ON POLICY "lab_panels_insert" ON lab_panels IS 
  'Super admins bypass tenant check, regular admins must be in tenant cache';
COMMENT ON POLICY "lab_results_insert" ON lab_results IS 
  'Super admins bypass tenant check, regular admins must be in tenant cache';

-- Verify the policies were created
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('lab_panels', 'lab_results', 'lab_ack_events')
ORDER BY tablename, cmd, policyname;
