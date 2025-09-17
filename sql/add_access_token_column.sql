-- Add missing columns to existing active_simulations table
-- Run this on your Supabase database

-- Add the simulation_token column (renamed to avoid conflicts with auth tokens)
ALTER TABLE public.active_simulations 
ADD COLUMN simulation_token VARCHAR(255) UNIQUE;

-- Add the allow_anonymous_access column
ALTER TABLE public.active_simulations 
ADD COLUMN allow_anonymous_access BOOLEAN DEFAULT true;

-- Update any existing simulations with generated simulation tokens
UPDATE public.active_simulations 
SET simulation_token = CONCAT('sim_', replace(gen_random_uuid()::text, '-', ''))
WHERE simulation_token IS NULL;

-- Make the simulation_token column NOT NULL after populating it
ALTER TABLE public.active_simulations 
ALTER COLUMN simulation_token SET NOT NULL;

-- Verify the columns were added successfully
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'active_simulations' 
AND column_name IN ('simulation_token', 'allow_anonymous_access')
ORDER BY column_name;

-- Show all simulations with their tokens and anonymous access setting
SELECT id, session_name, simulation_token, allow_anonymous_access, status 
FROM public.active_simulations 
ORDER BY created_at DESC;