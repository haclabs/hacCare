-- Create medication_administrations table for tracking medication administration records
-- This table stores records when medications are administered to patients

CREATE TABLE IF NOT EXISTS medication_administrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    administered_by TEXT NOT NULL,
    administered_by_id TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    dosage TEXT,
    route TEXT,
    status TEXT CHECK (status IN ('completed', 'missed', 'late', 'partial')) DEFAULT 'completed',
    medication_name TEXT, -- Fallback field for medication name
    tenant_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints if patient_medications table exists
-- (Commented out for now since we're using TEXT IDs that may not match primary keys)
-- ALTER TABLE medication_administrations 
-- ADD CONSTRAINT fk_medication_administrations_patient 
-- FOREIGN KEY (patient_id) REFERENCES patients(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_medication_administrations_patient_id ON medication_administrations(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_administrations_medication_id ON medication_administrations(medication_id);
CREATE INDEX IF NOT EXISTS idx_medication_administrations_timestamp ON medication_administrations(timestamp);
CREATE INDEX IF NOT EXISTS idx_medication_administrations_tenant_id ON medication_administrations(tenant_id);

-- Enable Row Level Security
ALTER TABLE medication_administrations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see administrations from their tenant
CREATE POLICY medication_administrations_tenant_isolation ON medication_administrations
    FOR ALL USING (
        tenant_id = get_user_tenant_direct(auth.uid()::text)
        OR is_super_admin_direct(auth.uid()::text)
    );

-- RLS Policy: Allow inserts with tenant_id automatically set
CREATE POLICY medication_administrations_insert ON medication_administrations
    FOR INSERT WITH CHECK (
        tenant_id = get_user_tenant_direct(auth.uid()::text)
        OR is_super_admin_direct(auth.uid()::text)
    );

-- Create trigger to automatically set tenant_id on insert
CREATE OR REPLACE FUNCTION set_medication_administration_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Set tenant_id if not provided
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := get_user_tenant_direct(auth.uid()::text);
    END IF;
    
    -- Update the updated_at timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_set_medication_administration_tenant_id
    BEFORE INSERT OR UPDATE ON medication_administrations
    FOR EACH ROW EXECUTE FUNCTION set_medication_administration_tenant_id();

-- Grant permissions
GRANT ALL ON medication_administrations TO authenticated;
GRANT USAGE ON SEQUENCE medication_administrations_id_seq TO authenticated;

-- Create a view for easier querying with medication details
CREATE OR REPLACE VIEW medication_administrations_with_details AS
SELECT 
    ma.*,
    pm.name as medication_display_name,
    pm.dosage as medication_dosage,
    pm.route as medication_route,
    pm.frequency as medication_frequency
FROM medication_administrations ma
LEFT JOIN patient_medications pm ON ma.medication_id = pm.id;

-- Grant access to the view
GRANT SELECT ON medication_administrations_with_details TO authenticated;

COMMENT ON TABLE medication_administrations IS 'Records of medication administrations to patients, including BCMA and manual entries';
COMMENT ON COLUMN medication_administrations.medication_id IS 'ID of the medication from patient_medications table';
COMMENT ON COLUMN medication_administrations.patient_id IS 'ID of the patient who received the medication';
COMMENT ON COLUMN medication_administrations.administered_by IS 'Name of the person who administered the medication';
COMMENT ON COLUMN medication_administrations.administered_by_id IS 'User ID of the person who administered the medication';
COMMENT ON COLUMN medication_administrations.timestamp IS 'When the medication was administered';
COMMENT ON COLUMN medication_administrations.status IS 'Status of the administration (completed, missed, late, partial)';
