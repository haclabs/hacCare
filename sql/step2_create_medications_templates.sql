-- Step 2: Create patient_medications_templates table
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

-- Enable RLS
ALTER TABLE patient_medications_templates ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON patient_medications_templates TO authenticated;