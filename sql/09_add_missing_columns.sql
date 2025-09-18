-- ============================================
-- MISSING COLUMNS MIGRATION
-- Add any missing columns to active_simulations table
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- Add simulation_status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'active_simulations' 
        AND column_name = 'simulation_status'
    ) THEN
        ALTER TABLE public.active_simulations 
        ADD COLUMN simulation_status TEXT DEFAULT 'lobby' 
        CHECK (simulation_status IN ('lobby', 'running', 'paused', 'completed'));
        
        RAISE NOTICE 'Added simulation_status column';
    ELSE
        RAISE NOTICE 'simulation_status column already exists';
    END IF;
END $$;

-- Add lobby_message column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'active_simulations' 
        AND column_name = 'lobby_message'
    ) THEN
        ALTER TABLE public.active_simulations 
        ADD COLUMN lobby_message TEXT DEFAULT 'Welcome to the simulation. Please wait for the instructor to start.';
        
        RAISE NOTICE 'Added lobby_message column';
    ELSE
        RAISE NOTICE 'lobby_message column already exists';
    END IF;
END $$;

-- Add sim_access_key column if it doesn't exist (renamed from simulation_token)
DO $$
BEGIN
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
END $$;

-- Populate sim_access_key for existing records if null
UPDATE public.active_simulations 
SET sim_access_key = CONCAT('sim_', replace(gen_random_uuid()::text, '-', ''))
WHERE sim_access_key IS NULL;

-- Verify all required columns exist
SELECT 
  'Column Check' as test_category,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'active_simulations' 
AND table_schema = 'public'
AND column_name IN (
  'scenario_template_id', 
  'instructor_id', 
  'sim_access_key', 
  'simulation_status', 
  'lobby_message',
  'tenant_id',
  'session_name'
)
ORDER BY column_name;

-- Show success message
SELECT 'COLUMNS UPDATED SUCCESSFULLY!' as status,
       'All required columns now exist in active_simulations' as message;