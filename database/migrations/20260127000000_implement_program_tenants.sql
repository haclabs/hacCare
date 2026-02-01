-- ============================================================================
-- IMPLEMENT PROGRAM TENANTS FOR INSTRUCTOR WORKSPACES
-- ============================================================================
-- Migration: Add program tenant functionality to existing tenant system
-- Author: GitHub Copilot
-- Date: 2026-01-27
-- ============================================================================
-- Purpose: Enable each program (NESA, PN, SIM Hub, BNAD) to have its own
--          tenant workspace where instructors can manage program-specific
--          content, templates, and announcements without patient data.
-- ============================================================================

-- ============================================================================
-- 1. EXTEND TENANT_TYPE ENUM (Must be in separate transaction)
-- ============================================================================

DO $$
BEGIN
    -- Check if 'program' exists before adding
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'program' AND enumtypid = 'tenant_type'::regtype) THEN
        -- Note: This assumes tenant_type is an enum. If it's a text field, skip this.
        -- Check if tenant_type is actually an enum
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tenant_type' AND typtype = 'e') THEN
            ALTER TYPE tenant_type ADD VALUE 'program';
            RAISE NOTICE '✅ Added program to tenant_type enum';
        ELSE
            RAISE NOTICE 'ℹ️ tenant_type is not an enum, skipping enum addition';
        END IF;
    ELSE
        RAISE NOTICE '⚠️ program tenant_type already exists';
    END IF;
END $$;

COMMIT;

