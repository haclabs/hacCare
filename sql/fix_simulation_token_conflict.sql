-- Migration to rename simulation_token to sim_access_key to avoid Supabase conflicts
-- This completely avoids any "token" naming that might conflict with Supabase auth

-- Check if simulation_token exists and rename it to sim_access_key
DO $$ 
BEGIN
    -- Check if simulation_token exists and rename it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'active_simulations' 
        AND column_name = 'simulation_token'
    ) THEN
        ALTER TABLE public.active_simulations 
        RENAME COLUMN simulation_token TO sim_access_key;
        
        RAISE NOTICE 'Renamed simulation_token to sim_access_key';
    ELSE
        -- Check if we need to add the column
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'active_simulations' 
            AND column_name = 'sim_access_key'
        ) THEN
            ALTER TABLE public.active_simulations 
            ADD COLUMN sim_access_key TEXT UNIQUE;
            
            RAISE NOTICE 'Added sim_access_key column';
        ELSE
            RAISE NOTICE 'sim_access_key column already exists';
        END IF;
    END IF;
END $$;

-- Verify the column exists with the correct name
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'active_simulations' 
AND column_name = 'sim_access_key';

-- Show all simulations with their new access keys
SELECT id, session_name, sim_access_key, allow_anonymous_access, status 
FROM public.active_simulations 
ORDER BY created_at DESC;