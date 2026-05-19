-- ============================================================================
-- Add avatar_id column to patients table
-- ============================================================================
-- Purpose: Add patient avatar selection with 10 diverse androgynous options
-- Date: November 26, 2025
-- ============================================================================

-- Add avatar_id column
ALTER TABLE patients
ADD COLUMN IF NOT EXISTS avatar_id TEXT;

-- Add comment
COMMENT ON COLUMN patients.avatar_id IS 'Patient avatar identifier (avatar-1 through avatar-10)';

-- Create index for faster avatar lookups
CREATE INDEX IF NOT EXISTS idx_patients_avatar_id ON patients(avatar_id);

-- Randomly assign avatars to existing patients
DO $$
DECLARE
  v_patient_id UUID;
  v_avatar_options TEXT[] := ARRAY['avatar-1', 'avatar-2', 'avatar-3', 'avatar-4', 'avatar-5', 
                                     'avatar-6', 'avatar-7', 'avatar-8', 'avatar-9', 'avatar-10'];
  v_random_avatar TEXT;
BEGIN
  -- Loop through all patients without avatars
  FOR v_patient_id IN 
    SELECT id FROM patients WHERE avatar_id IS NULL
  LOOP
    -- Pick a random avatar from the options
    v_random_avatar := v_avatar_options[1 + floor(random() * 10)::int];
    
    -- Update the patient with the random avatar
    UPDATE patients 
    SET avatar_id = v_random_avatar 
    WHERE id = v_patient_id;
    
    RAISE NOTICE 'Assigned % to patient %', v_random_avatar, v_patient_id;
  END LOOP;
  
  RAISE NOTICE '✅ Avatars assigned to all existing patients';
END $$;

-- Verify assignment (view results in output)
DO $$
BEGIN
  RAISE NOTICE '🎨 Patient avatar system initialized successfully';
  RAISE NOTICE 'Avatar distribution:';
END $$;

SELECT avatar_id, COUNT(*) as count
FROM patients
GROUP BY avatar_id
ORDER BY avatar_id;
