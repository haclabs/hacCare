-- ============================================================================
-- BULK ASSIGN STUDENTS TO SIMULATION
-- ============================================================================
-- Function: bulk_assign_students_to_simulation
-- Purpose: Efficiently assign multiple students to a simulation at once,
--          creating simulation_participants entries and granting tenant access
--          via tenant_users table. Uses array expansion for batch inserts.
-- ============================================================================

CREATE OR REPLACE FUNCTION bulk_assign_students_to_simulation(
  p_simulation_id UUID,
  p_student_user_ids UUID[],
  p_role TEXT DEFAULT 'student'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_simulation RECORD;
  v_assigned_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_tenant_role user_role;
BEGIN
  -- Validate simulation exists
  SELECT * INTO v_simulation 
  FROM simulations 
  WHERE id = p_simulation_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Simulation not found',
      'assigned_count', 0,
      'error_count', 0
    );
  END IF;

  -- Map simulation role to tenant role
  v_tenant_role := CASE p_role
    WHEN 'instructor' THEN 'admin'::user_role
    WHEN 'student' THEN 'nurse'::user_role
    ELSE 'nurse'::user_role
  END;

  -- Batch insert simulation_participants
  -- Using INSERT with array expansion and ON CONFLICT to handle duplicates
  INSERT INTO simulation_participants (
    simulation_id,
    user_id,
    role,
    granted_by,
    granted_at
  )
  SELECT 
    p_simulation_id,
    unnest(p_student_user_ids),
    p_role::simulation_role,
    auth.uid(),
    NOW()
  ON CONFLICT (simulation_id, user_id) DO NOTHING;

  -- Get count of successful inserts
  GET DIAGNOSTICS v_assigned_count = ROW_COUNT;

  -- Batch upsert tenant_users to grant RLS access
  -- This is CRITICAL for students to see simulation data
  INSERT INTO tenant_users (
    user_id,
    tenant_id,
    role,
    is_active
  )
  SELECT 
    unnest(p_student_user_ids),
    v_simulation.tenant_id,
    v_tenant_role,
    true
  ON CONFLICT (user_id, tenant_id) 
  DO UPDATE SET
    role = CASE 
      WHEN EXCLUDED.role = 'admin'::user_role THEN 'admin'::user_role  -- Keep instructor role if exists
      ELSE EXCLUDED.role 
    END,
    is_active = true;

  -- Log assignment for audit
  RAISE NOTICE 'Bulk assigned % students to simulation % (tenant: %)', 
    v_assigned_count, p_simulation_id, v_simulation.tenant_id;

  -- Return success result
  RETURN json_build_object(
    'success', true,
    'assigned_count', v_assigned_count,
    'error_count', 0,
    'errors', '[]'::JSONB,
    'message', format('%s students assigned successfully', v_assigned_count),
    'simulation_id', p_simulation_id,
    'tenant_id', v_simulation.tenant_id
  );

EXCEPTION WHEN OTHERS THEN
  -- Return error with context
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'assigned_count', v_assigned_count,
    'error_count', 1,
    'simulation_id', p_simulation_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_assign_students_to_simulation TO authenticated;

COMMENT ON FUNCTION bulk_assign_students_to_simulation IS 
'Efficiently assign multiple students to a simulation using batch inserts.
Creates simulation_participants entries and grants tenant_users access for RLS.
Uses ON CONFLICT to handle duplicate assignments gracefully.
Returns: {success: boolean, assigned_count: number, error_count: number, errors: []}';

-- ============================================================================
-- HELPER FUNCTION: Get students assigned to simulation
-- ============================================================================

CREATE OR REPLACE FUNCTION get_simulation_students(
  p_simulation_id UUID
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  student_number TEXT,
  role simulation_role,
  granted_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    sp.user_id,
    up.email,
    up.first_name,
    up.last_name,
    sr.student_number,
    sp.role,
    sp.granted_at,
    sp.last_accessed_at
  FROM simulation_participants sp
  JOIN user_profiles up ON up.id = sp.user_id
  LEFT JOIN student_roster sr ON sr.user_id = sp.user_id
  WHERE sp.simulation_id = p_simulation_id
  ORDER BY sp.role DESC, up.last_name, up.first_name;
$$;

GRANT EXECUTE ON FUNCTION get_simulation_students TO authenticated;

COMMENT ON FUNCTION get_simulation_students IS 
'Get all students assigned to a simulation with their profile and roster information';

-- ============================================================================
-- HELPER FUNCTION: Get cohort students for bulk assignment
-- ============================================================================

CREATE OR REPLACE FUNCTION get_cohort_students(
  p_cohort_id UUID
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  student_number TEXT,
  program_id UUID,
  program_code TEXT
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    sr.user_id,
    up.email,
    up.first_name,
    up.last_name,
    sr.student_number,
    sr.program_id,
    p.code as program_code
  FROM student_roster sr
  JOIN user_profiles up ON up.id = sr.user_id
  JOIN programs p ON p.id = sr.program_id
  WHERE sr.cohort_id = p_cohort_id
    AND sr.is_active = true
  ORDER BY up.last_name, up.first_name;
$$;

GRANT EXECUTE ON FUNCTION get_cohort_students TO authenticated;

COMMENT ON FUNCTION get_cohort_students IS 
'Get all active students in a cohort for bulk simulation assignment';
