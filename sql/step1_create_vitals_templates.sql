-- Step 1: Create patient_vitals_templates table
CREATE TABLE IF NOT EXISTS patient_vitals_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_template_id UUID NOT NULL REFERENCES simulation_patient_templates(id) ON DELETE CASCADE,
  vital_type VARCHAR(50) NOT NULL CHECK (vital_type IN (
    'blood_pressure', 'heart_rate', 'respiratory_rate', 'temperature', 
    'oxygen_saturation', 'blood_glucose', 'pain_scale', 'weight', 'height'
  )),
  value_systolic INTEGER, -- For blood pressure
  value_diastolic INTEGER, -- For blood pressure  
  value_numeric DECIMAL(10,2), -- For single numeric values
  unit VARCHAR(20) NOT NULL, -- e.g., 'mmHg', 'bpm', '/min', 'F', '%', 'mg/dL', 'lbs', 'in'
  normal_range_min DECIMAL(10,2), -- Expected normal minimum
  normal_range_max DECIMAL(10,2), -- Expected normal maximum
  notes TEXT,
  frequency_minutes INTEGER DEFAULT 60, -- How often this vital should be taken
  is_critical BOOLEAN DEFAULT false, -- Whether this is a critical vital for the scenario
  display_order INTEGER DEFAULT 0, -- Order to display in UI
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE patient_vitals_templates ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON patient_vitals_templates TO authenticated;