-- Lab Results Management System
-- Multi-tenant labs with categories (Chemistry, ABG, Hematology)
-- Supports sex-specific reference ranges and critical flagging

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE lab_category AS ENUM ('chemistry', 'abg', 'hematology');
CREATE TYPE lab_panel_status AS ENUM ('new', 'partial_ack', 'acknowledged');
CREATE TYPE lab_flag AS ENUM ('normal', 'abnormal_high', 'abnormal_low', 'critical_high', 'critical_low');
CREATE TYPE ref_operator AS ENUM ('between', '>=', '<=', 'sex-specific');
CREATE TYPE ack_scope AS ENUM ('panel', 'result');

-- ============================================================================
-- TABLES
-- ============================================================================

-- Reference ranges (master list seeded from diagnostics sheets)
CREATE TABLE IF NOT EXISTS lab_result_refs (
  test_code TEXT PRIMARY KEY,
  category lab_category NOT NULL,
  test_name TEXT NOT NULL,
  units TEXT,
  ref_low NUMERIC(12,4),
  ref_high NUMERIC(12,4),
  ref_operator ref_operator DEFAULT 'between',
  sex_ref JSONB,  -- {"male": {"low": x, "high": y}, "female": {"low": x, "high": y}}
  critical_low NUMERIC(12,4),
  critical_high NUMERIC(12,4),
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE lab_result_refs IS 'Master reference ranges for lab tests';
COMMENT ON COLUMN lab_result_refs.sex_ref IS 'Sex-specific ranges in JSON format';

-- Lab panels (collection/batch of labs)
CREATE TABLE IF NOT EXISTS lab_panels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  panel_time TIMESTAMPTZ NOT NULL,
  source TEXT,  -- 'manual entry', 'import', etc.
  entered_by UUID REFERENCES auth.users(id),
  status lab_panel_status DEFAULT 'new',
  ack_required BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lab_panels_tenant_patient ON lab_panels(tenant_id, patient_id);
CREATE INDEX idx_lab_panels_status ON lab_panels(status);
CREATE INDEX idx_lab_panels_panel_time ON lab_panels(panel_time DESC);

COMMENT ON TABLE lab_panels IS 'Lab panel batches with acknowledgement tracking';

-- Lab results (individual analytes)
CREATE TABLE IF NOT EXISTS lab_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  panel_id UUID NOT NULL REFERENCES lab_panels(id) ON DELETE CASCADE,
  category lab_category NOT NULL,
  test_code TEXT NOT NULL,
  test_name TEXT NOT NULL,
  value NUMERIC(12,4),
  units TEXT,
  ref_low NUMERIC(12,4),
  ref_high NUMERIC(12,4),
  ref_operator ref_operator DEFAULT 'between',
  sex_ref JSONB,
  critical_low NUMERIC(12,4),
  critical_high NUMERIC(12,4),
  flag lab_flag DEFAULT 'normal',
  entered_by UUID REFERENCES auth.users(id),
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  ack_by UUID REFERENCES auth.users(id),
  ack_at TIMESTAMPTZ,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lab_results_tenant_patient ON lab_results(tenant_id, patient_id);
CREATE INDEX idx_lab_results_panel ON lab_results(panel_id);
CREATE INDEX idx_lab_results_category ON lab_results(category);
CREATE INDEX idx_lab_results_flag ON lab_results(flag);
CREATE INDEX idx_lab_results_ack ON lab_results(ack_by, ack_at) WHERE ack_at IS NULL;

COMMENT ON TABLE lab_results IS 'Individual lab test results with reference ranges';
COMMENT ON COLUMN lab_results.flag IS 'Auto-computed from value vs reference range';

-- Acknowledgement audit log
CREATE TABLE IF NOT EXISTS lab_ack_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL,
  panel_id UUID NOT NULL REFERENCES lab_panels(id) ON DELETE CASCADE,
  ack_scope ack_scope NOT NULL,
  ack_by UUID NOT NULL REFERENCES auth.users(id),
  ack_at TIMESTAMPTZ DEFAULT NOW(),
  abnormal_summary JSONB,  -- [{test_code, value, flag}]
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lab_ack_events_tenant_patient ON lab_ack_events(tenant_id, patient_id);
CREATE INDEX idx_lab_ack_events_panel ON lab_ack_events(panel_id);
CREATE INDEX idx_lab_ack_events_ack_by ON lab_ack_events(ack_by);

COMMENT ON TABLE lab_ack_events IS 'Audit log for lab acknowledgements';

-- ============================================================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_lab_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lab_result_refs_updated_at
  BEFORE UPDATE ON lab_result_refs
  FOR EACH ROW
  EXECUTE FUNCTION update_lab_updated_at();

CREATE TRIGGER update_lab_panels_updated_at
  BEFORE UPDATE ON lab_panels
  FOR EACH ROW
  EXECUTE FUNCTION update_lab_updated_at();

CREATE TRIGGER update_lab_results_updated_at
  BEFORE UPDATE ON lab_results
  FOR EACH ROW
  EXECUTE FUNCTION update_lab_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE lab_panels ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_ack_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_result_refs ENABLE ROW LEVEL SECURITY;

-- lab_result_refs: read by all authenticated users
CREATE POLICY "lab_result_refs_select" ON lab_result_refs
  FOR SELECT TO authenticated
  USING (true);

-- lab_result_refs: only admins can modify
CREATE POLICY "lab_result_refs_modify" ON lab_result_refs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- lab_panels: select for users in same tenant
CREATE POLICY "lab_panels_select" ON lab_panels
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_cache
      WHERE user_id = auth.uid()
    )
  );

