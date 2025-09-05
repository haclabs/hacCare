-- Create bowel_records table for patient bowel movement tracking
-- This table stores bowel movement records with detailed assessment data

CREATE TABLE IF NOT EXISTS bowel_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    nurse_id UUID NOT NULL,
    nurse_name TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Bowel Assessment Fields
    bowel_incontinence TEXT NOT NULL CHECK (bowel_incontinence IN ('Continent', 'Incontinent', 'Partial')),
    stool_appearance TEXT NOT NULL CHECK (stool_appearance IN ('Normal', 'Abnormal', 'Blood present', 'Mucus present')),
    stool_consistency TEXT NOT NULL CHECK (stool_consistency IN ('Formed', 'Loose', 'Watery', 'Hard', 'Soft')),
    stool_colour TEXT NOT NULL CHECK (stool_colour IN ('Brown', 'Green', 'Yellow', 'Black', 'Red', 'Clay colored')),
    stool_amount TEXT NOT NULL CHECK (stool_amount IN ('Small', 'Moderate', 'Large', 'None')),
    
    -- Additional notes
    notes TEXT NOT NULL DEFAULT '',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_bowel_records_patient_id ON bowel_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_bowel_records_recorded_at ON bowel_records(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_bowel_records_nurse_id ON bowel_records(nurse_id);

-- Create RLS (Row Level Security) policies
ALTER TABLE bowel_records ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all bowel records
CREATE POLICY "Users can read all bowel records" ON bowel_records
    FOR SELECT 
    USING (true);

-- Policy: Users can insert bowel records
CREATE POLICY "Users can insert bowel records" ON bowel_records
    FOR INSERT 
    WITH CHECK (true);

-- Policy: Users can update their own bowel records
CREATE POLICY "Users can update their own bowel records" ON bowel_records
    FOR UPDATE 
    USING (nurse_id = auth.uid())
    WITH CHECK (nurse_id = auth.uid());

-- Policy: Users can delete their own bowel records (optional - you may want to restrict this)
CREATE POLICY "Users can delete their own bowel records" ON bowel_records
    FOR DELETE 
    USING (nurse_id = auth.uid());

-- Create trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_bowel_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bowel_records_updated_at
    BEFORE UPDATE ON bowel_records
    FOR EACH ROW
    EXECUTE FUNCTION update_bowel_records_updated_at();

-- Grant necessary permissions to authenticated users
GRANT ALL ON bowel_records TO authenticated;

-- Add comment to table
COMMENT ON TABLE bowel_records IS 'Table for storing patient bowel movement records and assessments';
COMMENT ON COLUMN bowel_records.recorded_at IS 'Date and time when the bowel movement was recorded in 24-hour format';
COMMENT ON COLUMN bowel_records.bowel_incontinence IS 'Patient continence status';
COMMENT ON COLUMN bowel_records.stool_appearance IS 'Visual appearance of stool';
COMMENT ON COLUMN bowel_records.stool_consistency IS 'Consistency/texture of stool';
COMMENT ON COLUMN bowel_records.stool_colour IS 'Color of stool';
COMMENT ON COLUMN bowel_records.stool_amount IS 'Amount/quantity of stool';
COMMENT ON COLUMN bowel_records.notes IS 'Additional observations and notes';
