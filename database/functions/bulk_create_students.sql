-- ============================================================================
-- BULK CREATE STUDENTS WITH AUTO-GENERATED CREDENTIALS
-- ============================================================================
-- Function: bulk_create_students
-- Purpose: Import multiple students via CSV, create auth accounts with
--          auto-generated passwords, send password reset emails, and
--          enroll in program with simulation_only flag enabled.
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
        -- Note: In production, this would use Supabase Admin API
        -- For now, we'll create the user and let the trigger handle profile creation
        v_temp_password := encode(gen_random_bytes(16), 'hex');
        
        -- Insert into auth.users (simplified - in production use Supabase Admin API)
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
          NULL,  -- Will require email confirmation
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

        -- Wait for trigger to create profile (may need delay in real implementation)
        PERFORM pg_sleep(0.1);

        -- Update user profile with student details
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

        -- Enroll student in program
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

        -- Add to tenant_users for program tenant access (if program has tenant)
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

        -- Note: Password reset email would be sent via Supabase Admin API in production
        RAISE NOTICE 'Student created: % (%) - Password reset email should be sent', 
          v_student_data.email, v_student_data.student_number;
      END IF;

    EXCEPTION WHEN OTHERS THEN
      -- Catch any errors for this student
      v_errors := v_errors || jsonb_build_object(
        'email', v_student_data.email,
        'student_number', v_student_data.student_number,
        'error', SQLERRM
      );
      v_error_count := v_error_count + 1;
      RAISE WARNING 'Error creating student %: %', v_student_data.email, SQLERRM;
    END;
  END LOOP;

  -- Return results
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

COMMENT ON FUNCTION bulk_create_students IS 
'Bulk import students from CSV with auto-generated passwords and email confirmations. 
Creates auth users, profiles with simulation_only=true, and enrolls in program roster.
NOTE: In production, use Supabase Admin API for user creation with automatic password reset emails.';
