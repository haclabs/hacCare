/*
  # Create patient advanced directives table

  1. New Tables
    - `patient_advanced_directives`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, foreign key to patients, unique)
      - `living_will_status` (text, default 'Not Available')
      - `living_will_date` (date, nullable)
      - `healthcare_proxy_name` (text, default empty)
      - `healthcare_proxy_phone` (text, default empty)
      - `dnr_status` (text, default 'Full Code')
      - `organ_donation_status` (text, default 'Not registered')
      - `organ_donation_details` (text, default empty)
      - `religious_preference` (text, default empty)
      - `special_instructions` (text, default empty)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `patient_advanced_directives` table
    - Authenticated users can read/insert/update
    - Admins can delete

  3. Indexes
    - Unique index on patient_id (one record per patient)
    - Index on patient_id for fast lookups

  4. Foreign Keys
    - patient_id references patients(id) with CASCADE delete

  5. Triggers
    - Auto-update updated_at timestamp
*/

-- Create patient advanced directives table
CREATE TABLE IF NOT EXISTS patient_advanced_directives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid UNIQUE NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  living_will_status text NOT NULL DEFAULT 'Not Available',
  living_will_date date,
  healthcare_proxy_name text DEFAULT '',
  healthcare_proxy_phone text DEFAULT '',
  dnr_status text NOT NULL DEFAULT 'Full Code',
  organ_donation_status text NOT NULL DEFAULT 'Not registered',
  organ_donation_details text DEFAULT '',
  religious_preference text DEFAULT '',
  special_instructions text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE patient_advanced_directives ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS patient_advanced_directives_patient_id_key ON patient_advanced_directives(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_advanced_directives_patient_id ON patient_advanced_directives(patient_id);

-- RLS Policies
CREATE POLICY "Authenticated users can read patient advanced directives"
  ON patient_advanced_directives
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert patient advanced directives"
  ON patient_advanced_directives
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update patient advanced directives"
  ON patient_advanced_directives
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete patient advanced directives"
  ON patient_advanced_directives
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

-- Triggers
CREATE TRIGGER update_patient_advanced_directives_updated_at
  BEFORE UPDATE ON patient_advanced_directives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();