-- Step 3: Create patient_notes_templates table
CREATE TABLE IF NOT EXISTS patient_notes_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_template_id UUID NOT NULL REFERENCES simulation_patient_templates(id) ON DELETE CASCADE,
  note_type VARCHAR(50) NOT NULL CHECK (note_type IN (
    'admission', 'progress', 'discharge', 'nursing', 'physician', 
    'assessment', 'plan', 'medication', 'procedure', 'education'
  )),
  note_content TEXT NOT NULL,
  created_by_role VARCHAR(50) NOT NULL CHECK (created_by_role IN (
    'nurse', 'physician', 'instructor', 'student', 'admin'
  )),
  scheduled_time TIMESTAMPTZ, -- When this note should appear in the simulation
  priority VARCHAR(20) DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  is_template BOOLEAN DEFAULT true, -- Whether this is a template or actual note
  requires_cosign BOOLEAN DEFAULT false, -- Whether this note requires a cosignature
  tags TEXT[], -- Array of tags for categorization
  display_order INTEGER DEFAULT 0,
  is_visible_to_students BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE patient_notes_templates ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON patient_notes_templates TO authenticated;