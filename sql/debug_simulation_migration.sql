-- ============================================
-- STEP 1: Debug Migration - Run Each Step Separately
-- ============================================

-- First, let's check what tables currently exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('tenants', 'active_simulations', 'simulation_users', 'simulation_lobby');

-- Check current columns in tenants table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
ORDER BY ordinal_position;

-- Check current columns in active_simulations table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'active_simulations' 
ORDER BY ordinal_position;

-- ============================================
-- STEP 2: Add Columns to Existing Tables (Run this first)
-- ============================================

-- Add simulation-specific fields to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS parent_tenant_id UUID REFERENCES tenants(id);

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS tenant_type TEXT DEFAULT 'institution';

-- Add constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'tenants_tenant_type_check'
  ) THEN
    ALTER TABLE tenants 
    ADD CONSTRAINT tenants_tenant_type_check 
    CHECK (tenant_type IN ('institution', 'simulation'));
  END IF;
END $$;

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS simulation_id UUID REFERENCES active_simulations(id);

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS auto_cleanup_at TIMESTAMP;

-- Update active_simulations table for lobby system
ALTER TABLE active_simulations 
ADD COLUMN IF NOT EXISTS simulation_status TEXT DEFAULT 'lobby';

-- Add constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'active_simulations_simulation_status_check'
  ) THEN
    ALTER TABLE active_simulations 
    ADD CONSTRAINT active_simulations_simulation_status_check 
    CHECK (simulation_status IN ('lobby', 'running', 'paused', 'completed'));
  END IF;
END $$;

ALTER TABLE active_simulations 
ADD COLUMN IF NOT EXISTS lobby_message TEXT;

ALTER TABLE active_simulations 
ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES auth.users(id);

-- Verify columns were added
SELECT 'tenants columns:' as check_type, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
AND column_name IN ('parent_tenant_id', 'tenant_type', 'simulation_id', 'auto_cleanup_at')
UNION ALL
SELECT 'active_simulations columns:' as check_type, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'active_simulations' 
AND column_name IN ('simulation_status', 'lobby_message', 'instructor_id');

-- ============================================
-- STEP 3: Create New Tables (Run this after Step 2 succeeds)
-- ============================================

-- Create simulation users table
DROP TABLE IF EXISTS simulation_users CASCADE;
CREATE TABLE simulation_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  username TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'instructor', 'nurse')),
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(simulation_tenant_id, username)
);

-- Create simulation lobby table
DROP TABLE IF EXISTS simulation_lobby CASCADE;
CREATE TABLE simulation_lobby (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID NOT NULL REFERENCES active_simulations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  username TEXT NOT NULL,
  role TEXT NOT NULL,
  joined_at TIMESTAMP DEFAULT NOW(),
  last_ping TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'ready', 'in_simulation')),
  UNIQUE(simulation_id, user_id)
);

-- Verify tables were created
SELECT table_name, 
       CASE WHEN table_name IS NOT NULL THEN 'EXISTS' ELSE 'MISSING' END as status
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('simulation_users', 'simulation_lobby');

-- Check simulation_users table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'simulation_users' 
ORDER BY ordinal_position;

-- ============================================
-- STEP 4: Test Table Access (Run this to verify)
-- ============================================

-- Test that we can query the new tables
SELECT 'simulation_users table test' as test, COUNT(*) as row_count FROM simulation_users;
SELECT 'simulation_lobby table test' as test, COUNT(*) as row_count FROM simulation_lobby;

-- Test joins work
SELECT 'Join test' as test, COUNT(*) as count
FROM tenants t
LEFT JOIN simulation_users su ON su.simulation_tenant_id = t.id
WHERE t.tenant_type = 'simulation';

-- ============================================
-- INSTRUCTIONS
-- ============================================

-- Run each step in order:
-- 1. Run STEP 1 to see current state
-- 2. Run STEP 2 to add columns (fix any errors before proceeding)
-- 3. Run STEP 3 to create tables (fix any errors before proceeding)  
-- 4. Run STEP 4 to verify everything works
-- 5. If all steps pass, then run the full migration