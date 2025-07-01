/*
  # Create patient medications table

  1. New Tables
    - `patient_medications`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, foreign key to patients)
      - `name` (text, not null)
      - `dosage` (text, not null)
      - `frequency` (text, not null)
      - `route` (text, not null)
      - `start_date` (date, not null)
      - `end_date` (date, nullable)
      - `prescribed_by` (text, not null)
      - `last_administered` (timestamptz, nullable)
      - `next_due` (timestamptz, not null)
      - `status` (text, default 'Active')
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `patient_medications` table
    - Authenticated users can manage patient medications

  3. Indexes
    - Index on patient_id for fast lookups
    - Index on next_due for medication scheduling

  4. Foreign Keys
    - patient_id references patients(id) with CASCADE delete
*/

-- Create patient medications table
CREATE TABLE IF NOT EXISTS patient_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  route text NOT NULL,
  start_date date NOT NULL,
  end_date date,
  prescribed_by text NOT NULL,
  last_administered timestamptz,
  next_due timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'Active',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE patient_medications ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_patient_medications_patient_id ON patient_medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_medications_next_due ON patient_medications(next_due);

-- RLS Policies
CREATE POLICY "Authenticated users can read patient medications"
  ON patient_medications
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage patient medications"
  ON patient_medications
  FOR ALL
  TO authenticated
  USING (true);