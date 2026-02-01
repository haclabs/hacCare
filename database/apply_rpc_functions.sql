-- ============================================================================
-- APPLY RPC FUNCTIONS FOR STUDENT ROSTER SYSTEM
-- ============================================================================
-- Run this file in Supabase SQL Editor to deploy all RPC functions
-- Copy and paste this entire file into Supabase Dashboard → SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. BULK CREATE STUDENTS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION bulk_create_students(
  p_program_id UUID,
  p_students JSONB  -- Array of {first_name, last_name, email, student_number}
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student JSONB;
  v_student_data RECORD;
  v_auth_user_id UUID;
  v_success_count INTEGER := 0;
  v_error_count INTEGER := 0;
  v_errors JSONB := '[]'::JSONB;
  v_temp_password TEXT;
  v_program RECORD;
  v_tenant_id UUID;
BEGIN
  -- Validate program exists
  SELECT * INTO v_program FROM programs WHERE id = p_program_id;
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Program not found',
      'imported_count', 0,
      'error_count', 0
    );
  END IF;

  v_tenant_id := v_program.tenant_id;

  -- Loop through students array
  FOR v_student IN SELECT * FROM jsonb_array_elements(p_students)
  LOOP
    BEGIN
      -- Extract student data
      SELECT 
        v_student->>'first_name' as first_name,
        v_student->>'last_name' as last_name,
        v_student->>'email' as email,
        v_student->>'student_number' as student_number
      INTO v_student_data;

      -- Validate required fields
      IF v_student_data.first_name IS NULL OR 
         v_student_data.last_name IS NULL OR 
         v_student_data.email IS NULL OR 
         v_student_data.student_number IS NULL THEN
        v_errors := v_errors || jsonb_build_object(
          'email', v_student_data.email,
          'student_number', v_student_data.student_number,
          'error', 'Missing required fields'
        );
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;

      -- Check if student_number already exists
      IF EXISTS (SELECT 1 FROM student_roster WHERE student_number = v_student_data.student_number) THEN
        v_errors := v_errors || jsonb_build_object(
          'email', v_student_data.email,
          'student_number', v_student_data.student_number,
          'error', 'Student number already exists'
        );
        v_error_count := v_error_count + 1;
        CONTINUE;
      END IF;

      -- Check if email already exists in auth.users
      SELECT id INTO v_auth_user_id FROM auth.users WHERE email = v_student_data.email;
      
      IF v_auth_user_id IS NOT NULL THEN
        -- User exists, check if already enrolled in this program
        IF EXISTS (
          SELECT 1 FROM student_roster 
          WHERE user_id = v_auth_user_id AND program_id = p_program_id
        ) THEN
          v_errors := v_errors || jsonb_build_object(
            'email', v_student_data.email,
            'student_number', v_student_data.student_number,
            'error', 'Student already enrolled in this program'
          );
          v_error_count := v_error_count + 1;
          CONTINUE;
        END IF;

        -- Enroll existing user
        INSERT INTO student_roster (
          user_id, 
          program_id, 
          student_number, 
          enrollment_date,
          created_by
        ) VALUES (
          v_auth_user_id,
          p_program_id,
          v_student_data.student_number,
          CURRENT_DATE,
          auth.uid()
        );

        -- Update profile to be simulation_only
        UPDATE user_profiles 
        SET simulation_only = true
        WHERE id = v_auth_user_id;

        v_success_count := v_success_count + 1;
      ELSE
        -- Create new auth user with auto-generated password
        v_temp_password := encode(gen_random_bytes(16), 'hex');
        
        INSERT INTO auth.users (
          instance_id,
          id,
          aud,
          role,
          email,
          encrypted_password,
          email_confirmed_at,
          raw_app_meta_data,
          raw_user_meta_data,
          created_at,
          updated_at,
          confirmation_token,
          email_change,
          email_change_token_new,
          recovery_token
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          gen_random_uuid(),
          'authenticated',
          'authenticated',
          v_student_data.email,
          crypt(v_temp_password, gen_salt('bf')),
          NULL,
          jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
          jsonb_build_object(
            'first_name', v_student_data.first_name,
            'last_name', v_student_data.last_name
          ),
          NOW(),
          NOW(),
          encode(gen_random_bytes(32), 'hex'),
          '',
          '',
          encode(gen_random_bytes(32), 'hex')
        )
        RETURNING id INTO v_auth_user_id;

        PERFORM pg_sleep(0.1);

        INSERT INTO user_profiles (
          id,
          email,
          first_name,
          last_name,
          role,
          simulation_only,
          is_active,
          email_confirmed
        ) VALUES (
          v_auth_user_id,
          v_student_data.email,
          v_student_data.first_name,
          v_student_data.last_name,
          'nurse',
          true,
          true,
          false
        )
        ON CONFLICT (id) DO UPDATE
        SET 
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          simulation_only = true,
          email_confirmed = false;

        INSERT INTO student_roster (
          user_id,
          program_id,
          student_number,
          enrollment_date,
          created_by
        ) VALUES (
          v_auth_user_id,
          p_program_id,
          v_student_data.student_number,
          CURRENT_DATE,
          auth.uid()
        );

        INSERT INTO tenant_users (
          user_id,
          tenant_id,
          role,
          is_active
        )
        SELECT 
          v_auth_user_id,
          t.id,
          'nurse',
          true
        FROM tenants t
        WHERE t.program_id = p_program_id
        ON CONFLICT (user_id, tenant_id) DO NOTHING;

        v_success_count := v_success_count + 1;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors || jsonb_build_object(
        'email', v_student_data.email,
        'student_number', v_student_data.student_number,
        'error', SQLERRM
      );
      v_error_count := v_error_count + 1;
    END;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'imported_count', v_success_count,
    'error_count', v_error_count,
    'errors', v_errors,
    'message', format('%s students imported successfully, %s errors', v_success_count, v_error_count)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'imported_count', v_success_count,
    'error_count', v_error_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_create_students TO authenticated;

-- ============================================================================
-- 2. BULK ASSIGN STUDENTS TO SIMULATION FUNCTION
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
  v_tenant_role user_role;
BEGIN
  SELECT * INTO v_simulation 
  FROM simulation_active 
  WHERE id = p_simulation_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Simulation not found',
      'assigned_count', 0,
      'error_count', 0
    );
  END IF;

  v_tenant_role := CASE p_role
    WHEN 'instructor' THEN 'admin'::user_role
    WHEN 'student' THEN 'nurse'::user_role
    ELSE 'nurse'::user_role
  END;

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

  GET DIAGNOSTICS v_assigned_count = ROW_COUNT;

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
      WHEN EXCLUDED.role = 'admin'::user_role THEN 'admin'::user_role
      ELSE EXCLUDED.role 
    END,
    is_active = true;

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

-- ============================================================================
-- 3. HELPER FUNCTIONS
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

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================
-- All RPC functions successfully deployed!
-- You can now use these functions in your application:
--   - bulk_create_students(program_id, students_json)
--   - bulk_assign_students_to_simulation(simulation_id, user_ids[], role)
--   - get_simulation_students(simulation_id)
--   - get_cohort_students(cohort_id)
-- ============================================================================
