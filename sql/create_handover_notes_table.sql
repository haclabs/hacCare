-- Handover Notes Table for SBAR Communication
-- This table stores handover notes following the SBAR framework:
-- Situation, Background, Assessment, Recommendations

CREATE TABLE handover_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- SBAR Framework fields
    situation TEXT NOT NULL,
    background TEXT NOT NULL,
    assessment TEXT NOT NULL,
    recommendations TEXT NOT NULL,
    
    -- Metadata
    shift VARCHAR(10) NOT NULL CHECK (shift IN ('day', 'evening', 'night')),
    priority VARCHAR(10) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    acknowledged_by UUID,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    
    -- Creator information (denormalized for performance)
    created_by_name VARCHAR(255) NOT NULL,
    created_by_role VARCHAR(100) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_handover_notes_patient_id ON handover_notes(patient_id);
CREATE INDEX idx_handover_notes_created_at ON handover_notes(created_at DESC);
CREATE INDEX idx_handover_notes_acknowledged ON handover_notes(acknowledged_by) WHERE acknowledged_by IS NOT NULL;
CREATE INDEX idx_handover_notes_priority ON handover_notes(priority);
CREATE INDEX idx_handover_notes_shift ON handover_notes(shift);

-- Enable Row Level Security (RLS)
ALTER TABLE handover_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users to read handover notes for patients they have access to
CREATE POLICY "Users can view handover notes for accessible patients" ON handover_notes
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to create handover notes
CREATE POLICY "Users can create handover notes" ON handover_notes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own handover notes within 24 hours
CREATE POLICY "Users can update their own recent handover notes" ON handover_notes
    FOR UPDATE USING (
        auth.uid()::text = created_by::text 
        AND created_at > NOW() - INTERVAL '24 hours'
    );

-- Allow users to acknowledge handover notes (update acknowledged_by and acknowledged_at)
CREATE POLICY "Users can acknowledge handover notes" ON handover_notes
    FOR UPDATE USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Allow deletion only by the creator within 1 hour of creation
CREATE POLICY "Users can delete their own new handover notes" ON handover_notes
    FOR DELETE USING (
        auth.uid()::text = created_by::text 
        AND created_at > NOW() - INTERVAL '1 hour'
    );

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_handover_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_handover_notes_updated_at
    BEFORE UPDATE ON handover_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_handover_notes_updated_at();

-- Add helpful comments
COMMENT ON TABLE handover_notes IS 'SBAR (Situation, Background, Assessment, Recommendations) handover notes for patient care transitions';
COMMENT ON COLUMN handover_notes.situation IS 'Current situation and purpose of communication';
COMMENT ON COLUMN handover_notes.background IS 'Relevant context and patient history';
COMMENT ON COLUMN handover_notes.assessment IS 'Professional clinical judgment and assessment';
COMMENT ON COLUMN handover_notes.recommendations IS 'Proposed actions and next steps';
COMMENT ON COLUMN handover_notes.shift IS 'Shift during which the handover note was created';
COMMENT ON COLUMN handover_notes.priority IS 'Priority level of the handover communication';
