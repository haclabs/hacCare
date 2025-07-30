-- Migration: Create diabetic_records table
-- Description: Table for storing blood glucose and insulin administration records
-- Created: 2024

-- Create the diabetic_records table
CREATE TABLE IF NOT EXISTS diabetic_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    time_cbg_taken TIME NOT NULL,
    reading_type VARCHAR(10) NOT NULL CHECK (reading_type IN ('AC', 'PC', 'HS', 'AM', 'PRN')),
    glucose_reading DECIMAL(4,1) NOT NULL CHECK (glucose_reading >= 0 AND glucose_reading <= 50),
    
    -- Insulin administration data (stored as JSONB for flexibility)
    basal_insulin JSONB,
    bolus_insulin JSONB,
    correction_insulin JSONB,
    other_insulin JSONB,
    
    -- Clinical documentation
    treatments_given TEXT,
    comments_for_physician TEXT,
    signature VARCHAR(255) NOT NULL,
    prompt_frequency VARCHAR(10) NOT NULL DEFAULT 'Q6H',
    
    -- Metadata
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tenant_id UUID,
    
    -- Constraints
    CONSTRAINT fk_diabetic_records_patient FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE,
    CONSTRAINT fk_diabetic_records_created_by FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE RESTRICT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_diabetic_records_patient_id ON diabetic_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_diabetic_records_date ON diabetic_records(date);
CREATE INDEX IF NOT EXISTS idx_diabetic_records_patient_date ON diabetic_records(patient_id, date);
CREATE INDEX IF NOT EXISTS idx_diabetic_records_tenant_id ON diabetic_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_diabetic_records_created_at ON diabetic_records(created_at);

-- Add RLS (Row Level Security) policies
ALTER TABLE diabetic_records ENABLE ROW LEVEL SECURITY;

-- Policy for users to view records for their tenant's patients
CREATE POLICY "Users can view diabetic records for their tenant" ON diabetic_records
    FOR SELECT USING (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );

-- Policy for users to insert records for their tenant's patients  
CREATE POLICY "Users can insert diabetic records for their tenant" ON diabetic_records
    FOR INSERT WITH CHECK (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
    );

-- Policy for users to update records they created within their tenant
CREATE POLICY "Users can update their own diabetic records within tenant" ON diabetic_records
    FOR UPDATE USING (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid AND
        created_by = auth.uid()
    );

-- Policy for authorized users to delete records within their tenant
CREATE POLICY "Authorized users can delete diabetic records within tenant" ON diabetic_records
    FOR DELETE USING (
        tenant_id = (auth.jwt() ->> 'tenant_id')::uuid AND
        (
            created_by = auth.uid() OR
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE user_id = auth.uid() 
                AND tenant_id = diabetic_records.tenant_id 
                AND role IN ('admin', 'supervisor', 'physician')
            )
        )
    );

-- Add trigger to automatically set tenant_id on insert
CREATE OR REPLACE FUNCTION set_diabetic_record_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Set tenant_id from JWT if not provided
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
    END IF;
    
    -- Validate patient belongs to the same tenant
    IF NOT EXISTS (
        SELECT 1 FROM patients 
        WHERE patient_id = NEW.patient_id 
        AND tenant_id = NEW.tenant_id
    ) THEN
        RAISE EXCEPTION 'Patient does not belong to the specified tenant';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_set_diabetic_record_tenant_id
    BEFORE INSERT ON diabetic_records
    FOR EACH ROW
    EXECUTE FUNCTION set_diabetic_record_tenant_id();

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_diabetic_record_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_diabetic_record_updated_at
    BEFORE UPDATE ON diabetic_records
    FOR EACH ROW
    EXECUTE FUNCTION update_diabetic_record_updated_at();

-- Add comments for documentation
COMMENT ON TABLE diabetic_records IS 'Blood glucose and subcutaneous insulin administration records for diabetic patients';
COMMENT ON COLUMN diabetic_records.patient_id IS 'References the patient this record belongs to';
COMMENT ON COLUMN diabetic_records.date IS 'Date when the glucose reading was taken';
COMMENT ON COLUMN diabetic_records.time_cbg_taken IS 'Time when the capillary blood glucose was taken';
COMMENT ON COLUMN diabetic_records.reading_type IS 'Type of reading: AC (before meals), PC (after meals), HS (hour of sleep), AM (morning), PRN (as needed)';
COMMENT ON COLUMN diabetic_records.glucose_reading IS 'Blood glucose reading in mmol/L';
COMMENT ON COLUMN diabetic_records.basal_insulin IS 'Basal insulin administration details (type, units, time, site) as JSON';
COMMENT ON COLUMN diabetic_records.bolus_insulin IS 'Bolus insulin administration details (type, units, time, site) as JSON';
COMMENT ON COLUMN diabetic_records.correction_insulin IS 'Correction insulin administration details (type, units, time, site) as JSON';
COMMENT ON COLUMN diabetic_records.other_insulin IS 'Other insulin administration details (type, units, time, site) as JSON';
COMMENT ON COLUMN diabetic_records.treatments_given IS 'Free text description of treatments provided';
COMMENT ON COLUMN diabetic_records.comments_for_physician IS 'Notes or observations for physician review';
COMMENT ON COLUMN diabetic_records.signature IS 'Name of the nurse or healthcare provider who administered care';
COMMENT ON COLUMN diabetic_records.prompt_frequency IS 'How often glucose monitoring should be performed (Q6H, Q4H, etc.)';

-- Example insulin JSON structure:
-- {
--   "type": "LANTUS",
--   "category": "Basal",
--   "units": 24.0,
--   "timeAdministered": "08:00",
--   "injectionSite": "Left thigh"
-- }
