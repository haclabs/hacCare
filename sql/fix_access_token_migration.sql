-- Migration to add access_token field to active_simulations table
-- Run this on your Supabase database

-- First, check if the column exists and add it if it doesn't
DO $$ 
BEGIN
    -- Add access_token column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'active_simulations' 
        AND column_name = 'access_token'
    ) THEN
        ALTER TABLE public.active_simulations 
        ADD COLUMN access_token VARCHAR(255) UNIQUE;
    END IF;
END $$;

-- Update any existing simulations without access tokens
UPDATE public.active_simulations 
SET access_token = CONCAT('sim_', replace(gen_random_uuid()::text, '-', ''))
WHERE access_token IS NULL OR access_token = '';

-- Make the column NOT NULL after we've populated it
ALTER TABLE public.active_simulations 
ALTER COLUMN access_token SET NOT NULL;

-- Verify all simulations now have access tokens
SELECT id, session_name, access_token 
FROM public.active_simulations 
WHERE access_token IS NULL OR access_token = '';