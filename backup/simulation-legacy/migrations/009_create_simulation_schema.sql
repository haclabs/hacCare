-- ===========================================================================
-- SIMULATION SYSTEM V2.0 - NEW SCHEMA CREATION
-- ===========================================================================
-- Purpose: Create new simulation infrastructure with snapshot capability
-- Run after: 001_drop_old_simulation_tables.sql
-- ===========================================================================

-- ============================================================================
-- STEP 1: CREATE ENUMS
-- ============================================================================

-- Drop old tenant_type check constraint if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'tenants_tenant_type_check'
  ) THEN
    ALTER TABLE tenants DROP CONSTRAINT tenants_tenant_type_check;
  END IF;
END $$;

-- Tenant types enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_type') THEN
    CREATE TYPE tenant_type AS ENUM (
      'production',           -- Regular hospital/facility tenant
      'institution',          -- Legacy institutional tenant
      'hospital',             -- Legacy hospital tenant
      'clinic',               -- Legacy clinic tenant
      'simulation_template',  -- Tenant used for building simulation templates
      'simulation_active'     -- Active simulation instance tenant
    );
  ELSE
    -- Add new values to existing enum if they don't exist
    ALTER TYPE tenant_type ADD VALUE IF NOT EXISTS 'institution';
    ALTER TYPE tenant_type ADD VALUE IF NOT EXISTS 'hospital';
    ALTER TYPE tenant_type ADD VALUE IF NOT EXISTS 'clinic';
    ALTER TYPE tenant_type ADD VALUE IF NOT EXISTS 'simulation_template';
    ALTER TYPE tenant_type ADD VALUE IF NOT EXISTS 'simulation_active';
  END IF;
END $$;

-- Simulation template status
CREATE TYPE simulation_template_status AS ENUM (
  'draft',      -- Being built, not ready for use
  'ready',      -- Snapshot saved, ready to launch
  'archived'    -- No longer actively used but preserved
);

-- Active simulation status
CREATE TYPE simulation_active_status AS ENUM (
  'pending',    -- Created but not started yet
  'running',    -- Currently active
  'paused',     -- Temporarily paused
  'completed',  -- Finished successfully
  'expired',    -- Time limit reached
  'cancelled'   -- Manually cancelled by admin
);

-- Participant roles
CREATE TYPE simulation_role AS ENUM (
  'instructor',  -- Can manage the simulation
  'student'      -- Participant in training
);

-- ============================================================================
-- STEP 2: MODIFY EXISTING TABLES
-- ============================================================================

-- Handle tenant_type column conversion
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' 
    AND column_name = 'tenant_type'
    AND data_type = 'text'
  ) THEN
    -- Convert text column to enum
    ALTER TABLE tenants 
    ALTER COLUMN tenant_type TYPE tenant_type USING tenant_type::tenant_type;
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' 
    AND column_name = 'tenant_type'
  ) THEN
    -- Add column if it doesn't exist
    ALTER TABLE tenants 
    ADD COLUMN tenant_type tenant_type DEFAULT 'production';
  END IF;
END $$;

-- Add other simulation fields to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS is_simulation boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS parent_tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS simulation_config jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS auto_cleanup_at timestamptz,
ADD COLUMN IF NOT EXISTS simulation_id uuid;

-- Add simulation_only flag to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS simulation_only boolean DEFAULT false;

-- Create index for faster simulation tenant queries
CREATE INDEX IF NOT EXISTS idx_tenants_type ON tenants(tenant_type);
CREATE INDEX IF NOT EXISTS idx_tenants_simulation ON tenants(is_simulation) WHERE is_simulation = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_simulation_only ON user_profiles(simulation_only) WHERE simulation_only = true;

-- ============================================================================
-- STEP 3: CREATE NEW SIMULATION TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Simulation Templates: Master templates for creating simulations
-- ---------------------------------------------------------------------------
CREATE TABLE simulation_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  name text NOT NULL,
  description text,
  
  -- Template Configuration
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status simulation_template_status DEFAULT 'draft',
  
  -- Snapshot Data: Complete state of all data in template tenant
  snapshot_data jsonb DEFAULT '{}'::jsonb,
  snapshot_version integer DEFAULT 0,
  snapshot_taken_at timestamptz,
  
  -- Settings
  default_duration_minutes integer DEFAULT 120, -- Default 2 hours
  auto_cleanup_after_hours integer DEFAULT 24,  -- Auto-delete after 24 hours
  
  -- Metadata
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT unique_template_name UNIQUE(name),
  CONSTRAINT valid_duration CHECK(default_duration_minutes > 0),
  CONSTRAINT valid_cleanup CHECK(auto_cleanup_after_hours >= 0)
);

-- ---------------------------------------------------------------------------
-- Active Simulations: Running instances of templates
-- ---------------------------------------------------------------------------
CREATE TABLE simulation_active (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Template Reference
  template_id uuid NOT NULL REFERENCES simulation_templates(id) ON DELETE RESTRICT,
  
  -- Instance Info
  name text NOT NULL, -- Can be same as template or customized
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status simulation_active_status DEFAULT 'pending',
  
  -- Timing
  duration_minutes integer NOT NULL,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz, -- Will be set via trigger
  completed_at timestamptz,
  
  -- Snapshot Reference
  template_snapshot_version integer NOT NULL,
  
  -- Settings
  allow_late_join boolean DEFAULT false,
  auto_cleanup boolean DEFAULT true,
  
  -- Metadata
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT valid_duration CHECK(duration_minutes > 0)
);

