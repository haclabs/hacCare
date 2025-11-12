-- Migration: Fix patient_advanced_directives table columns
-- This adds missing columns that the AdvancedDirectivesForm expects

-- Add missing columns to patient_advanced_directives
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_advanced_directives' AND column_name='living_will_exists') THEN
    ALTER TABLE patient_advanced_directives ADD COLUMN living_will_exists BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_advanced_directives' AND column_name='living_will_status') THEN
    ALTER TABLE patient_advanced_directives ADD COLUMN living_will_status TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_advanced_directives' AND column_name='living_will_date') THEN
    ALTER TABLE patient_advanced_directives ADD COLUMN living_will_date TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_advanced_directives' AND column_name='healthcare_proxy_name') THEN
    ALTER TABLE patient_advanced_directives ADD COLUMN healthcare_proxy_name TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_advanced_directives' AND column_name='healthcare_proxy_phone') THEN
    ALTER TABLE patient_advanced_directives ADD COLUMN healthcare_proxy_phone TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_advanced_directives' AND column_name='healthcare_proxy_relationship') THEN
    ALTER TABLE patient_advanced_directives ADD COLUMN healthcare_proxy_relationship TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_advanced_directives' AND column_name='organ_donation_status') THEN
    ALTER TABLE patient_advanced_directives ADD COLUMN organ_donation_status BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_advanced_directives' AND column_name='organ_donation_details') THEN
    ALTER TABLE patient_advanced_directives ADD COLUMN organ_donation_details TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_advanced_directives' AND column_name='religious_preference') THEN
    ALTER TABLE patient_advanced_directives ADD COLUMN religious_preference TEXT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='patient_advanced_directives' AND column_name='special_instructions') THEN
    ALTER TABLE patient_advanced_directives ADD COLUMN special_instructions TEXT;
  END IF;
END $$;

-- Add unique constraint on patient_id for upsert functionality
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'patient_advanced_directives_patient_id_key'
  ) THEN
    ALTER TABLE patient_advanced_directives ADD CONSTRAINT patient_advanced_directives_patient_id_key UNIQUE (patient_id);
  END IF;
END $$;

-- Verify the columns were added
DO $$
BEGIN
  RAISE NOTICE '✅ Checking patient_advanced_directives columns...';
END $$;

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'patient_advanced_directives'
ORDER BY ordinal_position;
