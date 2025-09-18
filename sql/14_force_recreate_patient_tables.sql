-- Force recreation of simulation patient tables with correct structure
-- Use this if the tables exist but have wrong column names

-- Drop existing tables if they have wrong structure (be careful with this!)
DROP TABLE IF EXISTS simulation_patient_vitals CASCADE;
DROP TABLE IF EXISTS simulation_patient_medications CASCADE;
DROP TABLE IF EXISTS simulation_patient_notes CASCADE;

-- Recreate simulation_patient_vitals table with correct structure
CREATE TABLE simulation_patient_vitals (
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

-- Recreate simulation_patient_medications table
CREATE TABLE simulation_patient_medications (
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

-- Recreate simulation_patient_notes table
CREATE TABLE simulation_patient_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    simulation_patient_id UUID NOT NULL REFERENCES simulation_patients(id) ON DELETE CASCADE,
    note_type VARCHAR(50) NOT NULL,
    note_content TEXT NOT NULL,
    created_by VARCHAR(100) NOT NULL,
    created_by_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_important BOOLEAN DEFAULT false,
    tags TEXT[]
);

-- Add missing columns to simulation_patients if they don't exist
ALTER TABLE simulation_patients 
ADD COLUMN IF NOT EXISTS age INTEGER,
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES simulation_patient_templates(id);

-- Enable RLS
ALTER TABLE simulation_patient_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_patient_medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_patient_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow all operations on simulation_patient_vitals" ON simulation_patient_vitals
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on simulation_patient_medications" ON simulation_patient_medications
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on simulation_patient_notes" ON simulation_patient_notes
    FOR ALL USING (true);