-- ---------------------------------------------------------------------------
-- Simulation Participants: User access to active simulations
-- ---------------------------------------------------------------------------
CREATE TABLE simulation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  simulation_id uuid NOT NULL REFERENCES simulation_active(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role
  role simulation_role NOT NULL DEFAULT 'student',
  
  -- Access Control
  granted_at timestamptz DEFAULT now(),
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  last_accessed_at timestamptz,
  
  -- Constraints
  CONSTRAINT unique_participant UNIQUE(simulation_id, user_id)
);

-- ---------------------------------------------------------------------------
-- Simulation History: Completed simulations with metrics
-- ---------------------------------------------------------------------------
CREATE TABLE simulation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Original Simulation Reference
  simulation_id uuid, -- Original active simulation (nullable if cleaned up)
  template_id uuid NOT NULL REFERENCES simulation_templates(id) ON DELETE CASCADE,
  
  -- Basic Info
  name text NOT NULL,
  status simulation_active_status NOT NULL,
  
  -- Timing
  duration_minutes integer NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz,
  completed_at timestamptz,
  
  -- Performance Metrics
  metrics jsonb DEFAULT '{}'::jsonb,
  debrief_data jsonb DEFAULT '{}'::jsonb,
  
  -- Participants (snapshot at completion)
  participants jsonb DEFAULT '[]'::jsonb,
  
  -- Activity Log (summary)
  activity_summary jsonb DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_by uuid NOT NULL REFERENCES auth.users(id),
  archived_at timestamptz DEFAULT now(),
  
  created_at timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Simulation Activity Log: Track all actions during simulation
-- ---------------------------------------------------------------------------
CREATE TABLE simulation_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  simulation_id uuid NOT NULL REFERENCES simulation_active(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  
  -- Activity Details
  action_type text NOT NULL, -- e.g., 'medication_administered', 'vital_signs_recorded'
  action_details jsonb DEFAULT '{}'::jsonb,
  entity_type text, -- e.g., 'patient', 'medication'
  entity_id uuid,   -- ID of the entity acted upon
  
  -- Timing
  occurred_at timestamptz DEFAULT now(),
  
  -- Context
  notes text
);

CREATE INDEX idx_activity_log_simulation ON simulation_activity_log(simulation_id, occurred_at DESC);
CREATE INDEX idx_activity_log_user ON simulation_activity_log(user_id, occurred_at DESC);

-- ============================================================================
-- STEP 4: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Simulation Templates
CREATE INDEX idx_simulation_templates_status ON simulation_templates(status);
CREATE INDEX idx_simulation_templates_created_by ON simulation_templates(created_by);
CREATE INDEX idx_simulation_templates_tenant ON simulation_templates(tenant_id);

-- Active Simulations
CREATE INDEX idx_simulation_active_status ON simulation_active(status);
CREATE INDEX idx_simulation_active_template ON simulation_active(template_id);
CREATE INDEX idx_simulation_active_tenant ON simulation_active(tenant_id);
CREATE INDEX idx_simulation_active_ends_at ON simulation_active(ends_at) WHERE status = 'running';

-- Participants
CREATE INDEX idx_simulation_participants_simulation ON simulation_participants(simulation_id);
CREATE INDEX idx_simulation_participants_user ON simulation_participants(user_id);

-- History
CREATE INDEX idx_simulation_history_template ON simulation_history(template_id);
CREATE INDEX idx_simulation_history_created_by ON simulation_history(created_by);
CREATE INDEX idx_simulation_history_completed ON simulation_history(completed_at DESC);

-- ============================================================================
-- STEP 5: CREATE TRIGGERS
-- ============================================================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Calculate ends_at for simulation_active
CREATE OR REPLACE FUNCTION calculate_simulation_ends_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate ends_at based on starts_at and duration_minutes
  NEW.ends_at = NEW.starts_at + (NEW.duration_minutes || ' minutes')::interval;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_simulation_templates_updated_at
  BEFORE UPDATE ON simulation_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_simulation_active_updated_at
  BEFORE UPDATE ON simulation_active
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Calculate ends_at on INSERT and UPDATE
CREATE TRIGGER calculate_simulation_active_ends_at
  BEFORE INSERT OR UPDATE OF starts_at, duration_minutes ON simulation_active
  FOR EACH ROW
  EXECUTE FUNCTION calculate_simulation_ends_at();

-- ============================================================================
-- STEP 6: ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE simulation_templates IS 'Master templates for creating simulation training scenarios';
COMMENT ON TABLE simulation_active IS 'Currently running or recently completed simulation instances';
COMMENT ON TABLE simulation_participants IS 'Users granted access to specific simulations';
COMMENT ON TABLE simulation_history IS 'Archived simulations with performance metrics for review';
COMMENT ON TABLE simulation_activity_log IS 'Detailed activity tracking for debrief reports';

-- Schema creation complete
-- Next step: Run 003_create_simulation_rls_policies.sql
