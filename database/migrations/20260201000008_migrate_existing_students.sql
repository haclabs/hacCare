-- ============================================================================
-- MIGRATE EXISTING STUDENT ACCOUNTS FROM NURSE TO STUDENT ROLE
-- ============================================================================
-- Migration: Convert simulation-only nurse accounts to student role
-- Author: GitHub Copilot
-- Date: 2026-02-01
-- ============================================================================
-- Purpose: Migrate existing users who were created as 'nurse' with 
--          simulation_only=true to the new 'student' role
-- ============================================================================

-- CONFIGURATION: Uses each user's primary_program field for assignment
DO $$
DECLARE
  v_tenant_id UUID;
  v_student_counter INTEGER := 1;
  v_student_number TEXT;
  v_user RECORD;
  v_program_id UUID;
BEGIN
  -- Get LethPoly tenant ID (or first active institution tenant)
  SELECT id INTO v_tenant_id
  FROM tenants
  WHERE tenant_type IN ('production', 'institution')
    AND status = 'active'
  ORDER BY 
    CASE WHEN name ILIKE '%lethpoly%' THEN 1 ELSE 2 END,
    created_at
  LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No institution tenant found';
  END IF;

  RAISE NOTICE '📍 Using tenant: %', v_tenant_id;

  -- Step 1: Show users that will be migrated
  RAISE NOTICE '👥 Users to be migrated from nurse to student:';
  FOR v_user IN 
    SELECT 
      id,
      email,
      first_name,
      last_name,
      role as current_role,
      primary_program,
      simulation_only,
      created_at
    FROM user_profiles
    WHERE role = 'nurse' 
      AND simulation_only = true
    ORDER BY email
  LOOP
    RAISE NOTICE '  - % % (%) - Program: % - created %', 
      v_user.first_name, v_user.last_name, v_user.email, 
      COALESCE(v_user.primary_program, 'NONE'), v_user.created_at;
  END LOOP;

  -- Step 2: Update user_profiles table
  UPDATE user_profiles
  SET 
    role = 'student',
    updated_at = NOW()
  WHERE role = 'nurse' 
    AND simulation_only = true;

  -- Step 3: Update tenant_users table (their tenant access role)
  UPDATE tenant_users
  SET role = 'student'
  WHERE user_id IN (
    SELECT id 
    FROM user_profiles 
    WHERE role = 'student' 
      AND simulation_only = true
  )
  AND role = 'nurse';

  -- Step 4: Create student_roster entries with fake student numbers
  RAISE NOTICE '🏷️  Generating student numbers and roster entries...';
  
  FOR v_user IN 
    SELECT id, email, first_name, last_name, primary_program
    FROM user_profiles
    WHERE role = 'student' 
      AND simulation_only = true
    ORDER BY email
  LOOP
    -- Generate unique student number (STU00001, STU00002, etc.)
    v_student_number := 'STU' || LPAD(v_student_counter::TEXT, 5, '0');
    
    -- Get program ID based on user's primary_program
    IF v_user.primary_program IS NOT NULL THEN
      SELECT id INTO v_program_id
      FROM programs
      WHERE tenant_id = v_tenant_id
        AND code = v_user.primary_program
        AND is_active = true;
      
      IF v_program_id IS NOT NULL THEN
        -- Insert into student_roster
        INSERT INTO student_roster (
          user_id,
          program_id,
          student_number,
          enrollment_date,
          is_active,
          notes,
          created_by
        )
        VALUES (
          v_user.id,
          v_program_id,
          v_student_number,
          CURRENT_DATE,
          true,
          'Migrated from nurse role - auto-generated student number',
          NULL
        )
        ON CONFLICT (user_id, program_id) DO UPDATE
        SET student_number = EXCLUDED.student_number,
            notes = EXCLUDED.notes;
        
        RAISE NOTICE '  ✓ % % (%) → Student #% in program %', 
          v_user.first_name, v_user.last_name, v_user.email, v_student_number, v_user.primary_program;
      ELSE
        RAISE WARNING '  ⚠️  % % (%) - Program "%" not found, skipping', 
          v_user.first_name, v_user.last_name, v_user.email, v_user.primary_program;
      END IF;
    ELSE
      RAISE WARNING '  ⚠️  % % (%) - No primary_program set, skipping roster entry', 
        v_user.first_name, v_user.last_name, v_user.email;
    END IF;
    
    v_student_counter := v_student_counter + 1;
  END LOOP;

  -- Step 5: Show migrated users with their programs
  RAISE NOTICE '✅ Successfully migrated users:';
  FOR v_user IN
    SELECT 
      up.id,
      up.email,
      up.first_name,
      up.last_name,
      up.role as new_role,
      tu.tenant_id,
      tu.role as tenant_role,
      ARRAY_AGG(p.code) as program_codes,
      ARRAY_AGG(sr.student_number) as student_numbers
    FROM user_profiles up
    LEFT JOIN tenant_users tu ON tu.user_id = up.id
    LEFT JOIN student_roster sr ON sr.user_id = up.id
    LEFT JOIN programs p ON p.id = sr.program_id
    WHERE up.role = 'student' 
      AND up.simulation_only = true
    GROUP BY up.id, up.email, up.first_name, up.last_name, up.role, tu.tenant_id, tu.role
    ORDER BY up.email
  LOOP
    RAISE NOTICE '  - % % (%) - Programs: % - Student #: %', 
      v_user.first_name, v_user.last_name, v_user.email, 
      v_user.program_codes, v_user.student_numbers[1];
  END LOOP;

  -- Step 6: Summary
  RAISE NOTICE '📊 Migration Summary:';
  RAISE NOTICE '  Total students migrated: %', (SELECT COUNT(*) FROM user_profiles WHERE role = 'student' AND simulation_only = true);
  RAISE NOTICE '  Total roster entries created: %', (SELECT COUNT(*) FROM student_roster WHERE notes LIKE '%Migrated from nurse role%');
  RAISE NOTICE '  Students by program:';
  
  FOR v_user IN
    SELECT p.code, COUNT(*) as student_count
    FROM student_roster sr
    JOIN programs p ON p.id = sr.program_id
    WHERE sr.notes LIKE '%Migrated from nurse role%'
    GROUP BY p.code
    ORDER BY p.code
  LOOP
    RAISE NOTICE '    - %: % students', v_user.code, v_user.student_count;
  END LOOP;

END $$;