-- lab_panels: insert/update/delete for admins in same tenant
CREATE POLICY "lab_panels_insert" ON lab_panels
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_cache
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "lab_panels_update" ON lab_panels
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_cache
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "lab_panels_delete" ON lab_panels
  FOR DELETE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_cache
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- lab_results: select for users in same tenant
CREATE POLICY "lab_results_select" ON lab_results
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_cache
      WHERE user_id = auth.uid()
    )
  );

-- lab_results: insert/update for admins OR acknowledge for nurses/students
CREATE POLICY "lab_results_insert" ON lab_results
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_cache
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "lab_results_update" ON lab_results
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_cache
      WHERE user_id = auth.uid()
    )
    AND (
      -- Admins can update everything
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role IN ('admin', 'super_admin')
      )
      -- Nurses/students can only update ack fields
      OR (
        ack_by = auth.uid()
        AND ack_at IS NOT NULL
      )
    )
  );

CREATE POLICY "lab_results_delete" ON lab_results
  FOR DELETE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_cache
      WHERE user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- lab_ack_events: select and insert for users in same tenant
CREATE POLICY "lab_ack_events_select" ON lab_ack_events
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_cache
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "lab_ack_events_insert" ON lab_ack_events
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM user_tenant_cache
      WHERE user_id = auth.uid()
    )
    AND ack_by = auth.uid()
  );

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update panel status based on results acknowledgement
CREATE OR REPLACE FUNCTION update_lab_panel_status()
RETURNS TRIGGER AS $$
DECLARE
  v_total_results INTEGER;
  v_acked_results INTEGER;
BEGIN
  -- Count total and acknowledged results for this panel
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE ack_at IS NOT NULL)
  INTO v_total_results, v_acked_results
  FROM lab_results
  WHERE panel_id = COALESCE(NEW.panel_id, OLD.panel_id);

  -- Update panel status
  IF v_acked_results = 0 THEN
    UPDATE lab_panels SET status = 'new' WHERE id = COALESCE(NEW.panel_id, OLD.panel_id);
  ELSIF v_acked_results < v_total_results THEN
    UPDATE lab_panels SET status = 'partial_ack' WHERE id = COALESCE(NEW.panel_id, OLD.panel_id);
  ELSE
    UPDATE lab_panels SET status = 'acknowledged' WHERE id = COALESCE(NEW.panel_id, OLD.panel_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_panel_status_on_result_ack
  AFTER UPDATE OF ack_at ON lab_results
  FOR EACH ROW
  EXECUTE FUNCTION update_lab_panel_status();

COMMENT ON FUNCTION update_lab_panel_status IS 'Auto-update panel status when results are acknowledged';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON lab_panels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON lab_results TO authenticated;
GRANT SELECT, INSERT ON lab_ack_events TO authenticated;
GRANT SELECT ON lab_result_refs TO authenticated;
