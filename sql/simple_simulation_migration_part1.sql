-- ============================================
-- SIMPLE SIMULATION MIGRATION - Run in Order
-- ============================================

-- PART 1: Create tables and columns first
-- ============================================

-- 1. Add columns to existing tables
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS parent_tenant_id UUID REFERENCES tenants(id),
ADD COLUMN IF NOT EXISTS tenant_type TEXT DEFAULT 'institution',
ADD COLUMN IF NOT EXISTS simulation_id UUID REFERENCES active_simulations(id),
ADD COLUMN IF NOT EXISTS auto_cleanup_at TIMESTAMP;

-- Add constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name LIKE '%tenant_type%') THEN
    ALTER TABLE tenants ADD CONSTRAINT tenants_tenant_type_check CHECK (tenant_type IN ('institution', 'simulation'));
  END IF;
END $$;

ALTER TABLE active_simulations 
ADD COLUMN IF NOT EXISTS simulation_status TEXT DEFAULT 'lobby',
ADD COLUMN IF NOT EXISTS lobby_message TEXT,
ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES auth.users(id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.check_constraints WHERE constraint_name LIKE '%simulation_status%') THEN
    ALTER TABLE active_simulations ADD CONSTRAINT active_simulations_status_check CHECK (simulation_status IN ('lobby', 'running', 'paused', 'completed'));
  END IF;
END $$;

-- 2. Create new tables
CREATE TABLE IF NOT EXISTS simulation_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  username TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('student', 'instructor', 'nurse')),
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(simulation_tenant_id, username)
);

CREATE TABLE IF NOT EXISTS simulation_lobby (
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

-- Enable RLS on new tables
ALTER TABLE simulation_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_lobby ENABLE ROW LEVEL SECURITY;

-- STOP HERE AND VERIFY TABLES EXIST BEFORE CONTINUING
-- Run: SELECT table_name FROM information_schema.tables WHERE table_name IN ('simulation_users', 'simulation_lobby');

-- ============================================
-- PART 2: Create functions (run after Part 1 succeeds)
-- ============================================