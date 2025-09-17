-- Migration to rename access_token to simulation_token to avoid conflicts
-- Run this if you already added the access_token column

-- Option 1: If you already added access_token column, rename it
DO $$ 
BEGIN
    -- Check if access_token exists and rename it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'active_simulations' 
        AND column_name = 'access_token'
    ) THEN
        ALTER TABLE public.active_simulations 
        RENAME COLUMN access_token TO simulation_token;
        
        RAISE NOTICE 'Renamed access_token to simulation_token';
    ELSE
        RAISE NOTICE 'access_token column does not exist, nothing to rename';
    END IF;
END $$;

-- Verify the column exists with the correct name
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'active_simulations' 
AND column_name = 'simulation_token';

-- Show all simulations with their tokens
SELECT id, session_name, simulation_token, allow_anonymous_access, status 
FROM public.active_simulations 
ORDER BY created_at DESC;