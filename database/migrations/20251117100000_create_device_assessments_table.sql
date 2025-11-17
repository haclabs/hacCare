-- =====================================================
-- CREATE DEVICE ASSESSMENTS TABLE
-- =====================================================
-- Device-specific assessment tracking (separate from wounds)
-- Supports IV, Foley, Feeding Tube, Chest Tube, Drains, etc.
-- Uses JSONB for device-type-specific fields
-- =====================================================

CREATE TABLE IF NOT EXISTS device_assessments (
  -- Primary Key
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Multi-tenant isolation
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Patient & Device references
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  device_id uuid NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  
  -- Assessment metadata
  assessed_at timestamptz NOT NULL DEFAULT NOW(),
  student_name text NOT NULL, -- Required for grading/debrief
  
  -- Device type (cached from devices table for quick queries)
  device_type text NOT NULL,
  
  -- Common assessment fields
  status text, -- Normal, Monitor, Intervention Required, Discontinued
  output_amount_ml numeric(10,2), -- For drains, Foley, chest tubes
  notes text,
  
  -- Device-specific assessment data (JSONB for flexibility)
  -- IV: site assessment, infiltration, line status, dressing
  -- Foley: patency, urine output, CAUTI risk
  -- Feeding Tube: placement verification, residuals, tolerance
  -- Chest Tube: suction, tidaling, air leak
  -- Drain: drainage character, reservoir status
  assessment_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_device_assessments_device_id 
  ON device_assessments(device_id);

CREATE INDEX IF NOT EXISTS idx_device_assessments_patient_id 
  ON device_assessments(patient_id);

CREATE INDEX IF NOT EXISTS idx_device_assessments_tenant_id 
  ON device_assessments(tenant_id);

-- Query optimization indexes
CREATE INDEX IF NOT EXISTS idx_device_assessments_device_type 
  ON device_assessments(device_type);

CREATE INDEX IF NOT EXISTS idx_device_assessments_assessed_at 
  ON device_assessments(assessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_device_assessments_student_name 
  ON device_assessments(student_name);

-- JSONB index for querying assessment_data
CREATE INDEX IF NOT EXISTS idx_device_assessments_data 
  ON device_assessments USING GIN (assessment_data);

-- =====================================================
-- ROW-LEVEL SECURITY
-- =====================================================

ALTER TABLE device_assessments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users - tenant isolation at application level
-- Application explicitly passes tenant_id in all queries
CREATE POLICY device_assessments_allow_authenticated
  ON device_assessments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_device_assessments_updated_at
  BEFORE UPDATE ON device_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE device_assessments IS 
'Device assessment records with device-type-specific data stored in JSONB. Separate from wound_assessments for cleaner architecture and better querying.';

COMMENT ON COLUMN device_assessments.device_id IS 
'Reference to devices table - NOT NULL (separate from wounds)';

COMMENT ON COLUMN device_assessments.device_type IS 
'Cached device type from devices table for quick filtering (iv-peripheral, foley, feeding-tube, etc.)';

COMMENT ON COLUMN device_assessments.student_name IS 
'Name of student who performed the assessment (required for grading and debrief tracking)';

COMMENT ON COLUMN device_assessments.assessment_data IS 
'Device-type-specific assessment fields stored as JSONB. Structure varies by device_type (IV: site assessment, infiltration; Foley: patency, CAUTI; Feeding Tube: placement, tolerance)';

COMMENT ON COLUMN device_assessments.output_amount_ml IS 
'Output measurement for devices that produce output (drains, Foley, chest tubes)';

-- =====================================================
-- GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON device_assessments TO authenticated;
