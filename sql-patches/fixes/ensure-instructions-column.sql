-- Ensure instructions column exists in patient_medications table
-- This is a safe operation that will only add the column if it doesn't exist

DO $$ 
BEGIN
    -- Check if instructions column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'patient_medications' 
        AND column_name = 'instructions'
    ) THEN
        ALTER TABLE patient_medications 
        ADD COLUMN instructions TEXT DEFAULT '';
    END IF;
END $$;

-- Update any NULL instructions to empty string
UPDATE patient_medications 
SET instructions = COALESCE(instructions, '');
