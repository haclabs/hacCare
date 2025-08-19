-- Check tenants table structure and add subdomain column if needed
-- Run these queries one by one in your remote Supabase SQL Editor

-- 1. First, check if the tenants table exists and what columns it has
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tenants' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check if subdomain column exists specifically
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'tenants' 
    AND table_schema = 'public'
    AND column_name = 'subdomain';

-- 3. If subdomain column doesn't exist, add it
-- (Only run this if the above query returns no rows)
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS subdomain VARCHAR(100) UNIQUE;

-- 4. Add index for faster subdomain lookups
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain 
ON tenants(subdomain) 
WHERE subdomain IS NOT NULL;

-- 5. Now check the table structure again
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'tenants' 
    AND table_schema = 'public'
ORDER BY ordinal_position;
