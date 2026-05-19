-- ============================================================================
-- Migration: Create wound_assessments table for hacMap assessment tracking
-- Description: Allows tracking of device and wound assessments over time
-- Author: System
-- Date: 2025-11-16
-- ============================================================================

-- Create wound_assessments table
CREATE TABLE IF NOT EXISTS wound_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links to device OR wound (one must be set)
  device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
  wound_id UUID REFERENCES wounds(id) ON DELETE CASCADE,
  
  -- Patient and tenant
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  
  -- Assessment metadata
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  student_name TEXT NOT NULL,
  
  -- Common assessment fields (applicable to both devices and wounds)
  site_condition TEXT, -- For devices: IV site condition, For wounds: surrounding skin
  pain_level INTEGER CHECK (pain_level >= 0 AND pain_level <= 10),
  notes TEXT,
  
  -- Wound-specific measurements
  wound_length_cm DECIMAL(5,2),
  wound_width_cm DECIMAL(5,2),
  wound_depth_cm DECIMAL(5,2),
  
  -- Wound-specific appearance
  wound_appearance TEXT, -- e.g., 'clean', 'granulating', 'necrotic', 'infected'
  drainage_type TEXT[], -- e.g., ['serous', 'sanguineous']
  drainage_amount TEXT, -- e.g., 'scant', 'moderate', 'copious'
  surrounding_skin TEXT, -- e.g., 'intact', 'macerated', 'erythematous'
  
  -- Treatment tracking
  treatment_applied TEXT, -- What treatment was performed
  dressing_type TEXT, -- Type of dressing applied
  
  -- Device-specific fields
  device_functioning BOOLEAN, -- Is device patent/working properly?
  output_amount_ml INTEGER, -- For drains/tubes
  
  -- Audit fields
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT wound_assessments_link_check CHECK (
    (device_id IS NOT NULL AND wound_id IS NULL) OR
    (device_id IS NULL AND wound_id IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX idx_wound_assessments_device_id ON wound_assessments(device_id);
CREATE INDEX idx_wound_assessments_wound_id ON wound_assessments(wound_id);
CREATE INDEX idx_wound_assessments_patient_id ON wound_assessments(patient_id);
CREATE INDEX idx_wound_assessments_tenant_id ON wound_assessments(tenant_id);
CREATE INDEX idx_wound_assessments_assessed_at ON wound_assessments(assessed_at DESC);
CREATE INDEX idx_wound_assessments_student_name ON wound_assessments(student_name);

-- Add comments
COMMENT ON TABLE wound_assessments IS 'Tracks device and wound assessments over time for monitoring and documentation';
COMMENT ON COLUMN wound_assessments.device_id IS 'Links to device being assessed (NULL if wound assessment)';
COMMENT ON COLUMN wound_assessments.wound_id IS 'Links to wound being assessed (NULL if device assessment)';
COMMENT ON COLUMN wound_assessments.student_name IS 'Name of student who performed the assessment (for debrief tracking)';
COMMENT ON COLUMN wound_assessments.site_condition IS 'Condition of IV site (devices) or surrounding skin (wounds)';
COMMENT ON COLUMN wound_assessments.device_functioning IS 'Is the device patent and functioning properly?';
COMMENT ON COLUMN wound_assessments.output_amount_ml IS 'Amount of drainage from device (for drains, tubes, catheters)';

-- Enable RLS
ALTER TABLE wound_assessments ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for tenant isolation
CREATE POLICY wound_assessments_tenant_isolation ON wound_assessments
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- Grant permissions
GRANT ALL ON wound_assessments TO authenticated;

-- Create updated_at trigger
CREATE TRIGGER update_wound_assessments_updated_at
  BEFORE UPDATE ON wound_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON POLICY wound_assessments_tenant_isolation ON wound_assessments IS 'Ensures assessments are isolated by tenant';
