/*
  # Create patient notes table

  1. New Tables
    - `patient_notes`
      - `id` (uuid, primary key)
      - `patient_id` (uuid, foreign key to patients)
      - `nurse_id` (uuid, foreign key to user_profiles)
      - `nurse_name` (text, not null)
      - `type` (text, not null)
      - `content` (text, not null)
      - `priority` (text, not null)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `patient_notes` table
    - Authenticated users can read/insert patient notes

  3. Indexes
    - Index on patient_id for fast lookups

  4. Foreign Keys
    - patient_id references patients(id) with CASCADE delete
    - nurse_id references user_profiles(id)
*/

-- Create patient notes table
CREATE TABLE IF NOT EXISTS patient_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid REFERENCES patients(id) ON DELETE CASCADE,
  nurse_id uuid REFERENCES user_profiles(id),
  nurse_name text NOT NULL,
  type text NOT NULL,
  content text NOT NULL,
  priority text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE patient_notes ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_patient_notes_patient_id ON patient_notes(patient_id);

-- RLS Policies
CREATE POLICY "Authenticated users can read patient notes"
  ON patient_notes
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert patient notes"
  ON patient_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (true);