-- Fix Medication Database Schema (Safe Version)
-- This adds missing columns that the application expects

-- Add missing columns to patient_medications table
ALTER TABLE patient_medications 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'scheduled',
ADD COLUMN IF NOT EXISTS next_due TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_administered TIMESTAMPTZ;

-- Update existing records to have the scheduled category if null
UPDATE patient_medications 
SET category = 'scheduled' 
WHERE category IS NULL;

-- Add check constraint for category values (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE constraint_name = 'patient_medications_category_check'
    ) THEN
        ALTER TABLE patient_medications 
        ADD CONSTRAINT patient_medications_category_check 
        CHECK (category IN ('scheduled', 'unscheduled', 'prn', 'continuous'));
    END IF;
END $$;
