-- Template system tables for vitals, medications, and notes
-- These tables store template data that can be instantiated when creating simulations

-- Vitals templates linked to patient templates
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

-- Medications templates linked to patient templates
CREATE TABLE IF NOT EXISTS patient_medications_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_template_id UUID NOT NULL REFERENCES simulation_patient_templates(id) ON DELETE CASCADE,
  medication_name VARCHAR(200) NOT NULL,
  generic_name VARCHAR(200), -- Generic drug name if different
  dosage VARCHAR(100) NOT NULL, -- e.g., '10mg', '5ml', '1 tablet'
  route VARCHAR(50) NOT NULL CHECK (route IN (
    'oral', 'intravenous', 'intramuscular', 'subcutaneous', 'topical', 
    'inhalation', 'rectal', 'sublingual', 'nasal', 'transdermal'
  )),
  frequency VARCHAR(100) NOT NULL, -- e.g., 'every 4 hours', 'twice daily', 'as needed'
  indication TEXT, -- Why this medication is prescribed
  contraindications TEXT, -- When not to give this medication
  side_effects TEXT[], -- Array of potential side effects
  is_prn BOOLEAN DEFAULT false, -- Pro re nata (as needed)
  prn_parameters TEXT, -- Conditions for PRN administration
  start_date DATE,
  end_date DATE,
  max_dose_per_day VARCHAR(50), -- Maximum daily dosage
  notes TEXT,
  barcode VARCHAR(100), -- For BCMA scanning simulation
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Notes templates linked to patient templates
CREATE TABLE IF NOT EXISTS patient_notes_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_template_id UUID NOT NULL REFERENCES simulation_patient_templates(id) ON DELETE CASCADE,
  note_type VARCHAR(50) NOT NULL CHECK (note_type IN (
    'admission', 'nursing', 'physician', 'progress', 'discharge', 'medication', 
    'assessment', 'intervention', 'education', 'communication', 'incident'
  )),
  note_title VARCHAR(200), -- Optional title for the note
  note_content TEXT NOT NULL,
  created_by_role VARCHAR(50) DEFAULT 'nurse' CHECK (created_by_role IN (
    'nurse', 'physician', 'student', 'instructor', 'therapist', 'social_worker'
  )),
  timestamp_offset_hours INTEGER DEFAULT 0, -- Hours from simulation start when this note should appear
  is_locked BOOLEAN DEFAULT false, -- Whether students can edit this note
  requires_signature BOOLEAN DEFAULT false, -- Whether this note requires electronic signature
  tags TEXT[], -- Tags for categorization
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patient_vitals_templates_patient_id ON patient_vitals_templates(patient_template_id);
CREATE INDEX IF NOT EXISTS idx_patient_vitals_templates_type ON patient_vitals_templates(vital_type);
CREATE INDEX IF NOT EXISTS idx_patient_vitals_templates_order ON patient_vitals_templates(display_order);

CREATE INDEX IF NOT EXISTS idx_patient_medications_templates_patient_id ON patient_medications_templates(patient_template_id);
CREATE INDEX IF NOT EXISTS idx_patient_medications_templates_name ON patient_medications_templates(medication_name);
CREATE INDEX IF NOT EXISTS idx_patient_medications_templates_active ON patient_medications_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_patient_medications_templates_order ON patient_medications_templates(display_order);

CREATE INDEX IF NOT EXISTS idx_patient_notes_templates_patient_id ON patient_notes_templates(patient_template_id);
CREATE INDEX IF NOT EXISTS idx_patient_notes_templates_type ON patient_notes_templates(note_type);
CREATE INDEX IF NOT EXISTS idx_patient_notes_templates_role ON patient_notes_templates(created_by_role);
CREATE INDEX IF NOT EXISTS idx_patient_notes_templates_order ON patient_notes_templates(display_order);

-- Row Level Security Policies
ALTER TABLE patient_vitals_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_medications_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_notes_templates ENABLE ROW LEVEL SECURITY;

-- Policies for vitals templates
CREATE POLICY "Tenant admins can manage vitals templates" ON patient_vitals_templates
  USING (
    EXISTS (
      SELECT 1 FROM simulation_patient_templates pt 
      JOIN scenario_templates st ON pt.scenario_template_id = st.id
      JOIN user_tenant_associations uta ON st.tenant_id = uta.tenant_id
      WHERE pt.id = patient_vitals_templates.patient_template_id
      AND uta.user_id = auth.uid()
      AND uta.role IN ('admin', 'instructor')
      AND uta.status = 'active'
    )
  );

