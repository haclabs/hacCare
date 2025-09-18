-- Fix simulation_patients table schema to match the instantiation function
-- This addresses schema mismatches between table definition and instantiation function

-- Add missing columns to simulation_patients table
ALTER TABLE simulation_patients 
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES simulation_patient_templates(id);

-- Update the table constraint to be more flexible
ALTER TABLE simulation_patients 
DROP CONSTRAINT IF EXISTS check_template_or_simulation;

-- Add a new constraint that allows for instantiated patients
ALTER TABLE simulation_patients 
ADD CONSTRAINT check_patient_type CHECK (
    (scenario_template_id IS NOT NULL AND active_simulation_id IS NULL AND is_template = true) OR
    (scenario_template_id IS NULL AND active_simulation_id IS NOT NULL AND is_template = false) OR
    (template_id IS NOT NULL AND active_simulation_id IS NOT NULL AND is_template = false)
);

-- Also create the missing tables that the instantiation function expects
CREATE TABLE IF NOT EXISTS simulation_patient_vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_patient_id UUID NOT NULL REFERENCES simulation_patients(id) ON DELETE CASCADE,
    vital_type VARCHAR(50) NOT NULL,
    value_systolic INTEGER,
    value_diastolic INTEGER,
    value_numeric DECIMAL(10,2),
    value_text TEXT,
    unit VARCHAR(20) NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_by VARCHAR(255),
    is_baseline BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS simulation_patient_medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_patient_id UUID NOT NULL REFERENCES simulation_patients(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    route VARCHAR(50) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    start_date DATE,
    end_date DATE,
    indication TEXT,
    special_instructions TEXT,
    is_prn BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    prescribed_by VARCHAR(255),
    prescribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS simulation_patient_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_patient_id UUID NOT NULL REFERENCES simulation_patients(id) ON DELETE CASCADE,
    note_type VARCHAR(50) NOT NULL, -- 'nursing', 'physician', 'medication', 'assessment'
    note_content TEXT NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_by_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_important BOOLEAN DEFAULT false,
    tags TEXT[]
);

-- Enable RLS on these tables
ALTER TABLE simulation_patient_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_patient_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_patient_notes ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (can be refined later)
CREATE POLICY "Users can view simulation patient vitals" ON simulation_patient_vitals
    FOR SELECT USING (true);

CREATE POLICY "Users can insert simulation patient vitals" ON simulation_patient_vitals
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update simulation patient vitals" ON simulation_patient_vitals
    FOR UPDATE USING (true);

CREATE POLICY "Users can view simulation patient medications" ON simulation_patient_medications
    FOR SELECT USING (true);

CREATE POLICY "Users can insert simulation patient medications" ON simulation_patient_medications
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update simulation patient medications" ON simulation_patient_medications
    FOR UPDATE USING (true);

CREATE POLICY "Users can view simulation patient notes" ON simulation_patient_notes
    FOR SELECT USING (true);

CREATE POLICY "Users can insert simulation patient notes" ON simulation_patient_notes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update simulation patient notes" ON simulation_patient_notes
    FOR UPDATE USING (true);