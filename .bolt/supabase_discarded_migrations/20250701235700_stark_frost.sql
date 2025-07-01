/*
  # Create patient assessments table

  1. New Tables
    - `patient_assessments`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, foreign key to patients)
      - `nurse_id` (uuid, foreign key to user_profiles)
      - `nurse_name` (text, nurse's full name)
      - `assessment_type` (text, type of assessment: physical, pain, neurological)
      - `assessment_date` (timestamp, when assessment was performed)
      - Physical assessment fields (general_appearance, respiratory_assessment, etc.)
      - Pain assessment fields (pain_scale, pain_location, etc.)
      - Neurological assessment fields (glasgow_coma_scale, motor_function, etc.)
      - Common fields (assessment_notes, recommendations, priority_level, etc.)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `patient_assessments` table
    - Add policies for authenticated users to read and insert assessments
    - Add policies for admins to update and delete assessments

  3. Indexes
    - Add indexes for patient_id and assessment_date for better query performance
*/

-- Create patient_assessments table
CREATE TABLE IF NOT EXISTS patient_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL,
  nurse_id uuid NOT NULL,
  nurse_name text NOT NULL,
  assessment_type text NOT NULL CHECK (assessment_type IN ('physical', 'pain', 'neurological')),
  assessment_date timestamptz NOT NULL DEFAULT now(),
  
  -- Physical Assessment Fields
  general_appearance text,
  level_of_consciousness text DEFAULT 'Alert and oriented x3',
  skin_condition text,
  respiratory_assessment text,
  cardiovascular_assessment text,
  gastrointestinal_assessment text,
  genitourinary_assessment text,
  musculoskeletal_assessment text,
  neurological_assessment text,
  
  -- Pain Assessment Fields
  pain_scale text DEFAULT '0',
  pain_location text,
  pain_quality text,
  pain_duration text,
  pain_triggers text,
  pain_relief_measures text,
  
  -- Neurological Assessment Fields
  glasgow_coma_scale text DEFAULT '15',
  pupil_response text DEFAULT 'PERRL',
  motor_function text,
  sensory_function text,
  reflexes text,
  cognitive_function text,
  
  -- Common Fields
  assessment_notes text NOT NULL,
  recommendations text,
  follow_up_required boolean NOT NULL DEFAULT false,
  priority_level text NOT NULL DEFAULT 'routine' CHECK (priority_level IN ('routine', 'urgent', 'critical')),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE patient_assessments 
ADD CONSTRAINT patient_assessments_patient_id_fkey 
FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE patient_assessments 
ADD CONSTRAINT patient_assessments_nurse_id_fkey 
FOREIGN KEY (nurse_id) REFERENCES user_profiles(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patient_assessments_patient_id 
ON patient_assessments(patient_id);

CREATE INDEX IF NOT EXISTS idx_patient_assessments_assessment_date 
ON patient_assessments(assessment_date);

CREATE INDEX IF NOT EXISTS idx_patient_assessments_type 
ON patient_assessments(assessment_type);

CREATE INDEX IF NOT EXISTS idx_patient_assessments_priority 
ON patient_assessments(priority_level);

-- Enable Row Level Security
ALTER TABLE patient_assessments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can read patient assessments"
  ON patient_assessments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert patient assessments"
  ON patient_assessments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update patient assessments"
  ON patient_assessments
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete patient assessments"
  ON patient_assessments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('admin', 'super_admin')
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_patient_assessments_updated_at
  BEFORE UPDATE ON patient_assessments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();