-- ============================================================================
-- 2. ADD PROGRAM_ID COLUMN TO TENANTS TABLE
-- ============================================================================
-- Links program tenants to their corresponding program record

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS program_id UUID REFERENCES programs(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_tenants_program_id ON tenants(program_id);

COMMENT ON COLUMN tenants.program_id IS 'Links program tenants to their program record. NULL for non-program tenants.';

-- ============================================================================
-- 2B. FIX TENANT_TYPE CHECK CONSTRAINT
-- ============================================================================
-- Remove old constraint and add one that includes 'program'

ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_tenant_type_check;

ALTER TABLE tenants
ADD CONSTRAINT tenants_tenant_type_check 
CHECK (tenant_type IN (
  'production',
  'institution',
  'hospital',
  'clinic',
  'simulation_template',
  'simulation_active',
  'program'
));

-- ============================================================================
-- 3. CREATE FUNCTION TO GENERATE PROGRAM TENANT
-- ============================================================================
-- Called when a new program is created or when migrating existing programs

CREATE OR REPLACE FUNCTION create_program_tenant(
  p_program_id UUID,
  p_parent_tenant_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_program RECORD;
  v_tenant_id UUID;
  v_subdomain TEXT;
  v_result json;
BEGIN
  -- Get program details
  SELECT * INTO v_program
  FROM programs
  WHERE id = p_program_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Program not found'
    );
  END IF;

  -- Check if program tenant already exists
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE program_id = p_program_id;

  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'tenant_id', v_tenant_id,
      'message', 'Program tenant already exists'
    );
  END IF;

  -- Generate subdomain from program code (lowercase, no spaces)
  v_subdomain := lower(regexp_replace(v_program.code, '[^a-zA-Z0-9]', '', 'g'));

  -- Create the program tenant
  INSERT INTO tenants (
    name,
    subdomain,
    tenant_type,
    parent_tenant_id,
    program_id,
    is_simulation,
    status,
    created_at
  )
  VALUES (
    v_program.name || ' Program',
    v_subdomain,
    'program',
    p_parent_tenant_id,
    p_program_id,
    false,
    'active',
    NOW()
  )
  RETURNING id INTO v_tenant_id;

  -- Grant program instructors access to the program tenant
  INSERT INTO tenant_users (user_id, tenant_id, role, is_active)
  SELECT 
    up.user_id,
    v_tenant_id,
    'instructor',
    true
  FROM user_programs up
  WHERE up.program_id = p_program_id
  ON CONFLICT (user_id, tenant_id) DO UPDATE 
  SET is_active = true, role = 'instructor';

  RAISE NOTICE '✅ Created program tenant: % (ID: %)', v_program.name, v_tenant_id;

  RETURN json_build_object(
    'success', true,
    'tenant_id', v_tenant_id,
    'tenant_name', v_program.name || ' Program',
    'subdomain', v_subdomain,
    'message', 'Program tenant created successfully'
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Subdomain conflict - add suffix
    v_subdomain := v_subdomain || '_' || substr(v_program.tenant_id::text, 1, 8);
    
    INSERT INTO tenants (
      name,
      subdomain,
      tenant_type,
      parent_tenant_id,
      program_id,
      is_simulation,
      status,
      created_at
    )
    VALUES (
      v_program.name || ' Program',
      v_subdomain,
      'program',
      p_parent_tenant_id,
      p_program_id,
      false,
      'active',
      NOW()
    )
    RETURNING id INTO v_tenant_id;

    RETURN json_build_object(
      'success', true,
      'tenant_id', v_tenant_id,
      'message', 'Program tenant created with alternate subdomain'
    );
    
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION create_program_tenant TO authenticated;

COMMENT ON FUNCTION create_program_tenant IS 
'Creates a dedicated tenant workspace for a program. Called when programs are created.';

-- ============================================================================
-- 4. CREATE TRIGGER TO AUTO-CREATE PROGRAM TENANTS
-- ============================================================================
-- Automatically creates program tenant when a new program is created

CREATE OR REPLACE FUNCTION trigger_create_program_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- Only create tenant for active programs
  IF NEW.is_active THEN
    -- Create the program tenant (use NEW.tenant_id as parent)
    SELECT create_program_tenant(NEW.id, NEW.tenant_id) INTO v_result;
    
    IF (v_result->>'success')::boolean = false THEN
      RAISE WARNING 'Failed to create program tenant: %', v_result->>'error';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS after_program_insert_create_tenant ON programs;

CREATE TRIGGER after_program_insert_create_tenant
  AFTER INSERT ON programs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_program_tenant();

COMMENT ON FUNCTION trigger_create_program_tenant IS 
'Trigger function that creates a program tenant when a new program is inserted';

-- ============================================================================
-- 5. CREATE HELPER FUNCTION TO GET USER'S PROGRAM TENANTS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_program_tenants(p_user_id UUID)
RETURNS TABLE (
  tenant_id UUID,
  tenant_name TEXT,
  program_id UUID,
  program_code TEXT,
  program_name TEXT,
  subdomain TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    p.id as program_id,
    p.code as program_code,
    p.name as program_name,
    t.subdomain
  FROM user_programs up
  JOIN programs p ON p.id = up.program_id
  JOIN tenants t ON t.program_id = p.id
  WHERE up.user_id = p_user_id
    AND p.is_active = true
    AND t.status = 'active'
    AND t.tenant_type = 'program'
  ORDER BY p.code;
$$;

GRANT EXECUTE ON FUNCTION get_user_program_tenants TO authenticated;

COMMENT ON FUNCTION get_user_program_tenants IS 
'Returns all program tenants that a user has access to via their program assignments';

-- ============================================================================
-- 6. UPDATE EXISTING PROGRAMS TO CREATE PROGRAM TENANTS
-- ============================================================================
-- Migrate existing programs to have program tenants

DO $$
DECLARE
  v_program RECORD;
  v_result json;
  v_parent_tenant_id UUID;
BEGIN
  -- Find the parent tenant (LethPoly or first active production tenant)
  SELECT id INTO v_parent_tenant_id
  FROM tenants
  WHERE tenant_type IN ('production', 'institution')
    AND status = 'active'
  ORDER BY 
    CASE WHEN name ILIKE '%lethpoly%' THEN 1 ELSE 2 END,
    created_at
  LIMIT 1;

  IF v_parent_tenant_id IS NULL THEN
    RAISE WARNING '⚠️ No parent tenant found for program tenant migration';
    RETURN;
  END IF;

  RAISE NOTICE '📍 Using parent tenant: %', v_parent_tenant_id;

  -- Create program tenants for all existing active programs
  FOR v_program IN 
    SELECT p.*
    FROM programs p
    WHERE p.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM tenants t 
        WHERE t.program_id = p.id
      )
  LOOP
    RAISE NOTICE '🔄 Creating program tenant for: % (%)', v_program.name, v_program.code;
    
    SELECT create_program_tenant(v_program.id, v_parent_tenant_id) INTO v_result;
    
    IF (v_result->>'success')::boolean THEN
      RAISE NOTICE '✅ Created program tenant: %', v_result->>'tenant_name';
    ELSE
      RAISE WARNING '❌ Failed to create program tenant for %: %', v_program.name, v_result->>'error';
    END IF;
  END LOOP;

  RAISE NOTICE '🎉 Program tenant migration complete';
END $$;

-- ============================================================================
-- 7. UPDATE RLS POLICIES FOR PROGRAM TENANT ACCESS
-- ============================================================================
-- Ensure instructors can access their program tenants

-- Update tenants table RLS to allow viewing program tenants
DROP POLICY IF EXISTS tenants_instructors_see_program_tenants ON tenants;

CREATE POLICY tenants_instructors_see_program_tenants
  ON tenants
  FOR SELECT
  TO authenticated
  USING (
    -- Users can see program tenants they have access to
    tenant_type = 'program' AND id IN (
      SELECT t.id
      FROM tenants t
      JOIN programs p ON p.id = t.program_id
      JOIN user_programs up ON up.program_id = p.id
      WHERE up.user_id = auth.uid()
        AND p.is_active = true
    )
  );

COMMENT ON POLICY tenants_instructors_see_program_tenants ON tenants IS 
'Allows instructors to see program tenants they are assigned to';

-- ============================================================================
-- 8. ADD DEFAULT_TENANT_ID TO USER_PROFILES
-- ============================================================================
-- Store instructor's default program tenant for auto-login

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS default_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_default_tenant_id ON user_profiles(default_tenant_id);

COMMENT ON COLUMN user_profiles.default_tenant_id IS 
'Instructors default program tenant. Auto-set to their first program tenant or manually chosen.';

-- Auto-set default_tenant_id for instructors with single program
UPDATE user_profiles up
SET default_tenant_id = (
  SELECT t.id
  FROM tenants t
  JOIN programs p ON p.id = t.program_id
  JOIN user_programs upr ON upr.program_id = p.id
  WHERE upr.user_id = up.id
    AND t.tenant_type = 'program'
    AND t.status = 'active'
  LIMIT 1
)
WHERE up.role = 'instructor'
  AND up.default_tenant_id IS NULL
  AND EXISTS (
    SELECT 1 FROM user_programs upr2 WHERE upr2.user_id = up.id
  );

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify program tenants created
SELECT 
  'Program Tenants Created' as status,
  COUNT(*) as tenant_count
FROM tenants
WHERE tenant_type = 'program';

-- Show program tenant mapping
SELECT 
  p.code as program_code,
  p.name as program_name,
  t.name as tenant_name,
  t.subdomain,
  t.status,
  (SELECT COUNT(*) FROM tenant_users tu WHERE tu.tenant_id = t.id) as user_count
FROM programs p
LEFT JOIN tenants t ON t.program_id = p.id
WHERE p.is_active = true
ORDER BY p.code;

-- Migration complete - check results above
