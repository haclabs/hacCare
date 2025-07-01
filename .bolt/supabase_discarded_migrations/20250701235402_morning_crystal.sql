/*
  # Create patient admission records table

  1. New Tables
    - `patient_admission_records`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, foreign key to patients, unique)
      - `admission_type` (text, default 'Emergency')
      - `attending_physician` (text, default empty)
      - `insurance_provider` (text, default empty)
      - `insurance_policy` (text, default empty)
      - `admission_source` (text, default 'Emergency Department')
      - `chief_complaint` (text, default empty)
      - `height` (text, default empty)
      - `weight` (text, default empty)
      - `bmi` (text, default empty)
      - `smoking_status` (text, default empty)
      - `alcohol_use` (text, default empty)
      - `exercise` (text, default empty)
      - `occupation` (text, default empty)
      - `family_history` (text, default empty)
      - `marital_status` (text, default empty)
      - `secondary_contact_name` (text, default empty)
      - `secondary_contact_relationship` (text, default empty)
      - `secondary_contact_phone` (text, default empty)
      - `secondary_contact_address` (text, default empty)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `patient_admission_records` table
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

-- Create patient admission records table
CREATE TABLE IF NOT EXISTS patient_admission_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid UNIQUE NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  admission_type text NOT NULL DEFAULT 'Emergency',
  attending_physician text NOT NULL DEFAULT '',
  insurance_provider text NOT NULL DEFAULT '',
  insurance_policy text NOT NULL DEFAULT '',
  admission_source text NOT NULL DEFAULT 'Emergency Department',
  chief_complaint text NOT NULL DEFAULT '',
  height text NOT NULL DEFAULT '',
  weight text NOT NULL DEFAULT '',
  bmi text NOT NULL DEFAULT '',
  smoking_status text NOT NULL DEFAULT '',
  alcohol_use text NOT NULL DEFAULT '',
  exercise text NOT NULL DEFAULT '',
  occupation text NOT NULL DEFAULT '',
  family_history text NOT NULL DEFAULT '',
  marital_status text NOT NULL DEFAULT '',
  secondary_contact_name text NOT NULL DEFAULT '',
  secondary_contact_relationship text NOT NULL DEFAULT '',
  secondary_contact_phone text NOT NULL DEFAULT '',
  secondary_contact_address text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE patient_admission_records ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE UNIQUE INDEX IF NOT EXISTS patient_admission_records_patient_id_key ON patient_admission_records(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_admission_records_patient_id ON patient_admission_records(patient_id);

-- RLS Policies
CREATE POLICY "Authenticated users can read patient admission records"
  ON patient_admission_records
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert patient admission records"
  ON patient_admission_records
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update patient admission records"
  ON patient_admission_records
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete patient admission records"
  ON patient_admission_records
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
CREATE TRIGGER update_patient_admission_records_updated_at
  BEFORE UPDATE ON patient_admission_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();