-- Migration: Update patient_notes table for clinical assessments and notes
-- This table stores nursing assessments, clinical notes, and other patient documentation

-- Add missing columns to existing patient_notes table
-- These will only be added if they don't already exist

-- Add type column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_notes' AND column_name='type') THEN
    ALTER TABLE patient_notes ADD COLUMN type TEXT NOT NULL DEFAULT 'Note';
  END IF;
END $$;

-- Add nurse_name column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_notes' AND column_name='nurse_name') THEN
    ALTER TABLE patient_notes ADD COLUMN nurse_name TEXT;
  END IF;
END $$;

-- Add nurse_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_notes' AND column_name='nurse_id') THEN
    ALTER TABLE patient_notes ADD COLUMN nurse_id TEXT;
  END IF;
END $$;

-- Add tenant_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_notes' AND column_name='tenant_id') THEN
    ALTER TABLE patient_notes ADD COLUMN tenant_id UUID;
  END IF;
END $$;

-- Add priority column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_notes' AND column_name='priority') THEN
    ALTER TABLE patient_notes ADD COLUMN priority TEXT DEFAULT 'Medium';
  END IF;
END $$;

-- Create index on patient_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_patient_notes_patient_id ON patient_notes(patient_id);

-- Create index on type for filtering
CREATE INDEX IF NOT EXISTS idx_patient_notes_type ON patient_notes(type);

-- Create index on tenant_id for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_patient_notes_tenant_id ON patient_notes(tenant_id);

-- Enable RLS
ALTER TABLE patient_notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view notes for their tenant" ON patient_notes;
DROP POLICY IF EXISTS "Users can insert notes for their tenant" ON patient_notes;
DROP POLICY IF EXISTS "Users can update notes for their tenant" ON patient_notes;
DROP POLICY IF EXISTS "Users can delete notes for their tenant" ON patient_notes;

-- Create RLS policies for tenant isolation
-- Using user_profiles to match the auto_set_tenant_id trigger
CREATE POLICY "Users can view notes for their tenant" ON patient_notes
  FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can insert notes for their tenant" ON patient_notes
  FOR INSERT
  WITH CHECK (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update notes for their tenant" ON patient_notes
  FOR UPDATE
  USING (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can delete notes for their tenant" ON patient_notes
  FOR DELETE
  USING (
    tenant_id = (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_patient_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_patient_notes_updated_at ON patient_notes;
CREATE TRIGGER set_patient_notes_updated_at
  BEFORE UPDATE ON patient_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_patient_notes_updated_at();

-- Comments for documentation
COMMENT ON TABLE patient_notes IS 'Stores clinical assessments, nursing notes, and patient documentation';
COMMENT ON COLUMN patient_notes.type IS 'Type of note: Assessment, Progress Note, Shift Note, etc.';
COMMENT ON COLUMN patient_notes.priority IS 'Priority level: Low, Medium, High, Critical';
COMMENT ON COLUMN patient_notes.tenant_id IS 'Auto-set by trigger based on patient tenant';
