-- Check current simulation system status
-- Run this first to see what exists in your database

-- Check if active_simulations table exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'active_simulations'
) as active_simulations_exists;

-- Check if access_token column exists (will error if table doesn't exist)
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'active_simulations' 
    AND column_name = 'access_token'
) as access_token_column_exists;

-- List all columns in active_simulations table (if it exists)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'active_simulations'
ORDER BY ordinal_position;