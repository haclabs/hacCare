-- Apply device_assessments RLS fix
DROP POLICY IF EXISTS device_assessments_tenant_isolation ON device_assessments;

CREATE POLICY device_assessments_tenant_isolation
  ON device_assessments
  FOR ALL
  TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

ALTER TABLE device_assessments ENABLE ROW LEVEL SECURITY;
