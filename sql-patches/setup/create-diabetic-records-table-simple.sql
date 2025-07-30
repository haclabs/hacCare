-- Migration: Create diabetic_records table (Following patient_vitals format)
-- Description: Table for storing blood glucose and insulin administration records
-- Created: 2025-07-30

-- Create the diabetic_records table
CREATE TABLE IF NOT EXISTS diabetic_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    recorded_by UUID REFERENCES user_profiles(id),
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
    
    -- Metadata (following patient_vitals pattern)
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_diabetic_records_patient_id ON diabetic_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_diabetic_records_tenant_id ON diabetic_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_diabetic_records_date ON diabetic_records(date);
CREATE INDEX IF NOT EXISTS idx_diabetic_records_patient_date ON diabetic_records(patient_id, date);
CREATE INDEX IF NOT EXISTS idx_diabetic_records_recorded_at ON diabetic_records(recorded_at);

-- Add comments for documentation
COMMENT ON TABLE diabetic_records IS 'Blood glucose and subcutaneous insulin administration records for diabetic patients';
COMMENT ON COLUMN diabetic_records.patient_id IS 'References the patient this record belongs to';
COMMENT ON COLUMN diabetic_records.tenant_id IS 'References the tenant this record belongs to';
COMMENT ON COLUMN diabetic_records.recorded_by IS 'References the user who recorded this entry';
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
COMMENT ON COLUMN diabetic_records.recorded_at IS 'Timestamp when this record was created';
COMMENT ON COLUMN diabetic_records.created_at IS 'Timestamp when this record was first created';

-- Example insulin JSON structure:
-- {
--   "type": "LANTUS",
--   "category": "Basal",
--   "units": 24.0,
--   "timeAdministered": "08:00",
--   "injectionSite": "Left thigh"
-- }
