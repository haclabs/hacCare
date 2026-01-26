-- ============================================================================
-- ADD PROGRAMS AND COORDINATOR/INSTRUCTOR ROLES
-- ============================================================================
-- Migration: Add program management system and new user roles
-- Author: GitHub Copilot
-- Date: 2026-01-26
-- ============================================================================

-- ============================================================================
-- 1. ADD NEW USER ROLES TO ENUM (Must be in separate transaction)
-- ============================================================================
-- Note: This must be run FIRST and COMMITTED before running the rest
-- If running manually, execute this section separately, then run the rest

DO $$
BEGIN
    -- Check if 'coordinator' exists before adding
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'coordinator' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'coordinator';
        RAISE NOTICE '✅ Added coordinator role';
    ELSE
        RAISE NOTICE '⚠️ coordinator role already exists';
    END IF;

    -- Check if 'instructor' exists before adding
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'instructor' AND enumtypid = 'user_role'::regtype) THEN
        ALTER TYPE user_role ADD VALUE 'instructor';
        RAISE NOTICE '✅ Added instructor role';
    ELSE
        RAISE NOTICE '⚠️ instructor role already exists';
    END IF;
END $$;

COMMIT;

-- Add comment after commit
COMMENT ON TYPE user_role IS 'User roles: super_admin (cross-tenant), coordinator (tenant-wide), admin (tenant admin), instructor (program-scoped), nurse (clinical staff)';

-- ============================================================================
-- 2. CREATE PROGRAMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Unique constraint: one program code per tenant
  CONSTRAINT programs_tenant_code_unique UNIQUE (tenant_id, code)
);

-- Indexes for performance
CREATE INDEX idx_programs_tenant_id ON programs(tenant_id);
CREATE INDEX idx_programs_code ON programs(code);
CREATE INDEX idx_programs_is_active ON programs(is_active);

-- Enable RLS
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see programs in their tenant
CREATE POLICY programs_tenant_isolation
  ON programs
  FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT uta.tenant_id 
      FROM user_tenant_access uta 
      WHERE uta.user_id = auth.uid() 
        AND uta.is_active = true
    )
  );

-- RLS Policy: Only super_admin and coordinator can manage programs
CREATE POLICY programs_management
  ON programs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'coordinator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'coordinator')
    )
  );

COMMENT ON TABLE programs IS 'Programs within tenants (e.g., NESA, PN, SIM Hub, BNAD)';
COMMENT ON COLUMN programs.code IS 'Short code for program (e.g., NESA, PN) - used in simulation categories';
COMMENT ON COLUMN programs.name IS 'Full program name';

-- ============================================================================
-- 3. CREATE USER_PROGRAMS JUNCTION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES auth.users(id),
  
  -- Unique constraint: one assignment per user-program pair
  CONSTRAINT user_programs_unique UNIQUE (user_id, program_id)
);

-- Indexes for performance
CREATE INDEX idx_user_programs_user_id ON user_programs(user_id);
CREATE INDEX idx_user_programs_program_id ON user_programs(program_id);

-- Enable RLS
ALTER TABLE user_programs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see their own program assignments
CREATE POLICY user_programs_view_own
  ON user_programs
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS Policy: Super_admin and coordinator can see all assignments in their tenant
CREATE POLICY user_programs_view_tenant
  ON user_programs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'coordinator')
    )
    AND program_id IN (
      SELECT p.id FROM programs p
      WHERE p.tenant_id IN (
        SELECT uta.tenant_id 
        FROM user_tenant_access uta 
        WHERE uta.user_id = auth.uid() 
          AND uta.is_active = true
      )
    )
  );

-- RLS Policy: Only super_admin and coordinator can manage assignments
CREATE POLICY user_programs_management
  ON user_programs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'coordinator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('super_admin', 'coordinator')
    )
  );

COMMENT ON TABLE user_programs IS 'Many-to-many: users assigned to programs';

-- ============================================================================
-- 4. UPDATE USER_PROFILES TABLE
-- ============================================================================

-- Rename department to primary_program (nullable for backwards compatibility)
ALTER TABLE user_profiles 
  RENAME COLUMN department TO primary_program;

COMMENT ON COLUMN user_profiles.primary_program IS 'DEPRECATED: Primary program code. Use user_programs junction table instead.';

-- ============================================================================
-- 5. SEED INITIAL PROGRAMS FOR LETHPOLY
-- ============================================================================

-- Insert programs for LethPoly tenant (you'll need to replace with actual tenant ID)
DO $$
DECLARE
  v_lethpoly_tenant_id UUID;
BEGIN
  -- Try to find LethPoly tenant (adjust WHERE clause as needed)
  SELECT id INTO v_lethpoly_tenant_id
  FROM tenants
  WHERE name ILIKE '%lethpoly%'
    OR subdomain ILIKE '%lethpoly%'
  LIMIT 1;
  
  -- Only seed if LethPoly tenant found
  IF v_lethpoly_tenant_id IS NOT NULL THEN
    INSERT INTO programs (tenant_id, code, name, description, created_by)
    VALUES
      (v_lethpoly_tenant_id, 'NESA', 'NESA Program', 'Nursing Education Simulation Alliance', NULL),
      (v_lethpoly_tenant_id, 'PN', 'Practical Nursing', 'Practical Nursing Program', NULL),
      (v_lethpoly_tenant_id, 'SIM Hub', 'Simulation Hub', 'Central Simulation Hub', NULL),
      (v_lethpoly_tenant_id, 'BNAD', 'BNAD Program', 'Bachelor of Nursing Advanced Diploma', NULL)
    ON CONFLICT (tenant_id, code) DO NOTHING;
    
    RAISE NOTICE '✅ Seeded programs for LethPoly tenant: %', v_lethpoly_tenant_id;
  ELSE
    RAISE NOTICE '⚠️ LethPoly tenant not found - skipping program seeding';
  END IF;
END $$;

-- ============================================================================
-- 6. CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function: Get user's assigned program codes
CREATE OR REPLACE FUNCTION get_user_program_codes(p_user_id UUID)
RETURNS TEXT[]
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT ARRAY_AGG(p.code)
  FROM user_programs up
  JOIN programs p ON p.id = up.program_id
  WHERE up.user_id = p_user_id
    AND p.is_active = true;
$$;

COMMENT ON FUNCTION get_user_program_codes IS 'Returns array of program codes assigned to user';

-- Function: Check if user has access to program
CREATE OR REPLACE FUNCTION user_has_program_access(p_user_id UUID, p_program_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_programs up
    JOIN programs p ON p.id = up.program_id
    WHERE up.user_id = p_user_id
      AND p.code = p_program_code
      AND p.is_active = true
  );
$$;

COMMENT ON FUNCTION user_has_program_access IS 'Check if user is assigned to a specific program';

-- ============================================================================
-- 7. UPDATE UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_programs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER programs_updated_at_trigger
  BEFORE UPDATE ON programs
  FOR EACH ROW
  EXECUTE FUNCTION update_programs_updated_at();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables created
SELECT 
  'programs' as table_name, 
  COUNT(*) as row_count 
FROM programs
UNION ALL
SELECT 
  'user_programs' as table_name, 
  COUNT(*) as row_count 
FROM user_programs;

-- Verify new roles added
SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = 'user_role'::regtype 
ORDER BY enumsortorder;