-- Policies for medications templates  
CREATE POLICY "Tenant admins can manage medications templates" ON patient_medications_templates
  USING (
    EXISTS (
      SELECT 1 FROM simulation_patient_templates pt 
      JOIN scenario_templates st ON pt.scenario_template_id = st.id
      JOIN user_tenant_associations uta ON st.tenant_id = uta.tenant_id
      WHERE pt.id = patient_medications_templates.patient_template_id
      AND uta.user_id = auth.uid()
      AND uta.role IN ('admin', 'instructor')
      AND uta.status = 'active'
    )
  );

-- Policies for notes templates
CREATE POLICY "Tenant admins can manage notes templates" ON patient_notes_templates
  USING 
    EXISTS (
      SELECT 1 FROM simulation_patient_templates pt 
      JOIN scenario_templates st ON pt.scenario_template_id = st.id
      JOIN user_tenant_associations uta ON st.tenant_id = uta.tenant_id
      WHERE pt.id = patient_notes_templates.patient_template_id
      AND uta.user_id = auth.uid()
      AND uta.role IN ('admin', 'instructor')
      AND uta.status = 'active'
    )
  );

-- Sample data for testing (optional)
DO $$
DECLARE
  sample_scenario_id UUID;
  sample_patient_id UUID;
BEGIN
  -- Get a sample scenario template (or create one if none exists)
  SELECT id INTO sample_scenario_id FROM scenario_templates LIMIT 1;
  
  IF sample_scenario_id IS NOT NULL THEN
    -- Get a sample patient template
    SELECT id INTO sample_patient_id FROM simulation_patient_templates 
    WHERE scenario_template_id = sample_scenario_id LIMIT 1;
    
    IF sample_patient_id IS NOT NULL THEN
      -- Insert sample vitals templates
      INSERT INTO patient_vitals_templates (
        patient_template_id, vital_type, value_numeric, unit, 
        normal_range_min, normal_range_max, notes, frequency_minutes, is_critical
      ) VALUES 
      (sample_patient_id, 'heart_rate', 72, 'bpm', 60, 100, 'Regular rhythm', 15, true),
      (sample_patient_id, 'temperature', 98.6, 'F', 97, 99, 'Oral temperature', 240, false),
      (sample_patient_id, 'oxygen_saturation', 98, '%', 95, 100, 'Room air', 30, true)
      ON CONFLICT DO NOTHING;
      
      -- Insert sample vitals template for blood pressure
      INSERT INTO patient_vitals_templates (
        patient_template_id, vital_type, value_systolic, value_diastolic, unit,
        normal_range_min, normal_range_max, notes, frequency_minutes, is_critical
      ) VALUES 
      (sample_patient_id, 'blood_pressure', 120, 80, 'mmHg', 90, 140, 'Manual cuff', 60, true)
      ON CONFLICT DO NOTHING;
      
      -- Insert sample medications templates
      INSERT INTO patient_medications_templates (
        patient_template_id, medication_name, generic_name, dosage, route, frequency,
        indication, is_prn, notes, barcode
      ) VALUES 
      (sample_patient_id, 'Lisinopril', 'lisinopril', '10mg', 'oral', 'once daily', 
       'Hypertension management', false, 'Take with or without food', 'MED001'),
      (sample_patient_id, 'Acetaminophen', 'acetaminophen', '650mg', 'oral', 'every 6 hours PRN',
       'Pain and fever relief', true, 'Maximum 3000mg per day', 'MED002'),
      (sample_patient_id, 'Normal Saline', 'sodium chloride 0.9%', '1000ml', 'intravenous', 'continuous',
       'Fluid maintenance', false, 'Monitor intake/output', 'IV001')
      ON CONFLICT DO NOTHING;
      
      -- Insert sample notes templates
      INSERT INTO patient_notes_templates (
        patient_template_id, note_type, note_title, note_content, created_by_role,
        timestamp_offset_hours, is_locked
      ) VALUES 
      (sample_patient_id, 'admission', 'Admission Assessment', 
       'Patient admitted for hypertension management. Alert and oriented x3. Vital signs stable. No acute distress noted.',
       'nurse', 0, true),
      (sample_patient_id, 'nursing', 'Hourly Assessment', 
       'Patient resting comfortably. Vital signs within normal limits. No complaints of pain or discomfort.',
       'nurse', 1, false),
      (sample_patient_id, 'physician', 'Progress Note',
       'Patient responding well to antihypertensive therapy. Blood pressure controlled. Continue current regimen.',
       'physician', 24, true)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;