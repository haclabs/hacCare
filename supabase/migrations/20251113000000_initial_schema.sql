


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'Old simulation system cleaned up - ready for new implementation';



CREATE TYPE "public"."ack_scope" AS ENUM (
    'panel',
    'result'
);


ALTER TYPE "public"."ack_scope" OWNER TO "postgres";


CREATE TYPE "public"."alert_priority_enum" AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


ALTER TYPE "public"."alert_priority_enum" OWNER TO "postgres";


CREATE TYPE "public"."alert_type_enum" AS ENUM (
    'medication_due',
    'vital_signs',
    'emergency',
    'lab_results',
    'discharge_ready'
);


ALTER TYPE "public"."alert_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."device_type_enum" AS ENUM (
    'closed-suction-drain',
    'chest-tube',
    'foley',
    'iv-peripheral',
    'iv-picc',
    'iv-port',
    'other',
    'feeding-tube',
    'ostomy',
    'nasogastric'
);


ALTER TYPE "public"."device_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."lab_category" AS ENUM (
    'chemistry',
    'abg',
    'hematology'
);


ALTER TYPE "public"."lab_category" OWNER TO "postgres";


CREATE TYPE "public"."lab_flag" AS ENUM (
    'normal',
    'abnormal_high',
    'abnormal_low',
    'critical_high',
    'critical_low'
);


ALTER TYPE "public"."lab_flag" OWNER TO "postgres";


CREATE TYPE "public"."lab_panel_status" AS ENUM (
    'new',
    'partial_ack',
    'acknowledged'
);


ALTER TYPE "public"."lab_panel_status" OWNER TO "postgres";


CREATE TYPE "public"."orientation_enum" AS ENUM (
    'superior',
    'inferior',
    'medial',
    'lateral',
    'anterior',
    'posterior'
);


ALTER TYPE "public"."orientation_enum" OWNER TO "postgres";


CREATE TYPE "public"."ref_operator" AS ENUM (
    'between',
    '>=',
    '<=',
    'sex-specific'
);


ALTER TYPE "public"."ref_operator" OWNER TO "postgres";


CREATE TYPE "public"."reservoir_type_enum" AS ENUM (
    'jackson-pratt',
    'hemovac',
    'penrose',
    'other',
    'urinary-drainage-bag'
);


ALTER TYPE "public"."reservoir_type_enum" OWNER TO "postgres";


CREATE TYPE "public"."simulation_active_status" AS ENUM (
    'pending',
    'running',
    'paused',
    'completed',
    'expired',
    'cancelled'
);


ALTER TYPE "public"."simulation_active_status" OWNER TO "postgres";


CREATE TYPE "public"."simulation_role" AS ENUM (
    'instructor',
    'student'
);


ALTER TYPE "public"."simulation_role" OWNER TO "postgres";


CREATE TYPE "public"."simulation_template_status" AS ENUM (
    'draft',
    'ready',
    'archived'
);


ALTER TYPE "public"."simulation_template_status" OWNER TO "postgres";


CREATE TYPE "public"."tenant_type" AS ENUM (
    'production',
    'simulation_template',
    'simulation_active',
    'program'
);


ALTER TYPE "public"."tenant_type" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'nurse',
    'admin',
    'super_admin',
    'instructor',
    'coordinator',
    'student'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


COMMENT ON TYPE "public"."user_role" IS 'User roles: super_admin (cross-tenant), coordinator (tenant-wide), admin (tenant admin), instructor (program-scoped), nurse (clinical staff), student (learner)';



CREATE TYPE "public"."wound_type_enum" AS ENUM (
    'incision',
    'laceration',
    'surgical-site',
    'pressure-injury',
    'skin-tear',
    'other'
);


ALTER TYPE "public"."wound_type_enum" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."acknowledge_alert_for_tenant"("p_alert_id" "uuid", "p_tenant_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  calling_user_id UUID;
  user_role TEXT;
BEGIN
  -- Get the current user
  calling_user_id := auth.uid();
  
  -- Check if user is super admin or admin
  SELECT role INTO user_role 
  FROM user_profiles 
  WHERE id = calling_user_id;
  
  -- Only super admins and admins can use this function
  IF user_role NOT IN ('super_admin', 'admin') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Access denied: Super Admin or Admin role required'
    );
  END IF;
  
  -- Update the alert (RLS bypassed due to SECURITY DEFINER)
  UPDATE patient_alerts
  SET 
    acknowledged = true,
    acknowledged_at = NOW(),
    acknowledged_by = calling_user_id
  WHERE id = p_alert_id
  AND tenant_id = p_tenant_id;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Alert not found or already acknowledged'
    );
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Alert acknowledged successfully'
  );
  
EXCEPTION WHEN others THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;


ALTER FUNCTION "public"."acknowledge_alert_for_tenant"("p_alert_id" "uuid", "p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."acknowledge_alert_for_tenant"("p_alert_id" "uuid", "p_tenant_id" "uuid") IS 'Allows super admins and admins to acknowledge patient alerts across tenants, bypassing RLS policies';



CREATE OR REPLACE FUNCTION "public"."add_patient_template_to_simulation_template"("p_patient_template_id" "uuid", "p_simulation_template_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_snapshot jsonb;
  v_target_tenant_id uuid;
  v_patient_count_before integer;
  v_patient_count_after integer;
BEGIN
  SELECT snapshot_data INTO v_snapshot
  FROM patient_templates
  WHERE id = p_patient_template_id;

  IF v_snapshot IS NULL OR v_snapshot = '{}'::jsonb THEN
    RETURN json_build_object('success', false, 'message', 'Patient template has no saved snapshot yet — save it before adding it to a simulation template');
  END IF;

  SELECT tenant_id INTO v_target_tenant_id
  FROM simulation_templates
  WHERE id = p_simulation_template_id;

  IF v_target_tenant_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Simulation template not found');
  END IF;

  SELECT COUNT(*) INTO v_patient_count_before FROM patients WHERE tenant_id = v_target_tenant_id;

  PERFORM restore_snapshot_to_tenant(
    p_tenant_id := v_target_tenant_id,
    p_snapshot := v_snapshot,
    p_preserve_barcodes := false
  );

  SELECT COUNT(*) INTO v_patient_count_after FROM patients WHERE tenant_id = v_target_tenant_id;

  RETURN json_build_object(
    'success', true,
    'simulation_template_id', p_simulation_template_id,
    'tenant_id', v_target_tenant_id,
    'patients_added', v_patient_count_after - v_patient_count_before,
    'message', 'Patient added to simulation template'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."add_patient_template_to_simulation_template"("p_patient_template_id" "uuid", "p_simulation_template_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_patient_template_to_simulation_template"("p_patient_template_id" "uuid", "p_simulation_template_id" "uuid") IS 'Copies a patient template''s single patient + all clinical data into a simulation template''s tenant, minting a fresh patient id/barcode each time. Copy-once — no ongoing sync back to the patient template.';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."student_roster" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "program_id" "uuid" NOT NULL,
    "cohort_id" "uuid",
    "student_number" "text" NOT NULL,
    "enrollment_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "is_active" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."student_roster" OWNER TO "postgres";


COMMENT ON TABLE "public"."student_roster" IS 'Student enrollments in programs with cohort tracking';



COMMENT ON COLUMN "public"."student_roster"."cohort_id" IS 'Optional cohort grouping (e.g., Fall 2025, Spring 2026)';



COMMENT ON COLUMN "public"."student_roster"."student_number" IS 'Institutional student ID (unique across all programs)';



CREATE OR REPLACE FUNCTION "public"."add_student_to_roster_admin"("p_program_id" "uuid", "p_user_id" "uuid", "p_student_number" "text") RETURNS "public"."student_roster"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_role text;
  v_row public.student_roster;
BEGIN
  SELECT role INTO v_caller_role FROM user_profiles WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'coordinator', 'admin', 'instructor') THEN
    RAISE EXCEPTION 'Insufficient permissions to manage the student roster';
  END IF;

  INSERT INTO student_roster (program_id, user_id, student_number, enrollment_date, created_by)
  VALUES (p_program_id, p_user_id, p_student_number, CURRENT_DATE, auth.uid())
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;


ALTER FUNCTION "public"."add_student_to_roster_admin"("p_program_id" "uuid", "p_user_id" "uuid", "p_student_number" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."add_student_to_roster_admin"("p_program_id" "uuid", "p_user_id" "uuid", "p_student_number" "text") IS 'Adds a student to a program roster, bypassing RLS. SECURITY DEFINER so this
works regardless of student_roster''s RLS policy state; caller must already
hold super_admin/coordinator/admin/instructor role (same gate as
update_user_profile_admin).';



CREATE OR REPLACE FUNCTION "public"."archive_landing_content_version"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only archive if content actually changed
  IF OLD.content IS DISTINCT FROM NEW.content OR OLD.metadata IS DISTINCT FROM NEW.metadata THEN
    INSERT INTO public.landing_page_content_history (
      content_id,
      version,
      content,
      metadata,
      created_at,
      created_by
    ) VALUES (
      OLD.id,
      OLD.version,
      OLD.content,
      OLD.metadata,
      OLD.updated_at,
      OLD.updated_by
    );
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."archive_landing_content_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_set_tenant_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- If tenant_id is already set (e.g., from RPC function), don't override it
  IF NEW.tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Otherwise, try to get it from tenant_users (avoid user_profiles for now due to cache)
  SELECT tu.tenant_id INTO NEW.tenant_id
  FROM tenant_users tu
  WHERE tu.user_id = auth.uid()
  AND tu.is_active = true
  LIMIT 1;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_set_tenant_id"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_set_tenant_id"() IS 'BEFORE INSERT trigger — auto-populates tenant_id from the current user''s active tenant_users row when not explicitly provided. Fixed 2026-08-18: qualified bare tenant_id reference that was ambiguous against NEW''s own tenant_id column (42702).';



CREATE OR REPLACE FUNCTION "public"."auto_tag_simulation_from_template"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- If simulation has no categories but template does, copy them
  IF (NEW.primary_categories IS NULL OR NEW.primary_categories = '{}') 
     AND NEW.template_id IS NOT NULL THEN
    SELECT primary_categories INTO NEW.primary_categories
    FROM simulation_templates
    WHERE id = NEW.template_id
      AND primary_categories IS NOT NULL
      AND primary_categories != '{}';
    
    IF NEW.primary_categories IS NOT NULL AND NEW.primary_categories != '{}' THEN
      RAISE NOTICE '✅ Auto-tagged simulation % with categories from template: %', 
        NEW.name, NEW.primary_categories;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_tag_simulation_from_template"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_tag_simulation_from_template"() IS 'Automatically copy primary_categories from template to simulation when launching';



CREATE OR REPLACE FUNCTION "public"."bulk_assign_students_to_simulation"("p_simulation_id" "uuid", "p_student_user_ids" "uuid"[], "p_role" "text" DEFAULT 'student'::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."bulk_assign_students_to_simulation"("p_simulation_id" "uuid", "p_student_user_ids" "uuid"[], "p_role" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_simulation_metrics"("p_simulation_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_metrics jsonb;
  v_tenant_id uuid;
BEGIN
  -- Get simulation tenant
  SELECT tenant_id INTO v_tenant_id
  FROM simulation_active
  WHERE id = p_simulation_id;
  
  -- Calculate various metrics
  v_metrics := jsonb_build_object(
    'medications_administered', (
      SELECT COUNT(*)
      FROM patient_medications m
      WHERE m.tenant_id = v_tenant_id
    ),
    'vitals_recorded', (
      SELECT COUNT(*)
      FROM patient_vitals pv
      WHERE pv.tenant_id = v_tenant_id
    ),
    'notes_created', (
      SELECT COUNT(*)
      FROM patient_notes pn
      WHERE pn.tenant_id = v_tenant_id
    ),
    'alerts_generated', (
      SELECT COUNT(*)
      FROM patient_alerts pa
      WHERE pa.tenant_id = v_tenant_id
    ),
    'alerts_acknowledged', (
      SELECT COUNT(*)
      FROM patient_alerts pa
      WHERE pa.tenant_id = v_tenant_id
      AND pa.acknowledged = true
    ),
    'total_actions', (
      SELECT COUNT(*)
      FROM simulation_activity_log
      WHERE simulation_id = p_simulation_id
    ),
    'unique_participants', (
      SELECT COUNT(DISTINCT user_id)
      FROM simulation_activity_log
      WHERE simulation_id = p_simulation_id
    )
  );
  
  RETURN v_metrics;
END;
$$;


ALTER FUNCTION "public"."calculate_simulation_metrics"("p_simulation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_all_problem_simulations"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_run_record RECORD;
    v_cleanup_count INTEGER := 0;
    v_results JSONB[];
BEGIN
    -- Find all simulations and try to clean them up
    FOR v_run_record IN 
        SELECT id, name, status 
        FROM sim_runs 
        WHERE status IN ('active', 'paused')
        ORDER BY created_at ASC  -- Delete oldest first
    LOOP
        BEGIN
            -- Try to delete each problematic run
            v_results := v_results || ARRAY[delete_simulation_run_safe(v_run_record.id)];
            v_cleanup_count := v_cleanup_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                -- Log the failure but continue
                v_results := v_results || ARRAY[jsonb_build_object(
                    'run_id', v_run_record.id,
                    'run_name', v_run_record.name,
                    'status', 'FAILED',
                    'error', SQLERRM
                )];
        END;
    END LOOP;
    
    RETURN jsonb_build_object(
        'cleaned_up_count', v_cleanup_count,
        'total_processed', array_length(v_results, 1),
        'details', v_results,
        'message', 'Bulk cleanup completed'
    );
END;
$$;


ALTER FUNCTION "public"."cleanup_all_problem_simulations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_backup_audit_logs"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM backup_audit_log 
    WHERE created_at < NOW() - INTERVAL '1 year';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_backup_audit_logs"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_backup_audit_logs"() IS 'Removes audit logs older than 1 year';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_simulations"() RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_count INTEGER := 0;
  v_tenant_record RECORD;
BEGIN
  -- Find expired simulation tenants
  FOR v_tenant_record IN 
    SELECT t.id, t.simulation_id 
    FROM tenants t 
    WHERE t.tenant_type = 'simulation' 
    AND t.auto_cleanup_at < NOW()
  LOOP
    -- Delete simulation data
    DELETE FROM simulation_patients WHERE active_simulation_id = v_tenant_record.simulation_id;
    DELETE FROM simulation_patient_vitals WHERE simulation_patient_id IN (
      SELECT id FROM simulation_patients WHERE active_simulation_id = v_tenant_record.simulation_id
    );
    DELETE FROM simulation_patient_medications WHERE simulation_patient_id IN (
      SELECT id FROM simulation_patients WHERE active_simulation_id = v_tenant_record.simulation_id
    );
    DELETE FROM simulation_patient_notes WHERE simulation_patient_id IN (
      SELECT id FROM simulation_patients WHERE active_simulation_id = v_tenant_record.simulation_id
    );
    
    -- Delete lobby and user data
    DELETE FROM simulation_lobby WHERE simulation_id = v_tenant_record.simulation_id;
    DELETE FROM tenant_users WHERE tenant_id = v_tenant_record.id;
    DELETE FROM simulation_users WHERE simulation_tenant_id = v_tenant_record.id;
    
    -- Delete the simulation and tenant
    DELETE FROM active_simulations WHERE id = v_tenant_record.simulation_id;
    DELETE FROM tenants WHERE id = v_tenant_record.id;
    
    v_count := v_count + 1;
  END LOOP;
  
  RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_simulations"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_simulations"() IS 'Removes expired simulation tenants and their data';



CREATE OR REPLACE FUNCTION "public"."cleanup_old_sessions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM user_sessions
  WHERE created_at < now() - interval '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_user_sessions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  deleted_count INTEGER;
  cutoff_date TIMESTAMPTZ;
BEGIN
  -- Calculate cutoff date (7 days ago)
  cutoff_date := NOW() - INTERVAL '7 days';
  
  -- Delete sessions older than 7 days
  WITH deleted AS (
    DELETE FROM user_sessions
    WHERE login_time < cutoff_date
    RETURNING id
  )
  SELECT COUNT(*) INTO deleted_count FROM deleted;
  
  -- Log the cleanup
  RAISE NOTICE 'Cleaned up % old user_sessions (older than %)', deleted_count, cutoff_date;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_user_sessions"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_old_user_sessions"() IS 'Deletes user_sessions older than 7 days to prevent table bloat. Run manually or schedule via Edge Function.';



CREATE OR REPLACE FUNCTION "public"."cleanup_orphaned_users"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Delete user_profiles that don't exist in auth.users
    DELETE FROM public.user_profiles
    WHERE id NOT IN (
        SELECT id FROM auth.users
    );
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Also clean up tenant_users for non-existent users
    DELETE FROM public.tenant_users
    WHERE user_id NOT IN (
        SELECT id FROM public.user_profiles
    );
    
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_orphaned_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compare_simulation_template_patients"("p_simulation_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_sim_tenant_id UUID;
  v_template_id UUID;
  v_template_snapshot JSONB;
  v_sim_patients JSONB := '[]'::jsonb;
  v_template_patients JSONB;
  v_sim_patient_rec RECORD;
  v_template_patient_rec RECORD;
  v_sim_patient_elem JSONB;
  v_template_patient_elem JSONB;
  v_added JSONB := '[]'::jsonb;
  v_removed JSONB := '[]'::jsonb;
  v_unchanged JSONB := '[]'::jsonb;
  v_matched BOOLEAN;
  v_sim_count INT;
  v_template_count INT;
  v_sim_first TEXT;
  v_sim_last TEXT;
  v_sim_dob TEXT;
  v_template_first TEXT;
  v_template_last TEXT;
  v_template_dob TEXT;
BEGIN
  -- Get simulation and template info
  SELECT sa.tenant_id, sa.template_id, st.snapshot_data
  INTO v_sim_tenant_id, v_template_id, v_template_snapshot
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  WHERE sa.id = p_simulation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;
  
  -- Get simulation's current patients
  FOR v_sim_patient_rec IN 
    SELECT first_name, last_name, date_of_birth
    FROM patients
    WHERE tenant_id = v_sim_tenant_id
    ORDER BY created_at
  LOOP
    v_sim_patients := v_sim_patients || jsonb_build_object(
      'first_name', v_sim_patient_rec.first_name,
      'last_name', v_sim_patient_rec.last_name,
      'dob', v_sim_patient_rec.date_of_birth
    );
  END LOOP;
  
  -- Get template's patients from snapshot
  v_template_patients := COALESCE(v_template_snapshot->'patients', '[]'::jsonb);
  
  v_sim_count := jsonb_array_length(v_sim_patients);
  v_template_count := jsonb_array_length(v_template_patients);
  
  RAISE NOTICE 'Comparing % sim patients vs % template patients', v_sim_count, v_template_count;
  
  -- Find unchanged and removed patients (sim patients not in template)
  FOR i IN 0..(v_sim_count - 1) LOOP
    v_sim_patient_elem := v_sim_patients->i;
    v_sim_first := v_sim_patient_elem->>'first_name';
    v_sim_last := v_sim_patient_elem->>'last_name';
    v_sim_dob := v_sim_patient_elem->>'dob';
    v_matched := false;
    
    -- Check if this sim patient exists in template
    FOR j IN 0..(v_template_count - 1) LOOP
      v_template_patient_elem := v_template_patients->j;
      v_template_first := v_template_patient_elem->>'first_name';
      v_template_last := v_template_patient_elem->>'last_name';
      v_template_dob := v_template_patient_elem->>'date_of_birth';
      
      IF v_sim_first = v_template_first
         AND v_sim_last = v_template_last
         AND v_sim_dob = v_template_dob
      THEN
        v_matched := true;
        EXIT;
      END IF;
    END LOOP;
    
    IF v_matched THEN
      v_unchanged := v_unchanged || v_sim_patient_elem;
    ELSE
      v_removed := v_removed || v_sim_patient_elem;
    END IF;
  END LOOP;
  
  -- Find added patients (template patients not in sim)
  FOR i IN 0..(v_template_count - 1) LOOP
    v_template_patient_elem := v_template_patients->i;
    v_template_first := v_template_patient_elem->>'first_name';
    v_template_last := v_template_patient_elem->>'last_name';
    v_template_dob := v_template_patient_elem->>'date_of_birth';
    v_matched := false;
    
    FOR j IN 0..(v_sim_count - 1) LOOP
      v_sim_patient_elem := v_sim_patients->j;
      v_sim_first := v_sim_patient_elem->>'first_name';
      v_sim_last := v_sim_patient_elem->>'last_name';
      v_sim_dob := v_sim_patient_elem->>'dob';
      
      IF v_template_first = v_sim_first
         AND v_template_last = v_sim_last
         AND v_template_dob = v_sim_dob
      THEN
        v_matched := true;
        EXIT;
      END IF;
    END LOOP;
    
    IF NOT v_matched THEN
      v_added := v_added || v_template_patient_elem;
    END IF;
  END LOOP;
  
  -- Return comparison result
  RETURN jsonb_build_object(
    'simulation_id', p_simulation_id,
    'simulation_patient_count', v_sim_count,
    'template_patient_count', v_template_count,
    'patients_unchanged', v_unchanged,
    'patients_added', v_added,
    'patients_removed', v_removed,
    'patient_list_identical', (jsonb_array_length(v_added) = 0 AND jsonb_array_length(v_removed) = 0),
    'barcodes_can_preserve', (jsonb_array_length(v_added) = 0 AND jsonb_array_length(v_removed) = 0),
    'requires_relaunch', (jsonb_array_length(v_added) > 0 OR jsonb_array_length(v_removed) > 0)
  );
END;
$$;


ALTER FUNCTION "public"."compare_simulation_template_patients"("p_simulation_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."compare_simulation_template_patients"("p_simulation_id" "uuid") IS 'Compares simulation vs template patient lists to determine if barcodes can be preserved during sync';



CREATE OR REPLACE FUNCTION "public"."compare_simulation_vs_template"("p_simulation_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_sim_tenant_id UUID;
  v_template_id UUID;
  v_template_snapshot JSONB;
  v_sim_patient_count INT;
  v_sim_medication_count INT;
  v_sim_order_count INT;
  v_sim_wound_count INT;
  v_sim_device_count INT;
  v_template_patient_count INT;
  v_template_medication_count INT;
  v_template_order_count INT;
  v_template_wound_count INT;
  v_template_device_count INT;
  v_template_version INT;
  v_synced_version INT;
BEGIN
  -- Get simulation tenant and template
  SELECT sa.tenant_id, sa.template_id, sa.template_snapshot_version_synced,
         st.snapshot_data, st.snapshot_version
  INTO v_sim_tenant_id, v_template_id, v_synced_version,
       v_template_snapshot, v_template_version
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  WHERE sa.id = p_simulation_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;
  
  -- Count CURRENT data in active simulation tenant
  SELECT 
    COUNT(DISTINCT p.id),
    COUNT(DISTINCT pm.id),
    COUNT(DISTINCT ord.id),
    COUNT(DISTINCT w.id),
    COUNT(DISTINCT d.id)
  INTO 
    v_sim_patient_count,
    v_sim_medication_count,
    v_sim_order_count,
    v_sim_wound_count,
    v_sim_device_count
  FROM patients p
  LEFT JOIN patient_medications pm ON pm.tenant_id = v_sim_tenant_id
  LEFT JOIN doctors_orders ord ON ord.tenant_id = v_sim_tenant_id
  LEFT JOIN wounds w ON w.tenant_id = v_sim_tenant_id
  LEFT JOIN devices d ON d.tenant_id = v_sim_tenant_id
  WHERE p.tenant_id = v_sim_tenant_id;
  
  -- Count data in template snapshot
  v_template_patient_count := jsonb_array_length(COALESCE(v_template_snapshot->'patients', '[]'::jsonb));
  v_template_medication_count := jsonb_array_length(COALESCE(v_template_snapshot->'patient_medications', '[]'::jsonb));
  v_template_order_count := jsonb_array_length(COALESCE(v_template_snapshot->'doctors_orders', '[]'::jsonb));
  v_template_wound_count := jsonb_array_length(COALESCE(v_template_snapshot->'wounds', '[]'::jsonb));
  v_template_device_count := jsonb_array_length(COALESCE(v_template_snapshot->'devices', '[]'::jsonb));
  
  RAISE NOTICE 'Simulation: % patients, % medications | Template: % patients, % medications',
    v_sim_patient_count, v_sim_medication_count, v_template_patient_count, v_template_medication_count;
  
  RETURN jsonb_build_object(
    'simulation_id', p_simulation_id,
    'template_id', v_template_id,
    'version_synced', v_synced_version,
    'version_current', v_template_version,
    'patient_count_old', v_sim_patient_count,
    'patient_count_new', v_template_patient_count,
    'medication_count_old', v_sim_medication_count,
    'medication_count_new', v_template_medication_count,
    'order_count_old', v_sim_order_count,
    'order_count_new', v_template_order_count,
    'wound_count_old', v_sim_wound_count,
    'wound_count_new', v_template_wound_count,
    'device_count_old', v_sim_device_count,
    'device_count_new', v_template_device_count
  );
END;
$$;


ALTER FUNCTION "public"."compare_simulation_vs_template"("p_simulation_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."compare_simulation_vs_template"("p_simulation_id" "uuid") IS 'Compares active simulation current data with template current snapshot for accurate sync preview';



CREATE OR REPLACE FUNCTION "public"."complete_simulation"("p_simulation_id" "uuid", "p_activities" "jsonb" DEFAULT '[]'::"jsonb", "p_instructor_name" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_simulation simulation_active%ROWTYPE;
  v_history_id UUID;
  v_metrics JSONB;
  v_participants JSONB;
  v_activity_summary JSONB;
  v_result JSON;
BEGIN
  -- Get simulation details
  SELECT * INTO v_simulation
  FROM simulation_active
  WHERE id = p_simulation_id;
  
  IF v_simulation.id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found';
  END IF;
  
  -- Build simple metrics
  v_metrics := jsonb_build_object(
    'duration_minutes', v_simulation.duration_minutes,
    'activities_count', jsonb_array_length(p_activities)
  );
  
  -- Get participants list
  SELECT jsonb_agg(
    jsonb_build_object(
      'user_id', sp.user_id,
      'role', sp.role,
      'granted_at', sp.granted_at
    )
  ) INTO v_participants
  FROM simulation_participants sp
  WHERE sp.simulation_id = p_simulation_id;
  
  -- Activity summary (deprecated - keep for backward compatibility)
  v_activity_summary := jsonb_build_object(
    'total_activities', jsonb_array_length(p_activities),
    'activities', p_activities
  );
  
  -- Insert into history with categories and instructor name
  INSERT INTO simulation_history (
    simulation_id,
    template_id,
    name,
    status,
    duration_minutes,
    started_at,
    ended_at,
    completed_at,
    participants,
    activity_summary,
    student_activities,
    created_by,
    primary_categories,
    sub_categories,
    instructor_name
  )
  VALUES (
    v_simulation.id,
    v_simulation.template_id,
    v_simulation.name,
    'completed',
    v_simulation.duration_minutes,
    v_simulation.starts_at,
    v_simulation.ends_at,
    NOW(),
    v_participants,
    v_activity_summary,
    p_activities,
    v_simulation.created_by,
    v_simulation.primary_categories,
    v_simulation.sub_categories,
    p_instructor_name
  )
  RETURNING id INTO v_history_id;
  
  -- Update simulation status
  UPDATE simulation_active
  SET 
    status = 'completed',
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_simulation_id;
  
  v_result := json_build_object(
    'success', true,
    'history_id', v_history_id,
    'metrics', v_metrics,
    'message', 'Simulation completed and archived to history with categories'
  );
  
  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."complete_simulation"("p_simulation_id" "uuid", "p_activities" "jsonb", "p_instructor_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."complete_simulation"("p_simulation_id" "uuid", "p_activities" "jsonb", "p_instructor_name" "text") IS 'Complete simulation and archive to history with categories preserved';



CREATE OR REPLACE FUNCTION "public"."confirm_simulation_student_email"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_role text;
  v_is_simulation_only boolean;
BEGIN
  SELECT role INTO v_caller_role FROM user_profiles WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'coordinator', 'admin', 'instructor') THEN
    RAISE EXCEPTION 'Insufficient permissions to confirm student accounts';
  END IF;

  SELECT simulation_only INTO v_is_simulation_only FROM user_profiles WHERE id = p_user_id;

  IF v_is_simulation_only IS NOT TRUE THEN
    RAISE EXCEPTION 'This function can only auto-confirm simulation-only accounts';
  END IF;

  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE id = p_user_id;
END;
$$;


ALTER FUNCTION "public"."confirm_simulation_student_email"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."confirm_simulation_student_email"("p_user_id" "uuid") IS 'Marks a simulation-only student account as email-confirmed so it can sign in
immediately, without needing to click a confirmation link (auto-generated
accounts use a fake, non-deliverable address and could never receive one).
Restricted to simulation_only=true targets, callable only by
super_admin/coordinator/admin/instructor.';



CREATE OR REPLACE FUNCTION "public"."confirm_user_email"("target_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Get current user's role for permission check
  SELECT role INTO current_user_role
  FROM user_profiles WHERE id = auth.uid();
  
  -- Only super admins can confirm user emails
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can confirm user emails';
  END IF;

  -- Update the user to be confirmed
  UPDATE auth.users 
  SET 
    email_confirmed_at = NOW(),
    updated_at = NOW()
  WHERE id = target_user_id
    AND email_confirmed_at IS NULL;

  IF FOUND THEN
    RAISE NOTICE 'User % email confirmed successfully', target_user_id;
    RETURN TRUE;
  ELSE
    RAISE NOTICE 'User % not found or already confirmed', target_user_id;
    RETURN FALSE;
  END IF;
END;
$$;


ALTER FUNCTION "public"."confirm_user_email"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_medication_super_admin"("p_patient_id" "uuid", "p_name" "text", "p_dosage" "text", "p_frequency" "text", "p_route" "text", "p_start_date" "date", "p_end_date" "date" DEFAULT NULL::"date", "p_prescribed_by" "text" DEFAULT NULL::"text", "p_category" "text" DEFAULT 'scheduled'::"text", "p_admin_time" "text" DEFAULT '09:00'::"text", "p_status" "text" DEFAULT 'Active'::"text") RETURNS TABLE("medication_id" "uuid", "patient_id" "uuid", "name" "text", "dosage" "text", "frequency" "text", "route" "text", "start_date" "date", "end_date" "date", "prescribed_by" "text", "last_administered" timestamp with time zone, "next_due" timestamp with time zone, "status" "text", "created_at" timestamp with time zone, "category" "text", "tenant_id" "uuid", "admin_time" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    current_user_id UUID;
    user_role TEXT;
    patient_tenant_id UUID;
    new_medication_id UUID;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    -- Check if user is super admin or admin
    SELECT role INTO user_role 
    FROM user_profiles 
    WHERE id = current_user_id;
    
    -- Only allow super_admin and admin roles to use this function
    IF user_role NOT IN ('super_admin', 'admin') THEN
        RAISE EXCEPTION 'Insufficient permissions. Only super admins and admins can create cross-tenant medications.';
    END IF;

    -- Get the patient's tenant_id
    SELECT patients.tenant_id INTO patient_tenant_id
    FROM patients
    WHERE patients.id = p_patient_id;
    
    IF patient_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Patient not found or has no tenant_id';
    END IF;

    -- Generate new UUID for medication
    new_medication_id := gen_random_uuid();
    
    -- Insert the medication
    INSERT INTO patient_medications (
        id,
        patient_id,
        name,
        dosage,
        frequency,
        route,
        start_date,
        end_date,
        prescribed_by,
        last_administered,
        next_due,
        status,
        created_at,
        category,
        tenant_id,
        admin_time
    ) VALUES (
        new_medication_id,
        p_patient_id,
        p_name,
        p_dosage,
        p_frequency,
        p_route,
        p_start_date,
        p_end_date,
        p_prescribed_by,
        NULL, -- last_administered
        (p_start_date + p_admin_time::time)::timestamptz, -- next_due: start_date + admin_time
        p_status,
        NOW(),
        p_category,
        patient_tenant_id,
        p_admin_time
    );
    
    -- Return the created medication - use fully qualified column names
    RETURN QUERY
    SELECT 
        pm.id as medication_id,
        pm.patient_id,
        pm.name,
        pm.dosage,
        pm.frequency,
        pm.route,
        pm.start_date,
        pm.end_date,
        pm.prescribed_by,
        pm.last_administered,
        pm.next_due,
        pm.status,
        pm.created_at,
        pm.category,
        pm.tenant_id,
        pm.admin_time
    FROM patient_medications pm
    WHERE pm.id = new_medication_id;
    
END;
$$;


ALTER FUNCTION "public"."create_medication_super_admin"("p_patient_id" "uuid", "p_name" "text", "p_dosage" "text", "p_frequency" "text", "p_route" "text", "p_start_date" "date", "p_end_date" "date", "p_prescribed_by" "text", "p_category" "text", "p_admin_time" "text", "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_patient_template"("p_name" "text", "p_description" "text" DEFAULT NULL::"text", "p_primary_categories" "text"[] DEFAULT NULL::"text"[]) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id UUID;
  v_template_id UUID;
  v_subdomain TEXT;
  v_current_user_id UUID;
BEGIN
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'User not authenticated');
  END IF;

  v_subdomain := lower(regexp_replace(p_name, '[^a-zA-Z0-9]', '', 'g'));
  v_subdomain := 'pt-' || substring(v_subdomain, 1, 20) || '-' || substring(gen_random_uuid()::text, 1, 8);

  INSERT INTO tenants (name, subdomain, tenant_type, is_simulation, status)
  VALUES (p_name || ' (Patient Template)', v_subdomain, 'patient_template', true, 'active')
  RETURNING id INTO v_tenant_id;

  INSERT INTO patient_templates (tenant_id, name, description, primary_categories, status, created_by)
  VALUES (v_tenant_id, p_name, p_description, p_primary_categories, 'draft', v_current_user_id)
  RETURNING id INTO v_template_id;

  INSERT INTO tenant_users (tenant_id, user_id, role, is_active)
  VALUES (v_tenant_id, v_current_user_id, 'admin', true);

  RETURN json_build_object(
    'success', true,
    'patient_template_id', v_template_id,
    'tenant_id', v_tenant_id,
    'message', 'Patient template created successfully'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;


ALTER FUNCTION "public"."create_patient_template"("p_name" "text", "p_description" "text", "p_primary_categories" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_patient_template"("p_name" "text", "p_description" "text", "p_primary_categories" "text"[]) IS 'Creates a new single-patient template with its own dedicated tenant for live editing. Mirrors create_simulation_template.';



CREATE OR REPLACE FUNCTION "public"."create_program_tenant"("p_program_id" "uuid", "p_parent_tenant_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."create_program_tenant"("p_program_id" "uuid", "p_parent_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_program_tenant"("p_program_id" "uuid", "p_parent_tenant_id" "uuid") IS 'Creates a dedicated tenant workspace for a program. Called when programs are created.';



CREATE OR REPLACE FUNCTION "public"."create_simulation_subtenant"("p_simulation_id" "uuid", "p_simulation_name" "text", "p_parent_tenant_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_subtenant_id UUID;
  v_subdomain TEXT;
BEGIN
  -- Generate a unique subdomain for the simulation sub-tenant
  v_subdomain := 'sim-' || extract(epoch from now())::bigint || '-' || substr(md5(random()::text), 1, 8);
  
  -- Create the simulation sub-tenant
  INSERT INTO tenants (
    id,
    name,
    subdomain,
    parent_tenant_id,
    tenant_type,
    simulation_id,
    auto_cleanup_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    'Simulation: ' || p_simulation_name,
    v_subdomain,
    p_parent_tenant_id,
    'simulation',
    p_simulation_id,
    NOW() + INTERVAL '24 hours', -- Auto-cleanup after 24 hours
    NOW(),
    NOW()
  ) RETURNING id INTO v_subtenant_id;

  -- Update the active_simulation to reference this tenant and set to lobby
  UPDATE active_simulations 
  SET 
    tenant_id = v_subtenant_id,
    simulation_status = 'lobby',
    lobby_message = 'Welcome to ' || p_simulation_name || '. Please wait for the instructor to start the simulation.'
  WHERE id = p_simulation_id;

  RETURN v_subtenant_id;
END;
$$;


ALTER FUNCTION "public"."create_simulation_subtenant"("p_simulation_id" "uuid", "p_simulation_name" "text", "p_parent_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_simulation_subtenant"("p_simulation_id" "uuid", "p_simulation_name" "text", "p_parent_tenant_id" "uuid") IS 'Creates a new sub-tenant for a simulation with isolated data and auto-generated subdomain';



CREATE OR REPLACE FUNCTION "public"."create_simulation_template"("p_name" "text", "p_description" "text", "p_default_duration_minutes" integer, "p_primary_categories" "text"[] DEFAULT NULL::"text"[]) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id UUID;
  v_template_id UUID;
  v_subdomain TEXT;
  v_current_user_id UUID;
  v_result json;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not authenticated'
    );
  END IF;

  -- Generate unique subdomain from template name
  v_subdomain := lower(regexp_replace(p_name, '[^a-zA-Z0-9]', '', 'g'));
  v_subdomain := substring(v_subdomain, 1, 20) || '-' || substring(gen_random_uuid()::text, 1, 8);

  -- Create the simulation template tenant
  INSERT INTO tenants (
    name,
    subdomain,
    tenant_type,
    is_simulation,
    status
  )
  VALUES (
    p_name || ' (Template)',
    v_subdomain,
    'simulation_template',
    true,
    'active'
  )
  RETURNING id INTO v_tenant_id;

  -- Create the template record with program categories
  INSERT INTO simulation_templates (
    tenant_id,
    name,
    description,
    default_duration_minutes,
    primary_categories,
    status,
    created_by
  )
  VALUES (
    v_tenant_id,
    p_name,
    p_description,
    p_default_duration_minutes,
    p_primary_categories,
    'draft',
    v_current_user_id
  )
  RETURNING id INTO v_template_id;

  -- Grant the creator admin access to the template tenant
  INSERT INTO tenant_users (
    tenant_id,
    user_id,
    role,
    is_active
  )
  VALUES (
    v_tenant_id,
    v_current_user_id,
    'admin',
    true
  );

  -- Return success
  SELECT json_build_object(
    'success', true,
    'template_id', v_template_id,
    'tenant_id', v_tenant_id,
    'message', 'Template created successfully'
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$;


ALTER FUNCTION "public"."create_simulation_template"("p_name" "text", "p_description" "text", "p_default_duration_minutes" integer, "p_primary_categories" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_simulation_template"("p_name" "text", "p_description" "text", "p_default_duration_minutes" integer, "p_primary_categories" "text"[]) IS 'Creates a new simulation template with optional program categories. Categories determine which instructors can see and use the template.';



CREATE OR REPLACE FUNCTION "public"."create_snapshot"("p_template_id" "uuid", "p_name" "text", "p_description" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_snapshot_id UUID;
    v_version INTEGER;
    v_snapshot_data JSONB;
BEGIN
    -- Get next version number for this template
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
    FROM sim_snapshots
    WHERE template_id = p_template_id;
    
    -- Build complete snapshot data
    SELECT jsonb_build_object(
        'patients', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', tp.id,
                    'public_patient_id', tp.public_patient_id,
                    'demographics', tp.demographics,
                    'medical_history', tp.medical_history,
                    'baseline_vitals', tp.baseline_vitals,
                    'baseline_alerts', tp.baseline_alerts,
                    'room', tp.room,
                    'bed', tp.bed
                )
            )
            FROM sim_template_patients tp
            WHERE tp.template_id = p_template_id
        ), '[]'::jsonb),
        
        'medications', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', tm.id,
                    'template_patient_id', tm.template_patient_id,
                    'medication_name', tm.medication_name,
                    'dosage', tm.dosage,
                    'route', tm.route,
                    'frequency', tm.frequency,
                    'prescribed_by', tm.prescribed_by,
                    'prescribed_at', tm.prescribed_at,
                    'status', tm.status
                )
            )
            FROM sim_template_meds tm
            WHERE tm.template_id = p_template_id
        ), '[]'::jsonb),
        
        'barcodes', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', tb.id,
                    'template_med_id', tb.template_med_id,
                    'public_barcode_id', tb.public_barcode_id
                )
            )
            FROM sim_template_barcodes tb
            WHERE tb.template_id = p_template_id
        ), '[]'::jsonb),
        
        'lab_orders', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'template_patient_id', tp.id,
                    'order_date', lo.order_date,
                    'order_time', lo.order_time,
                    'procedure_category', lo.procedure_category,
                    'procedure_type', lo.procedure_type,
                    'source_category', lo.source_category,
                    'source_type', lo.source_type,
                    'initials', lo.initials,
                    'status', lo.status,
                    'notes', lo.notes
                )
            )
            FROM sim_template_patients tp
            LEFT JOIN patients p ON p.patient_id = tp.public_patient_id
            LEFT JOIN lab_orders lo ON lo.patient_id = p.id
            WHERE tp.template_id = p_template_id
            AND lo.id IS NOT NULL
        ), '[]'::jsonb),
        
        -- NEW: hacMap data structure with avatar_locations, devices, and wounds
        'hacmap', COALESCE((
            SELECT jsonb_build_object(
                'locations', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', al.id,
                            'patient_id', al.patient_id,
                            'region_key', al.region_key,
                            'x_percent', al.x_percent,
                            'y_percent', al.y_percent,
                            'body_view', al.body_view,
                            'free_text', al.free_text,
                            'created_by', al.created_by
                        )
                    )
                    FROM sim_template_patients tp
                    LEFT JOIN patients p ON p.patient_id = tp.public_patient_id
                    LEFT JOIN avatar_locations al ON al.patient_id = p.id
                    WHERE tp.template_id = p_template_id
                    AND al.id IS NOT NULL
                ), '[]'::jsonb),
                'devices', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', d.id,
                            'location_id', d.location_id,
                            'type', d.type,
                            'placement_date', d.placement_date,
                            'placement_time', d.placement_time,
                            'placed_pre_arrival', d.placed_pre_arrival,
                            'inserted_by', d.inserted_by,
                            'tube_number', d.tube_number,
                            'orientation', d.orientation,
                            'tube_size_fr', d.tube_size_fr,
                            'number_of_sutures_placed', d.number_of_sutures_placed,
                            'reservoir_type', d.reservoir_type,
                            'reservoir_size_ml', d.reservoir_size_ml,
                            'securement_method', d.securement_method,
                            'patient_tolerance', d.patient_tolerance,
                            'notes', d.notes
                        )
                    )
                    FROM sim_template_patients tp
                    LEFT JOIN patients p ON p.patient_id = tp.public_patient_id
                    LEFT JOIN devices d ON d.patient_id = p.id
                    WHERE tp.template_id = p_template_id
                    AND d.id IS NOT NULL
                ), '[]'::jsonb),
                'wounds', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', w.id,
                            'location_id', w.location_id,
                            'wound_type', w.wound_type,
                            'peri_wound_temperature', w.peri_wound_temperature,
                            'wound_length_cm', w.wound_length_cm,
                            'wound_width_cm', w.wound_width_cm,
                            'wound_depth_cm', w.wound_depth_cm,
                            'wound_description', w.wound_description,
                            'drainage_description', w.drainage_description,
                            'drainage_consistency', w.drainage_consistency,
                            'wound_odor', w.wound_odor,
                            'drainage_amount', w.drainage_amount,
                            'wound_edges', w.wound_edges,
                            'closure', w.closure,
                            'suture_staple_line', w.suture_staple_line,
                            'sutures_intact', w.sutures_intact,
                            'entered_by', w.entered_by,
                            'notes', w.notes
                        )
                    )
                    FROM sim_template_patients tp
                    LEFT JOIN patients p ON p.patient_id = tp.public_patient_id
                    LEFT JOIN wounds w ON w.patient_id = p.id
                    WHERE tp.template_id = p_template_id
                    AND w.id IS NOT NULL
                ), '[]'::jsonb)
            )
        ), '{}'::jsonb),
        
        'template_metadata', (
            SELECT jsonb_build_object(
                'name', name,
                'description', description,
                'specialty', specialty,
                'difficulty_level', difficulty_level,
                'estimated_duration', estimated_duration,
                'learning_objectives', learning_objectives
            )
            FROM sim_templates
            WHERE id = p_template_id
        )
    ) INTO v_snapshot_data;
    
    -- Create the snapshot
    INSERT INTO sim_snapshots (
        template_id,
        version,
        name,
        description,
        snapshot_data,
        created_by
    ) VALUES (
        p_template_id,
        v_version,
        p_name,
        p_description,
        v_snapshot_data,
        auth.uid()
    ) RETURNING id INTO v_snapshot_id;
    
    RETURN v_snapshot_id;
END;
$$;


ALTER FUNCTION "public"."create_snapshot"("p_template_id" "uuid", "p_name" "text", "p_description" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_snapshot"("p_template_id" "uuid", "p_name" "text", "p_description" "text") IS 'Creates snapshot from template including hacMap data with body_view field';



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "first_name" "text" DEFAULT ''::"text" NOT NULL,
    "last_name" "text" DEFAULT ''::"text" NOT NULL,
    "role" "public"."user_role" DEFAULT 'nurse'::"public"."user_role" NOT NULL,
    "primary_program" "text",
    "license_number" "text",
    "phone" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "simulation_only" boolean DEFAULT false,
    "default_tenant_id" "uuid",
    "welcome_seen_at" timestamp with time zone
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."user_profiles"."primary_program" IS 'DEPRECATED: Primary program code. Use user_programs junction table instead.';



COMMENT ON COLUMN "public"."user_profiles"."default_tenant_id" IS 'Instructors default program tenant. Auto-set to their first program tenant or manually chosen.';



COMMENT ON COLUMN "public"."user_profiles"."welcome_seen_at" IS 'Set when the user dismisses the welcome tour with "don''t show again". NULL = show it.';



CREATE OR REPLACE FUNCTION "public"."create_user_profile"("user_id" "uuid", "user_email" "text" DEFAULT NULL::"text", "first_name" "text" DEFAULT 'User'::"text", "last_name" "text" DEFAULT ''::"text", "user_role" "public"."user_role" DEFAULT 'nurse'::"public"."user_role") RETURNS "public"."user_profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  new_profile user_profiles;
  actual_email text;
BEGIN
  -- Get email from auth.users if not provided
  IF user_email IS NULL THEN
    SELECT email INTO actual_email FROM auth.users WHERE id = user_id;
  ELSE
    actual_email := user_email;
  END IF;

  -- Insert the new profile
  INSERT INTO user_profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    user_id,
    COALESCE(actual_email, ''),
    first_name,
    last_name,
    user_role,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), user_profiles.first_name),
    last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), user_profiles.last_name),
    updated_at = now()
  RETURNING * INTO new_profile;

  RETURN new_profile;
END;
$$;


ALTER FUNCTION "public"."create_user_profile"("user_id" "uuid", "user_email" "text", "first_name" "text", "last_name" "text", "user_role" "public"."user_role") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_user_profile"("user_id" "uuid", "user_email" "text", "first_name" "text", "last_name" "text", "user_role" "public"."user_role") IS 'Creates a user profile with immutable search path for security';



CREATE OR REPLACE FUNCTION "public"."create_user_session"("p_ip_address" "inet", "p_user_agent" "text" DEFAULT NULL::"text", "p_tenant_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  session_id uuid;
  resolved_tenant_id uuid;
BEGIN
  -- End any existing active sessions for this user first
  UPDATE user_sessions
  SET logout_time = now(),
      status = 'logged_out'
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND logout_time IS NULL;

  -- Resolve tenant ID: use provided value, or fall back to first assigned tenant
  IF p_tenant_id IS NOT NULL THEN
    resolved_tenant_id := p_tenant_id;
  ELSE
    SELECT tenant_id INTO resolved_tenant_id
    FROM public.tenant_users
    WHERE user_id = auth.uid()
    ORDER BY created_at ASC
    LIMIT 1;
  END IF;

  -- Always create a new session for each login
  INSERT INTO user_sessions (
    user_id,
    ip_address,
    user_agent,
    tenant_id,
    login_time,
    last_activity,
    status
  ) VALUES (
    auth.uid(),
    p_ip_address,
    p_user_agent,
    resolved_tenant_id,
    now(),
    now(),
    'active'
  ) RETURNING id INTO session_id;

  RETURN session_id;
END;
$$;


ALTER FUNCTION "public"."create_user_session"("p_ip_address" "inet", "p_user_agent" "text", "p_tenant_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_user_session"("p_ip_address" "inet", "p_user_agent" "text", "p_tenant_id" "uuid") IS 'Creates or updates user session with IP tracking on login';



CREATE OR REPLACE FUNCTION "public"."current_user_is_super_admin"() RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  is_admin boolean := false;
BEGIN
  -- Check if user has super_admin role in user_profiles table
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() 
    AND role = 'super_admin' 
    AND is_active = true
  ) INTO is_admin;
  
  -- If user_profiles doesn't exist or no record found, check auth metadata
  IF NOT is_admin THEN
    SELECT COALESCE(
      (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'super_admin',
      false
    ) INTO is_admin;
  END IF;
  
  RETURN is_admin;
EXCEPTION 
  WHEN OTHERS THEN
    -- Fallback to auth metadata if user_profiles table doesn't exist
    RETURN COALESCE(
      (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'super_admin',
      false
    );
END;
$$;


ALTER FUNCTION "public"."current_user_is_super_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."deactivate_user"("target_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Check permissions
  SELECT role INTO current_user_role
  FROM user_profiles WHERE id = auth.uid();
  
  IF current_user_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to deactivate users';
  END IF;
  
  -- Deactivate user
  UPDATE user_profiles 
  SET is_active = false, updated_at = NOW()
  WHERE id = target_user_id;
  
  RETURN 'User deactivated successfully';
END;
$$;


ALTER FUNCTION "public"."deactivate_user"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_medication_super_admin"("p_medication_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    current_user_id UUID;
    user_role TEXT;
    deleted_count INTEGER;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    -- Check if user is super admin or admin
    SELECT role INTO user_role 
    FROM user_profiles 
    WHERE id = current_user_id;
    
    -- Only allow super_admin and admin roles to use this function
    IF user_role NOT IN ('super_admin', 'admin') THEN
        RAISE EXCEPTION 'Insufficient permissions. Only super admins and admins can delete cross-tenant medications.';
    END IF;

    -- First delete any administration records for this medication
    DELETE FROM medication_administrations WHERE medication_id = p_medication_id;
    
    -- Delete the medication itself
    DELETE FROM patient_medications WHERE id = p_medication_id;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log the action if deletion was successful
    IF deleted_count > 0 THEN
        -- Note: Audit logging temporarily disabled due to table schema mismatch
        -- TODO: Fix audit_logs table structure or remove if not needed
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
    
END;
$$;


ALTER FUNCTION "public"."delete_medication_super_admin"("p_medication_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_medication_super_admin"("p_medication_id" "uuid") IS 'Allows super admins and admins to delete medications across tenant boundaries, bypassing RLS';



CREATE OR REPLACE FUNCTION "public"."delete_patient_template"("p_patient_template_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_template_name text;
  v_tenant_id uuid;
  v_deleted_patients integer := 0;
BEGIN
  SELECT name, tenant_id INTO v_template_name, v_tenant_id
  FROM patient_templates
  WHERE id = p_patient_template_id;

  IF v_template_name IS NULL THEN
    RAISE EXCEPTION 'Patient template not found: %', p_patient_template_id;
  END IF;

  IF v_tenant_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_deleted_patients FROM patients WHERE tenant_id = v_tenant_id;

    BEGIN DELETE FROM medication_administrations WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_vitals WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_neuro_assessments WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_notes WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_alerts WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_images WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM wound_treatments WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM wound_assessments WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM device_assessments WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_results WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_panels WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_ack_events WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_orders WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM doctors_orders WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM handover_notes WHERE patient_id::uuid IN (SELECT id FROM patients WHERE tenant_id = v_tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_advanced_directives WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_admission_records WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_bbit_entries WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_newborn_assessments WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_system_assessments WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM tr_screening_entries WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM tr_active_living_profiles WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM tr_assessment_scores WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM tr_treatment_plan_rows WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM tr_interdisciplinary_interps WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM tr_progress_notes WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM bowel_records WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM diabetic_records WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_intake_output_events WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM wounds WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM devices WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM avatar_locations WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_medications WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;

    DELETE FROM patients WHERE tenant_id = v_tenant_id;
    DELETE FROM tenant_users WHERE tenant_id = v_tenant_id;
    DELETE FROM patient_templates WHERE id = p_patient_template_id;
    DELETE FROM tenants WHERE id = v_tenant_id;
  ELSE
    DELETE FROM patient_templates WHERE id = p_patient_template_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'patient_template_id', p_patient_template_id,
    'template_name', v_template_name,
    'tenant_id', v_tenant_id,
    'deleted_patients', v_deleted_patients
  );
END;
$$;


ALTER FUNCTION "public"."delete_patient_template"("p_patient_template_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_patient_template"("p_patient_template_id" "uuid") IS 'Deletes a patient template AND its backing tenant (patients, meds, notes, everything). Mirrors delete_simulation_template. Uses SECURITY DEFINER to bypass RLS for complete cleanup.';



CREATE OR REPLACE FUNCTION "public"."delete_simulation"("p_simulation_id" "uuid", "p_archive_to_history" boolean DEFAULT true) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_simulation_tenant_id uuid;
  v_simulation_name text;
  v_template_id uuid;
  v_deleted_patients integer := 0;
  v_deleted_medications integer := 0;
  v_child_tenant_id uuid;
  v_deleted_auto_students integer := 0;
BEGIN
  -- Get simulation details before deletion
  SELECT tenant_id, name, template_id
  INTO v_simulation_tenant_id, v_simulation_name, v_template_id
  FROM simulation_active
  WHERE id = p_simulation_id;

  IF v_simulation_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;

  -- Delete auto-generated student accounts tied to this simulation FIRST
  -- (before anything cascades simulation_auto_students away). Deleting
  -- auth.users cascades to user_profiles, tenant_users, student_roster,
  -- and simulation_participants for that account automatically.
  WITH deleted_users AS (
    DELETE FROM auth.users
    WHERE id IN (
      SELECT user_id FROM simulation_auto_students WHERE simulation_id = p_simulation_id
    )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_deleted_auto_students FROM deleted_users;

  -- Archive to history if requested (only if simulation actually started)
  IF p_archive_to_history THEN
    -- Check if simulation has started (starts_at is not null)
    IF EXISTS (
      SELECT 1 FROM simulation_active 
      WHERE id = p_simulation_id AND starts_at IS NOT NULL
    ) THEN
      -- Check if not already archived
      IF NOT EXISTS (SELECT 1 FROM simulation_history WHERE simulation_id = p_simulation_id) THEN
        INSERT INTO simulation_history (
          id, simulation_id, tenant_id, template_id, name, duration_minutes,
          started_at, ended_at, created_by, completed_at, status,
          primary_categories, sub_categories
        )
        SELECT 
          gen_random_uuid(), -- New history record ID
          id,                -- simulation_id reference
          tenant_id, 
          template_id, 
          name, 
          duration_minutes,
          COALESCE(starts_at, NOW()), -- Use starts_at or NOW() as fallback
          ends_at,           -- Can be NULL
          created_by, 
          NOW(),             -- completed_at
          status,
          primary_categories, 
          sub_categories
        FROM simulation_active
        WHERE id = p_simulation_id;
      END IF;
    ELSE
      RAISE NOTICE 'Simulation % has not started yet (starts_at is NULL) - skipping history archive', p_simulation_id;
    END IF;
  END IF;

  -- Count what we're about to delete
  SELECT COUNT(*) INTO v_deleted_patients
  FROM patients WHERE tenant_id = v_simulation_tenant_id;

  SELECT COUNT(*) INTO v_deleted_medications
  FROM patient_medications WHERE tenant_id = v_simulation_tenant_id;

  -- Delete all tenant-related data to avoid foreign key conflicts
  -- Order matters: delete children before parents
  -- Use PERFORM with EXCEPTION handling to skip tables that don't exist
  
  BEGIN
    DELETE FROM patient_alerts WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN
    -- Table doesn't exist, skip
  END;
  
  BEGIN
    DELETE FROM patient_notes WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM patient_vitals WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM patient_medications WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM wound_assessments WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM device_assessments WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM patient_images WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  BEGIN
    DELETE FROM medication_administrations WHERE tenant_id = v_simulation_tenant_id;
  EXCEPTION WHEN undefined_table THEN NULL;
  END;
  
  -- Delete patients last (they're referenced by other tables)
  DELETE FROM patients WHERE tenant_id = v_simulation_tenant_id;
  
  -- Delete simulation participants
  DELETE FROM simulation_participants WHERE simulation_id = p_simulation_id;
  
  -- Delete tenant users
  DELETE FROM tenant_users WHERE tenant_id = v_simulation_tenant_id;

  -- ⚠️ Delete any child tenants BEFORE deleting the parent simulation tenant
  -- This prevents foreign key violations on parent_tenant_id
  FOR v_child_tenant_id IN 
    SELECT id FROM tenants WHERE parent_tenant_id = v_simulation_tenant_id
  LOOP
    RAISE NOTICE 'Deleting child tenant data for: %', v_child_tenant_id;
    
    -- Delete ALL data from child tenant first (same order as parent)
    BEGIN DELETE FROM patient_alerts WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_notes WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_vitals WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_medications WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM wound_assessments WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM device_assessments WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_images WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM medication_administrations WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_results WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_panels WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_orders WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM doctors_orders WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_bbit_entries WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM bowel_records WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM wounds WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM devices WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM avatar_locations WHERE tenant_id = v_child_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    
    -- Delete patients from child tenant
    DELETE FROM patients WHERE tenant_id = v_child_tenant_id;
    
    -- Delete child tenant users
    DELETE FROM tenant_users WHERE tenant_id = v_child_tenant_id;
    
    -- Delete the child tenant
    DELETE FROM tenants WHERE id = v_child_tenant_id;
  END LOOP;

  -- Now safe to delete the simulation tenant
  DELETE FROM tenants WHERE id = v_simulation_tenant_id;

  -- Delete the simulation_active record
  DELETE FROM simulation_active WHERE id = p_simulation_id;

  RAISE NOTICE 'Deleted simulation % (%) with tenant % - removed % patients, % medications, % auto-generated student account(s)',
    p_simulation_id, v_simulation_name, v_simulation_tenant_id,
    v_deleted_patients, v_deleted_medications, v_deleted_auto_students;

  RETURN jsonb_build_object(
    'success', true,
    'simulation_id', p_simulation_id,
    'simulation_name', v_simulation_name,
    'tenant_id', v_simulation_tenant_id,
    'archived', p_archive_to_history,
    'deleted_patients', v_deleted_patients,
    'deleted_medications', v_deleted_medications,
    'deleted_auto_students', v_deleted_auto_students
  );
END;
$$;


ALTER FUNCTION "public"."delete_simulation"("p_simulation_id" "uuid", "p_archive_to_history" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_simulation"("p_simulation_id" "uuid", "p_archive_to_history" boolean) IS 'Deletes an active simulation and its associated tenant. 
Also deletes any auto-generated simulation-only student accounts tied to it (simulation_auto_students).
Handles child tenants (program tenants) before deleting parent.
Optionally archives to simulation_history before deletion.
Uses SECURITY DEFINER to bypass RLS for complete cleanup.';



CREATE OR REPLACE FUNCTION "public"."delete_simulation_history"("p_history_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_simulation_name text;
BEGIN
  -- Get history details
  SELECT name INTO v_simulation_name
  FROM simulation_history
  WHERE id = p_history_id;

  IF v_simulation_name IS NULL THEN
    RAISE EXCEPTION 'History record not found: %', p_history_id;
  END IF;

  -- Delete the history record
  DELETE FROM simulation_history WHERE id = p_history_id;

  RAISE NOTICE 'Deleted history record % (%)', p_history_id, v_simulation_name;

  RETURN jsonb_build_object(
    'success', true,
    'history_id', p_history_id,
    'simulation_name', v_simulation_name
  );
END;
$$;


ALTER FUNCTION "public"."delete_simulation_history"("p_history_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_simulation_history"("p_history_id" "uuid") IS 'Permanently deletes a simulation history record and its debrief data.
Uses SECURITY DEFINER to bypass RLS.';



CREATE OR REPLACE FUNCTION "public"."delete_simulation_template"("p_template_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_template_name text;
  v_tenant_id uuid;
  v_active_simulations_count integer;
  v_deleted_patients integer := 0;
BEGIN
  SELECT name, tenant_id INTO v_template_name, v_tenant_id
  FROM simulation_templates
  WHERE id = p_template_id;

  IF v_template_name IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;

  -- Warn (but don't block) if simulations launched from this template still exist
  SELECT COUNT(*) INTO v_active_simulations_count
  FROM simulation_active
  WHERE template_id = p_template_id;

  IF v_active_simulations_count > 0 THEN
    RAISE WARNING 'Template % has % active simulations that will continue running',
      v_template_name, v_active_simulations_count;
  END IF;

  IF v_tenant_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_deleted_patients FROM patients WHERE tenant_id = v_tenant_id;

    -- Delete all tenant-scoped clinical data, children before parents.
    -- Wrapped per-table so a schema change (new/renamed table) can't block the whole delete.
    BEGIN DELETE FROM medication_administrations WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_vitals WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_neuro_assessments WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_notes WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_alerts WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_images WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM wound_treatments WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM wound_assessments WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM device_assessments WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_results WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_panels WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_ack_events WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM lab_orders WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM doctors_orders WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM handover_notes WHERE patient_id::uuid IN (SELECT id FROM patients WHERE tenant_id = v_tenant_id); EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_advanced_directives WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_admission_records WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_bbit_entries WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_newborn_assessments WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_system_assessments WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM tr_screening_entries WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM tr_active_living_profiles WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM tr_assessment_scores WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM tr_treatment_plan_rows WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM tr_interdisciplinary_interps WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM tr_progress_notes WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM bowel_records WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM diabetic_records WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_intake_output_events WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM wounds WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM devices WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM avatar_locations WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;
    BEGIN DELETE FROM patient_medications WHERE tenant_id = v_tenant_id; EXCEPTION WHEN undefined_table THEN NULL; END;

    -- Patients last (referenced by most of the above)
    DELETE FROM patients WHERE tenant_id = v_tenant_id;

    -- Tenant membership + the template row, then the tenant itself
    DELETE FROM tenant_users WHERE tenant_id = v_tenant_id;
    DELETE FROM simulation_templates WHERE id = p_template_id;
    DELETE FROM tenants WHERE id = v_tenant_id;
  ELSE
    -- No tenant on record (shouldn't normally happen) — just remove the metadata row
    DELETE FROM simulation_templates WHERE id = p_template_id;
  END IF;

  RAISE NOTICE 'Deleted template % (%) with tenant % — removed % patients',
    p_template_id, v_template_name, v_tenant_id, v_deleted_patients;

  RETURN jsonb_build_object(
    'success', true,
    'template_id', p_template_id,
    'template_name', v_template_name,
    'tenant_id', v_tenant_id,
    'deleted_patients', v_deleted_patients,
    'active_simulations_warning', v_active_simulations_count > 0,
    'active_simulations_count', v_active_simulations_count
  );
END;
$$;


ALTER FUNCTION "public"."delete_simulation_template"("p_template_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_simulation_template"("p_template_id" "uuid") IS 'Deletes a simulation template AND its backing tenant (patients, meds, notes, everything).
Mirrors the delete_simulation() pattern since patients.tenant_id is ON DELETE SET NULL
(not CASCADE) and several clinical tables have no cascade at all, so a raw tenant delete
would either orphan patients (tenant_id -> NULL) or fail with a FK violation.
Warns (does not block) if active simulations still reference this template.
Uses SECURITY DEFINER to bypass RLS for complete cleanup.';



CREATE OR REPLACE FUNCTION "public"."delete_tenant_secure"("target_tenant_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Only super admins can delete tenants
  SELECT role INTO current_user_role
  FROM user_profiles WHERE id = auth.uid();
  
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can delete tenants';
  END IF;
  
  -- Soft delete tenant
  UPDATE tenants 
  SET status = 'inactive', updated_at = NOW()
  WHERE id = target_tenant_id;
  
  RETURN 'Tenant deleted successfully';
END;
$$;


ALTER FUNCTION "public"."delete_tenant_secure"("target_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_permanently"("target_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Only super admins can permanently delete users
  SELECT role INTO current_user_role
  FROM user_profiles WHERE id = auth.uid();
  
  IF current_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'Only super administrators can permanently delete users';
  END IF;
  
  -- Delete from tenant_users first
  DELETE FROM tenant_users WHERE user_id = target_user_id;
  
  -- Delete from user_profiles
  DELETE FROM user_profiles WHERE id = target_user_id;
  
  -- Delete from auth.users (this requires service role)
  DELETE FROM auth.users WHERE id = target_user_id;
  
  RETURN 'User permanently deleted';
END;
$$;


ALTER FUNCTION "public"."delete_user_permanently"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."duplicate_patient_to_tenant"("p_source_patient_id" "text", "p_target_tenant_id" "uuid", "p_new_patient_id" "text" DEFAULT NULL::"text", "p_include_vitals" boolean DEFAULT true, "p_include_medications" boolean DEFAULT true, "p_include_assessments" boolean DEFAULT true, "p_include_handover_notes" boolean DEFAULT true, "p_include_alerts" boolean DEFAULT true, "p_include_diabetic_records" boolean DEFAULT true, "p_include_bowel_records" boolean DEFAULT true, "p_include_wound_care" boolean DEFAULT true, "p_include_doctors_orders" boolean DEFAULT true, "p_include_labs" boolean DEFAULT true, "p_include_hacmap" boolean DEFAULT true, "p_include_intake_output" boolean DEFAULT true) RETURNS TABLE("success" boolean, "new_patient_id" "uuid", "new_patient_identifier" "text", "records_created" "jsonb", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_source_patient_uuid UUID;
  v_new_patient_uuid UUID;
  v_new_patient_identifier TEXT;
  v_vitals_count INTEGER := 0;
  v_medications_count INTEGER := 0;
  v_med_admin_count INTEGER := 0;
  v_notes_count INTEGER := 0;
  v_assessments_count INTEGER := 0;
  v_handover_count INTEGER := 0;
  v_alerts_count INTEGER := 0;
  v_diabetic_count INTEGER := 0;
  v_bowel_count INTEGER := 0;
  v_wound_assessments_count INTEGER := 0;
  v_wound_treatments_count INTEGER := 0;
  v_doctors_orders_count INTEGER := 0;
  v_admission_records_count INTEGER := 0;
  v_advanced_directives_count INTEGER := 0;
  v_lab_orders_count INTEGER := 0;
  v_lab_panels_count INTEGER := 0;
  v_lab_results_count INTEGER := 0;
  v_hacmap_locations_count INTEGER := 0;
  v_hacmap_devices_count INTEGER := 0;
  v_hacmap_wounds_count INTEGER := 0;
  v_intake_output_count INTEGER := 0;
  v_panel_id_mapping JSONB := '{}'::JSONB;
  v_location_mapping JSONB := '{}'::JSONB;
  v_old_panel_id UUID;
  v_new_panel_id UUID;
  v_old_location_id UUID;
  v_new_location_id UUID;
  v_records_created JSONB;
BEGIN
  -- Get source patient UUID
  SELECT id INTO v_source_patient_uuid
  FROM patients
  WHERE patient_id = p_source_patient_id;

  IF v_source_patient_uuid IS NULL THEN
    RETURN QUERY SELECT 
      false AS success, 
      NULL::UUID AS new_patient_id, 
      NULL::TEXT AS new_patient_identifier,
      NULL::JSONB AS records_created,
      'Source patient not found'::TEXT AS message;
    RETURN;
  END IF;

  -- Generate new patient_id if not provided
  IF p_new_patient_id IS NULL OR p_new_patient_id = '' THEN
    v_new_patient_identifier := 'P' || (10000 + floor(random() * 90000))::TEXT;
  ELSE
    v_new_patient_identifier := p_new_patient_id;
  END IF;

  -- Check if new patient_id already exists in target tenant
  IF EXISTS (
    SELECT 1 FROM patients 
    WHERE patient_id = v_new_patient_identifier 
    AND tenant_id = p_target_tenant_id
  ) THEN
    RETURN QUERY SELECT 
      false AS success, 
      NULL::UUID AS new_patient_id, 
      NULL::TEXT AS new_patient_identifier,
      NULL::JSONB AS records_created,
      ('Patient ID ' || v_new_patient_identifier || ' already exists in target tenant')::TEXT AS message;
    RETURN;
  END IF;

  -- Create new patient record
  INSERT INTO patients (
    tenant_id,
    patient_id,
    first_name,
    last_name,
    date_of_birth,
    gender,
    admission_date,
    room_number,
    bed_number,
    allergies,
    condition,
    diagnosis,
    blood_type,
    emergency_contact_name,
    emergency_contact_relationship,
    emergency_contact_phone,
    assigned_nurse
  )
  SELECT
    p_target_tenant_id,
    v_new_patient_identifier,
    first_name,
    last_name,
    date_of_birth,
    gender,
    admission_date,
    room_number,
    bed_number,
    allergies,
    condition,
    diagnosis,
    blood_type,
    emergency_contact_name,
    emergency_contact_relationship,
    emergency_contact_phone,
    assigned_nurse
  FROM patients
  WHERE id = v_source_patient_uuid
  RETURNING id INTO v_new_patient_uuid;

  RAISE NOTICE 'Created new patient: %', v_new_patient_uuid;

  -- Copy patient vitals
  IF p_include_vitals THEN
    INSERT INTO patient_vitals (
      patient_id,
      tenant_id,
      temperature,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      heart_rate,
      respiratory_rate,
      oxygen_saturation,
      oxygen_delivery,
      recorded_at
    )
    SELECT
      v_new_patient_uuid,
      p_target_tenant_id,
      temperature,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      heart_rate,
      respiratory_rate,
      oxygen_saturation,
      oxygen_delivery,
      recorded_at
    FROM patient_vitals
    WHERE patient_id::text = v_source_patient_uuid::text;
    
    GET DIAGNOSTICS v_vitals_count = ROW_COUNT;
    RAISE NOTICE 'Copied % vital records', v_vitals_count;
  END IF;

  -- Copy medications
  IF p_include_medications THEN
    INSERT INTO patient_medications (
      patient_id,
      tenant_id,
      name,
      dosage,
      frequency,
      route,
      start_date,
      end_date,
      prescribed_by,
      admin_time,
      admin_times,
      last_administered,
      next_due,
      status,
      category
    )
    SELECT
      v_new_patient_uuid,
      p_target_tenant_id,
      name,
      dosage,
      frequency,
      route,
      start_date,
      end_date,
      prescribed_by,
      admin_time,
      admin_times,
      last_administered,
      next_due,
      status,
      category
    FROM patient_medications
    WHERE patient_id::text = v_source_patient_uuid::text;
    
    GET DIAGNOSTICS v_medications_count = ROW_COUNT;
    RAISE NOTICE 'Copied % medication records', v_medications_count;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bcma_medication_administrations') THEN
      INSERT INTO bcma_medication_administrations (
        patient_id,
        medication_id,
        administered_by,
        administered_by_id,
        timestamp,
        notes,
        dosage,
        route,
        status
      )
      SELECT
        v_new_patient_uuid,
        medication_id,
        administered_by,
        administered_by_id,
        timestamp,
        notes,
        dosage,
        route,
        status
      FROM bcma_medication_administrations
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_med_admin_count = ROW_COUNT;
      RAISE NOTICE 'Copied % medication administration records', v_med_admin_count;
    END IF;
  END IF;

  -- Copy assessments
  IF p_include_assessments THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_assessments') THEN
      INSERT INTO patient_assessments (
        patient_id,
        assessment_type,
        assessment_data,
        assessed_by,
        assessed_at
      )
      SELECT
        v_new_patient_uuid,
        assessment_type,
        assessment_data,
        assessed_by,
        assessed_at
      FROM patient_assessments
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_assessments_count = ROW_COUNT;
      RAISE NOTICE 'Copied % assessment records', v_assessments_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_admission_records') THEN
      INSERT INTO patient_admission_records (
        patient_id,
        tenant_id,
        admission_type,
        attending_physician,
        insurance_provider,
        insurance_policy,
        admission_source,
        chief_complaint,
        height,
        weight,
        bmi,
        smoking_status,
        alcohol_use,
        exercise,
        occupation,
        family_history,
        marital_status,
        secondary_contact_name,
        secondary_contact_relationship,
        secondary_contact_phone,
        secondary_contact_address
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        admission_type,
        attending_physician,
        insurance_provider,
        insurance_policy,
        admission_source,
        chief_complaint,
        height,
        weight,
        bmi,
        smoking_status,
        alcohol_use,
        exercise,
        occupation,
        family_history,
        marital_status,
        secondary_contact_name,
        secondary_contact_relationship,
        secondary_contact_phone,
        secondary_contact_address
      FROM patient_admission_records
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_admission_records_count = ROW_COUNT;
      RAISE NOTICE 'Copied % admission records', v_admission_records_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_advanced_directives') THEN
      INSERT INTO patient_advanced_directives (
        patient_id,
        tenant_id,
        living_will_status,
        living_will_date,
        healthcare_proxy_name,
        healthcare_proxy_phone,
        dnr_status,
        organ_donation_status,
        organ_donation_details,
        religious_preference,
        special_instructions
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        living_will_status,
        living_will_date,
        healthcare_proxy_name,
        healthcare_proxy_phone,
        dnr_status,
        organ_donation_status,
        organ_donation_details,
        religious_preference,
        special_instructions
      FROM patient_advanced_directives
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_advanced_directives_count = ROW_COUNT;
      RAISE NOTICE 'Copied % advanced directives', v_advanced_directives_count;
    END IF;
  END IF;

  -- Copy handover notes
  IF p_include_handover_notes THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'handover_notes') THEN
      INSERT INTO handover_notes (
        patient_id,
        situation,
        background,
        assessment,
        recommendations,
        shift,
        priority,
        created_by,
        created_by_name,
        created_by_role
      )
      SELECT
        v_new_patient_uuid,
        situation,
        background,
        assessment,
        recommendations,
        shift,
        priority,
        created_by,
        created_by_name,
        created_by_role
      FROM handover_notes
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_handover_count = ROW_COUNT;
      RAISE NOTICE 'Copied % handover notes', v_handover_count;
    END IF;
  END IF;

  -- Copy patient alerts
  IF p_include_alerts THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_alerts') THEN
      INSERT INTO patient_alerts (
        patient_id,
        tenant_id,
        patient_name,
        alert_type,
        priority,
        message,
        acknowledged,
        acknowledged_by,
        acknowledged_at,
        expires_at
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        pa.patient_name,
        pa.alert_type,
        pa.priority,
        pa.message,
        pa.acknowledged,
        pa.acknowledged_by,
        pa.acknowledged_at,
        pa.expires_at
      FROM patient_alerts pa
      WHERE pa.patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_alerts_count = ROW_COUNT;
      RAISE NOTICE 'Copied % patient alerts', v_alerts_count;
    END IF;
  END IF;

  -- Copy diabetic records
  IF p_include_diabetic_records THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'diabetic_records') THEN
      INSERT INTO diabetic_records (
        tenant_id,
        patient_id,
        recorded_by,
        date,
        time_cbg_taken,
        reading_type,
        glucose_reading,
        basal_insulin,
        bolus_insulin,
        correction_insulin,
        other_insulin,
        treatments_given,
        comments_for_physician,
        signature,
        prompt_frequency,
        recorded_at
      )
      SELECT
        p_target_tenant_id,
        v_new_patient_uuid,
        recorded_by,
        date,
        time_cbg_taken,
        reading_type,
        glucose_reading,
        basal_insulin,
        bolus_insulin,
        correction_insulin,
        other_insulin,
        treatments_given,
        comments_for_physician,
        signature,
        prompt_frequency,
        recorded_at
      FROM diabetic_records
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_diabetic_count = ROW_COUNT;
      RAISE NOTICE 'Copied % diabetic records', v_diabetic_count;
    END IF;
  END IF;

  -- Copy bowel records
  IF p_include_bowel_records THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bowel_records') THEN
      INSERT INTO bowel_records (
        patient_id,
        tenant_id,
        nurse_id,
        nurse_name,
        recorded_at,
        bowel_incontinence,
        stool_appearance,
        stool_consistency,
        stool_colour,
        stool_amount,
        notes
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        nurse_id,
        nurse_name,
        recorded_at,
        bowel_incontinence,
        stool_appearance,
        stool_consistency,
        stool_colour,
        stool_amount,
        notes
      FROM bowel_records
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_bowel_count = ROW_COUNT;
      RAISE NOTICE 'Copied % bowel records', v_bowel_count;
    END IF;
  END IF;

  -- Copy wound care
  IF p_include_wound_care THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wound_assessments') THEN
      INSERT INTO wound_assessments (
        patient_id,
        tenant_id,
        assessment_date,
        wound_location,
        wound_type,
        stage,
        length_cm,
        width_cm,
        depth_cm,
        wound_bed,
        exudate_amount,
        exudate_type,
        periwound_condition,
        pain_level,
        odor,
        signs_of_infection,
        assessment_notes,
        photos,
        assessor_id,
        assessor_name
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        assessment_date,
        wound_location,
        wound_type,
        stage,
        length_cm,
        width_cm,
        depth_cm,
        wound_bed,
        exudate_amount,
        exudate_type,
        periwound_condition,
        pain_level,
        odor::boolean,
        signs_of_infection::boolean,
        assessment_notes,
        photos,
        assessor_id,
        assessor_name
      FROM wound_assessments
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_wound_assessments_count = ROW_COUNT;
      RAISE NOTICE 'Copied % wound assessments', v_wound_assessments_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wound_treatments') THEN
      INSERT INTO wound_treatments (
        patient_id,
        tenant_id,
        wound_assessment_id,
        treatment_date,
        treatment_type,
        products_used,
        procedure_notes,
        administered_by,
        administered_by_id,
        administered_at,
        next_treatment_due,
        photos_after
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        wound_assessment_id,
        treatment_date,
        treatment_type,
        products_used,
        procedure_notes,
        administered_by,
        administered_by_id,
        administered_at,
        next_treatment_due,
        photos_after
      FROM wound_treatments
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_wound_treatments_count = ROW_COUNT;
      RAISE NOTICE 'Copied % wound treatments', v_wound_treatments_count;
    END IF;
  END IF;

  -- Copy doctors orders
  IF p_include_doctors_orders THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'doctors_orders') THEN
      INSERT INTO doctors_orders (
        patient_id,
        tenant_id,
        order_date,
        order_time,
        order_text,
        ordering_doctor,
        notes,
        order_type,
        is_acknowledged,
        acknowledged_by,
        acknowledged_at,
        created_by,
        doctor_name
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        order_date,
        order_time,
        order_text,
        ordering_doctor,
        notes,
        order_type,
        is_acknowledged,
        acknowledged_by,
        acknowledged_at,
        created_by,
        doctor_name
      FROM doctors_orders
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_doctors_orders_count = ROW_COUNT;
      RAISE NOTICE 'Copied % doctors orders', v_doctors_orders_count;
    END IF;
  END IF;

  -- Copy lab orders
  IF p_include_labs THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_orders') THEN
      INSERT INTO lab_orders (
        patient_id,
        tenant_id,
        order_date,
        order_time,
        procedure_category,
        procedure_type,
        source_category,
        source_type,
        student_name,
        verified_by,
        status,
        notes,
        label_printed,
        created_by
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        order_date,
        order_time,
        procedure_category,
        procedure_type,
        source_category,
        source_type,
        student_name,
        verified_by,
        status,
        notes,
        false, -- Reset label_printed for new patient
        created_by
      FROM lab_orders
      WHERE patient_id = v_source_patient_uuid;
      
      GET DIAGNOSTICS v_lab_orders_count = ROW_COUNT;
      RAISE NOTICE 'Copied % lab orders', v_lab_orders_count;
    END IF;
  END IF;

  -- Copy lab panels and lab results (with panel ID mapping)
  IF p_include_labs THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_panels') THEN
      -- First, copy lab panels and build panel ID mapping
      FOR v_old_panel_id IN 
        SELECT id FROM lab_panels WHERE patient_id = v_source_patient_uuid
      LOOP
        INSERT INTO lab_panels (
          patient_id,
          tenant_id,
          panel_time,
          source,
          notes,
          status,
          ack_required,
          entered_by
        )
        SELECT
          v_new_patient_uuid,
          p_target_tenant_id,
          panel_time,
          source,
          notes,
          'new', -- Reset status for new patient
          ack_required,
          entered_by
        FROM lab_panels
        WHERE id = v_old_panel_id
        RETURNING id INTO v_new_panel_id;
        
        -- Store old → new mapping
        v_panel_id_mapping := v_panel_id_mapping || jsonb_build_object(
          v_old_panel_id::text, v_new_panel_id::text
        );
        
        v_lab_panels_count := v_lab_panels_count + 1;
      END LOOP;
      
      RAISE NOTICE 'Copied % lab panels', v_lab_panels_count;
      
      -- Then, copy lab results using the panel ID mapping
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_results') THEN
        INSERT INTO lab_results (
          patient_id,
          tenant_id,
          panel_id,
          category,
          test_code,
          test_name,
          value,
          units,
          ref_low,
          ref_high,
          ref_operator,
          sex_ref,
          critical_low,
          critical_high,
          flag,
          entered_by,
          comments
        )
        SELECT
          v_new_patient_uuid,
          p_target_tenant_id,
          (v_panel_id_mapping->>lr.panel_id::text)::uuid, -- Map old panel_id to new panel_id
          lr.category,
          lr.test_code,
          lr.test_name,
          lr.value,
          lr.units,
          lr.ref_low,
          lr.ref_high,
          lr.ref_operator,
          lr.sex_ref,
          lr.critical_low,
          lr.critical_high,
          lr.flag,
          lr.entered_by,
          lr.comments
        FROM lab_results lr
        WHERE lr.patient_id = v_source_patient_uuid
        AND (v_panel_id_mapping->>lr.panel_id::text) IS NOT NULL;
        
        GET DIAGNOSTICS v_lab_results_count = ROW_COUNT;
        RAISE NOTICE 'Copied % lab results', v_lab_results_count;
      END IF;
    END IF;
  END IF;

  -- Copy hacMap data (avatar_locations, devices, wounds with location ID mapping)
  IF p_include_hacmap THEN
    -- First, copy avatar_locations and build ID mapping
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'avatar_locations') THEN
      FOR v_old_location_id IN 
        SELECT id FROM avatar_locations WHERE patient_id = v_source_patient_uuid
      LOOP
        INSERT INTO avatar_locations (
          tenant_id,
          patient_id,
          region_key,
          x_percent,
          y_percent,
          body_view,
          free_text,
          created_by
        )
        SELECT
          p_target_tenant_id,
          v_new_patient_uuid,
          region_key,
          x_percent,
          y_percent,
          body_view,
          free_text,
          created_by
        FROM avatar_locations
        WHERE id = v_old_location_id
        RETURNING id INTO v_new_location_id;
        
        -- Store old → new mapping
        v_location_mapping := v_location_mapping || jsonb_build_object(
          v_old_location_id::text, v_new_location_id::text
        );
        
        v_hacmap_locations_count := v_hacmap_locations_count + 1;
      END LOOP;
      RAISE NOTICE 'Copied % avatar_locations', v_hacmap_locations_count;
    END IF;

    -- Copy devices (linked to new locations)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'devices') THEN
      INSERT INTO devices (
        tenant_id,
        patient_id,
        location_id,
        type,
        placement_date,
        placement_time,
        placed_pre_arrival,
        inserted_by,
        tube_number,
        orientation,
        tube_size_fr,
        number_of_sutures_placed,
        reservoir_type,
        reservoir_size_ml,
        securement_method,
        patient_tolerance,
        notes,
        created_by
      )
      SELECT
        p_target_tenant_id,
        v_new_patient_uuid,
        (v_location_mapping->>location_id::text)::uuid,
        type,
        placement_date,
        placement_time,
        placed_pre_arrival,
        inserted_by,
        tube_number,
        orientation,
        tube_size_fr,
        number_of_sutures_placed,
        reservoir_type,
        reservoir_size_ml,
        securement_method,
        patient_tolerance,
        notes,
        created_by
      FROM devices
      WHERE patient_id = v_source_patient_uuid
      AND (v_location_mapping->>location_id::text) IS NOT NULL;
      
      GET DIAGNOSTICS v_hacmap_devices_count = ROW_COUNT;
      RAISE NOTICE 'Copied % devices', v_hacmap_devices_count;
    END IF;

    -- Copy wounds (linked to new locations)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wounds') THEN
      INSERT INTO wounds (
        tenant_id,
        patient_id,
        location_id,
        wound_type,
        peri_wound_temperature,
        wound_length_cm,
        wound_width_cm,
        wound_depth_cm,
        wound_description,
        drainage_description,
        drainage_consistency,
        wound_odor,
        drainage_amount,
        wound_edges,
        closure,
        suture_staple_line,
        sutures_intact,
        notes,
        created_by
      )
      SELECT
        p_target_tenant_id,
        v_new_patient_uuid,
        (v_location_mapping->>location_id::text)::uuid,
        wound_type,
        peri_wound_temperature,
        wound_length_cm,
        wound_width_cm,
        wound_depth_cm,
        wound_description,
        drainage_description,
        drainage_consistency,
        wound_odor,
        drainage_amount,
        wound_edges,
        closure,
        suture_staple_line,
        sutures_intact,
        notes,
        created_by
      FROM wounds
      WHERE patient_id = v_source_patient_uuid
      AND (v_location_mapping->>location_id::text) IS NOT NULL;
      
      GET DIAGNOSTICS v_hacmap_wounds_count = ROW_COUNT;
      RAISE NOTICE 'Copied % wounds', v_hacmap_wounds_count;
    END IF;
  END IF;

  -- Copy intake & output events
  IF p_include_intake_output THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_intake_output_events') THEN
      INSERT INTO patient_intake_output_events (
        tenant_id,
        patient_id,
        event_timestamp,
        shift_label,
        direction,
        category,
        route,
        description,
        amount_ml,
        student_name,
        created_by
      )
      SELECT
        p_target_tenant_id,
        v_new_patient_uuid,
        event_timestamp,
        shift_label,
        direction,
        category,
        route,
        description,
        amount_ml,
        student_name,
        created_by
      FROM patient_intake_output_events
      WHERE patient_id = v_source_patient_uuid;
      
      GET DIAGNOSTICS v_intake_output_count = ROW_COUNT;
      RAISE NOTICE 'Copied % intake/output events', v_intake_output_count;
    END IF;
  END IF;

  -- Build result JSON
  v_records_created := jsonb_build_object(
    'vitals', v_vitals_count,
    'medications', v_medications_count,
    'medication_administrations', v_med_admin_count,
    'notes', v_notes_count,
    'assessments', v_assessments_count,
    'handover_notes', v_handover_count,
    'alerts', v_alerts_count,
    'diabetic_records', v_diabetic_count,
    'bowel_records', v_bowel_count,
    'wound_assessments', v_wound_assessments_count,
    'wound_treatments', v_wound_treatments_count,
    'doctors_orders', v_doctors_orders_count,
    'admission_records', v_admission_records_count,
    'advanced_directives', v_advanced_directives_count,
    'lab_orders', v_lab_orders_count,
    'lab_panels', v_lab_panels_count,
    'lab_results', v_lab_results_count,
    'hacmap_locations', v_hacmap_locations_count,
    'hacmap_devices', v_hacmap_devices_count,
    'hacmap_wounds', v_hacmap_wounds_count,
    'intake_output_events', v_intake_output_count
  );

  -- Return success
  RETURN QUERY SELECT 
    true AS success,
    v_new_patient_uuid AS new_patient_id,
    v_new_patient_identifier AS new_patient_identifier,
    v_records_created AS records_created,
    ('Patient duplicated successfully with ' || 
     (v_vitals_count + v_medications_count + v_med_admin_count + v_notes_count + 
      v_assessments_count + v_handover_count + v_alerts_count + v_diabetic_count + 
      v_bowel_count + v_wound_assessments_count + v_wound_treatments_count + 
      v_doctors_orders_count + v_admission_records_count + v_advanced_directives_count + 
      v_lab_orders_count + v_lab_panels_count + v_lab_results_count + 
      v_hacmap_locations_count + v_hacmap_devices_count + v_hacmap_wounds_count + 
      v_intake_output_count)::TEXT || ' associated records')::TEXT AS message;

END;
$$;


ALTER FUNCTION "public"."duplicate_patient_to_tenant"("p_source_patient_id" "text", "p_target_tenant_id" "uuid", "p_new_patient_id" "text", "p_include_vitals" boolean, "p_include_medications" boolean, "p_include_assessments" boolean, "p_include_handover_notes" boolean, "p_include_alerts" boolean, "p_include_diabetic_records" boolean, "p_include_bowel_records" boolean, "p_include_wound_care" boolean, "p_include_doctors_orders" boolean, "p_include_labs" boolean, "p_include_hacmap" boolean, "p_include_intake_output" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."duplicate_patient_to_tenant"("p_source_patient_id" "text", "p_target_tenant_id" "uuid", "p_new_patient_id" "text", "p_include_vitals" boolean, "p_include_medications" boolean, "p_include_assessments" boolean, "p_include_handover_notes" boolean, "p_include_alerts" boolean, "p_include_diabetic_records" boolean, "p_include_bowel_records" boolean, "p_include_wound_care" boolean, "p_include_doctors_orders" boolean, "p_include_labs" boolean, "p_include_hacmap" boolean, "p_include_intake_output" boolean) IS 'Duplicates a patient and ALL associated data to another tenant. Includes labs, hacMap, intake/output, and all other clinical data with proper foreign key mapping.';



CREATE OR REPLACE FUNCTION "public"."enable_rls_on_new_tables"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_ddl_commands() LOOP
    -- Only act on CREATE TABLE statements in the public schema
    IF obj.command_tag = 'CREATE TABLE' AND obj.schema_name = 'public' THEN
      EXECUTE format(
        'ALTER TABLE %s ENABLE ROW LEVEL SECURITY',
        obj.object_identity  -- already schema-qualified, e.g. "public.patients"
      );
    END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."enable_rls_on_new_tables"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."end_user_session"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Update active sessions to logged out
  UPDATE user_sessions
  SET status = 'logged_out',
      logout_time = now()
  WHERE user_id = auth.uid()
    AND status = 'active'
    AND logout_time IS NULL;

  -- Session ended - logout time recorded
  
  RETURN true;
END;
$$;


ALTER FUNCTION "public"."end_user_session"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."end_user_session"() IS 'Ends user session and records logout time';



CREATE OR REPLACE FUNCTION "public"."ensure_user_profile"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO user_profiles (id, email, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'nurse',
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_user_profile"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_user_profile"("user_id" "uuid", "user_email" "text") RETURNS "public"."user_profiles"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  profile user_profiles;
BEGIN
  -- Try to get existing profile
  SELECT * INTO profile FROM user_profiles WHERE id = user_id;
  
  -- If no profile exists, create one
  IF profile IS NULL THEN
    INSERT INTO user_profiles (
      id,
      email,
      first_name,
      last_name,
      role,
      is_active
    ) VALUES (
      user_id,
      COALESCE(user_email, ''),
      'User',
      '',
      'nurse',
      true
    )
    RETURNING * INTO profile;
  END IF;
  
  RETURN profile;
EXCEPTION
  WHEN OTHERS THEN
    -- Return a basic profile structure even if insert fails
    SELECT user_id, COALESCE(user_email, ''), 'User', '', 'nurse'::user_role, null, null, null, true, now(), now()
    INTO profile.id, profile.email, profile.first_name, profile.last_name, profile.role, 
         profile.department, profile.license_number, profile.phone, profile.is_active, 
         profile.created_at, profile.updated_at;
    RETURN profile;
END;
$$;


ALTER FUNCTION "public"."ensure_user_profile"("user_id" "uuid", "user_email" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."ensure_user_profile"("user_id" "uuid", "user_email" "text") IS 'Creates or retrieves a user profile. Uses immutable search path for security.';



CREATE OR REPLACE FUNCTION "public"."fetch_medications_for_tenant"("target_tenant_id" "uuid") RETURNS TABLE("medication_id" "uuid", "patient_id" "uuid", "name" "text", "dosage" "text", "frequency" "text", "route" "text", "prescribed_by" "text", "start_date" "date", "tenant_id" "uuid", "patient_first_name" "text", "patient_last_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    current_user_id UUID;
    user_role TEXT;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Check if user is super admin or admin
    SELECT role INTO user_role 
    FROM user_profiles 
    WHERE id = current_user_id;
    
    -- Only allow super_admin and admin roles to use this function
    IF user_role NOT IN ('super_admin', 'admin') THEN
        RAISE EXCEPTION 'Insufficient permissions. Only super admins and admins can access cross-tenant data.';
    END IF;
    
    -- Return medications for the specified tenant with patient info
    RETURN QUERY
    SELECT 
        pm.id as medication_id,
        pm.patient_id,
        pm.name,
        pm.dosage,
        pm.frequency,
        pm.route,
        pm.prescribed_by,
        pm.start_date,
        pm.tenant_id,
        p.first_name as patient_first_name,
        p.last_name as patient_last_name
    FROM patient_medications pm
    LEFT JOIN patients p ON pm.patient_id = p.id
    WHERE pm.tenant_id = target_tenant_id
    AND pm.status = 'Active'
    ORDER BY pm.name;
END;
$$;


ALTER FUNCTION "public"."fetch_medications_for_tenant"("target_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_user_by_email"("email_param" "text") RETURNS TABLE("user_id" "uuid", "email" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    au.id as user_id,
    au.email::TEXT as email,
    au.created_at
  FROM auth.users au
  WHERE au.email = email_param
  AND au.deleted_at IS NULL
  LIMIT 1;
$$;


ALTER FUNCTION "public"."find_user_by_email"("email_param" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_simulation_id_sets"("p_template_id" "uuid", "p_session_count" integer, "p_session_names" "text"[] DEFAULT NULL::"text"[]) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_id_sets jsonb := '[]'::jsonb;
  v_session_data jsonb;
  v_patient_mappings jsonb;
  v_med_mappings jsonb;
  v_tenant_id uuid;
  v_patient_record record;
  v_med_record record;
  v_new_patient_uuid uuid;
  v_new_med_uuid uuid;
  i integer;
  v_session_name text;
BEGIN
  -- Get template tenant
  SELECT tenant_id INTO v_tenant_id
  FROM simulation_templates
  WHERE id = p_template_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;
  
  RAISE NOTICE '🎯 Generating % reusable ID sets for template %', p_session_count, p_template_id;
  
  -- Generate ID sets for each session
  FOR i IN 1..p_session_count LOOP
    v_patient_mappings := '{}'::jsonb;
    v_med_mappings := '{}'::jsonb;
    
    -- Determine session name
    IF p_session_names IS NOT NULL AND i <= array_length(p_session_names, 1) THEN
      v_session_name := p_session_names[i];
    ELSE
      v_session_name := 'Session ' || i;
    END IF;
    
    RAISE NOTICE '📋 Session %: %', i, v_session_name;
    
    -- Generate unique IDs for patients (these will be reused across resets)
    FOR v_patient_record IN 
      SELECT id, patient_id, first_name, last_name 
      FROM patients 
      WHERE tenant_id = v_tenant_id
      ORDER BY patient_id
    LOOP
      v_new_patient_uuid := gen_random_uuid();
      v_patient_mappings := jsonb_set(
        v_patient_mappings,
        ARRAY[v_patient_record.id::text],
        to_jsonb(v_new_patient_uuid::text)
      );
      
      RAISE NOTICE '  Patient: % % (%) -> %', 
        v_patient_record.first_name, 
        v_patient_record.last_name,
        v_patient_record.patient_id,
        v_new_patient_uuid;
    END LOOP;
    
    -- Generate unique IDs for medications (these will be reused across resets)
    FOR v_med_record IN 
      SELECT pm.id, pm.medication_name, p.patient_id
      FROM patient_medications pm 
      JOIN patients p ON p.id = pm.patient_id 
      WHERE p.tenant_id = v_tenant_id
      ORDER BY p.patient_id, pm.medication_name
    LOOP
      v_new_med_uuid := gen_random_uuid();
      v_med_mappings := jsonb_set(
        v_med_mappings,
        ARRAY[v_med_record.id::text],
        to_jsonb(v_new_med_uuid::text)
      );
      
      RAISE NOTICE '  Medication: % (Patient: %) -> %', 
        v_med_record.medication_name,
        v_med_record.patient_id,
        v_new_med_uuid;
    END LOOP;
    
    -- Build session data
    v_session_data := jsonb_build_object(
      'session_number', i,
      'session_name', v_session_name,
      'created_at', now(),
      'patient_count', (SELECT count(*) FROM patients WHERE tenant_id = v_tenant_id),
      'medication_count', (SELECT count(*) FROM patient_medications pm JOIN patients p ON p.id = pm.patient_id WHERE p.tenant_id = v_tenant_id),
      'id_mappings', jsonb_build_object(
        'patients', v_patient_mappings,
        'medications', v_med_mappings
      )
    );
    
    -- Add to sets array
    v_id_sets := v_id_sets || jsonb_build_array(v_session_data);
  END LOOP;
  
  -- Store all sets in template
  UPDATE simulation_templates
  SET 
    simulation_id_sets = v_id_sets,
    updated_at = now()
  WHERE id = p_template_id;
  
  RAISE NOTICE '✅ Generated % reusable ID sets', p_session_count;
  
  RETURN json_build_object(
    'success', true,
    'session_count', p_session_count,
    'sessions', v_id_sets,
    'message', 'ID sets generated successfully. You can now print labels that will work across multiple simulation runs.'
  );
END;
$$;


ALTER FUNCTION "public"."generate_simulation_id_sets"("p_template_id" "uuid", "p_session_count" integer, "p_session_names" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_admin_users"() RETURNS TABLE("user_id" "uuid", "email" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT 
    au.id as user_id,
    au.email::TEXT as email,
    au.created_at
  FROM auth.users au
  WHERE au.deleted_at IS NULL
  AND au.email_confirmed_at IS NOT NULL
  ORDER BY au.created_at DESC;
$$;


ALTER FUNCTION "public"."get_available_admin_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_tenants_for_transfer"("p_source_patient_id" "text") RETURNS TABLE("tenant_id" "uuid", "tenant_name" character varying, "subdomain" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_source_tenant_id UUID;
BEGIN
    -- Get source patient's tenant
    SELECT patients.tenant_id INTO v_source_tenant_id
    FROM patients 
    WHERE patient_id = p_source_patient_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Patient not found with patient_id: %', p_source_patient_id;
    END IF;
    
    -- Return all tenants except the source tenant
    RETURN QUERY 
    SELECT 
        t.id,
        t.name,
        t.subdomain
    FROM tenants t
    WHERE t.id != v_source_tenant_id
    AND t.status = 'active'
    ORDER BY t.name;
END;
$$;


ALTER FUNCTION "public"."get_available_tenants_for_transfer"("p_source_patient_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_cohort_students"("p_cohort_id" "uuid") RETURNS TABLE("user_id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "student_number" "text", "program_id" "uuid", "program_code" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_cohort_students"("p_cohort_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_secure_alerts"() RETURNS TABLE("alert_id" "uuid", "patient_id" "uuid", "patient_name" "text", "alert_type" "text", "message" "text", "priority" "text", "acknowledged" boolean, "acknowledged_by" "uuid", "acknowledged_at" timestamp with time zone, "created_at" timestamp with time zone, "tenant_id" "uuid", "tenant_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_user_id UUID := auth.uid();
  user_exists BOOLEAN := false;
  user_active BOOLEAN := false;
BEGIN
  -- Check if auth.uid() is valid
  IF current_user_id IS NULL OR current_user_id = '00000000-0000-0000-0000-000000000000'::UUID THEN
    RAISE EXCEPTION 'Access denied: Authentication required';
  END IF;

  -- Check if user profile exists and is active
  SELECT 
    EXISTS(SELECT 1 FROM user_profiles WHERE id = current_user_id),
    COALESCE((SELECT is_active FROM user_profiles WHERE id = current_user_id), false)
  INTO user_exists, user_active;
  
  IF NOT user_exists THEN
    RAISE EXCEPTION 'Access denied: User profile not found';
  END IF;
  
  IF NOT user_active THEN
    RAISE EXCEPTION 'Access denied: User account is inactive';
  END IF;

  -- Return alerts using the RLS-protected view
  RETURN QUERY
  SELECT 
    pav.id as alert_id,
    pav.patient_id,
    pav.patient_name,
    pav.alert_type,
    pav.message,
    pav.priority,
    pav.acknowledged,
    pav.acknowledged_by,
    pav.acknowledged_at,
    pav.created_at,
    pav.tenant_id,
    pav.tenant_name
  FROM patient_alerts_view pav
  ORDER BY pav.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_secure_alerts"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_simulation_label_data"("p_template_id" "uuid", "p_session_number" integer) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id uuid;
  v_session_data jsonb;
  v_id_mappings jsonb;
  v_label_data json;
BEGIN
  -- Get template info
  SELECT tenant_id, simulation_id_sets->>(p_session_number - 1)
  INTO v_tenant_id, v_session_data
  FROM simulation_templates
  WHERE id = p_template_id;
  
  IF v_session_data IS NULL THEN
    RAISE EXCEPTION 'Session % not found for template %. Generate ID sets first using generate_simulation_id_sets()', 
      p_session_number, p_template_id;
  END IF;
  
  v_id_mappings := v_session_data->'id_mappings';
  
  -- Build label data with pre-allocated IDs
  SELECT json_build_object(
    'session_name', v_session_data->>'session_name',
    'session_number', p_session_number,
    'template_id', p_template_id,
    'patients', (
      SELECT json_agg(json_build_object(
        'simulation_uuid', (v_id_mappings->'patients'->>p.id::text)::uuid,
        'patient_id', p.patient_id,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'full_name', p.first_name || ' ' || p.last_name,
        'date_of_birth', p.date_of_birth,
        'blood_type', p.blood_type,
        'allergies', p.allergies,
        'room_number', p.room_number,
        'bed_number', p.bed_number,
        'barcode', 'SIM-P-' || (v_id_mappings->'patients'->>p.id::text)
      ) ORDER BY p.patient_id)
      FROM patients p
      WHERE p.tenant_id = v_tenant_id
    ),
    'medications', (
      SELECT json_agg(json_build_object(
        'simulation_uuid', (v_id_mappings->'medications'->>pm.id::text)::uuid,
        'medication_name', pm.medication_name,
        'generic_name', pm.generic_name,
        'dosage', pm.dosage,
        'route', pm.route,
        'frequency', pm.frequency,
        'patient_id', p.patient_id,
        'patient_name', p.first_name || ' ' || p.last_name,
        'room_number', p.room_number,
        'bed_number', p.bed_number,
        'barcode', 'SIM-M-' || (v_id_mappings->'medications'->>pm.id::text)
      ) ORDER BY p.patient_id, pm.medication_name)
      FROM patient_medications pm
      JOIN patients p ON p.id = pm.patient_id
      WHERE p.tenant_id = v_tenant_id
    )
  ) INTO v_label_data;
  
  RETURN v_label_data;
END;
$$;


ALTER FUNCTION "public"."get_simulation_label_data"("p_template_id" "uuid", "p_session_number" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_simulation_students"("p_simulation_id" "uuid") RETURNS TABLE("user_id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "student_number" "text", "role" "public"."simulation_role", "granted_at" timestamp with time zone, "last_accessed_at" timestamp with time zone)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_simulation_students"("p_simulation_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_super_admin_tenant_context"() RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  tenant_context text;
BEGIN
  -- Only super admins can get tenant context
  IF NOT public.current_user_is_super_admin() THEN
    RETURN NULL;
  END IF;
  
  -- Get current tenant context from session
  SELECT current_setting('app.current_tenant_id', true) INTO tenant_context;
  
  -- Return NULL if empty string (represents ALL_TENANTS mode)
  IF tenant_context = '' OR tenant_context IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN tenant_context;
END;
$$;


ALTER FUNCTION "public"."get_super_admin_tenant_context"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tenants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" character varying(255) NOT NULL,
    "subdomain" character varying(100) NOT NULL,
    "logo_url" "text",
    "primary_color" character varying(7) DEFAULT '#3B82F6'::character varying,
    "settings" "jsonb" DEFAULT '{"currency": "USD", "features": {"mobile_app": true, "wound_care": false, "barcode_scanning": false, "advanced_analytics": false, "medication_management": true}, "security": {"password_policy": {"min_length": 8, "require_numbers": true, "require_symbols": false, "require_lowercase": true, "require_uppercase": true}, "session_timeout": 480, "two_factor_required": false}, "timezone": "UTC", "date_format": "MM/DD/YYYY"}'::"jsonb" NOT NULL,
    "status" character varying(20) DEFAULT 'active'::character varying NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "admin_user_id" "uuid",
    "subscription_plan" character varying(20) DEFAULT 'basic'::character varying NOT NULL,
    "max_users" integer DEFAULT 10 NOT NULL,
    "max_patients" integer DEFAULT 100 NOT NULL,
    "parent_tenant_id" "uuid",
    "tenant_type" "text" DEFAULT 'institution'::"text",
    "simulation_id" "uuid",
    "auto_cleanup_at" timestamp without time zone,
    "is_simulation" boolean DEFAULT false,
    "simulation_config" "jsonb" DEFAULT '{}'::"jsonb",
    "program_id" "uuid",
    CONSTRAINT "tenants_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('active'::character varying)::"text", ('inactive'::character varying)::"text", ('suspended'::character varying)::"text"]))),
    CONSTRAINT "tenants_subscription_plan_check" CHECK ((("subscription_plan")::"text" = ANY (ARRAY[('basic'::character varying)::"text", ('premium'::character varying)::"text", ('enterprise'::character varying)::"text"])))
);


ALTER TABLE "public"."tenants" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenants" IS 'Stores tenant/organization information for multi-tenant architecture';



COMMENT ON COLUMN "public"."tenants"."settings" IS 'JSON configuration for tenant-specific settings and features';



COMMENT ON COLUMN "public"."tenants"."program_id" IS 'Links program tenants to their program record. NULL for non-program tenants.';



CREATE OR REPLACE FUNCTION "public"."get_tenant_by_subdomain_public"("p_subdomain" "text") RETURNS SETOF "public"."tenants"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT * FROM public.tenants
  WHERE subdomain = p_subdomain AND status = 'active'
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_tenant_by_subdomain_public"("p_subdomain" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_tenant_users"("target_tenant_id" "uuid") RETURNS TABLE("user_id" "uuid", "tenant_id" "uuid", "role" "text", "permissions" "text"[], "is_active" boolean, "email" "text", "first_name" "text", "last_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tu.user_id,
    tu.tenant_id,
    tu.role::TEXT,
    tu.permissions,
    tu.is_active,
    up.email,
    up.first_name,
    up.last_name
  FROM tenant_users tu
  JOIN user_profiles up ON tu.user_id = up.id
  WHERE tu.tenant_id = target_tenant_id;
END;
$$;


ALTER FUNCTION "public"."get_tenant_users"("target_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_accessible_simulations"("p_user_id" "uuid") RETURNS TABLE("template_id" "uuid", "template_name" "text", "simulation_id" "uuid", "simulation_name" "text", "categories" "text"[], "access_reason" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    st.id as template_id,
    st.name as template_name,
    sa.id as simulation_id,
    sa.name as simulation_name,
    COALESCE(st.primary_categories, sa.primary_categories, '{}'::text[]) as categories,
    CASE
      WHEN up.role IN ('super_admin', 'coordinator') THEN 'Super admin/Coordinator access'
      WHEN up.role = 'admin' THEN 'Admin access'
      WHEN st.created_by = p_user_id OR sa.created_by = p_user_id THEN 'Creator'
      WHEN EXISTS (
        SELECT 1 FROM user_programs up_prog
        JOIN programs prog ON prog.id = up_prog.program_id
        WHERE up_prog.user_id = p_user_id
          AND prog.code = ANY(COALESCE(st.primary_categories, sa.primary_categories, '{}'::text[]))
      ) THEN 'Program match: ' || array_to_string(
        ARRAY(
          SELECT prog.code FROM user_programs up_prog
          JOIN programs prog ON prog.id = up_prog.program_id
          WHERE up_prog.user_id = p_user_id
        ), ', '
      )
      ELSE 'Unknown'
    END as access_reason
  FROM user_profiles up
  LEFT JOIN simulation_templates st ON true
  LEFT JOIN simulation_active sa ON true
  WHERE up.id = p_user_id
    AND (st.id IS NOT NULL OR sa.id IS NOT NULL);
END;
$$;


ALTER FUNCTION "public"."get_user_accessible_simulations"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_accessible_simulations"("p_user_id" "uuid") IS 'Debug function to see what simulations a user can access and why';



CREATE OR REPLACE FUNCTION "public"."get_user_auth_status"("p_user_ids" "uuid"[]) RETURNS TABLE("user_id" "uuid", "last_sign_in_at" timestamp with time zone, "email_confirmed_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM user_profiles WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'coordinator', 'admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to view user sign-in status';
  END IF;

  RETURN QUERY
  SELECT au.id, au.last_sign_in_at, au.email_confirmed_at
  FROM auth.users au
  WHERE au.id = ANY(p_user_ids);
END;
$$;


ALTER FUNCTION "public"."get_user_auth_status"("p_user_ids" "uuid"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_auth_status"("p_user_ids" "uuid"[]) IS 'Returns last_sign_in_at/email_confirmed_at from auth.users for the given user ids. Caller must be admin/coordinator/super_admin. Used by User Management to flag accounts that have never signed in (pending setup).';



CREATE OR REPLACE FUNCTION "public"."get_user_current_tenant"("target_user_id" "uuid") RETURNS TABLE("tenant_id" "uuid", "role" "text", "is_active" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tu.tenant_id,
    tu.role::TEXT,  -- Cast VARCHAR to TEXT to match return type
    tu.is_active
  FROM tenant_users tu
  WHERE tu.user_id = target_user_id 
    AND tu.is_active = true
  LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_user_current_tenant"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_program_codes"("p_user_id" "uuid") RETURNS "text"[]
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT ARRAY_AGG(p.code)
  FROM user_programs up
  JOIN programs p ON p.id = up.program_id
  WHERE up.user_id = p_user_id
    AND p.is_active = true;
$$;


ALTER FUNCTION "public"."get_user_program_codes"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_program_codes"("p_user_id" "uuid") IS 'Returns array of program codes assigned to user';



CREATE OR REPLACE FUNCTION "public"."get_user_program_tenants"("p_user_id" "uuid") RETURNS TABLE("tenant_id" "uuid", "tenant_name" "text", "program_id" "uuid", "program_code" "text", "program_name" "text", "subdomain" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."get_user_program_tenants"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_program_tenants"("p_user_id" "uuid") IS 'Returns all program tenants that a user has access to via their program assignments';



CREATE OR REPLACE FUNCTION "public"."get_user_role"("user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    user_role text;
BEGIN
    -- Get the user's role
    SELECT role INTO user_role
    FROM public.user_profiles
    WHERE id = user_id;
    
    RETURN user_role;
END;
$$;


ALTER FUNCTION "public"."get_user_role"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_simulation_assignments"("p_user_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result json;
BEGIN
  -- Security check: Users can only query their own assignments
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() is NULL';
  END IF;
  
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: You can only query your own simulation assignments';
  END IF;

  -- Get simulation assignments for the user
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO v_result
  FROM (
    SELECT 
      sp.id,
      sp.simulation_id,
      sp.role,
      sp.granted_at,
      json_build_object(
        'id', sa.id,
        'name', sa.name,
        'status', sa.status,
        'starts_at', sa.starts_at,
        'tenant_id', sa.tenant_id,
        'template', (
          SELECT json_build_object('name', st.name, 'description', st.description)
          FROM simulation_templates st
          WHERE st.id = sa.template_id
        )
      ) as simulation
    FROM simulation_participants sp
    JOIN simulation_active sa ON sa.id = sp.simulation_id
    WHERE sp.user_id = p_user_id
      AND sa.status = 'running'
      AND sa.ends_at > NOW()
    ORDER BY sp.granted_at DESC
  ) t;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_user_simulation_assignments"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_simulation_assignments"("p_user_id" "uuid") IS 'Gets simulation assignments for a user, bypassing RLS restrictions. Used by simulation portal.';



CREATE OR REPLACE FUNCTION "public"."get_user_simulation_tenant_access"() RETURNS "uuid"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT CASE
    -- Super admin can access any tenant
    WHEN EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin' 
      AND is_active = true
    ) THEN NULL -- NULL means access all tenants
    
    -- Regular users only access their assigned tenant
    ELSE (
      SELECT tenant_id 
      FROM tenant_users 
      WHERE user_id = auth.uid() 
      AND is_active = true 
      LIMIT 1
    )
  END;
$$;


ALTER FUNCTION "public"."get_user_simulation_tenant_access"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_user_simulation_tenant_access"() IS 'Returns NULL for super_admin (access all tenants) or tenant_id for regular users';



CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, created_at, updated_at)
    VALUES (NEW.id, NEW.email, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_patient_tenant_assignment"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Ensure patient has a tenant_id
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'Patient must have a tenant_id';
  END IF;
  
  -- Verify tenant exists
  IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE id = NEW.tenant_id) THEN
    RAISE EXCEPTION 'Invalid tenant_id: %', NEW.tenant_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_patient_tenant_assignment"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_profile_update"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- Update timestamp
  NEW.updated_at = NOW();
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_profile_update"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."instantiate_simulation_patients"("p_simulation_id" "uuid", "p_scenario_template_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
    template_record RECORD;
    patient_id UUID;
    vitals_record RECORD;
    med_record RECORD;
    note_record RECORD;
    patient_count INTEGER := 0;
BEGIN
    -- Loop through all patient templates for this scenario
    FOR template_record IN 
        SELECT * FROM simulation_patient_templates 
        WHERE scenario_template_id = p_scenario_template_id 
        AND is_active = true
    LOOP
        -- Create the simulation patient with proper constraint fields
        INSERT INTO simulation_patients (
            active_simulation_id,
            template_id,          -- Reference to the template
            is_template,          -- Must be false for instantiated patients
            patient_id,
            patient_name,
            date_of_birth,
            gender,
            room_number,
            bed_number,
            diagnosis,
            condition,
            allergies,
            blood_type,
            emergency_contact_name,
            emergency_contact_relationship,
            emergency_contact_phone,
            assigned_nurse
        ) VALUES (
            p_simulation_id,      -- active_simulation_id
            template_record.id,   -- template_id
            false,                -- is_template = false
            gen_random_uuid()::text,
            template_record.patient_name,
            template_record.date_of_birth,
            template_record.gender,
            template_record.room_number,
            template_record.bed_number,
            template_record.diagnosis,
            template_record.condition,
            template_record.allergies,
            template_record.blood_type,
            template_record.emergency_contact_name,
            template_record.emergency_contact_relationship,
            template_record.emergency_contact_phone,
            template_record.assigned_nurse
        ) RETURNING id INTO patient_id;

        -- Add initial vitals from template
        FOR vitals_record IN 
            SELECT * FROM patient_vitals_templates 
            WHERE patient_template_id = template_record.id 
        LOOP
            INSERT INTO simulation_patient_vitals (
                simulation_patient_id,
                vital_type,
                value_systolic,
                value_diastolic,
                value_numeric,
                unit,
                recorded_at,
                recorded_by,
                notes
            ) VALUES (
                patient_id,
                vitals_record.vital_type,
                vitals_record.value_systolic,
                vitals_record.value_diastolic,
                vitals_record.value_numeric,
                vitals_record.unit,
                NOW(),
                'system',
                vitals_record.notes
            );
        END LOOP;

        -- Add initial medications from template
        FOR med_record IN 
            SELECT * FROM patient_medications_templates 
            WHERE patient_template_id = template_record.id 
            AND is_active = true
        LOOP
            INSERT INTO simulation_patient_medications (
                simulation_patient_id,
                medication_name,
                dosage,
                route,
                frequency,
                start_date,
                end_date,
                indication,
                is_prn,
                prn_parameters,
                notes,
                is_active
            ) VALUES (
                patient_id,
                med_record.medication_name,
                med_record.dosage,
                med_record.route,
                med_record.frequency,
                COALESCE(med_record.start_date, CURRENT_DATE),
                med_record.end_date,
                med_record.indication,
                med_record.is_prn,
                med_record.prn_parameters,
                med_record.notes,
                med_record.is_active
            );
        END LOOP;

        -- Add initial notes from template
        FOR note_record IN 
            SELECT * FROM patient_notes_templates 
            WHERE patient_template_id = template_record.id 
        LOOP
            INSERT INTO simulation_patient_notes (
                simulation_patient_id,
                note_type,
                note_content,
                created_by_role,
                created_at,
                priority,
                is_visible_to_students
            ) VALUES (
                patient_id,
                note_record.note_type,
                note_record.note_content,
                note_record.created_by_role,
                COALESCE(note_record.scheduled_time, NOW()),
                note_record.priority,
                note_record.is_visible_to_students
            );
        END LOOP;

        patient_count := patient_count + 1;
    END LOOP;

    RETURN patient_count;
END;
$$;


ALTER FUNCTION "public"."instantiate_simulation_patients"("p_simulation_id" "uuid", "p_scenario_template_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin_user"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    user_role text;
BEGIN
    -- Get the user's role
    SELECT role INTO user_role
    FROM public.user_profiles
    WHERE id = user_id;
    
    -- Return true if the user is an admin or super_admin
    RETURN user_role IN ('admin', 'super_admin');
END;
$$;


ALTER FUNCTION "public"."is_admin_user"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin"("check_user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM tenant_users 
    WHERE user_id = check_user_id 
    AND role = 'super_admin'
  );
$$;


ALTER FUNCTION "public"."is_super_admin"("check_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin_direct"("user_uuid" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_users 
    WHERE user_id = user_uuid 
    AND role = 'super_admin'
    AND is_active = true
  );
$$;


ALTER FUNCTION "public"."is_super_admin_direct"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_super_admin_user"("user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    user_role text;
BEGIN
    -- Get the user's role
    SELECT role INTO user_role
    FROM public.user_profiles
    WHERE id = user_id;
    
    -- Return true if the user is a super_admin
    RETURN user_role = 'super_admin';
END;
$$;


ALTER FUNCTION "public"."is_super_admin_user"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_tenant_admin"("tenant_uuid" "uuid", "user_uuid" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.tenant_users tu
        JOIN public.user_profiles up ON tu.user_id = up.id
        WHERE tu.tenant_id = tenant_uuid
        AND tu.user_id = user_uuid
        AND tu.is_active = true
        AND up.role IN ('admin', 'super_admin')
    );
END;
$$;


ALTER FUNCTION "public"."is_tenant_admin"("tenant_uuid" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."launch_run"("p_snapshot_id" "uuid", "p_run_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_run_id UUID;
    v_snapshot_data JSONB;
    v_patient JSONB;
    v_barcode JSONB;
    v_run_patient_id UUID;
BEGIN
    -- Get snapshot data
    SELECT snapshot_data INTO v_snapshot_data
    FROM sim_snapshots
    WHERE id = p_snapshot_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Snapshot not found: %', p_snapshot_id;
    END IF;
    
    -- Create the run
    INSERT INTO sim_runs (
        snapshot_id,
        name,
        created_by
    ) VALUES (
        p_snapshot_id,
        p_run_name,
        auth.uid()
    ) RETURNING id INTO v_run_id;
    
    -- Create stable run patients (preserve public IDs from template)
    FOR v_patient IN 
        SELECT * FROM jsonb_array_elements(v_snapshot_data->'patients')
    LOOP
        INSERT INTO sim_run_patients (
            run_id,
            template_patient_id,
            public_patient_id,
            room,
            bed
        ) VALUES (
            v_run_id,
            (v_patient->>'id')::UUID,
            v_patient->>'public_patient_id',
            v_patient->>'room',
            v_patient->>'bed'
        );
    END LOOP;
    
    -- Create stable barcode pool (preserve public barcode IDs from template)
    FOR v_barcode IN
        SELECT 
            tb.*,
            tm.medication_name
        FROM jsonb_array_elements(v_snapshot_data->'barcodes') tb
        JOIN jsonb_array_elements(v_snapshot_data->'medications') tm
            ON (tb->>'template_med_id')::UUID = (tm->>'id')::UUID
    LOOP
        INSERT INTO sim_run_barcode_pool (
            run_id,
            template_barcode_id,
            public_barcode_id,
            medication_name
        ) VALUES (
            v_run_id,
            (v_barcode->>'id')::UUID,
            v_barcode->>'public_barcode_id',
            v_barcode->>'medication_name'
        );
    END LOOP;
    
    RETURN v_run_id;
END;
$$;


ALTER FUNCTION "public"."launch_run"("p_snapshot_id" "uuid", "p_run_name" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."launch_run"("p_snapshot_id" "uuid", "p_run_name" "text") IS 'Launches active simulation from snapshot';



CREATE OR REPLACE FUNCTION "public"."launch_simulation"("p_template_id" "uuid", "p_name" "text", "p_duration_minutes" integer, "p_participant_user_ids" "uuid"[], "p_participant_roles" "text"[] DEFAULT NULL::"text"[], "p_primary_categories" "text"[] DEFAULT '{}'::"text"[], "p_sub_categories" "text"[] DEFAULT '{}'::"text"[], "p_state_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("simulation_id" "uuid", "tenant_id" "uuid", "message" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_simulation_tenant_id UUID;
  v_home_tenant_id UUID;
  v_user_role TEXT;
  v_simulation_id UUID;
  v_snapshot JSONB;
  v_snapshot_anchor timestamptz;
  v_patient_count INTEGER;
  v_template_snapshot_version INTEGER;
BEGIN
  -- Get user's role from user_profiles
  SELECT up.role INTO v_user_role
  FROM user_profiles up
  WHERE up.id = auth.uid();
  
  -- Get user's home tenant_id from user_tenant_access
  SELECT uta.tenant_id INTO v_home_tenant_id
  FROM user_tenant_access uta
  WHERE uta.user_id = auth.uid()
    AND uta.is_active = true
  LIMIT 1;
  
  -- Super admins without tenant: use first non-simulation tenant
  IF v_home_tenant_id IS NULL AND v_user_role = 'super_admin' THEN
    SELECT t.id INTO v_home_tenant_id
    FROM tenants t
    WHERE t.is_simulation = false
    ORDER BY t.created_at ASC
    LIMIT 1;
  END IF;

  -- Confirm the template exists (and grab its version regardless of which
  -- snapshot we end up launching from).
  SELECT st.snapshot_version
  INTO v_template_snapshot_version
  FROM simulation_templates st
  WHERE st.id = p_template_id;

  IF v_template_snapshot_version IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;

  IF p_state_id IS NOT NULL THEN
    SELECT sts.snapshot_data, sts.updated_at INTO v_snapshot, v_snapshot_anchor
    FROM simulation_template_states sts
    WHERE sts.id = p_state_id AND sts.template_id = p_template_id;

    IF v_snapshot IS NULL THEN
      RAISE EXCEPTION 'Template state not found or does not belong to this template: %', p_state_id;
    END IF;
  ELSE
    SELECT st.snapshot_data, st.snapshot_taken_at INTO v_snapshot, v_snapshot_anchor
    FROM simulation_templates st
    WHERE st.id = p_template_id;

    IF v_snapshot IS NULL THEN
      RAISE EXCEPTION 'Template has no snapshot data';
    END IF;
  END IF;

  -- Re-base wall-clock timestamps (I&O, vitals, orders, medication history/
  -- next_due, etc.) baked into the snapshot so they land relative to THIS
  -- launch instead of showing whenever the template/state was last saved.
  v_snapshot := shift_snapshot_timestamps(v_snapshot, now() - v_snapshot_anchor);

  -- Generate new simulation ID
  v_simulation_id := gen_random_uuid();

  -- Create new simulation tenant (temporary tenant for this simulation session)
  INSERT INTO tenants (
    name,
    subdomain,
    tenant_type,
    is_simulation,
    parent_tenant_id,
    simulation_config,
    status
  )
  VALUES (
    'sim_active_' || p_name || '_' || extract(epoch from now())::text,
    'sim-act-' || lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8),
    'simulation_active',
    true,
    v_home_tenant_id,
    jsonb_build_object(
      'template_id', p_template_id,
      'launched_at', now()
    ),
    'active'
  )
  RETURNING id INTO v_simulation_tenant_id;

  -- Restore snapshot to the NEW simulation tenant (creates patients and all baseline data)
  PERFORM restore_snapshot_to_tenant(
    p_tenant_id := v_simulation_tenant_id,
    p_snapshot := v_snapshot,
    p_preserve_barcodes := false
  );

  -- Count patients created
  SELECT COUNT(*) INTO v_patient_count
  FROM patients p
  WHERE p.tenant_id = v_simulation_tenant_id;

  -- Create simulation_active record with categories
  INSERT INTO simulation_active (
    id,
    tenant_id,
    template_id,
    name,
    duration_minutes,
    starts_at,
    ends_at,
    created_by,
    status,
    template_snapshot_version,
    template_snapshot_version_synced,
    primary_categories,
    sub_categories,
    current_state_id
  )
  VALUES (
    v_simulation_id,
    v_simulation_tenant_id,
    p_template_id,
    p_name,
    p_duration_minutes,
    NOW(),
    NOW() + (p_duration_minutes || ' minutes')::INTERVAL,
    auth.uid(),
    'running',
    v_template_snapshot_version,
    v_template_snapshot_version,  -- Launched at current template version
    p_primary_categories,
    p_sub_categories,
    p_state_id
  );

  RAISE NOTICE 'Simulation launched: % (%) with categories: Primary=[%], Sub=[%], state=%',
    v_simulation_id, p_name, 
    array_to_string(p_primary_categories, ', '), 
    array_to_string(p_sub_categories, ', '),
    p_state_id;

  -- Add the launching instructor to tenant_users so they can read all clinical
  -- tables when generating the debrief on completion.
  INSERT INTO tenant_users (user_id, tenant_id, is_active, role)
  VALUES (auth.uid(), v_simulation_tenant_id, true, 'admin')
  ON CONFLICT ON CONSTRAINT tenant_users_tenant_id_user_id_key DO UPDATE
    SET is_active = true, role = 'admin';

  RAISE NOTICE '✅ Launching instructor added to simulation tenant_users for debrief access';

  -- Add participants if provided
  IF p_participant_user_ids IS NOT NULL AND array_length(p_participant_user_ids, 1) > 0 THEN
    FOR i IN 1..array_length(p_participant_user_ids, 1)
    LOOP
      -- Add to simulation_participants table
      INSERT INTO simulation_participants (
        simulation_id,
        user_id,
        role,
        granted_by
      )
      VALUES (
        v_simulation_id,
        p_participant_user_ids[i],
        COALESCE(p_participant_roles[i], 'student')::simulation_role,
        auth.uid()
      );
      
      -- Add to tenant_users for RLS access to simulation tenant data
      -- Map simulation roles to valid tenant_users roles: instructor→admin, student→nurse
      INSERT INTO tenant_users (user_id, tenant_id, is_active, role)
      VALUES (
        p_participant_user_ids[i], 
        v_simulation_tenant_id, 
        true,
        CASE COALESCE(p_participant_roles[i], 'student')
          WHEN 'instructor' THEN 'admin'
          WHEN 'student' THEN 'nurse'
          ELSE 'nurse'
        END
      )
      ON CONFLICT ON CONSTRAINT tenant_users_tenant_id_user_id_key DO UPDATE
        SET is_active = true;
    END LOOP;
    
    RAISE NOTICE '✅ Added % participants to simulation with tenant access', array_length(p_participant_user_ids, 1);
  END IF;

  RETURN QUERY SELECT 
    v_simulation_id AS simulation_id,
    v_simulation_tenant_id AS tenant_id,
    format('Simulation "%s" launched successfully with %s patients', p_name, v_patient_count) AS message;
END;
$$;


ALTER FUNCTION "public"."launch_simulation"("p_template_id" "uuid", "p_name" "text", "p_duration_minutes" integer, "p_participant_user_ids" "uuid"[], "p_participant_roles" "text"[], "p_primary_categories" "text"[], "p_sub_categories" "text"[], "p_state_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."launch_simulation"("p_template_id" "uuid", "p_name" "text", "p_duration_minutes" integer, "p_participant_user_ids" "uuid"[], "p_participant_roles" "text"[], "p_primary_categories" "text"[], "p_sub_categories" "text"[], "p_state_id" "uuid") IS 'Launches a new active simulation from a template (or one of its named states). Re-bases the snapshot''s wall-clock timestamps (I&O/vitals/orders/meds/etc.) to land relative to the launch instant instead of the template''s original build date.';



CREATE OR REPLACE FUNCTION "public"."load_template_state"("p_template_id" "uuid", "p_state_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_tenant_id uuid;
  v_snapshot jsonb;
  v_table_record record;
  v_result jsonb;
  v_tables_cleared integer := 0;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM simulation_templates WHERE id = p_template_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;

  -- Caller must have editing access to this template's tenant (mirrors the
  -- tenant_users check used by enterTemplateTenant()/the states RLS policies).
  IF NOT (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = v_tenant_id AND tu.user_id = auth.uid() AND tu.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'coordinator', 'admin')
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to edit this template';
  END IF;

  IF p_state_id IS NULL THEN
    -- Discard path: reload the template's own default snapshot
    SELECT snapshot_data INTO v_snapshot
    FROM simulation_templates
    WHERE id = p_template_id;

    IF v_snapshot IS NULL THEN
      RAISE EXCEPTION 'This template has no saved snapshot yet — nothing to discard back to';
    END IF;
  ELSE
    SELECT snapshot_data INTO v_snapshot
    FROM simulation_template_states
    WHERE id = p_state_id AND template_id = p_template_id;

    IF v_snapshot IS NULL THEN
      RAISE EXCEPTION 'Template state not found or does not belong to this template: %', p_state_id;
    END IF;
  END IF;

  RAISE NOTICE '🔄 Loading state % into template tenant % for editing', p_state_id, v_tenant_id;

  -- STEP 1: Clear patient_id-only tables (no tenant_id column) BEFORE patients
  -- are deleted below, same discovery criteria save_template_state() uses to
  -- capture them — keeps this in sync automatically as new clinical tables
  -- are added, without needing a hand-maintained delete list.
  FOR v_table_record IN
    SELECT DISTINCT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public'
    AND c.column_name = 'patient_id'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'simulation_%'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns c2
      WHERE c2.table_name = t.table_name AND c2.column_name = 'tenant_id'
    )
  LOOP
    EXECUTE format(
      'DELETE FROM %I WHERE patient_id IN (SELECT id FROM patients WHERE tenant_id = $1)',
      v_table_record.table_name
    ) USING v_tenant_id;
    v_tables_cleared := v_tables_cleared + 1;
  END LOOP;

  -- STEP 2: Clear all tenant_id-scoped tables (patients last, since STEP 1
  -- above still needs them to resolve patient_id -> tenant_id).
  FOR v_table_record IN
    SELECT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public'
    AND c.column_name = 'tenant_id'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'simulation_%'
    AND t.table_name NOT IN ('tenant_users', 'programs')
    ORDER BY CASE WHEN t.table_name = 'patients' THEN 2 ELSE 1 END
  LOOP
    EXECUTE format('DELETE FROM %I WHERE tenant_id = $1', v_table_record.table_name) USING v_tenant_id;
    v_tables_cleared := v_tables_cleared + 1;
  END LOOP;

  RAISE NOTICE '🗑️  Cleared % tables in template tenant before restoring state', v_tables_cleared;

  -- STEP 3: Restore the named state's snapshot fresh. Unlike an active
  -- simulation reset, template barcodes aren't load-bearing (real barcodes
  -- are only assigned when a simulation is launched from this template), so
  -- this intentionally does NOT preserve barcodes — same behavior as
  -- importing a template from an export package.
  SELECT restore_snapshot_to_tenant(
    p_tenant_id := v_tenant_id,
    p_snapshot := v_snapshot
  ) INTO v_result;

  RAISE NOTICE '✅ State loaded for editing: %', jsonb_pretty(v_result);

  RETURN jsonb_build_object(
    'success', true,
    'template_id', p_template_id,
    'state_id', p_state_id,
    'restore_details', v_result
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error loading template state: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'message', SQLERRM
  );
END;
$_$;


ALTER FUNCTION "public"."load_template_state"("p_template_id" "uuid", "p_state_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."load_template_state"("p_template_id" "uuid", "p_state_id" "uuid") IS 'Loads a named template state (simulation_template_states) into the template''s own tenant, replacing current live data, so an instructor can edit that state via the normal template editing flow. p_state_id NULL reloads the template''s own default snapshot instead (discard-changes path). Does not preserve barcodes (not load-bearing for templates — real barcodes are assigned on simulation launch).';



CREATE OR REPLACE FUNCTION "public"."mark_welcome_seen"() RETURNS timestamp with time zone
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_seen_at TIMESTAMPTZ := NOW();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE user_profiles
  SET welcome_seen_at = v_seen_at,
      updated_at = v_seen_at
  WHERE id = auth.uid();

  RETURN v_seen_at;
END;
$$;


ALTER FUNCTION "public"."mark_welcome_seen"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."move_patient_to_tenant"("p_source_patient_id" "text", "p_target_tenant_id" "uuid") RETURNS TABLE("patient_id" "uuid", "patient_identifier" character varying, "records_updated" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_patient_uuid UUID;
    v_patient_identifier VARCHAR(255);
    v_vitals_count INTEGER := 0;
    v_medications_count INTEGER := 0;
BEGIN
    -- Get patient UUID and identifier
    SELECT id, patients.patient_id INTO v_patient_uuid, v_patient_identifier
    FROM patients 
    WHERE patients.patient_id = p_source_patient_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Patient not found with patient_id: %', p_source_patient_id;
    END IF;
    
    -- Update patient tenant
    UPDATE patients 
    SET tenant_id = p_target_tenant_id,
        updated_at = NOW()
    WHERE id = v_patient_uuid;
    
    -- Update vitals tenant
    UPDATE patient_vitals 
    SET tenant_id = p_target_tenant_id
    WHERE patient_id = v_patient_uuid;
    
    GET DIAGNOSTICS v_vitals_count = ROW_COUNT;
    
    -- Update medications tenant
    UPDATE patient_medications 
    SET tenant_id = p_target_tenant_id
    WHERE patient_id = v_patient_uuid;
    
    GET DIAGNOSTICS v_medications_count = ROW_COUNT;
    
    -- Return results
    RETURN QUERY SELECT 
        v_patient_uuid,
        v_patient_identifier,
        jsonb_build_object(
            'vitals_updated', v_vitals_count,
            'medications_updated', v_medications_count
        );
END;
$$;


ALTER FUNCTION "public"."move_patient_to_tenant"("p_source_patient_id" "text", "p_target_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."move_patient_to_tenant"("p_patient_id" "uuid", "p_target_tenant_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
    UPDATE patients 
    SET tenant_id = p_target_tenant_id, updated_at = NOW()
    WHERE id = p_patient_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Patient not found';
    END IF;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."move_patient_to_tenant"("p_patient_id" "uuid", "p_target_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_medication_identifiers"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF OLD.id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'Cannot change medication ID! Barcodes depend on this ID.';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_medication_identifiers"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."protect_medication_identifiers"() IS 'Protects medication IDs from changes to preserve barcode validity';



CREATE OR REPLACE FUNCTION "public"."protect_patient_identifiers"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF OLD.patient_id IS DISTINCT FROM NEW.patient_id THEN
    RAISE EXCEPTION 'Cannot change patient_id! Pre-printed labels depend on this ID.';
  END IF;
  IF OLD.id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'Cannot change patient UUID!';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_patient_identifiers"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."protect_patient_identifiers"() IS 'Protects patient_id from changes to preserve pre-printed label validity';



CREATE OR REPLACE FUNCTION "public"."protect_super_admin_role"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only block the change if:
  -- 1. The role is being changed FROM super_admin
  -- 2. The user making the change is NOT a super_admin themselves
  IF OLD.role = 'super_admin' AND NEW.role != 'super_admin' THEN
    -- Check if the current user is a super_admin
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = 'super_admin'
    ) THEN
      RAISE EXCEPTION 'Cannot change role of super_admin users';
    END IF;
    
    -- Log the change for audit purposes
    RAISE NOTICE 'Super admin % changed role from % to % by %', 
      OLD.id, OLD.role, NEW.role, auth.uid();
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_super_admin_role"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."protect_super_admin_role"() IS 'Prevents non-super-admins from changing super_admin roles, but allows super_admins to demote other super_admins. Includes audit logging for security compliance.';



CREATE OR REPLACE FUNCTION "public"."reactivate_user"("target_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- Check permissions
  SELECT role INTO current_user_role
  FROM user_profiles WHERE id = auth.uid();
  
  IF current_user_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to reactivate users';
  END IF;
  
  -- Reactivate user
  UPDATE user_profiles 
  SET is_active = true, updated_at = NOW()
  WHERE id = target_user_id;
  
  RETURN 'User reactivated successfully';
END;
$$;


ALTER FUNCTION "public"."reactivate_user"("target_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reassign_user_tenant"("p_user_id" "uuid", "p_new_tenant_id" "uuid", "p_role" "text" DEFAULT 'nurse'::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_existing_count integer;
  v_deleted_count integer;
BEGIN
  -- Verify the caller is a super_admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Only super admins can reassign user tenants';
  END IF;

  -- Verify the target user exists
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Verify the target tenant exists
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_new_tenant_id) THEN
    RAISE EXCEPTION 'Tenant not found: %', p_new_tenant_id;
  END IF;

  -- Count existing tenant assignments
  SELECT COUNT(*) INTO v_existing_count
  FROM tenant_users
  WHERE user_id = p_user_id;

  -- Delete all existing tenant assignments for this user
  DELETE FROM tenant_users
  WHERE user_id = p_user_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Insert the new tenant assignment
  INSERT INTO tenant_users (user_id, tenant_id, is_active, role)
  VALUES (p_user_id, p_new_tenant_id, true, p_role)
  ON CONFLICT (user_id, tenant_id) DO UPDATE
  SET is_active = true, role = EXCLUDED.role;

  RAISE NOTICE 'User % reassigned from % tenants to tenant %', 
    p_user_id, v_deleted_count, p_new_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'new_tenant_id', p_new_tenant_id,
    'previous_tenant_count', v_existing_count,
    'deleted_count', v_deleted_count
  );
END;
$$;


ALTER FUNCTION "public"."reassign_user_tenant"("p_user_id" "uuid", "p_new_tenant_id" "uuid", "p_role" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reassign_user_tenant"("p_user_id" "uuid", "p_new_tenant_id" "uuid", "p_role" "text") IS 'Reassigns a user to a different tenant. Uses SECURITY DEFINER to bypass RLS. 
Only callable by super_admins. Removes all existing tenant assignments and creates a new one.';



CREATE OR REPLACE FUNCTION "public"."refresh_user_tenant_cache"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Refresh the materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_tenant_cache;
END;
$$;


ALTER FUNCTION "public"."refresh_user_tenant_cache"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_user_from_tenant"("tenant_uuid" "uuid", "user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    UPDATE public.tenant_users
    SET is_active = false,
        updated_at = NOW()
    WHERE tenant_id = tenant_uuid
    AND user_id = user_uuid;
    
    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."remove_user_from_tenant"("tenant_uuid" "uuid", "user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_run"("p_run_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_deleted_counts JSONB;
    v_vitals_count INTEGER;
    v_med_admin_count INTEGER; 
    v_alert_ack_count INTEGER;
    v_notes_count INTEGER;
    v_tenant_check UUID;
BEGIN
    -- Verify run exists and user has access (RLS will enforce this but let's be explicit)
    SELECT st.tenant_id INTO v_tenant_check
    FROM sim_runs sr
    JOIN sim_snapshots ss ON ss.id = sr.snapshot_id
    JOIN sim_templates st ON st.id = ss.template_id
    WHERE sr.id = p_run_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Run not found or access denied: %', p_run_id;
    END IF;
    
    -- Prevent concurrent writes during reset with advisory lock
    -- Use a unique lock ID based on the run_id
    PERFORM pg_advisory_xact_lock(
        ('x' || substr(md5('sim_run:' || p_run_id::text), 1, 16))::bit(64)::bigint
    );
    
    -- Delete ONLY event data (student-entered changes)
    -- DO NOT touch sim_run_patients or sim_run_barcode_pool (preserves printed IDs)
    
    DELETE FROM sim_run_vitals_events WHERE run_id = p_run_id;
    GET DIAGNOSTICS v_vitals_count = ROW_COUNT;
    
    DELETE FROM sim_run_med_admin_events WHERE run_id = p_run_id;
    GET DIAGNOSTICS v_med_admin_count = ROW_COUNT;
    
    DELETE FROM sim_run_alert_acks WHERE run_id = p_run_id;
    GET DIAGNOSTICS v_alert_ack_count = ROW_COUNT;
    
    DELETE FROM sim_run_notes WHERE run_id = p_run_id;
    GET DIAGNOSTICS v_notes_count = ROW_COUNT;
    
    -- Delete lab orders created during run
    DELETE FROM lab_orders lo
    USING sim_run_patients rp, patients p
    WHERE lo.patient_id = p.id
    AND p.patient_id = rp.public_patient_id
    AND rp.run_id = p_run_id;
    
    -- Delete hacmap markers created during run  
    DELETE FROM hacmap_markers hm
    USING sim_run_patients rp, patients p
    WHERE hm.patient_id = p.id
    AND p.patient_id = rp.public_patient_id
    AND rp.run_id = p_run_id;
    
    -- Update run status and timestamp
    UPDATE sim_runs 
    SET updated_at = NOW()
    WHERE id = p_run_id;
    
    -- Prepare result summary
    v_deleted_counts := jsonb_build_object(
        'vitals_events', v_vitals_count,
        'med_admin_events', v_med_admin_count,
        'alert_acknowledgments', v_alert_ack_count,
        'notes', v_notes_count,
        'total_deleted', v_vitals_count + v_med_admin_count + v_alert_ack_count + v_notes_count,
        'reset_at', NOW(),
        'run_id', p_run_id
    );
    
    -- Send notification for real-time updates
    PERFORM pg_notify('sim_run_reset', p_run_id::text);
    
    -- Log the reset action (optional - could be in a separate audit table)
    INSERT INTO sim_run_notes (
        run_id,
        run_patient_id,
        note_type,
        author_id,
        author_role,
        title,
        content
    ) VALUES (
        p_run_id,
        NULL, -- System note, not patient-specific
        'system',
        auth.uid(),
        'system',
        'Simulation Reset',
        format('Reset completed. Deleted: %s vitals, %s med admins, %s alert acks, %s notes',
               v_vitals_count, v_med_admin_count, v_alert_ack_count, v_notes_count)
    );
    
    RETURN v_deleted_counts;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and re-raise
        RAISE EXCEPTION 'Reset failed for run %: %', p_run_id, SQLERRM;
END;
$$;


ALTER FUNCTION "public"."reset_run"("p_run_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reset_run"("p_run_id" "uuid") IS 'Resets simulation by deleting only event data, preserving printed IDs';



CREATE OR REPLACE FUNCTION "public"."reset_simulation_for_next_session"("p_simulation_id" "uuid", "p_state_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id uuid;
  v_template_id uuid;
  v_snapshot jsonb;
  v_snapshot_anchor timestamptz;
  v_snapshot_original jsonb;  -- Keep original snapshot with medications
  v_duration_minutes integer;
  v_result jsonb;
  v_patient_barcodes jsonb := '{}'::jsonb;
  v_patient_id uuid;
  v_barcode text;
  v_count integer;
  v_stats jsonb := '{}'::jsonb;
BEGIN
  RAISE NOTICE '🔄 Starting session reset for simulation: %', p_simulation_id;
  
  -- Get simulation details
  SELECT 
    sa.tenant_id,
    sa.template_id,
    sa.duration_minutes,
    st.snapshot_data,
    st.snapshot_taken_at
  INTO 
    v_tenant_id,
    v_template_id,
    v_duration_minutes,
    v_snapshot,
    v_snapshot_anchor
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  WHERE sa.id = p_simulation_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;

  -- If a named state was requested, use its snapshot instead of the template's default
  IF p_state_id IS NOT NULL THEN
    SELECT snapshot_data, updated_at INTO v_snapshot, v_snapshot_anchor
    FROM simulation_template_states
    WHERE id = p_state_id AND template_id = v_template_id;

    IF v_snapshot IS NULL THEN
      RAISE EXCEPTION 'Template state not found or does not belong to this simulation''s template: %', p_state_id;
    END IF;

    RAISE NOTICE '📦 Using named state % for reset', p_state_id;
  END IF;

  -- Re-base wall-clock timestamps (I&O, vitals, orders, medication history, etc.)
  -- so they land relative to THIS reset instead of the template/state's original
  -- build date.
  v_snapshot := shift_snapshot_timestamps(v_snapshot, now() - v_snapshot_anchor);

  -- Save original snapshot (before we remove medications)
  v_snapshot_original := v_snapshot;

  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Template has no snapshot data';
  END IF;

  RAISE NOTICE '✅ Found simulation - tenant: %, template: %', v_tenant_id, v_template_id;
  
  -- =====================================================
  -- STEP 1: SAVE PATIENT & MEDICATION BARCODE IDs (CRITICAL!)
  -- =====================================================
  -- These are printed on labels and CANNOT change
  
  -- Save patient barcodes
  FOR v_patient_id, v_barcode IN 
    SELECT id, patient_id 
    FROM patients 
    WHERE tenant_id = v_tenant_id
    ORDER BY created_at
  LOOP
    v_patient_barcodes := v_patient_barcodes || jsonb_build_object(v_patient_id::text, v_barcode);
    RAISE NOTICE '💾 Saving patient barcode: % has barcode %', v_patient_id, v_barcode;
  END LOOP;
  


  -- =====================================================
  -- STEP 2: DELETE STUDENT WORK (preserve medications!)
  -- =====================================================
  -- Delete student-added data but KEEP medications (preserve UUIDs for barcodes)
  
  DELETE FROM medication_administrations WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % medication administrations', v_count;
  
  -- 🆕 DON'T delete medications - preserve them like we preserve patients!
  -- DELETE FROM patient_medications WHERE tenant_id = v_tenant_id;
  RAISE NOTICE '💊 Preserving medications (like patients) - UUIDs and barcodes stay consistent';
  
  -- 🔄 Reset medication administration timing (for back-to-back sessions)
  UPDATE patient_medications
  SET last_administered = NULL
  WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🔄 Reset % medication administration times for new session', v_count;
  
  DELETE FROM patient_vitals WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % vitals', v_count;
  
  DELETE FROM patient_neuro_assessments WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % neuro assessments', v_count;
  
  DELETE FROM patient_notes WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % notes', v_count;
  
  DELETE FROM patient_alerts WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % alerts', v_count;
  
  DELETE FROM patient_images WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % images', v_count;
  
  DELETE FROM wound_assessments WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % wound assessments', v_count;
  
  DELETE FROM device_assessments WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % device assessments', v_count;
  
  DELETE FROM lab_results WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % lab results', v_count;
  
  DELETE FROM lab_panels WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % lab panels', v_count;
  
  DELETE FROM patient_bbit_entries WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % BBIT entries', v_count;
  
  DELETE FROM patient_newborn_assessments WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % newborn assessments', v_count;

  -- 📋 Flowsheet system assessments: delete ONLY student entries.
  -- Instructor-set baseline entries (is_baseline = true) survive the reset so
  -- that clinical context (e.g. "patient has chronic pain, baseline 7/10")
  -- is still visible to students in the next session.
  DELETE FROM patient_system_assessments
  WHERE tenant_id = v_tenant_id
    AND is_baseline = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % system assessments (student entries only, baseline preserved)', v_count;

  -- 🧩 TR module tables: delete student entries, preserve instructor baselines
  DELETE FROM tr_screening_entries WHERE tenant_id = v_tenant_id AND is_baseline = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % TR screening entries (student only)', v_count;

  DELETE FROM tr_active_living_profiles WHERE tenant_id = v_tenant_id AND is_baseline = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % TR active living profiles (student only)', v_count;

  DELETE FROM tr_assessment_scores WHERE tenant_id = v_tenant_id AND is_baseline = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % TR assessment scores (student only)', v_count;

  DELETE FROM tr_treatment_plan_rows WHERE tenant_id = v_tenant_id AND is_baseline = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % TR treatment plan rows (student only)', v_count;

  DELETE FROM tr_interdisciplinary_interps WHERE tenant_id = v_tenant_id AND is_baseline = false;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % TR interdisciplinary interpretations (student only)', v_count;

  DELETE FROM tr_progress_notes WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % TR progress notes', v_count;

  DELETE FROM doctors_orders WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % doctors orders', v_count;
  
  DELETE FROM handover_notes WHERE patient_id::uuid IN (SELECT id FROM patients WHERE tenant_id = v_tenant_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % handover notes', v_count;
  
  DELETE FROM patient_advanced_directives WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % advanced directives', v_count;
  
  DELETE FROM patient_admission_records WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % admission records', v_count;
  
  DELETE FROM lab_orders WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % lab orders', v_count;
  
  DELETE FROM bowel_records WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % bowel records', v_count;
  
  -- Try tenant_id first, fall back to patient_id if column doesn't exist
  BEGIN
    DELETE FROM patient_intake_output_events WHERE tenant_id = v_tenant_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️  Deleted % intake/output events (via tenant_id)', v_count;
  EXCEPTION WHEN undefined_column THEN
    DELETE FROM patient_intake_output_events WHERE patient_id IN (SELECT id FROM patients WHERE tenant_id = v_tenant_id);
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '🗑️  Deleted % intake/output events (via patient_id)', v_count;
  END;
  
  -- Delete baseline items too (will be restored from snapshot)
  DELETE FROM wounds WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % wounds', v_count;
  
  DELETE FROM devices WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % devices', v_count;
  
  DELETE FROM avatar_locations WHERE tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '🗑️  Deleted % avatar locations', v_count;
  
  RAISE NOTICE '✅ All data deleted (except patients and medications)';

  -- =====================================================
  -- STEP 3: RESTORE FROM SNAPSHOT WITH BARCODE PRESERVATION
  -- =====================================================
  -- Remove medications from snapshot - they're preserved like patients
  -- KEEP patients in snapshot - restore function needs them to build patient mapping!
  v_snapshot := v_snapshot - 'patient_medications';
  RAISE NOTICE '💊 Removed medications from snapshot (preserved with their UUIDs)';

  -- Remove system assessments from snapshot - baseline rows are preserved
  -- in-place (is_baseline = true), so restoring from snapshot would duplicate them.
  v_snapshot := v_snapshot - 'patient_system_assessments';
  RAISE NOTICE '📋 Removed system assessments from snapshot (baseline rows preserved in-place)';

  -- Strip TR tables from snapshot — baseline rows preserved in-place
  v_snapshot := v_snapshot - 'tr_screening_entries';
  v_snapshot := v_snapshot - 'tr_active_living_profiles';
  v_snapshot := v_snapshot - 'tr_assessment_scores';
  v_snapshot := v_snapshot - 'tr_treatment_plan_rows';
  v_snapshot := v_snapshot - 'tr_interdisciplinary_interps';
  v_snapshot := v_snapshot - 'tr_progress_notes';
  RAISE NOTICE '🧩 Removed TR module tables from snapshot (baseline rows preserved in-place)';

  RAISE NOTICE '👥 Keeping patients in snapshot for ID mapping (will not create new patients due to preserve_barcodes flag)';
  
  -- Restore all baseline data, mapping to existing patients
  SELECT restore_snapshot_to_tenant(
    p_tenant_id := v_tenant_id,
    p_snapshot := v_snapshot,
    p_barcode_mappings := v_patient_barcodes,
    p_preserve_barcodes := true
  ) INTO v_result;
  
  RAISE NOTICE '✅ Restored snapshot with preserved barcodes';
  RAISE NOTICE '📊 Restore result: %', jsonb_pretty(v_result);
  RAISE NOTICE '💊 Medications preserved unchanged (like patients) - UUIDs and barcodes stay consistent';

  -- =====================================================
  -- STEP 4: SET STATUS TO PENDING (Ready to start, NOT auto-start)
  -- =====================================================
  
  UPDATE simulation_active
  SET
    status = 'pending',
    starts_at = NULL,
    ends_at = NULL,
    completed_at = NULL,
    current_state_id = p_state_id,
    updated_at = NOW()
  WHERE id = p_simulation_id;
  
  RAISE NOTICE '✅ Status set to PENDING - simulation ready to start manually';
  RAISE NOTICE '⏱️  Timer will be set when instructor clicks Play';

  -- =====================================================
  -- STEP 5: LOG THE RESET
  -- =====================================================
  
  INSERT INTO simulation_activity_log (
    simulation_id,
    user_id,
    action_type,
    action_details,
    notes
  )
  VALUES (
    p_simulation_id,
    auth.uid(),
    'simulation_reset',
    v_result,
    CASE WHEN p_state_id IS NOT NULL
      THEN format('Simulation reset to template state %s - status set to pending, ready for manual start', p_state_id)
      ELSE 'Simulation reset for next session - status set to pending, ready for manual start'
    END
  );

  RAISE NOTICE '🎉 Session reset complete! Simulation ready to start.';
  
  -- Return success with pending status message and detailed restore info
  RETURN jsonb_build_object(
    'success', true,
    'simulation_id', p_simulation_id,
    'status', 'pending',
    'state_id', p_state_id,
    'message', 'Simulation reset successfully. Click Play to start when ready.',
    'restore_details', v_result,
    'restored_counts', COALESCE(v_result->'restored_counts', '{}'::jsonb),
    'patients_preserved', (SELECT COUNT(*) FROM patients WHERE tenant_id = v_tenant_id),
    'medications_preserved', (SELECT COUNT(*) FROM patient_medications WHERE tenant_id = v_tenant_id)
  );

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Error during reset: %', SQLERRM;
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$;


ALTER FUNCTION "public"."reset_simulation_for_next_session"("p_simulation_id" "uuid", "p_state_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reset_simulation_for_next_session"("p_simulation_id" "uuid", "p_state_id" "uuid") IS 'Reset simulation for next session - preserves patient/medication barcodes, sets status to pending (manual start required). Optional p_state_id resets into a named template state instead of the template''s default snapshot. Re-bases snapshot wall-clock timestamps to land relative to the reset instant.';



CREATE OR REPLACE FUNCTION "public"."reset_simulation_with_template_updates"("p_simulation_id" "uuid", "p_state_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tenant_id uuid;
  v_template_id uuid;
  v_snapshot jsonb;
  v_snapshot_anchor timestamptz;
  v_duration_minutes integer;
  v_result jsonb;
  v_patient_barcodes jsonb := '{}'::jsonb;
  v_restore_barcodes jsonb := '{}'::jsonb;
  v_patient_id uuid;
  v_barcode text;
  v_count integer;
  v_template_version INT;
  v_patient_comparison JSONB;
  v_template_meds JSONB;
  v_template_med JSONB;
  v_meds_added INT := 0;
  v_med_exists BOOLEAN;
  v_med_id UUID;
  v_med_record RECORD;
  v_template_med_count INT := 0;
  v_sim_med_count INT := 0;
  v_meds_removed INT := 0;
  i INT;
  v_first_name TEXT;
  v_last_name TEXT;
  v_dob TEXT;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  RAISE NOTICE '🔄 Starting template sync reset for simulation: %', p_simulation_id;
  RAISE NOTICE '═══════════════════════════════════════════════════════';
  
  -- STEP 0: Check if patient lists match (CRITICAL VALIDATION)
  SELECT compare_simulation_template_patients(p_simulation_id) INTO v_patient_comparison;
  
  IF (v_patient_comparison->>'requires_relaunch')::boolean = true THEN
    RAISE EXCEPTION 'PATIENT_LIST_CHANGED: Cannot preserve barcodes - patient list changed.';
  END IF;
  
  RAISE NOTICE '✅ Patient lists match - barcodes can be preserved';
  
  -- Get simulation details
  SELECT 
    sa.tenant_id,
    sa.template_id,
    sa.duration_minutes,
    st.snapshot_data,
    st.snapshot_version,
    st.snapshot_taken_at
  INTO 
    v_tenant_id,
    v_template_id,
    v_duration_minutes,
    v_snapshot,
    v_template_version,
    v_snapshot_anchor
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  WHERE sa.id = p_simulation_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;

  -- If a named state was requested, use its snapshot instead of the template's default
  IF p_state_id IS NOT NULL THEN
    SELECT snapshot_data, updated_at INTO v_snapshot, v_snapshot_anchor
    FROM simulation_template_states
    WHERE id = p_state_id AND template_id = v_template_id;

    IF v_snapshot IS NULL THEN
      RAISE EXCEPTION 'Template state not found or does not belong to this simulation''s template: %', p_state_id;
    END IF;

    RAISE NOTICE '📦 Using named state % for sync reset', p_state_id;
  END IF;

  -- Re-base wall-clock timestamps (I&O, vitals, orders, medication history/
  -- next_due, etc.) so they land relative to THIS reset instead of the
  -- template/state's original build date. Must happen BEFORE the medication
  -- sync loop below reads next_due/start_date/end_date off v_snapshot.
  v_snapshot := shift_snapshot_timestamps(v_snapshot, now() - v_snapshot_anchor);
  
  RAISE NOTICE '📋 Simulation Details:';
  RAISE NOTICE '  - Simulation ID: %', p_simulation_id;
  RAISE NOTICE '  - Tenant ID: %', v_tenant_id;
  RAISE NOTICE '  - Template ID: %', v_template_id;
  RAISE NOTICE '  - Template Version: %', v_template_version;
  RAISE NOTICE '  - Snapshot medications: %', jsonb_array_length(v_snapshot->'patient_medications');

  -- Build mapping: template patient UUID → barcode
  -- Extract from snapshot's patients array
  FOR i IN 0..jsonb_array_length(v_snapshot->'patients') - 1 LOOP
    v_patient_id := ((v_snapshot->'patients')->i->>'id')::uuid;
    v_barcode := (v_snapshot->'patients')->i->>'patient_id';
    v_patient_barcodes := v_patient_barcodes || jsonb_build_object(v_patient_id::text, v_barcode);
    RAISE NOTICE '🔗 Template patient % → Barcode %', v_patient_id, v_barcode;
  END LOOP;

  -- =====================================================
  -- STEP 2: DELETE STUDENT WORK (keep meds & patients!)
  -- =====================================================
  
  DELETE FROM medication_administrations WHERE tenant_id = v_tenant_id;
  UPDATE patient_medications SET last_administered = NULL WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_vitals WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_neuro_assessments WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_notes WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_alerts WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_images WHERE tenant_id = v_tenant_id;
  DELETE FROM wound_assessments WHERE tenant_id = v_tenant_id;
  DELETE FROM device_assessments WHERE tenant_id = v_tenant_id;
  DELETE FROM lab_results WHERE tenant_id = v_tenant_id;
  DELETE FROM lab_panels WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_bbit_entries WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_newborn_assessments WHERE tenant_id = v_tenant_id;
  DELETE FROM doctors_orders WHERE tenant_id = v_tenant_id;
  DELETE FROM handover_notes WHERE patient_id::uuid IN (SELECT id FROM patients WHERE tenant_id = v_tenant_id);
  DELETE FROM patient_advanced_directives WHERE tenant_id = v_tenant_id;
  DELETE FROM patient_admission_records WHERE tenant_id = v_tenant_id;
  DELETE FROM lab_orders WHERE tenant_id = v_tenant_id;
  DELETE FROM bowel_records WHERE tenant_id = v_tenant_id;
  DELETE FROM wounds WHERE tenant_id = v_tenant_id;
  DELETE FROM devices WHERE tenant_id = v_tenant_id;
  DELETE FROM avatar_locations WHERE tenant_id = v_tenant_id;

  -- 📋 Flowsheet system assessments: delete ONLY student entries (was ON HOLD, now active)
  DELETE FROM patient_system_assessments WHERE tenant_id = v_tenant_id AND is_baseline = false;

  -- 🧩 TR module tables: delete student entries, preserve instructor baselines
  DELETE FROM tr_screening_entries WHERE tenant_id = v_tenant_id AND is_baseline = false;
  DELETE FROM tr_active_living_profiles WHERE tenant_id = v_tenant_id AND is_baseline = false;
  DELETE FROM tr_assessment_scores WHERE tenant_id = v_tenant_id AND is_baseline = false;
  DELETE FROM tr_treatment_plan_rows WHERE tenant_id = v_tenant_id AND is_baseline = false;
  DELETE FROM tr_interdisciplinary_interps WHERE tenant_id = v_tenant_id AND is_baseline = false;
  DELETE FROM tr_progress_notes WHERE tenant_id = v_tenant_id;

  -- =====================================================
  -- STEP 3: INSERT NEW MEDICATIONS (Property-based matching)
  -- =====================================================
  -- Since simulation launch creates NEW UUIDs, we can't compare by ID
  -- Instead: match by patient barcode + medication properties
  -- New meds get NEW UUIDs = NEW barcodes (print labels for these only)
  
  v_template_meds := v_snapshot->'patient_medications';
  IF v_template_meds IS NOT NULL THEN
    v_template_med_count := jsonb_array_length(v_template_meds);
    
    -- Count existing meds BEFORE sync
    SELECT COUNT(*) INTO v_sim_med_count FROM patient_medications WHERE tenant_id = v_tenant_id;
    
    RAISE NOTICE '📋 Template has % medications, simulation currently has %', v_template_med_count, v_sim_med_count;
    
    FOR i IN 0..jsonb_array_length(v_template_meds) - 1 LOOP
      v_template_med := v_template_meds->i;
      
      -- Get template patient demographics (not barcode - barcodes change!)
      SELECT 
        pat.value->>'first_name',
        pat.value->>'last_name',
        pat.value->>'date_of_birth'
      INTO v_first_name, v_last_name, v_dob
      FROM jsonb_array_elements(v_snapshot->'patients') AS pat
      WHERE (pat.value->>'id')::uuid = (v_template_med->>'patient_id')::uuid;
      
      IF v_first_name IS NULL THEN
        RAISE NOTICE '⚠️ Skipping medication % - patient UUID % not found in snapshot', 
          v_template_med->>'name', v_template_med->>'patient_id';
        CONTINUE;
      END IF;
      
      RAISE NOTICE '🔍 Medication: % (%s %s) for patient % % (DOB: %)', 
        v_template_med->>'name', v_template_med->>'dosage', v_template_med->>'route',
        v_first_name, v_last_name, v_dob;
      
      -- Find simulation patient by demographics (NOT barcode!)
      SELECT id, patient_id INTO v_patient_id, v_barcode
      FROM patients 
      WHERE tenant_id = v_tenant_id 
        AND first_name = v_first_name
        AND last_name = v_last_name
        AND date_of_birth = v_dob::date;
      
      IF v_patient_id IS NULL THEN
        RAISE NOTICE '⚠️ Skipping medication - patient % % (DOB: %) not found in simulation', 
          v_first_name, v_last_name, v_dob;
        CONTINUE;
      END IF;
      
      RAISE NOTICE '   → Mapped to simulation patient % (barcode: %)', v_patient_id, v_barcode;
      
      -- Check if medication exists by properties (name, dosage, route for this patient)
      SELECT EXISTS (
        SELECT 1 FROM patient_medications
        WHERE tenant_id = v_tenant_id 
          AND patient_id = v_patient_id
          AND name = v_template_med->>'name'
          AND dosage = v_template_med->>'dosage'
          AND route = v_template_med->>'route'
      ) INTO v_med_exists;
      
      IF NOT v_med_exists THEN
        RAISE NOTICE '➕ Adding new medication: % %mg %s for patient %', 
          v_template_med->>'name', v_template_med->>'dosage', v_template_med->>'route', v_barcode;
        
        BEGIN
          -- Insert with NEW UUID. Copy catalog_id + barcode from template so
          -- physical QR labels printed for this medication remain valid.
          INSERT INTO patient_medications (
            tenant_id, patient_id, name, dosage, route, frequency,
            admin_time, admin_times, category, start_date, end_date,
            next_due, prescribed_by, status, last_administered,
            catalog_id, barcode
          ) VALUES (
            v_tenant_id,
            v_patient_id,  -- Mapped to simulation patient
            v_template_med->>'name',
            v_template_med->>'dosage',
            v_template_med->>'route',
            v_template_med->>'frequency',
            v_template_med->>'admin_time',
            v_template_med->'admin_times',
            v_template_med->>'category',
            (v_template_med->>'start_date')::date,
            CASE WHEN v_template_med->>'end_date' IS NOT NULL 
                 THEN (v_template_med->>'end_date')::date 
                 ELSE NULL END,
            CASE WHEN v_template_med->>'next_due' IS NOT NULL 
                 THEN (v_template_med->>'next_due')::timestamptz 
                 ELSE NULL END,
            v_template_med->>'prescribed_by',
            COALESCE(v_template_med->>'status', 'active'),
            NULL,  -- last_administered
            CASE WHEN v_template_med->>'catalog_id' IS NOT NULL
                 THEN (v_template_med->>'catalog_id')::uuid
                 ELSE NULL END,
            v_template_med->>'barcode'  -- NULL for free-entry meds
          );
          
          v_meds_added := v_meds_added + 1;
          
        EXCEPTION WHEN OTHERS THEN
          RAISE NOTICE '❌ ERROR inserting medication: % - Error: %', v_template_med->>'name', SQLERRM;
        END;
      ELSE
        RAISE NOTICE '⏭️ Already exists: % for patient %', v_template_med->>'name', v_barcode;
      END IF;
    END LOOP;
    
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '📊 MEDICATION SYNC: % new medications added', v_meds_added;
    RAISE NOTICE '═══════════════════════════════════════════════════════';
  END IF;

  -- =====================================================
  -- STEP 3B: DELETE REMOVED MEDICATIONS
  -- =====================================================
  -- Find sim medications that DON'T exist in template and delete them
  -- Preserves medication_administrations (student work history)
  
  RAISE NOTICE '🔍 Checking for medications removed from template...';
  
  FOR v_med_record IN 
    SELECT pm.id, pm.name, pm.dosage, pm.route, p.first_name, p.last_name, p.date_of_birth
    FROM patient_medications pm
    JOIN patients p ON p.id = pm.patient_id
    WHERE pm.tenant_id = v_tenant_id
  LOOP
    -- Check if this medication exists in template
    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_snapshot->'patient_medications') AS med
      JOIN jsonb_array_elements(v_snapshot->'patients') AS pat 
        ON (pat.value->>'id')::uuid = (med.value->>'patient_id')::uuid
      WHERE med.value->>'name' = v_med_record.name
        AND med.value->>'dosage' = v_med_record.dosage
        AND med.value->>'route' = v_med_record.route
        AND pat.value->>'first_name' = v_med_record.first_name
        AND pat.value->>'last_name' = v_med_record.last_name
        AND (pat.value->>'date_of_birth')::date = v_med_record.date_of_birth
    ) THEN
      RAISE NOTICE '➖ Removing deleted medication: % % %s for patient % %', 
        v_med_record.name, v_med_record.dosage, v_med_record.route,
        v_med_record.first_name, v_med_record.last_name;
      
      DELETE FROM patient_medications WHERE id = v_med_record.id;
      v_meds_removed := v_meds_removed + 1;
    END IF;
  END LOOP;
  
  IF v_meds_removed > 0 THEN
    RAISE NOTICE '═══════════════════════════════════════════════════════';
    RAISE NOTICE '📊 REMOVED: % medications deleted from template', v_meds_removed;
    RAISE NOTICE '═══════════════════════════════════════════════════════';
  ELSE
    RAISE NOTICE '✅ No medications removed from template';
  END IF;

  -- =====================================================
  -- STEP 4: RESTORE OTHER DATA FROM TEMPLATE
  -- =====================================================
  
  -- Remove patient_medications from snapshot (we handled it above)
  v_snapshot := v_snapshot - 'patient_medications';

  -- Strip PSA and TR tables — baseline rows preserved in-place, restore would duplicate
  v_snapshot := v_snapshot - 'patient_system_assessments';
  v_snapshot := v_snapshot - 'tr_screening_entries';
  v_snapshot := v_snapshot - 'tr_active_living_profiles';
  v_snapshot := v_snapshot - 'tr_assessment_scores';
  v_snapshot := v_snapshot - 'tr_treatment_plan_rows';
  v_snapshot := v_snapshot - 'tr_interdisciplinary_interps';
  v_snapshot := v_snapshot - 'tr_progress_notes';

  -- Build barcode mapping for restore_snapshot_to_tenant (sim patient UUID → barcode)
  FOR v_patient_id, v_barcode IN 
    SELECT id, patient_id FROM patients WHERE tenant_id = v_tenant_id ORDER BY created_at
  LOOP
    v_restore_barcodes := v_restore_barcodes || jsonb_build_object(v_patient_id::text, v_barcode);
  END LOOP;
  
  SELECT restore_snapshot_to_tenant(
    p_tenant_id := v_tenant_id,
    p_snapshot := v_snapshot,
    p_barcode_mappings := v_restore_barcodes,
    p_preserve_barcodes := true
  ) INTO v_result;

  -- =====================================================
  -- STEP 5: UPDATE SIMULATION STATUS & LOG
  -- =====================================================
  
  UPDATE simulation_active SET
    status = 'pending',
    starts_at = NULL,
    ends_at = NULL,
    template_snapshot_version_synced = v_template_version,
    current_state_id = p_state_id,
    updated_at = NOW()
  WHERE id = p_simulation_id;
  
  -- Only log if we have an authenticated user (skip during direct SQL testing)
  IF auth.uid() IS NOT NULL THEN
    INSERT INTO simulation_activity_log (
      simulation_id, user_id, action_type, action_details, notes
    ) VALUES (
      p_simulation_id, auth.uid(), 'synced_from_template',
      jsonb_build_object(
        'template_version', v_template_version,
        'state_id', p_state_id,
        'meds_added', v_meds_added,
        'meds_removed', v_meds_removed
      ),
      format('Synced to template v%s%s: %s added, %s removed', 
        v_template_version,
        CASE WHEN p_state_id IS NOT NULL THEN format(' (state %s)', p_state_id) ELSE '' END,
        v_meds_added, v_meds_removed)
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'template_version_synced', v_template_version,
    'state_id', p_state_id,
    'medications_added', v_meds_added,
    'medications_removed', v_meds_removed,
    'template_medication_count', v_template_med_count,
    'simulation_medication_count_before', v_sim_med_count,
    'simulation_medication_count_after', v_sim_med_count + v_meds_added - v_meds_removed
  );
END;
$$;


ALTER FUNCTION "public"."reset_simulation_with_template_updates"("p_simulation_id" "uuid", "p_state_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reset_simulation_with_template_updates"("p_simulation_id" "uuid", "p_state_id" "uuid") IS 'Smart template sync: Matches medications by properties (patient+name+dosage+route), not UUIDs. Inserts NEW medications with NEW UUIDs/barcodes. Instructor prints labels for newly added medications only. Existing medication barcodes unchanged. Optional p_state_id syncs from a named template state instead of the template''s default snapshot. Re-bases snapshot wall-clock timestamps to land relative to the reset instant.';



CREATE OR REPLACE FUNCTION "public"."restore_snapshot_to_tenant"("p_tenant_id" "uuid", "p_snapshot" "jsonb", "p_id_mappings" "jsonb" DEFAULT NULL::"jsonb", "p_barcode_mappings" "jsonb" DEFAULT NULL::"jsonb", "p_preserve_barcodes" boolean DEFAULT false, "p_skip_patients" boolean DEFAULT false) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_table_name text;
  v_actual_table_name text;
  v_table_data jsonb;
  v_record jsonb;
  v_patient_mapping jsonb := '{}'::jsonb;
  v_id_mapping jsonb := '{}'::jsonb;
  v_old_patient_id uuid;
  v_new_patient_id uuid;
  v_old_id uuid;
  v_new_id uuid;
  v_count integer;
  v_count_check integer;
  v_total_records integer := 0;
  v_columns text[];
  v_placeholders text[];
  v_values text[];
  v_sql text;
  v_col record;
  i integer;
  v_array_elements text;
  v_column_type text;
  v_udt_name text;
  v_mapped_count integer;
  v_has_patient_id_unique boolean;
BEGIN
  RAISE NOTICE '🔄 Schema-agnostic restore to tenant % (skip_patients=%, preserve_barcodes=%)', 
    p_tenant_id, p_skip_patients, p_preserve_barcodes;
  
  -- =====================================================
  -- STEP 1: Build patient mapping
  -- =====================================================
  
  IF p_preserve_barcodes AND p_snapshot ? 'patients' THEN
    RAISE NOTICE '💾 Preserving patient barcodes - mapping by demographics (first/last/dob)';
    v_mapped_count := 0;
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patients')
    LOOP
      v_old_patient_id := (v_record->>'id')::uuid;
      
      -- Match by demographics – the only stable cross-tenant identifier.
      -- DO NOT use created_at ORDER + OFFSET: simulation patients all share
      -- the same created_at (inserted in one transaction), making OFFSET
      -- non-deterministic and causing cross-patient data mapping.
      SELECT id INTO v_new_patient_id
      FROM patients
      WHERE tenant_id = p_tenant_id
        AND first_name = v_record->>'first_name'
        AND last_name  = v_record->>'last_name'
        AND date_of_birth = (v_record->>'date_of_birth')::date;
      
      IF v_new_patient_id IS NULL THEN
        RAISE EXCEPTION 'Cannot map snapshot patient % % (DOB: %) — no matching patient found in simulation tenant %',
          v_record->>'first_name', v_record->>'last_name', v_record->>'date_of_birth', p_tenant_id;
      END IF;
      
      v_patient_mapping := v_patient_mapping || jsonb_build_object(v_old_patient_id::text, v_new_patient_id);
      v_id_mapping := v_id_mapping || jsonb_build_object(v_old_patient_id::text, v_new_patient_id);
      
      RAISE NOTICE '💾 Mapped snapshot patient % (% %) → existing patient % (barcode preserved)', 
        v_old_patient_id, v_record->>'first_name', v_record->>'last_name', v_new_patient_id;
      v_mapped_count := v_mapped_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Mapped % patients by demographics', v_mapped_count;
    
  ELSIF p_skip_patients AND p_id_mappings IS NOT NULL THEN
    v_patient_mapping := p_id_mappings;
    v_id_mapping := p_id_mappings;
    RAISE NOTICE '📋 Using existing patient IDs from mapping: %', jsonb_pretty(v_patient_mapping);
    
  ELSIF p_snapshot ? 'patients' THEN
    RAISE NOTICE '👤 Creating new patients...';
    v_count := 0;
    
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patients')
    LOOP
      v_old_patient_id := (v_record->>'id')::uuid;
      v_new_patient_id := gen_random_uuid();
      
      v_columns := ARRAY[]::text[];
      v_values := ARRAY[]::text[];
      
      v_columns := array_append(v_columns, 'tenant_id');
      v_values := array_append(v_values, quote_literal(p_tenant_id));
      
      v_columns := array_append(v_columns, 'id');
      v_values := array_append(v_values, quote_literal(v_new_patient_id));
      
      v_columns := array_append(v_columns, 'patient_id');
      IF p_preserve_barcodes AND p_barcode_mappings ? v_new_patient_id::text THEN
        v_values := array_append(v_values, quote_literal(p_barcode_mappings->>v_new_patient_id::text));
        RAISE NOTICE '💾 Preserving barcode for patient %: %', 
          v_new_patient_id, p_barcode_mappings->>v_new_patient_id::text;
      ELSE
        v_values := array_append(v_values, quote_literal('P' || floor(random() * 90000 + 10000)::text));
      END IF;
      
      FOR v_col IN 
        SELECT key, value 
        FROM jsonb_each(v_record)
        WHERE key NOT IN ('id', 'tenant_id', 'patient_id', 'created_at', 'updated_at')
      LOOP
        SELECT COUNT(*) INTO v_count_check
        FROM information_schema.columns
        WHERE table_name = 'patients'
        AND column_name = v_col.key
        AND table_schema = 'public';
        
        IF v_count_check = 0 THEN
          RAISE NOTICE '⚠️  Skipping patient column % - does not exist in patients table', v_col.key;
          CONTINUE;
        END IF;
        
        v_columns := array_append(v_columns, quote_ident(v_col.key));
        
        -- Handle empty arrays correctly
        IF jsonb_typeof(v_col.value) = 'array' THEN
          SELECT string_agg(quote_literal(elem), ',')
          INTO v_array_elements
          FROM jsonb_array_elements_text(v_col.value) elem;
          
          IF v_array_elements IS NULL OR v_array_elements = '' THEN
            -- Empty array - add ARRAY[]::text[]
            v_values := array_append(v_values, 'ARRAY[]::text[]');
          ELSE
            -- Non-empty array
            v_values := array_append(v_values, 'ARRAY[' || v_array_elements || ']');
          END IF;
        ELSIF v_col.value = 'null'::jsonb THEN
          v_values := array_append(v_values, 'NULL');
        ELSE
          v_values := array_append(v_values, quote_nullable(v_col.value#>>'{}'));
        END IF;
      END LOOP;
      
      v_sql := format('INSERT INTO patients (%s) VALUES (%s)',
        array_to_string(v_columns, ', '),
        array_to_string(v_values, ', ')
      );
      EXECUTE v_sql;
      
      v_patient_mapping := v_patient_mapping || jsonb_build_object(v_old_patient_id::text, v_new_patient_id);
      v_id_mapping := v_id_mapping || jsonb_build_object(v_old_patient_id::text, v_new_patient_id);
      v_count := v_count + 1;
    END LOOP;
    
    v_total_records := v_total_records + v_count;
    RAISE NOTICE '✅ Restored % patients', v_count;
  END IF;
  
  -- =====================================================
  -- STEP 2: Restore ALL other tables dynamically
  -- =====================================================
  FOR v_table_name IN 
    SELECT key as table_name
    FROM jsonb_object_keys(p_snapshot) key
    WHERE key NOT IN ('patients', 'snapshot_metadata')
    ORDER BY 
      CASE key
        WHEN 'avatar_locations' THEN 1
        WHEN 'devices' THEN 2
        WHEN 'wounds' THEN 2
        WHEN 'lab_panels' THEN 3
        WHEN 'lab_results' THEN 4
        ELSE 5
      END
  LOOP
    v_table_data := p_snapshot->v_table_name;
    
    v_actual_table_name := CASE 
      WHEN v_table_name = 'medications' THEN 'patient_medications'
      ELSE v_table_name
    END;
    
    IF jsonb_array_length(v_table_data) > 0 THEN
      RAISE NOTICE '📦 Restoring % (% records)...', v_table_name, jsonb_array_length(v_table_data);
      v_count := 0;
      
      -- Detect tables that only ever allow one row per patient (e.g.
      -- patient_advanced_directives, patient_admission_records) so the
      -- INSERT below can be made idempotent via ON CONFLICT instead of
      -- erroring when a snapshot's fallback mapping assigns two rows to
      -- the same patient.
      SELECT EXISTS (
        SELECT 1
        FROM pg_constraint c
        JOIN pg_class t ON t.oid = c.conrelid
        WHERE t.relname = v_actual_table_name
          AND c.contype = 'u'
          AND array_length(c.conkey, 1) = 1
          AND c.conkey = ARRAY[(
            SELECT a.attnum FROM pg_attribute a
            WHERE a.attrelid = t.oid AND a.attname = 'patient_id'
          )]
      ) INTO v_has_patient_id_unique;
      
      FOR v_record IN SELECT * FROM jsonb_array_elements(v_table_data)
      LOOP
        v_columns := ARRAY[]::text[];
        v_values := ARRAY[]::text[];
        
        IF v_table_name = 'devices' THEN
          RAISE NOTICE '🔧 Processing device: type=%, location_id=%', 
            v_record->>'type', v_record->>'location_id';
        END IF;
        
        v_old_id := (v_record->>'id')::uuid;
        v_new_id := gen_random_uuid();
        v_columns := array_append(v_columns, 'id');
        v_values := array_append(v_values, quote_literal(v_new_id));
        v_id_mapping := v_id_mapping || jsonb_build_object(v_old_id::text, v_new_id);
        
        IF v_record ? 'tenant_id' THEN
          v_columns := array_append(v_columns, 'tenant_id');
          v_values := array_append(v_values, quote_literal(p_tenant_id));
        END IF;
        
        IF v_record ? 'patient_id' THEN
          v_old_patient_id := (v_record->>'patient_id')::uuid;
          
          IF v_patient_mapping ? v_old_patient_id::text THEN
            v_new_patient_id := (v_patient_mapping->>v_old_patient_id::text)::uuid;
            v_columns := array_append(v_columns, 'patient_id');
            v_values := array_append(v_values, quote_literal(v_new_patient_id));
          ELSE
            DECLARE
              v_target_patient_id uuid;
              v_patients_in_template integer;
              v_patients_in_simulation integer;
            BEGIN
              SELECT jsonb_array_length(p_snapshot->'patients') INTO v_patients_in_template;
              SELECT COUNT(*) INTO v_patients_in_simulation 
              FROM patients WHERE tenant_id = p_tenant_id;
              
              IF v_patients_in_template = 1 AND v_patients_in_simulation = 1 THEN
                SELECT id INTO v_target_patient_id
                FROM patients
                WHERE tenant_id = p_tenant_id
                LIMIT 1;
                
                IF v_target_patient_id IS NOT NULL THEN
                  v_columns := array_append(v_columns, 'patient_id');
                  v_values := array_append(v_values, quote_literal(v_target_patient_id));
                ELSE
                  RAISE WARNING '⚠️ [%] No patient found in simulation tenant', v_table_name;
                  CONTINUE;
                END IF;
              ELSE
                RAISE WARNING '⚠️ [%] Skipping - template has % patients, simulation has %', 
                  v_table_name, v_patients_in_template, v_patients_in_simulation;
                CONTINUE;
              END IF;
            END;
          END IF;
        END IF;
        
        -- Copy all other columns, mapping foreign key UUIDs
        FOR v_col IN 
          SELECT key, value 
          FROM jsonb_each(v_record)
          WHERE key NOT IN ('id', 'tenant_id', 'patient_id', 'created_at', 'updated_at')
        LOOP
          -- Check if column exists in target table
          SELECT COUNT(*) INTO v_count
          FROM information_schema.columns
          WHERE table_name = v_actual_table_name
          AND column_name = v_col.key
          AND table_schema = 'public';
          
          IF v_count = 0 THEN
            -- Column doesn't exist - skip with notice
            RAISE NOTICE '⚠️  Skipping column % - does not exist in %', v_col.key, v_actual_table_name;
            CONTINUE;
          END IF;
          
          v_columns := array_append(v_columns, quote_ident(v_col.key));
          
          IF v_col.key LIKE '%_id' AND v_col.value::text ~ '^"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"$' THEN
            v_old_id := (v_col.value#>>'{}')::uuid;
            IF v_id_mapping ? v_old_id::text THEN
              v_new_id := (v_id_mapping->>v_old_id::text)::uuid;
              v_values := array_append(v_values, quote_literal(v_new_id));
              IF v_table_name = 'devices' AND v_col.key = 'location_id' THEN
                RAISE NOTICE '🗺️  Mapped device.location_id: % → %', v_old_id, v_new_id;
              END IF;
            ELSE
              v_values := array_append(v_values, quote_nullable(v_col.value#>>'{}'));
              IF v_table_name = 'devices' AND v_col.key = 'location_id' THEN
                RAISE WARNING '⚠️  Device location_id % NOT FOUND in mapping!', v_old_id;
              END IF;
            END IF;
          ELSIF jsonb_typeof(v_col.value) = 'array' THEN
            SELECT data_type, udt_name
            INTO v_column_type, v_udt_name
            FROM information_schema.columns
            WHERE table_name = v_actual_table_name
            AND column_name = v_col.key
            AND table_schema = 'public';
            
            IF v_column_type = 'jsonb' THEN
              v_values := array_append(v_values, quote_literal(v_col.value::text) || '::jsonb');
            ELSE
              SELECT string_agg(quote_literal(elem), ',')
              INTO v_array_elements
              FROM jsonb_array_elements_text(v_col.value) elem;
              
              -- Handle empty arrays correctly
              IF v_array_elements IS NULL OR v_array_elements = '' THEN
                IF v_column_type = 'ARRAY' AND v_udt_name LIKE '\_%' THEN
                  v_values := array_append(v_values, 'ARRAY[]::' || substring(v_udt_name from 2) || '[]');
                ELSE
                  v_values := array_append(v_values, 'ARRAY[]::text[]');
                END IF;
              ELSE
                IF v_column_type = 'ARRAY' AND v_udt_name LIKE '\_%' THEN
                  v_values := array_append(v_values, 'ARRAY[' || v_array_elements || ']::' || substring(v_udt_name from 2) || '[]');
                  IF v_table_name = 'devices' THEN
                    RAISE NOTICE '📋 Device ENUM array %: [%] cast to %', v_col.key, v_array_elements, substring(v_udt_name from 2) || '[]';
                  END IF;
                ELSE
                  v_values := array_append(v_values, 'ARRAY[' || v_array_elements || ']');
                  IF v_table_name = 'devices' THEN
                    RAISE NOTICE '📋 Device text array %: [%]', v_col.key, v_array_elements;
                  END IF;
                END IF;
              END IF;
            END IF;
          ELSIF jsonb_typeof(v_col.value) = 'object' THEN
            v_values := array_append(v_values, quote_literal(v_col.value::text) || '::jsonb');
          ELSIF v_col.value = 'null'::jsonb THEN
            v_values := array_append(v_values, 'NULL');
          ELSE
            SELECT data_type, udt_name
            INTO v_column_type, v_udt_name
            FROM information_schema.columns
            WHERE table_name = v_actual_table_name
            AND column_name = v_col.key
            AND table_schema = 'public';
            
            IF v_column_type = 'USER-DEFINED' THEN
              v_values := array_append(v_values, quote_nullable(v_col.value#>>'{}') || '::' || v_udt_name);
              IF v_table_name = 'devices' THEN
                RAISE NOTICE '🎯 Casting % to ENUM type %', v_col.key, v_udt_name;
              END IF;
            ELSE
              v_values := array_append(v_values, quote_nullable(v_col.value#>>'{}'));
            END IF;
          END IF;
        END LOOP;
        
        BEGIN
          IF array_length(v_columns, 1) != array_length(v_values, 1) THEN
            RAISE WARNING '❌ Column/Value mismatch in %: % columns, % values', 
              v_actual_table_name, array_length(v_columns, 1), array_length(v_values, 1);
            RAISE WARNING '📋 Columns: %', array_to_string(v_columns, ', ');
            RAISE WARNING '📋 Values: %', array_to_string(v_values, ', ');
            RAISE WARNING '📋 Record: %', v_record::text;
            CONTINUE;
          END IF;
          
          v_sql := format('INSERT INTO %I (%s) VALUES (%s)%s',
            v_actual_table_name,
            array_to_string(v_columns, ', '),
            array_to_string(v_values, ', '),
            CASE WHEN v_has_patient_id_unique THEN ' ON CONFLICT (patient_id) DO NOTHING' ELSE '' END
          );
          
          EXECUTE v_sql;
          v_count := v_count + 1;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '⚠️ Failed to insert into %: % | SQL: %', v_actual_table_name, SQLERRM, v_sql;
          RAISE WARNING '⚠️ Record data: %', v_record::text;
          RAISE WARNING '⚠️ SQLSTATE: %', SQLSTATE;
        END;
      END LOOP;
      
      v_total_records := v_total_records + v_count;
      RAISE NOTICE '✅ Restored % records to %', v_count, v_actual_table_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE '🎉 Restore complete: % total records', v_total_records;
  
  RETURN json_build_object(
    'success', true,
    'tenant_id', p_tenant_id,
    'records_restored', v_total_records,
    'message', 'Schema-agnostic restore completed'
  );
END;
$_$;


ALTER FUNCTION "public"."restore_snapshot_to_tenant"("p_tenant_id" "uuid", "p_snapshot" "jsonb", "p_id_mappings" "jsonb", "p_barcode_mappings" "jsonb", "p_preserve_barcodes" boolean, "p_skip_patients" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."restore_snapshot_to_tenant"("p_tenant_id" "uuid", "p_snapshot" "jsonb", "p_id_mappings" "jsonb", "p_barcode_mappings" "jsonb", "p_preserve_barcodes" boolean, "p_skip_patients" boolean) IS 'Restores snapshot data to a tenant. Fixed 2026-08-18: tables with a UNIQUE(patient_id) constraint (patient_advanced_directives, patient_admission_records) now use ON CONFLICT (patient_id) DO NOTHING to avoid duplicate-key failures when the fallback single-patient mapping assigns more than one snapshot row to the same patient.';



CREATE OR REPLACE FUNCTION "public"."rls_auto_enable"() RETURNS "event_trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."rls_auto_enable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."save_patient_template_snapshot"("p_patient_template_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_tenant_id uuid;
  v_snapshot jsonb := '{}'::jsonb;
  v_table_record record;
  v_table_data jsonb;
  v_count integer;
  v_total_tables integer := 0;
  v_total_records integer := 0;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM patient_templates
  WHERE id = p_patient_template_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Patient template not found: %', p_patient_template_id;
  END IF;

  -- STEP 1: tables with tenant_id
  FOR v_table_record IN
    SELECT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public'
    AND c.column_name = 'tenant_id'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'simulation_%'
    AND t.table_name <> 'patient_templates'
    AND t.table_name NOT IN ('tenant_users', 'programs')  -- Tenant admin/org metadata, not template data
    ORDER BY t.table_name
  LOOP
    EXECUTE format('
      SELECT COALESCE(jsonb_agg(to_jsonb(t.*)), ''[]''::jsonb), COUNT(*)
      FROM %I t
      WHERE t.tenant_id = $1
    ', v_table_record.table_name)
    INTO v_table_data, v_count
    USING v_tenant_id;

    IF v_count > 0 THEN
      v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
      v_total_records := v_total_records + v_count;
      v_total_tables := v_total_tables + 1;
    END IF;
  END LOOP;

  -- STEP 2: tables linked via patient_id only (no tenant_id column)
  FOR v_table_record IN
    SELECT DISTINCT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public'
    AND c.column_name = 'patient_id'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'simulation_%'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns c2
      WHERE c2.table_name = t.table_name
      AND c2.column_name = 'tenant_id'
    )
    ORDER BY t.table_name
  LOOP
    EXECUTE format('
      SELECT COALESCE(jsonb_agg(to_jsonb(t.*)), ''[]''::jsonb), COUNT(*)
      FROM %I t
      JOIN patients p ON p.id = t.patient_id
      WHERE p.tenant_id = $1
    ', v_table_record.table_name)
    INTO v_table_data, v_count
    USING v_tenant_id;

    IF v_count > 0 THEN
      v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
      v_total_records := v_total_records + v_count;
      v_total_tables := v_total_tables + 1;
    END IF;
  END LOOP;

  v_snapshot := v_snapshot || jsonb_build_object(
    'snapshot_metadata', jsonb_build_object(
      'created_at', now(),
      'created_by', auth.uid(),
      'tenant_id', v_tenant_id,
      'total_tables_scanned', v_total_tables,
      'total_records_captured', v_total_records,
      'schema_version', '2.0'
    )
  );

  UPDATE patient_templates
  SET
    snapshot_data = v_snapshot,
    snapshot_taken_at = now(),
    status = 'ready',
    updated_at = now()
  WHERE id = p_patient_template_id;

  RETURN jsonb_build_object(
    'success', true,
    'patient_template_id', p_patient_template_id,
    'tables_captured', v_total_tables,
    'records_captured', v_total_records,
    'message', 'Patient template snapshot saved successfully'
  );
END;
$_$;


ALTER FUNCTION "public"."save_patient_template_snapshot"("p_patient_template_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_patient_template_snapshot"("p_patient_template_id" "uuid") IS 'Schema-agnostic snapshot creation for patient templates. Mirrors save_template_snapshot_v2 but targets patient_templates (excludes tenant_users/programs admin metadata).';



CREATE OR REPLACE FUNCTION "public"."save_template_snapshot_v2"("p_template_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_tenant_id uuid;
  v_snapshot jsonb := '{}'::jsonb;
  v_table_record record;
  v_table_data jsonb;
  v_count integer;
  v_total_tables integer := 0;
  v_total_records integer := 0;
BEGIN
  -- Get template tenant
  SELECT tenant_id INTO v_tenant_id 
  FROM simulation_templates 
  WHERE id = p_template_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;

  RAISE NOTICE '📸 Creating dynamic snapshot for template % (tenant %)', p_template_id, v_tenant_id;
  
  -- STEP 1: Auto-discover and capture all tables with tenant_id column
  FOR v_table_record IN 
    SELECT t.table_name 
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public' 
    AND c.column_name = 'tenant_id'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'simulation_%'  -- Skip simulation system tables
    AND t.table_name NOT IN ('tenant_users', 'programs')  -- Tenant admin/org metadata, not template data
    ORDER BY t.table_name
  LOOP
    -- Dynamically capture all data from this tenant-aware table
    EXECUTE format('
      SELECT COALESCE(jsonb_agg(to_jsonb(t.*)), ''[]''::jsonb), COUNT(*)
      FROM %I t 
      WHERE t.tenant_id = $1
    ', v_table_record.table_name)
    INTO v_table_data, v_count
    USING v_tenant_id;
    
    -- Add to snapshot if there's data
    IF v_count > 0 THEN
      v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
      v_total_records := v_total_records + v_count;
      v_total_tables := v_total_tables + 1;
      RAISE NOTICE '  ✅ Captured % records from %', v_count, v_table_record.table_name;
    END IF;
  END LOOP;
  
  -- STEP 2: Auto-discover tables linked via patient_id (but no tenant_id)
  FOR v_table_record IN 
    SELECT DISTINCT t.table_name 
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public' 
    AND c.column_name = 'patient_id'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'simulation_%'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns c2 
      WHERE c2.table_name = t.table_name 
      AND c2.column_name = 'tenant_id'
    )
    ORDER BY t.table_name
  LOOP
    -- Capture data linked to patients in this tenant
    EXECUTE format('
      SELECT COALESCE(jsonb_agg(to_jsonb(t.*)), ''[]''::jsonb), COUNT(*)
      FROM %I t 
      JOIN patients p ON p.id = t.patient_id 
      WHERE p.tenant_id = $1
    ', v_table_record.table_name)
    INTO v_table_data, v_count
    USING v_tenant_id;
    
    -- Add to snapshot if there's data
    IF v_count > 0 THEN
      v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
      v_total_records := v_total_records + v_count;
      v_total_tables := v_total_tables + 1;
      RAISE NOTICE '  ✅ Captured % records from % (via patient_id)', v_count, v_table_record.table_name;
    END IF;
  END LOOP;
  
  -- Add metadata
  v_snapshot := v_snapshot || jsonb_build_object(
    'snapshot_metadata', jsonb_build_object(
      'created_at', now(),
      'created_by', auth.uid(),
      'tenant_id', v_tenant_id,
      'total_tables_scanned', v_total_tables,
      'total_records_captured', v_total_records,
      'schema_version', '2.0'
    )
  );
  
  -- Update template with new snapshot
  UPDATE simulation_templates
  SET 
    snapshot_data = v_snapshot,
    snapshot_version = snapshot_version + 1,
    snapshot_taken_at = now(),
    status = 'ready',
    updated_at = now()
  WHERE id = p_template_id;
  
  RAISE NOTICE '🎉 Dynamic snapshot complete: % tables, % total records', v_total_tables, v_total_records;
  
  RETURN jsonb_build_object(
    'success', true,
    'template_id', p_template_id,
    'snapshot_version', (SELECT snapshot_version FROM simulation_templates WHERE id = p_template_id),
    'tables_captured', v_total_tables,
    'records_captured', v_total_records,
    'message', 'Schema-agnostic snapshot created successfully'
  );
END;
$_$;


ALTER FUNCTION "public"."save_template_snapshot_v2"("p_template_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_template_snapshot_v2"("p_template_id" "uuid") IS 'Schema-agnostic snapshot creation V2. Automatically discovers and captures ALL tenant clinical/template data (excludes tenant_users/programs admin metadata). Works with future schema changes automatically.';



CREATE OR REPLACE FUNCTION "public"."save_template_state"("p_template_id" "uuid", "p_label" "text", "p_changelog_note" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_tenant_id uuid;
  v_snapshot jsonb := '{}'::jsonb;
  v_table_record record;
  v_table_data jsonb;
  v_count integer;
  v_total_tables integer := 0;
  v_total_records integer := 0;
  v_state_id uuid;
  v_state_count integer;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM simulation_templates WHERE id = p_template_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;

  IF p_label IS NULL OR trim(p_label) = '' THEN
    RAISE EXCEPTION 'A label is required to save a template state';
  END IF;

  SELECT COUNT(*) INTO v_state_count FROM simulation_template_states WHERE template_id = p_template_id;
  IF v_state_count >= 10 THEN
    RETURN jsonb_build_object('success', false, 'message', 'Maximum of 10 states per template reached');
  END IF;

  FOR v_table_record IN
    SELECT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public'
    AND c.column_name = 'tenant_id'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'simulation_%'
    AND t.table_name NOT IN ('tenant_users', 'programs')
    ORDER BY t.table_name
  LOOP
    EXECUTE format('
      SELECT COALESCE(jsonb_agg(to_jsonb(t.*)), ''[]''::jsonb), COUNT(*)
      FROM %I t
      WHERE t.tenant_id = $1
    ', v_table_record.table_name)
    INTO v_table_data, v_count
    USING v_tenant_id;

    IF v_count > 0 THEN
      v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
      v_total_records := v_total_records + v_count;
      v_total_tables := v_total_tables + 1;
    END IF;
  END LOOP;

  FOR v_table_record IN
    SELECT DISTINCT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public'
    AND c.column_name = 'patient_id'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'simulation_%'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns c2
      WHERE c2.table_name = t.table_name
      AND c2.column_name = 'tenant_id'
    )
    ORDER BY t.table_name
  LOOP
    EXECUTE format('
      SELECT COALESCE(jsonb_agg(to_jsonb(t.*)), ''[]''::jsonb), COUNT(*)
      FROM %I t
      JOIN patients p ON p.id = t.patient_id
      WHERE p.tenant_id = $1
    ', v_table_record.table_name)
    INTO v_table_data, v_count
    USING v_tenant_id;

    IF v_count > 0 THEN
      v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
      v_total_records := v_total_records + v_count;
      v_total_tables := v_total_tables + 1;
    END IF;
  END LOOP;

  v_snapshot := v_snapshot || jsonb_build_object(
    'snapshot_metadata', jsonb_build_object(
      'created_at', now(),
      'created_by', auth.uid(),
      'tenant_id', v_tenant_id,
      'total_tables_scanned', v_total_tables,
      'total_records_captured', v_total_records,
      'schema_version', '2.0'
    )
  );

  BEGIN
    INSERT INTO simulation_template_states (
      tenant_id, template_id, label, changelog_note, snapshot_data, sort_order, created_by
    ) VALUES (
      v_tenant_id, p_template_id, trim(p_label), p_changelog_note, v_snapshot, v_state_count, auth.uid()
    )
    RETURNING id INTO v_state_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'message', 'A state with that label already exists for this template');
  END;

  RETURN jsonb_build_object(
    'success', true,
    'state_id', v_state_id,
    'template_id', p_template_id,
    'label', p_label,
    'tables_captured', v_total_tables,
    'records_captured', v_total_records,
    'message', 'Template state saved successfully'
  );
END;
$_$;


ALTER FUNCTION "public"."save_template_state"("p_template_id" "uuid", "p_label" "text", "p_changelog_note" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."save_template_state"("p_template_id" "uuid", "p_label" "text", "p_changelog_note" "text") IS 'Captures the template tenant''s current clinical data as a new named state (e.g. "Week 2"), independent of the template''s default snapshot_data.';



CREATE OR REPLACE FUNCTION "public"."set_alert_tenant_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
  -- If tenant_id is not provided, get it from the patient
  IF NEW.tenant_id IS NULL THEN
    SELECT p.tenant_id INTO NEW.tenant_id
    FROM public.patients p
    WHERE p.id = NEW.patient_id;
    
    -- If patient doesn't have a tenant_id, this will fail
    IF NEW.tenant_id IS NULL THEN
      RAISE EXCEPTION 'Cannot create alert: patient has no tenant association';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_alert_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_medication_admin_tenant_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- If tenant_id is not provided, get it from the patient
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id
    FROM patients
    WHERE patient_id = NEW.patient_id;  -- Join on barcode, not UUID
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_medication_admin_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_super_admin_tenant_context"("target_tenant_id" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only super admins can set tenant context
  IF NOT public.current_user_is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can set tenant context';
  END IF;
  
  -- Validate tenant exists if target_tenant_id provided
  IF target_tenant_id IS NOT NULL THEN
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = target_tenant_id::uuid) THEN
        RAISE EXCEPTION 'Invalid tenant ID: %', target_tenant_id;
      END IF;
    EXCEPTION 
      WHEN OTHERS THEN
        -- If tenants table doesn't exist, just accept any tenant_id
        NULL;
    END;
  END IF;
  
  -- Set the context (stored in session)
  IF target_tenant_id IS NOT NULL THEN
    PERFORM set_config('app.current_tenant_id', target_tenant_id, false);
  ELSE
    PERFORM set_config('app.current_tenant_id', '', false);
  END IF;
  
  RAISE NOTICE 'Super admin tenant context set to: %', COALESCE(target_tenant_id, 'ALL_TENANTS');
END;
$$;


ALTER FUNCTION "public"."set_super_admin_tenant_context"("target_tenant_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_tenant_id_on_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
BEGIN
    -- If tenant_id is not provided, try to get it from the current user
    IF NEW.tenant_id IS NULL THEN
        NEW.tenant_id := get_user_current_tenant(auth.uid());
        
        -- If still null, raise an exception
        IF NEW.tenant_id IS NULL THEN
            RAISE EXCEPTION 'Cannot determine tenant_id for user %', auth.uid();
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_tenant_id_on_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin 
  new.updated_at = now(); 
  return new; 
end $$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_wound_assessment_tenant_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Get tenant_id from the patient
  SELECT tenant_id INTO NEW.tenant_id
  FROM patients
  WHERE id = NEW.patient_id;
  
  -- If we couldn't get tenant_id from patient, try from JWT
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := (auth.jwt() ->> 'tenant_id')::uuid;
  END IF;
  
  -- If still null, raise an error
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'Cannot determine tenant_id for wound assessment';
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_wound_assessment_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_wound_treatment_tenant_id"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.tenant_id = (SELECT tenant_id FROM patients WHERE id = NEW.patient_id);
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_wound_treatment_tenant_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."shift_snapshot_timestamps"("p_snapshot" "jsonb", "p_shift" interval) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_table_name text;
  v_actual_table_name text;
  v_shiftable_cols text[];
  v_rows jsonb;
  v_row jsonb;
  v_new_rows jsonb;
  i integer;
BEGIN
  IF p_shift IS NULL OR p_shift = interval '0' THEN
    RETURN p_snapshot;
  END IF;

  FOR v_table_name IN SELECT jsonb_object_keys(p_snapshot)
  LOOP
    IF v_table_name = 'snapshot_metadata' THEN
      CONTINUE;
    END IF;

    v_rows := p_snapshot->v_table_name;
    IF jsonb_typeof(v_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(v_rows) = 0 THEN
      CONTINUE;
    END IF;

    -- Same 'medications' -> 'patient_medications' alias restore_snapshot_to_tenant uses
    v_actual_table_name := CASE WHEN v_table_name = 'medications' THEN 'patient_medications' ELSE v_table_name END;

    SELECT array_agg(column_name) INTO v_shiftable_cols
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = v_actual_table_name
      AND data_type IN ('timestamp with time zone', 'timestamp without time zone')
      AND column_name NOT IN ('created_at', 'updated_at');

    IF v_shiftable_cols IS NULL THEN
      CONTINUE;
    END IF;

    v_new_rows := '[]'::jsonb;
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_rows)
    LOOP
      FOR i IN 1..array_length(v_shiftable_cols, 1) LOOP
        IF v_row ? v_shiftable_cols[i] AND (v_row->v_shiftable_cols[i]) IS DISTINCT FROM 'null'::jsonb THEN
          v_row := jsonb_set(
            v_row,
            ARRAY[v_shiftable_cols[i]],
            to_jsonb(((v_row->>v_shiftable_cols[i])::timestamptz + p_shift))
          );
        END IF;
      END LOOP;
      v_new_rows := v_new_rows || jsonb_build_array(v_row);
    END LOOP;

    p_snapshot := jsonb_set(p_snapshot, ARRAY[v_table_name], v_new_rows);
  END LOOP;

  RETURN p_snapshot;
END;
$$;


ALTER FUNCTION "public"."shift_snapshot_timestamps"("p_snapshot" "jsonb", "p_shift" interval) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."shift_snapshot_timestamps"("p_snapshot" "jsonb", "p_shift" interval) IS 'Shifts every timestamp/timestamptz column (except created_at/updated_at) across all tables in a snapshot JSONB by a fixed interval, preserving relative spacing. Used by launch_simulation/reset_simulation_for_next_session/reset_simulation_with_template_updates to re-base a template''s baked-in wall-clock times around the actual launch/reset instant.';



CREATE OR REPLACE FUNCTION "public"."trigger_create_program_tenant"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."trigger_create_program_tenant"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."trigger_create_program_tenant"() IS 'Trigger function that creates a program tenant when a new program is inserted';



CREATE OR REPLACE FUNCTION "public"."trigger_refresh_user_tenant_cache"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Trigger cache refresh
  PERFORM refresh_user_tenant_cache();
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."trigger_refresh_user_tenant_cache"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_bowel_records_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_bowel_records_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_contact_submissions_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_contact_submissions_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_handover_notes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_handover_notes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lab_panel_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_total_results INTEGER;
  v_acked_results INTEGER;
BEGIN
  -- Count total and acknowledged results for this panel
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE ack_at IS NOT NULL)
  INTO v_total_results, v_acked_results
  FROM lab_results
  WHERE panel_id = COALESCE(NEW.panel_id, OLD.panel_id);

  -- Update panel status
  IF v_acked_results = 0 THEN
    UPDATE lab_panels SET status = 'new' WHERE id = COALESCE(NEW.panel_id, OLD.panel_id);
  ELSIF v_acked_results < v_total_results THEN
    UPDATE lab_panels SET status = 'partial_ack' WHERE id = COALESCE(NEW.panel_id, OLD.panel_id);
  ELSE
    UPDATE lab_panels SET status = 'acknowledged' WHERE id = COALESCE(NEW.panel_id, OLD.panel_id);
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lab_panel_status"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_lab_panel_status"() IS 'Auto-update panel status when results are acknowledged';



CREATE OR REPLACE FUNCTION "public"."update_lab_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lab_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_landing_content_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_landing_content_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_medication_administrations_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_medication_administrations_updated_at"() OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_medications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid",
    "name" "text" NOT NULL,
    "dosage" "text" NOT NULL,
    "frequency" "text" NOT NULL,
    "route" "text" NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date",
    "prescribed_by" "text" NOT NULL,
    "last_administered" timestamp with time zone,
    "next_due" timestamp with time zone NOT NULL,
    "status" "text" DEFAULT 'Active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "category" "text" DEFAULT 'scheduled'::"text",
    "tenant_id" "uuid",
    "admin_time" character varying(5) DEFAULT '08:00'::character varying,
    "admin_times" "jsonb",
    "catalog_id" "uuid",
    "barcode" "text",
    CONSTRAINT "patient_medications_category_check" CHECK (("category" = ANY (ARRAY['scheduled'::"text", 'unscheduled'::"text", 'prn'::"text", 'continuous'::"text", 'diabetic'::"text", 'stat'::"text"])))
);


ALTER TABLE "public"."patient_medications" OWNER TO "postgres";


COMMENT ON COLUMN "public"."patient_medications"."category" IS 'Medication category: scheduled (default), unscheduled, prn, continuous, diabetic, stat. Defaults to scheduled for backward compatibility with snapshot restoration.';



COMMENT ON COLUMN "public"."patient_medications"."admin_time" IS 'Time of day when medication should be administered (HH:MM format)';



COMMENT ON COLUMN "public"."patient_medications"."catalog_id" IS 'FK to medications_catalog. NULL for free-entry medications.';



COMMENT ON COLUMN "public"."patient_medications"."barcode" IS 'Pre-resolved barcode string. Populated from catalog.barcode for catalog entries, or hash-generated (M{initial}{5digits}) for free-entry medications. Copied through simulation launch and reset so physical labels remain valid.';



CREATE OR REPLACE FUNCTION "public"."update_medication_super_admin"("p_medication_id" "uuid", "p_updates" "jsonb") RETURNS SETOF "public"."patient_medications"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    current_user_id UUID;
    user_role TEXT;
    update_query TEXT;
    field_name TEXT;
    field_value TEXT;
    update_fields TEXT[] := '{}';
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    -- Check if user is super admin or admin
    SELECT role INTO user_role 
    FROM user_profiles 
    WHERE id = current_user_id;
    
    -- Only allow super_admin and admin roles to use this function
    IF user_role NOT IN ('super_admin', 'admin') THEN
        RAISE EXCEPTION 'Insufficient permissions. Only super admins and admins can update cross-tenant medications.';
    END IF;

    -- Build dynamic update query from JSONB input
    FOR field_name IN SELECT jsonb_object_keys(p_updates)
    LOOP
        -- Get the field value as text
        field_value := p_updates ->> field_name;
        
        -- Add field to update list with proper escaping
        update_fields := update_fields || (quote_ident(field_name) || ' = ' || quote_literal(field_value));
    END LOOP;
    
    -- If no fields to update, return empty result
    IF array_length(update_fields, 1) IS NULL THEN
        RAISE EXCEPTION 'No valid fields provided for update';
    END IF;
    
    -- Build and execute the update query
    update_query := 'UPDATE patient_medications SET ' || array_to_string(update_fields, ', ') || 
                   ' WHERE id = ' || quote_literal(p_medication_id) || ' RETURNING *';
    
    -- Execute the update and return the result
    RETURN QUERY EXECUTE update_query;
    
    -- Note: Audit logging temporarily disabled due to table schema mismatch
    -- TODO: Fix audit_logs table structure or remove if not needed
    
END;
$$;


ALTER FUNCTION "public"."update_medication_super_admin"("p_medication_id" "uuid", "p_updates" "jsonb") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_medication_super_admin"("p_medication_id" "uuid", "p_updates" "jsonb") IS 'Allows super admins and admins to update medications across tenant boundaries, bypassing RLS';



CREATE OR REPLACE FUNCTION "public"."update_patient_intake_output_events_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_patient_intake_output_events_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_patient_notes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_patient_notes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_programs_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_programs_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_simulation_categories"("p_simulation_id" "uuid", "p_primary_categories" "text"[] DEFAULT '{}'::"text"[], "p_sub_categories" "text"[] DEFAULT '{}'::"text"[]) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Simply update the categories - doesn't affect any other simulation data
  UPDATE simulation_active
  SET 
    primary_categories = p_primary_categories,
    sub_categories = p_sub_categories,
    updated_at = NOW()
  WHERE id = p_simulation_id;
  
  IF FOUND THEN
    RAISE NOTICE 'Updated categories for simulation: %', p_simulation_id;
    RETURN TRUE;
  ELSE
    RAISE NOTICE 'Simulation not found: %', p_simulation_id;
    RETURN FALSE;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_simulation_categories"("p_simulation_id" "uuid", "p_primary_categories" "text"[], "p_sub_categories" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_simulation_categories"("p_simulation_id" "uuid", "p_primary_categories" "text"[], "p_sub_categories" "text"[]) IS 'Safely update category tags on existing active simulations';



CREATE OR REPLACE FUNCTION "public"."update_simulation_history_categories"("p_simulation_id" "uuid", "p_primary_categories" "text"[] DEFAULT '{}'::"text"[], "p_sub_categories" "text"[] DEFAULT '{}'::"text"[]) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Update the categories in simulation_history
  UPDATE simulation_history
  SET 
    primary_categories = p_primary_categories,
    sub_categories = p_sub_categories
  WHERE id = p_simulation_id;
  
  IF FOUND THEN
    RAISE NOTICE 'Updated categories for simulation in history: %', p_simulation_id;
    RETURN TRUE;
  ELSE
    RAISE NOTICE 'Simulation not found in history: %', p_simulation_id;
    RETURN FALSE;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_simulation_history_categories"("p_simulation_id" "uuid", "p_primary_categories" "text"[], "p_sub_categories" "text"[]) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_simulation_history_categories"("p_simulation_id" "uuid", "p_primary_categories" "text"[], "p_sub_categories" "text"[]) IS 'Safely update category tags on completed simulations in history';



CREATE OR REPLACE FUNCTION "public"."update_student_roster_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_student_roster_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_template_state_snapshot"("p_template_id" "uuid", "p_state_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_tenant_id uuid;
  v_snapshot jsonb := '{}'::jsonb;
  v_table_record record;
  v_table_data jsonb;
  v_count integer;
  v_total_tables integer := 0;
  v_total_records integer := 0;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM simulation_templates WHERE id = p_template_id;
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;

  IF NOT (
    EXISTS (
      SELECT 1 FROM tenant_users tu
      WHERE tu.tenant_id = v_tenant_id AND tu.user_id = auth.uid() AND tu.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('super_admin', 'coordinator', 'admin')
    )
  ) THEN
    RAISE EXCEPTION 'Not authorized to edit this template';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM simulation_template_states WHERE id = p_state_id AND template_id = p_template_id
  ) THEN
    RAISE EXCEPTION 'Template state not found or does not belong to this template: %', p_state_id;
  END IF;

  -- Capture loop identical to save_template_state() — keep both in sync if the
  -- capture criteria ever changes.
  FOR v_table_record IN
    SELECT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public'
    AND c.column_name = 'tenant_id'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'simulation_%'
    AND t.table_name NOT IN ('tenant_users', 'programs')
    ORDER BY t.table_name
  LOOP
    EXECUTE format('
      SELECT COALESCE(jsonb_agg(to_jsonb(t.*)), ''[]''::jsonb), COUNT(*)
      FROM %I t
      WHERE t.tenant_id = $1
    ', v_table_record.table_name)
    INTO v_table_data, v_count
    USING v_tenant_id;

    IF v_count > 0 THEN
      v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
      v_total_records := v_total_records + v_count;
      v_total_tables := v_total_tables + 1;
    END IF;
  END LOOP;

  FOR v_table_record IN
    SELECT DISTINCT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_schema = 'public'
    AND c.column_name = 'patient_id'
    AND t.table_type = 'BASE TABLE'
    AND t.table_name NOT LIKE 'simulation_%'
    AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns c2
      WHERE c2.table_name = t.table_name
      AND c2.column_name = 'tenant_id'
    )
    ORDER BY t.table_name
  LOOP
    EXECUTE format('
      SELECT COALESCE(jsonb_agg(to_jsonb(t.*)), ''[]''::jsonb), COUNT(*)
      FROM %I t
      JOIN patients p ON p.id = t.patient_id
      WHERE p.tenant_id = $1
    ', v_table_record.table_name)
    INTO v_table_data, v_count
    USING v_tenant_id;

    IF v_count > 0 THEN
      v_snapshot := v_snapshot || jsonb_build_object(v_table_record.table_name, v_table_data);
      v_total_records := v_total_records + v_count;
      v_total_tables := v_total_tables + 1;
    END IF;
  END LOOP;

  v_snapshot := v_snapshot || jsonb_build_object(
    'snapshot_metadata', jsonb_build_object(
      'created_at', now(),
      'created_by', auth.uid(),
      'tenant_id', v_tenant_id,
      'total_tables_scanned', v_total_tables,
      'total_records_captured', v_total_records,
      'schema_version', '2.0'
    )
  );

  UPDATE simulation_template_states
  SET snapshot_data = v_snapshot,
      updated_at = now()
  WHERE id = p_state_id AND template_id = p_template_id;

  RETURN jsonb_build_object(
    'success', true,
    'template_id', p_template_id,
    'state_id', p_state_id,
    'tables_captured', v_total_tables,
    'records_captured', v_total_records
  );
END;
$_$;


ALTER FUNCTION "public"."update_template_state_snapshot"("p_template_id" "uuid", "p_state_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_template_state_snapshot"("p_template_id" "uuid", "p_state_id" "uuid") IS 'Overwrites an existing named template state''s snapshot_data in place with the template tenant''s current live data, keeping the state''s id/label/changelog_note stable (so simulation_active.current_state_id references referencing it stay valid). Companion to load_template_state.';



CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_profile_admin"("p_user_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_role" "text", "p_department" "text" DEFAULT NULL::"text", "p_license_number" "text" DEFAULT NULL::"text", "p_phone" "text" DEFAULT NULL::"text", "p_is_active" boolean DEFAULT true, "p_simulation_only" boolean DEFAULT false) RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_result json;
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM user_profiles WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'coordinator', 'admin', 'instructor') THEN
    RAISE EXCEPTION 'Insufficient permissions to update user profiles';
  END IF;

  IF v_caller_role = 'instructor' AND p_role NOT IN ('student', 'nurse') THEN
    RAISE EXCEPTION 'Instructors may only create or update student/nurse accounts';
  END IF;

  IF v_caller_role = 'admin' AND p_role IN ('super_admin', 'coordinator') THEN
    RAISE EXCEPTION 'Admins may not assign the coordinator or super_admin role';
  END IF;

  IF v_caller_role = 'coordinator' AND p_role IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Coordinators may not assign the admin or super_admin role';
  END IF;

  -- UPSERT: create profile if it doesn't exist (e.g. trigger missed), otherwise update.
  INSERT INTO user_profiles (
    id, email, first_name, last_name, role, primary_program,
    license_number, phone, is_active, simulation_only, created_at, updated_at
  )
  SELECT
    p_user_id, COALESCE(au.email, ''), p_first_name, p_last_name, p_role::user_role,
    p_department, p_license_number, p_phone, p_is_active, p_simulation_only, NOW(), NOW()
  FROM auth.users au
  WHERE au.id = p_user_id
  ON CONFLICT (id) DO UPDATE SET
    first_name      = EXCLUDED.first_name,
    last_name       = EXCLUDED.last_name,
    role            = EXCLUDED.role,
    primary_program = EXCLUDED.primary_program,
    license_number  = EXCLUDED.license_number,
    phone           = EXCLUDED.phone,
    is_active       = EXCLUDED.is_active,
    simulation_only = EXCLUDED.simulation_only,
    updated_at      = NOW();

  SELECT json_build_object(
    'success', true,
    'user_id', p_user_id,
    'first_name', p_first_name,
    'last_name', p_last_name,
    'simulation_only', p_simulation_only
  ) INTO v_result;

  RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."update_user_profile_admin"("p_user_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_role" "text", "p_department" "text", "p_license_number" "text", "p_phone" "text", "p_is_active" boolean, "p_simulation_only" boolean) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_user_profile_admin"("p_user_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_role" "text", "p_department" "text", "p_license_number" "text", "p_phone" "text", "p_is_active" boolean, "p_simulation_only" boolean) IS 'Allows super_admin/coordinator/admin/instructor callers to update user profiles, bypassing RLS.
SECURITY: caller must already hold one of those roles; instructors are further capped to only
assign student/nurse roles, and admins/coordinators cannot assign roles above their own tier
(mirrors the role-assignment matrix already enforced client-side in UserForm.tsx).
Uses UPSERT so it creates the profile row if the on_auth_user_created trigger missed it.';



CREATE OR REPLACE FUNCTION "public"."user_has_patient_access"("patient_tenant_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  has_access boolean := false;
BEGIN
  -- Super admin can access all patients
  IF public.current_user_is_super_admin() THEN
    RETURN true;
  END IF;
  
  -- Regular users can only access patients from their assigned tenants
  SELECT EXISTS (
    SELECT 1 FROM tenant_users 
    WHERE user_id = auth.uid() 
    AND tenant_id = patient_tenant_id 
    AND is_active = true
  ) INTO has_access;
  
  RETURN has_access;
EXCEPTION
  WHEN OTHERS THEN
    -- If tenant_users doesn't exist, allow access (single tenant mode)
    RETURN true;
END;
$$;


ALTER FUNCTION "public"."user_has_patient_access"("patient_tenant_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_permission"("user_uuid" "uuid", "permission_name" "text", "tenant_uuid" "uuid" DEFAULT NULL::"uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
    -- Super admins have all permissions
    IF EXISTS (
        SELECT 1 FROM public.user_profiles 
        WHERE id = user_uuid AND role = 'super_admin'
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Tenant-specific permission checks
    IF tenant_uuid IS NOT NULL THEN
        RETURN EXISTS (
            SELECT 1
            FROM public.tenant_users tu
            JOIN public.user_profiles up ON tu.user_id = up.id
            WHERE tu.user_id = user_uuid
            AND tu.tenant_id = tenant_uuid
            AND tu.is_active = true
            AND (
                (permission_name = 'admin' AND up.role IN ('admin', 'super_admin'))
                OR (permission_name = 'read' AND up.role IN ('user', 'admin', 'super_admin'))
                OR (permission_name = 'write' AND up.role IN ('user', 'admin', 'super_admin'))
            )
        );
    END IF;
    
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."user_has_permission"("user_uuid" "uuid", "permission_name" "text", "tenant_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_program_access"("p_user_id" "uuid", "p_program_code" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."user_has_program_access"("p_user_id" "uuid", "p_program_code" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."user_has_program_access"("p_user_id" "uuid", "p_program_code" "text") IS 'Check if user is assigned to a specific program';



CREATE OR REPLACE FUNCTION "public"."user_has_tenant_access"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  user_role TEXT;
  tenant_count INTEGER;
BEGIN
  -- Check if user exists and is active
  SELECT role INTO user_role
  FROM user_profiles 
  WHERE id = auth.uid() AND is_active = true;
  
  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Super admins always have access
  IF user_role = 'super_admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Regular users must have at least one active tenant assignment
  SELECT COUNT(*) INTO tenant_count
  FROM tenant_users 
  WHERE user_id = auth.uid() AND is_active = true;
  
  RETURN tenant_count > 0;
END;
$$;


ALTER FUNCTION "public"."user_has_tenant_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_has_tenant_access"("user_uuid" "uuid", "tenant_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.tenant_users tu
    WHERE tu.user_id = user_uuid 
    AND tu.tenant_id = tenant_uuid 
    AND tu.is_active = true
  );
END;
$$;


ALTER FUNCTION "public"."user_has_tenant_access"("user_uuid" "uuid", "tenant_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_is_super_admin"("user_uuid" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.user_profiles up
    WHERE up.id = user_uuid 
    AND up.role = 'super_admin'
  );
END;
$$;


ALTER FUNCTION "public"."user_is_super_admin"("user_uuid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_subdomain"("subdomain_input" "text") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
BEGIN
  -- Validate subdomain format and availability
  IF subdomain_input IS NULL OR LENGTH(subdomain_input) < 3 THEN
    RETURN FALSE;
  END IF;
  
  -- Check if subdomain already exists
  IF EXISTS (SELECT 1 FROM tenants WHERE subdomain = subdomain_input) THEN
    RETURN FALSE;
  END IF;
  
  -- Basic validation: alphanumeric and hyphens only
  IF subdomain_input !~ '^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$_$;


ALTER FUNCTION "public"."validate_subdomain"("subdomain_input" "text") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "action" "text" NOT NULL,
    "target_id" "uuid",
    "target_type" "text" NOT NULL,
    "details" "jsonb" DEFAULT '{}'::"jsonb",
    "timestamp" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."audit_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."avatar_locations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "region_key" "text" NOT NULL,
    "x_percent" numeric NOT NULL,
    "y_percent" numeric NOT NULL,
    "free_text" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "body_view" "text",
    CONSTRAINT "avatar_locations_x_percent_check" CHECK ((("x_percent" >= (0)::numeric) AND ("x_percent" <= (100)::numeric))),
    CONSTRAINT "avatar_locations_y_percent_check" CHECK ((("y_percent" >= (0)::numeric) AND ("y_percent" <= (100)::numeric)))
);


ALTER TABLE "public"."avatar_locations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."avatar_locations"."body_view" IS 'View where marker was placed: front or back. NULL for regions visible on both views (head, arms, etc.)';



CREATE TABLE IF NOT EXISTS "public"."bowel_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "patient_id" "text" NOT NULL,
    "nurse_id" "text" NOT NULL,
    "nurse_name" "text" NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "bowel_incontinence" "text",
    "stool_appearance" "text",
    "stool_consistency" "text",
    "stool_colour" "text",
    "stool_amount" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "student_name" "text",
    CONSTRAINT "bowel_records_bowel_incontinence_check" CHECK (("bowel_incontinence" = ANY (ARRAY['Continent'::"text", 'Incontinent'::"text", 'Partial'::"text"]))),
    CONSTRAINT "bowel_records_stool_amount_check" CHECK (("stool_amount" = ANY (ARRAY['Small'::"text", 'Moderate'::"text", 'Large'::"text", 'None'::"text"]))),
    CONSTRAINT "bowel_records_stool_appearance_check" CHECK (("stool_appearance" = ANY (ARRAY['Normal'::"text", 'Abnormal'::"text", 'Blood present'::"text", 'Mucus present'::"text"]))),
    CONSTRAINT "bowel_records_stool_colour_check" CHECK (("stool_colour" = ANY (ARRAY['Brown'::"text", 'Green'::"text", 'Yellow'::"text", 'Black'::"text", 'Red'::"text", 'Clay colored'::"text"]))),
    CONSTRAINT "bowel_records_stool_consistency_check" CHECK (("stool_consistency" = ANY (ARRAY['Formed'::"text", 'Loose'::"text", 'Watery'::"text", 'Hard'::"text", 'Soft'::"text"])))
);


ALTER TABLE "public"."bowel_records" OWNER TO "postgres";


COMMENT ON TABLE "public"."bowel_records" IS 'Bowel movement records with RLS enabled for multi-tenant isolation';



COMMENT ON COLUMN "public"."bowel_records"."student_name" IS 'Full name of student who created bowel record';



CREATE TABLE IF NOT EXISTS "public"."contact_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "institution" "text",
    "message" "text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processed" boolean DEFAULT false,
    "processed_at" timestamp with time zone,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."contact_submissions" OWNER TO "postgres";


COMMENT ON TABLE "public"."contact_submissions" IS 'Stores contact form submissions from the landing page';



COMMENT ON COLUMN "public"."contact_submissions"."processed" IS 'Whether the submission has been reviewed/responded to';



CREATE TABLE IF NOT EXISTS "public"."device_assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "device_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "assessed_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "student_name" "text" NOT NULL,
    "device_type" "text" NOT NULL,
    "status" "text",
    "output_amount_ml" numeric(10,2),
    "notes" "text",
    "assessment_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."device_assessments" OWNER TO "postgres";


COMMENT ON TABLE "public"."device_assessments" IS 'Tracks device assessments over time for monitoring and documentation';



COMMENT ON COLUMN "public"."device_assessments"."device_id" IS 'Links to device being assessed';



COMMENT ON COLUMN "public"."device_assessments"."student_name" IS 'Name of student who performed the assessment (for debrief tracking)';



COMMENT ON COLUMN "public"."device_assessments"."device_type" IS 'Cached device type from devices table for quick filtering';



COMMENT ON COLUMN "public"."device_assessments"."output_amount_ml" IS 'Generic output amount for drains, tubes, catheters';



COMMENT ON COLUMN "public"."device_assessments"."assessment_data" IS 'Device-specific assessment data stored as JSONB for flexibility';



CREATE TABLE IF NOT EXISTS "public"."devices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "type" "public"."device_type_enum" DEFAULT 'closed-suction-drain'::"public"."device_type_enum" NOT NULL,
    "placement_date" "date",
    "placement_time" time without time zone,
    "placed_pre_arrival" "text",
    "inserted_by" "text",
    "tube_number" integer,
    "orientation" "public"."orientation_enum"[] DEFAULT '{}'::"public"."orientation_enum"[],
    "tube_size_fr" "text",
    "number_of_sutures_placed" integer,
    "reservoir_type" "public"."reservoir_type_enum",
    "reservoir_size_ml" integer,
    "securement_method" "text"[] DEFAULT '{}'::"text"[],
    "patient_tolerance" "text",
    "notes" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "gauge" "text",
    "site_side" "text",
    "route" "text",
    "external_length_cm" numeric(5,2),
    "initial_xray_confirmed" boolean DEFAULT false,
    "initial_ph" numeric(3,1),
    "initial_aspirate_appearance" "text",
    "placement_confirmed" boolean DEFAULT false,
    "site_location" "text",
    "ostomy_construction" "text",
    "stoma_side" "text",
    "ng_securement" "text",
    "ng_attached_to" "text",
    "ng_external_length_mm" numeric(8,1),
    "ng_residual_volume_ml" numeric(8,1),
    CONSTRAINT "devices_tube_number_check" CHECK ((("tube_number" >= 1) AND ("tube_number" <= 10)))
);


ALTER TABLE "public"."devices" OWNER TO "postgres";


COMMENT ON COLUMN "public"."devices"."gauge" IS 'IV gauge size (e.g., 18G, 20G, 22G)';



COMMENT ON COLUMN "public"."devices"."site_side" IS 'Side of body (Left/Right)';



COMMENT ON COLUMN "public"."devices"."route" IS 'Feeding tube route (NG, OG, PEG, PEJ, GJ, Other)';



COMMENT ON COLUMN "public"."devices"."external_length_cm" IS 'External length at skin in centimeters';



COMMENT ON COLUMN "public"."devices"."initial_xray_confirmed" IS 'X-ray confirmation of initial placement';



COMMENT ON COLUMN "public"."devices"."initial_ph" IS 'Initial pH check value';



COMMENT ON COLUMN "public"."devices"."initial_aspirate_appearance" IS 'Initial aspirate appearance (milky, green, clear, bloody, other)';



COMMENT ON COLUMN "public"."devices"."placement_confirmed" IS 'Placement confirmed prior to first use';



COMMENT ON COLUMN "public"."devices"."site_location" IS 'Anatomical location description (e.g., left antecubital, right forearm)';



COMMENT ON COLUMN "public"."devices"."ostomy_construction" IS 'Ostomy type: Colostomy, Ileostomy, Urostomy, Other';



COMMENT ON COLUMN "public"."devices"."stoma_side" IS 'Side of abdomen: Left, Right';



CREATE TABLE IF NOT EXISTS "public"."diabetic_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "patient_id" "text" NOT NULL,
    "recorded_by" "uuid",
    "date" "date" NOT NULL,
    "time_cbg_taken" time without time zone NOT NULL,
    "reading_type" character varying(10) NOT NULL,
    "glucose_reading" numeric(4,1) NOT NULL,
    "basal_insulin" "jsonb",
    "bolus_insulin" "jsonb",
    "correction_insulin" "jsonb",
    "other_insulin" "jsonb",
    "treatments_given" "text",
    "comments_for_physician" "text",
    "signature" character varying(255) NOT NULL,
    "prompt_frequency" character varying(10) DEFAULT 'Q6H'::character varying NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "student_name" "text",
    CONSTRAINT "diabetic_records_glucose_reading_check" CHECK ((("glucose_reading" >= (0)::numeric) AND ("glucose_reading" <= (50)::numeric))),
    CONSTRAINT "diabetic_records_reading_type_check" CHECK ((("reading_type")::"text" = ANY (ARRAY[('AC'::character varying)::"text", ('PC'::character varying)::"text", ('HS'::character varying)::"text", ('AM'::character varying)::"text", ('PRN'::character varying)::"text"])))
);


ALTER TABLE "public"."diabetic_records" OWNER TO "postgres";


COMMENT ON COLUMN "public"."diabetic_records"."student_name" IS 'Full name of student who created diabetic record';



CREATE TABLE IF NOT EXISTS "public"."doctors_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "order_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "order_time" time without time zone DEFAULT CURRENT_TIME NOT NULL,
    "order_text" "text" NOT NULL,
    "ordering_doctor" "text" NOT NULL,
    "notes" "text",
    "order_type" "text" DEFAULT 'Direct'::"text",
    "is_acknowledged" boolean DEFAULT false,
    "acknowledged_by" "uuid",
    "acknowledged_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "doctor_name" "text",
    "acknowledged_by_student" "text",
    CONSTRAINT "doctors_orders_order_type_check" CHECK (("order_type" = ANY (ARRAY['Direct'::"text", 'Phone Order'::"text", 'Verbal Order'::"text"])))
);


ALTER TABLE "public"."doctors_orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."doctors_orders" IS 'Stores physician orders with acknowledgment tracking and support for phone/verbal orders';



COMMENT ON COLUMN "public"."doctors_orders"."order_text" IS 'The actual physician order content';



COMMENT ON COLUMN "public"."doctors_orders"."order_type" IS 'Type of order: Direct (admin/super admin), Phone Order, or Verbal Order (nurses)';



COMMENT ON COLUMN "public"."doctors_orders"."is_acknowledged" IS 'Whether the order has been acknowledged by nursing staff';



COMMENT ON COLUMN "public"."doctors_orders"."doctor_name" IS 'Name of the doctor who created the order (for admin/super admin entries)';



COMMENT ON COLUMN "public"."doctors_orders"."acknowledged_by_student" IS 'Full name of student who acknowledged order';



CREATE TABLE IF NOT EXISTS "public"."handover_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "situation" "text" NOT NULL,
    "background" "text" NOT NULL,
    "assessment" "text" NOT NULL,
    "recommendations" "text" NOT NULL,
    "shift" character varying(10) NOT NULL,
    "priority" character varying(10) NOT NULL,
    "acknowledged_by" "uuid",
    "acknowledged_at" timestamp with time zone,
    "created_by_name" character varying(255) NOT NULL,
    "created_by_role" character varying(100) NOT NULL,
    "student_name" "text",
    "nursing_notes" "text",
    CONSTRAINT "handover_notes_priority_check" CHECK ((("priority")::"text" = ANY (ARRAY[('low'::character varying)::"text", ('medium'::character varying)::"text", ('high'::character varying)::"text", ('urgent'::character varying)::"text"]))),
    CONSTRAINT "handover_notes_shift_check" CHECK ((("shift")::"text" = ANY (ARRAY[('day'::character varying)::"text", ('evening'::character varying)::"text", ('night'::character varying)::"text"])))
);


ALTER TABLE "public"."handover_notes" OWNER TO "postgres";


COMMENT ON TABLE "public"."handover_notes" IS 'SBAR (Situation, Background, Assessment, Recommendations) handover notes for patient care transitions';



COMMENT ON COLUMN "public"."handover_notes"."situation" IS 'Current situation and purpose of communication';



COMMENT ON COLUMN "public"."handover_notes"."background" IS 'Relevant context and patient history';



COMMENT ON COLUMN "public"."handover_notes"."assessment" IS 'Professional clinical judgment and assessment';



COMMENT ON COLUMN "public"."handover_notes"."recommendations" IS 'Proposed actions and next steps';



COMMENT ON COLUMN "public"."handover_notes"."shift" IS 'Shift during which the handover note was created';



COMMENT ON COLUMN "public"."handover_notes"."priority" IS 'Priority level of the handover communication';



COMMENT ON COLUMN "public"."handover_notes"."student_name" IS 'Name of the student who acknowledged this handover note. Used for debrief reporting to track student activity.';



COMMENT ON COLUMN "public"."handover_notes"."nursing_notes" IS 'Free-text nursing observations, displayed above the SBAR fields in the handover form.';



CREATE TABLE IF NOT EXISTS "public"."kb_walkthroughs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "scribe_url" "text" NOT NULL,
    "category" "text",
    "display_order" integer DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "kb_walkthroughs_title_not_empty" CHECK (("btrim"("title") <> ''::"text")),
    CONSTRAINT "kb_walkthroughs_url_not_empty" CHECK (("btrim"("scribe_url") <> ''::"text"))
);


ALTER TABLE "public"."kb_walkthroughs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lab_ack_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "panel_id" "uuid" NOT NULL,
    "ack_scope" "public"."ack_scope" NOT NULL,
    "ack_by" "uuid" NOT NULL,
    "ack_at" timestamp with time zone DEFAULT "now"(),
    "abnormal_summary" "jsonb",
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "student_name" "text"
);


ALTER TABLE "public"."lab_ack_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."lab_ack_events" IS 'Audit log for lab acknowledgements';



COMMENT ON COLUMN "public"."lab_ack_events"."student_name" IS 'Name of the student who acknowledged the labs (for debrief reporting)';



CREATE TABLE IF NOT EXISTS "public"."lab_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "order_date" "date" NOT NULL,
    "order_time" time without time zone NOT NULL,
    "procedure_category" "text" NOT NULL,
    "procedure_type" "text" NOT NULL,
    "source_category" "text" NOT NULL,
    "source_type" "text" NOT NULL,
    "student_name" "text" NOT NULL,
    "verified_by" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "notes" "text",
    "label_printed" boolean DEFAULT false,
    "label_printed_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."lab_orders" OWNER TO "postgres";


COMMENT ON COLUMN "public"."lab_orders"."student_name" IS 'Full name of student who ordered lab';



CREATE TABLE IF NOT EXISTS "public"."lab_panels" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "panel_time" timestamp with time zone NOT NULL,
    "source" "text",
    "entered_by" "uuid",
    "status" "public"."lab_panel_status" DEFAULT 'new'::"public"."lab_panel_status",
    "ack_required" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "student_name" "text"
);


ALTER TABLE "public"."lab_panels" OWNER TO "postgres";


COMMENT ON TABLE "public"."lab_panels" IS 'Lab panel batches with acknowledgement tracking';



COMMENT ON COLUMN "public"."lab_panels"."student_name" IS 'Full name of student who created panel';



CREATE TABLE IF NOT EXISTS "public"."lab_result_refs" (
    "test_code" "text" NOT NULL,
    "category" "public"."lab_category" NOT NULL,
    "test_name" "text" NOT NULL,
    "units" "text",
    "ref_low" numeric(12,4),
    "ref_high" numeric(12,4),
    "ref_operator" "public"."ref_operator" DEFAULT 'between'::"public"."ref_operator",
    "sex_ref" "jsonb",
    "critical_low" numeric(12,4),
    "critical_high" numeric(12,4),
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lab_result_refs" OWNER TO "postgres";


COMMENT ON TABLE "public"."lab_result_refs" IS 'Seeded with ABG, Hematology, and Chemistry reference ranges';



COMMENT ON COLUMN "public"."lab_result_refs"."sex_ref" IS 'Sex-specific ranges in JSON format';



CREATE TABLE IF NOT EXISTS "public"."lab_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "panel_id" "uuid" NOT NULL,
    "category" "public"."lab_category" NOT NULL,
    "test_code" "text" NOT NULL,
    "test_name" "text" NOT NULL,
    "value" numeric(12,4),
    "units" "text",
    "ref_low" numeric(12,4),
    "ref_high" numeric(12,4),
    "ref_operator" "public"."ref_operator" DEFAULT 'between'::"public"."ref_operator",
    "sex_ref" "jsonb",
    "critical_low" numeric(12,4),
    "critical_high" numeric(12,4),
    "flag" "public"."lab_flag" DEFAULT 'normal'::"public"."lab_flag",
    "entered_by" "uuid",
    "entered_at" timestamp with time zone DEFAULT "now"(),
    "ack_by" "uuid",
    "ack_at" timestamp with time zone,
    "comments" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "acknowledged_by_student" "text",
    "note" "text"
);


ALTER TABLE "public"."lab_results" OWNER TO "postgres";


COMMENT ON TABLE "public"."lab_results" IS 'Individual lab test results with reference ranges';



COMMENT ON COLUMN "public"."lab_results"."flag" IS 'Auto-computed from value vs reference range';



COMMENT ON COLUMN "public"."lab_results"."acknowledged_by_student" IS 'Full name of student who acknowledged result';



COMMENT ON COLUMN "public"."lab_results"."note" IS 'Student note added when acknowledging lab result';



CREATE TABLE IF NOT EXISTS "public"."medication_administrations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "medication_id" "text",
    "patient_id" "text" NOT NULL,
    "administered_by" "text" NOT NULL,
    "administered_by_id" "text",
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "notes" "text",
    "dosage" "text",
    "route" "text",
    "status" "text" DEFAULT 'completed'::"text",
    "medication_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid" NOT NULL,
    "student_name" "text",
    "barcode_scanned" boolean DEFAULT false,
    "patient_barcode_scanned" "text",
    "medication_barcode_scanned" "text",
    "override_reason" "text",
    "witness_name" "text",
    "administered_dose" "text",
    CONSTRAINT "medication_administrations_status_check" CHECK (("status" = ANY (ARRAY['completed'::"text", 'missed'::"text", 'late'::"text", 'partial'::"text"])))
);


ALTER TABLE "public"."medication_administrations" OWNER TO "postgres";


COMMENT ON TABLE "public"."medication_administrations" IS 'Medication administration records. Can be deleted by reset_simulation_for_next_session function with SECURITY DEFINER bypass.';



COMMENT ON COLUMN "public"."medication_administrations"."student_name" IS 'Name of the student who administered the medication (for simulation tracking)';



COMMENT ON COLUMN "public"."medication_administrations"."barcode_scanned" IS 'Whether this medication was administered using barcode scanning (BCMA compliant)';



COMMENT ON COLUMN "public"."medication_administrations"."patient_barcode_scanned" IS 'The patient barcode that was scanned (for audit trail)';



COMMENT ON COLUMN "public"."medication_administrations"."medication_barcode_scanned" IS 'The medication barcode that was scanned (for audit trail)';



COMMENT ON COLUMN "public"."medication_administrations"."override_reason" IS 'Reason provided when student manually overrides barcode scanning requirement';



COMMENT ON COLUMN "public"."medication_administrations"."witness_name" IS 'Name of witness when manual override is used (for safety compliance)';



COMMENT ON COLUMN "public"."medication_administrations"."administered_dose" IS 'Volume/units drawn up and administered by the student (e.g., "2 mL"). Distinct from dosage which stores the label concentration (e.g., "500mg/2mL"). Populated via the BCMA verify step where students enter their calculated dose.';



CREATE TABLE IF NOT EXISTS "public"."medications_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "barcode" "text" NOT NULL,
    "name" "text" NOT NULL,
    "generic_name" "text",
    "formulation" "text" NOT NULL,
    "strength" "text" NOT NULL,
    "route" "text" NOT NULL,
    "category" "text" DEFAULT 'scheduled'::"text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "display_order" integer,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "medications_catalog_category_check" CHECK (("category" = ANY (ARRAY['scheduled'::"text", 'unscheduled'::"text", 'prn'::"text", 'continuous'::"text", 'diabetic'::"text", 'stat'::"text"]))),
    CONSTRAINT "medications_catalog_route_check" CHECK (("route" = ANY (ARRAY['oral'::"text", 'intravenous'::"text", 'intramuscular'::"text", 'subcutaneous'::"text", 'topical'::"text", 'inhalation'::"text", 'rectal'::"text", 'sublingual'::"text", 'nasal'::"text", 'transdermal'::"text"])))
);


ALTER TABLE "public"."medications_catalog" OWNER TO "postgres";


COMMENT ON TABLE "public"."medications_catalog" IS 'Master medication catalog. tenant_id IS NULL = global starter pack (super_admin managed). tenant_id non-null = institution-specific additions (admin/coordinator managed). Barcodes are MZ-series (MZ001–MZ020 global, MZ021+ institution additions). patient_medications.catalog_id links to this table; barcode is copied on insert and preserved through simulation launch/reset so physical QR labels are reusable.';



COMMENT ON COLUMN "public"."medications_catalog"."tenant_id" IS 'NULL = global entry managed only by super_admin. Non-null = institution addition.';



COMMENT ON COLUMN "public"."medications_catalog"."barcode" IS 'Stable QR barcode string printed on physical medication labels (e.g. MZ003). Must be globally unique. MZ001–MZ020 reserved for global pack.';



CREATE TABLE IF NOT EXISTS "public"."multi_tenant_admins" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."multi_tenant_admins" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_admission_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "patient_id" "text" NOT NULL,
    "admission_type" "text",
    "attending_physician" "text",
    "insurance_provider" "text",
    "insurance_policy" "text",
    "admission_source" "text",
    "chief_complaint" "text",
    "height" "text",
    "weight" "text",
    "bmi" "text",
    "smoking_status" "text",
    "alcohol_use" "text",
    "exercise" "text",
    "occupation" "text",
    "family_history" "text",
    "marital_status" "text",
    "secondary_contact_name" "text",
    "secondary_contact_relationship" "text",
    "secondary_contact_phone" "text",
    "secondary_contact_address" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "admission_date" timestamp with time zone,
    "admitting_diagnosis" "text",
    "allergies" "text",
    "current_medications" "text",
    "emergency_contact_name" "text",
    "emergency_contact_phone" "text",
    "emergency_contact_relationship" "text",
    "student_name" "text"
);


ALTER TABLE "public"."patient_admission_records" OWNER TO "postgres";


COMMENT ON TABLE "public"."patient_admission_records" IS 'Patient admission records with RLS enabled for multi-tenant isolation';



CREATE TABLE IF NOT EXISTS "public"."patient_advanced_directives" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid",
    "patient_id" "text" NOT NULL,
    "living_will_status" "text",
    "living_will_date" "text",
    "healthcare_proxy_name" "text",
    "healthcare_proxy_phone" "text",
    "dnr_status" "text",
    "organ_donation_status" "text",
    "organ_donation_details" "text",
    "religious_preference" "text",
    "special_instructions" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "living_will_exists" boolean DEFAULT false,
    "healthcare_proxy_relationship" "text",
    "student_name" "text"
);


ALTER TABLE "public"."patient_advanced_directives" OWNER TO "postgres";


COMMENT ON TABLE "public"."patient_advanced_directives" IS 'Patient advanced care directives with RLS enabled for multi-tenant isolation';



COMMENT ON COLUMN "public"."patient_advanced_directives"."student_name" IS 'Name of the student who filled out the advanced directives (for debrief reporting)';



CREATE TABLE IF NOT EXISTS "public"."patient_alerts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "patient_name" "text" NOT NULL,
    "alert_type" "public"."alert_type_enum" NOT NULL,
    "message" "text" NOT NULL,
    "priority" "public"."alert_priority_enum" NOT NULL,
    "acknowledged" boolean DEFAULT false NOT NULL,
    "acknowledged_by" "uuid",
    "acknowledged_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "tenant_id" "uuid"
);


ALTER TABLE "public"."patient_alerts" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."patient_alerts_view" WITH ("security_invoker"='on') AS
 SELECT "pa"."id",
    "pa"."patient_id",
    "pa"."patient_name",
    "pa"."alert_type",
    "pa"."message",
    "pa"."priority",
    "pa"."acknowledged",
    "pa"."acknowledged_by",
    "pa"."acknowledged_at",
    "pa"."created_at",
    "pa"."tenant_id",
    "t"."name" AS "tenant_name",
    "t"."subdomain" AS "tenant_subdomain"
   FROM ("public"."patient_alerts" "pa"
     JOIN "public"."tenants" "t" ON (("pa"."tenant_id" = "t"."id")));


ALTER VIEW "public"."patient_alerts_view" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_bbit_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "time_label" "text",
    "student_name" "text",
    "glucose_value" numeric(5,2),
    "basal_name" "text",
    "basal_dose" numeric(6,2),
    "basal_status" "text",
    "basal_held_reason" "text",
    "basal_held_other" "text",
    "bolus_dose" numeric(6,2),
    "bolus_meal" "text",
    "bolus_status" "text",
    "bolus_not_given_reason" "text",
    "correction_dose" numeric(6,2),
    "correction_suggested_dose" numeric(6,2),
    "correction_status" "text",
    "hypo_juice" boolean,
    "hypo_dextrose_tabs" boolean,
    "hypo_iv_dextrose" boolean,
    "hypo_glucagon" boolean,
    "hypo_other" "text",
    "hypo_recheck_completed" boolean,
    "carb_intake" "text",
    "note_symptomatic_hypo" boolean,
    "note_hyperglycemia_symptoms" boolean,
    "note_insulin_delay" boolean,
    "note_other" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "patient_bbit_entries_basal_dose_check" CHECK (("basal_dose" >= (0)::numeric)),
    CONSTRAINT "patient_bbit_entries_basal_held_reason_check" CHECK (("basal_held_reason" = ANY (ARRAY['Low BG'::"text", 'NPO'::"text", 'Provider order'::"text", 'Other'::"text"]))),
    CONSTRAINT "patient_bbit_entries_basal_status_check" CHECK (("basal_status" = ANY (ARRAY['given'::"text", 'held'::"text"]))),
    CONSTRAINT "patient_bbit_entries_bolus_dose_check" CHECK (("bolus_dose" >= (0)::numeric)),
    CONSTRAINT "patient_bbit_entries_bolus_meal_check" CHECK (("bolus_meal" = ANY (ARRAY['Breakfast'::"text", 'Lunch'::"text", 'Supper'::"text"]))),
    CONSTRAINT "patient_bbit_entries_bolus_not_given_reason_check" CHECK (("bolus_not_given_reason" = ANY (ARRAY['Patient not eating'::"text", 'NPO'::"text", 'Refused'::"text"]))),
    CONSTRAINT "patient_bbit_entries_bolus_status_check" CHECK (("bolus_status" = ANY (ARRAY['given'::"text", 'not_given'::"text"]))),
    CONSTRAINT "patient_bbit_entries_carb_intake_check" CHECK (("carb_intake" = ANY (ARRAY['full'::"text", 'partial'::"text", 'none'::"text"]))),
    CONSTRAINT "patient_bbit_entries_correction_dose_check" CHECK (("correction_dose" >= (0)::numeric)),
    CONSTRAINT "patient_bbit_entries_correction_status_check" CHECK (("correction_status" = ANY (ARRAY['given'::"text", 'not_required'::"text"]))),
    CONSTRAINT "patient_bbit_entries_correction_suggested_dose_check" CHECK (("correction_suggested_dose" >= (0)::numeric)),
    CONSTRAINT "patient_bbit_entries_glucose_value_check" CHECK ((("glucose_value" >= (0)::numeric) AND ("glucose_value" <= (50)::numeric)))
);


ALTER TABLE "public"."patient_bbit_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_images" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid",
    "image_url" "text" NOT NULL,
    "thumbnail_url" "text",
    "annotations" "jsonb" DEFAULT '[]'::"jsonb",
    "image_type" "text" NOT NULL,
    "description" "text",
    "uploaded_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid"
);


ALTER TABLE "public"."patient_images" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_intake_output_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "event_timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "shift_label" "text",
    "direction" "text" NOT NULL,
    "category" "text" NOT NULL,
    "route" "text",
    "description" "text",
    "amount_ml" numeric(10,2) NOT NULL,
    "student_name" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "patient_intake_output_events_amount_ml_check" CHECK (("amount_ml" >= (0)::numeric)),
    CONSTRAINT "patient_intake_output_events_category_check" CHECK (("category" = ANY (ARRAY['oral'::"text", 'iv_fluid'::"text", 'iv_med'::"text", 'blood'::"text", 'tube_feed'::"text", 'urine'::"text", 'stool'::"text", 'emesis'::"text", 'drain'::"text"]))),
    CONSTRAINT "patient_intake_output_events_direction_check" CHECK (("direction" = ANY (ARRAY['intake'::"text", 'output'::"text"])))
);


ALTER TABLE "public"."patient_intake_output_events" OWNER TO "postgres";


COMMENT ON TABLE "public"."patient_intake_output_events" IS 'Tracks fluid intake and output events for patients. Used for calculating fluid balance in nursing care.';



COMMENT ON COLUMN "public"."patient_intake_output_events"."direction" IS 'Either intake (fluids going in) or output (fluids coming out)';



COMMENT ON COLUMN "public"."patient_intake_output_events"."category" IS 'Type of I&O: oral, iv_fluid, iv_med, blood, tube_feed, urine, stool, emesis, drain';



COMMENT ON COLUMN "public"."patient_intake_output_events"."amount_ml" IS 'Volume in milliliters (mL). Always positive number.';



COMMENT ON COLUMN "public"."patient_intake_output_events"."student_name" IS 'Name of student who recorded this event. Used for activity tracking in simulation debrief reports.';



CREATE TABLE IF NOT EXISTS "public"."patient_medications_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_template_id" "uuid" NOT NULL,
    "medication_name" character varying(200) NOT NULL,
    "generic_name" character varying(200),
    "dosage" character varying(100) NOT NULL,
    "route" character varying(50) NOT NULL,
    "frequency" character varying(100) NOT NULL,
    "indication" "text",
    "contraindications" "text",
    "side_effects" "text"[],
    "is_prn" boolean DEFAULT false,
    "prn_parameters" "text",
    "start_date" "date",
    "end_date" "date",
    "max_dose_per_day" character varying(50),
    "notes" "text",
    "barcode" character varying(100),
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "patient_medications_templates_route_check" CHECK ((("route")::"text" = ANY (ARRAY[('oral'::character varying)::"text", ('intravenous'::character varying)::"text", ('intramuscular'::character varying)::"text", ('subcutaneous'::character varying)::"text", ('topical'::character varying)::"text", ('inhalation'::character varying)::"text", ('rectal'::character varying)::"text", ('sublingual'::character varying)::"text", ('nasal'::character varying)::"text", ('transdermal'::character varying)::"text"])))
);


ALTER TABLE "public"."patient_medications_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_neuro_assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "student_name" "text",
    "level_of_consciousness" "text",
    "oriented_person" boolean,
    "oriented_place" boolean,
    "oriented_time" boolean,
    "gcs_eye" smallint,
    "gcs_verbal" smallint,
    "gcs_motor" smallint,
    "pupils_equal" boolean,
    "pupil_left_size" numeric(3,1),
    "pupil_left_reaction" "text",
    "pupil_right_size" numeric(3,1),
    "pupil_right_reaction" "text",
    "strength_right_arm" smallint,
    "strength_left_arm" smallint,
    "strength_right_leg" smallint,
    "strength_left_leg" smallint,
    "sensation" "text",
    "speech" "text",
    "pain_score" smallint,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "patient_neuro_assessments_gcs_eye_check" CHECK ((("gcs_eye" >= 1) AND ("gcs_eye" <= 4))),
    CONSTRAINT "patient_neuro_assessments_gcs_motor_check" CHECK ((("gcs_motor" >= 1) AND ("gcs_motor" <= 6))),
    CONSTRAINT "patient_neuro_assessments_gcs_verbal_check" CHECK ((("gcs_verbal" >= 1) AND ("gcs_verbal" <= 5))),
    CONSTRAINT "patient_neuro_assessments_level_of_consciousness_check" CHECK (("level_of_consciousness" = ANY (ARRAY['Alert'::"text", 'Voice'::"text", 'Pain'::"text", 'Unresponsive'::"text"]))),
    CONSTRAINT "patient_neuro_assessments_pain_score_check" CHECK ((("pain_score" >= 0) AND ("pain_score" <= 10))),
    CONSTRAINT "patient_neuro_assessments_pupil_left_reaction_check" CHECK (("pupil_left_reaction" = ANY (ARRAY['Brisk'::"text", 'Sluggish'::"text", 'Fixed'::"text", 'Absent'::"text"]))),
    CONSTRAINT "patient_neuro_assessments_pupil_left_size_check" CHECK ((("pupil_left_size" >= (1)::numeric) AND ("pupil_left_size" <= (9)::numeric))),
    CONSTRAINT "patient_neuro_assessments_pupil_right_reaction_check" CHECK (("pupil_right_reaction" = ANY (ARRAY['Brisk'::"text", 'Sluggish'::"text", 'Fixed'::"text", 'Absent'::"text"]))),
    CONSTRAINT "patient_neuro_assessments_pupil_right_size_check" CHECK ((("pupil_right_size" >= (1)::numeric) AND ("pupil_right_size" <= (9)::numeric))),
    CONSTRAINT "patient_neuro_assessments_sensation_check" CHECK (("sensation" = ANY (ARRAY['Normal'::"text", 'Reduced'::"text", 'Absent'::"text", 'Abnormal'::"text"]))),
    CONSTRAINT "patient_neuro_assessments_speech_check" CHECK (("speech" = ANY (ARRAY['Clear'::"text", 'Slurred'::"text", 'Confused'::"text", 'Aphasia'::"text", 'None'::"text"]))),
    CONSTRAINT "patient_neuro_assessments_strength_left_arm_check" CHECK ((("strength_left_arm" >= 0) AND ("strength_left_arm" <= 5))),
    CONSTRAINT "patient_neuro_assessments_strength_left_leg_check" CHECK ((("strength_left_leg" >= 0) AND ("strength_left_leg" <= 5))),
    CONSTRAINT "patient_neuro_assessments_strength_right_arm_check" CHECK ((("strength_right_arm" >= 0) AND ("strength_right_arm" <= 5))),
    CONSTRAINT "patient_neuro_assessments_strength_right_leg_check" CHECK ((("strength_right_leg" >= 0) AND ("strength_right_leg" <= 5)))
);


ALTER TABLE "public"."patient_neuro_assessments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_newborn_assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "time_of_birth" time without time zone,
    "weight_grams" numeric(6,1),
    "length_cm" numeric(5,1),
    "head_circumference_cm" numeric(4,1),
    "head_circumference_1hr_cm" numeric(4,1),
    "head_circumference_2hr_cm" numeric(4,1),
    "apgar_1min" smallint,
    "apgar_5min" smallint,
    "apgar_10min" smallint,
    "vitamin_k_given" boolean DEFAULT false,
    "vitamin_k_declined" boolean DEFAULT false,
    "vitamin_k_dose" "text",
    "vitamin_k_site" "text",
    "vitamin_k_date" "date",
    "vitamin_k_time" "text",
    "vitamin_k_signature" "text",
    "erythromycin_given" boolean DEFAULT false,
    "erythromycin_date" "date",
    "erythromycin_time" "text",
    "erythromycin_signature" "text",
    "physical_observations" "jsonb" DEFAULT '{}'::"jsonb",
    "completed_by" "text",
    "completed_initials" "text",
    "student_name" "text",
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "patient_newborn_assessments_apgar_10min_check" CHECK ((("apgar_10min" >= 0) AND ("apgar_10min" <= 10))),
    CONSTRAINT "patient_newborn_assessments_apgar_1min_check" CHECK ((("apgar_1min" >= 0) AND ("apgar_1min" <= 10))),
    CONSTRAINT "patient_newborn_assessments_apgar_5min_check" CHECK ((("apgar_5min" >= 0) AND ("apgar_5min" <= 10))),
    CONSTRAINT "patient_newborn_assessments_vitamin_k_dose_check" CHECK (("vitamin_k_dose" = ANY (ARRAY['0.5mg'::"text", '1.0mg'::"text"])))
);


ALTER TABLE "public"."patient_newborn_assessments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "note_type" "text",
    "content" "text",
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "type" "text" DEFAULT 'Note'::"text" NOT NULL,
    "nurse_name" "text",
    "nurse_id" "text",
    "priority" "text" DEFAULT 'Medium'::"text",
    "student_name" "text"
);


ALTER TABLE "public"."patient_notes" OWNER TO "postgres";


COMMENT ON TABLE "public"."patient_notes" IS 'Stores clinical assessments, nursing notes, and patient documentation';



COMMENT ON COLUMN "public"."patient_notes"."tenant_id" IS 'Auto-set by trigger based on patient tenant';



COMMENT ON COLUMN "public"."patient_notes"."type" IS 'Type of note: Assessment, Progress Note, Shift Note, etc.';



COMMENT ON COLUMN "public"."patient_notes"."priority" IS 'Priority level: Low, Medium, High, Critical';



COMMENT ON COLUMN "public"."patient_notes"."student_name" IS 'Full name of student who created note';



CREATE TABLE IF NOT EXISTS "public"."patient_system_assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "system_type" "text" NOT NULL,
    "assessment_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "nurse_id" "uuid",
    "nurse_name" "text",
    "recorded_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_baseline" boolean DEFAULT false NOT NULL
);


ALTER TABLE "public"."patient_system_assessments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "tenant_id" "uuid" NOT NULL,
    "status" "public"."simulation_template_status" DEFAULT 'draft'::"public"."simulation_template_status",
    "snapshot_data" "jsonb" DEFAULT '{}'::"jsonb",
    "snapshot_taken_at" timestamp with time zone,
    "primary_categories" "text"[] DEFAULT '{}'::"text"[],
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."patient_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."patient_templates" IS 'Reusable single-patient templates. Each has its own dedicated tenant for live editing; snapshot_data is copied (never synced) into simulation templates via add_patient_template_to_simulation_template().';



CREATE TABLE IF NOT EXISTS "public"."patient_vitals" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid",
    "temperature" numeric(4,1),
    "blood_pressure_systolic" integer,
    "blood_pressure_diastolic" integer,
    "heart_rate" integer,
    "respiratory_rate" integer,
    "oxygen_saturation" integer,
    "recorded_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid",
    "oxygen_delivery" "text" DEFAULT 'Room Air'::"text",
    "student_name" "text",
    "oxygen_flow_rate" "text" DEFAULT 'N/A'::"text",
    CONSTRAINT "patient_vitals_at_least_one_vital" CHECK ((("temperature" IS NOT NULL) OR ("heart_rate" IS NOT NULL) OR ("blood_pressure_systolic" IS NOT NULL) OR ("blood_pressure_diastolic" IS NOT NULL) OR ("respiratory_rate" IS NOT NULL) OR ("oxygen_saturation" IS NOT NULL))),
    CONSTRAINT "patient_vitals_bp_pair" CHECK (((("blood_pressure_systolic" IS NULL) AND ("blood_pressure_diastolic" IS NULL)) OR (("blood_pressure_systolic" IS NOT NULL) AND ("blood_pressure_diastolic" IS NOT NULL))))
);


ALTER TABLE "public"."patient_vitals" OWNER TO "postgres";


COMMENT ON TABLE "public"."patient_vitals" IS 'Patient vital signs records. All vital fields are optional to support clinical scenarios where not all measurements can be obtained (e.g., newborns without BP). At least one vital sign must be present per record.';



COMMENT ON COLUMN "public"."patient_vitals"."oxygen_delivery" IS 'Oxygen delivery method: Room Air, O2 1 L/min through O2 15 L/min';



COMMENT ON COLUMN "public"."patient_vitals"."student_name" IS 'Full name of student who recorded vitals';



COMMENT ON COLUMN "public"."patient_vitals"."oxygen_flow_rate" IS 'Oxygen flow rate: N/A, <1L, 1L-15L, >15L. Separates device type from flow rate for clinical accuracy.';



COMMENT ON CONSTRAINT "patient_vitals_at_least_one_vital" ON "public"."patient_vitals" IS 'Ensures at least one vital sign measurement is recorded per entry';



COMMENT ON CONSTRAINT "patient_vitals_bp_pair" ON "public"."patient_vitals" IS 'Ensures blood pressure values are recorded together (both systolic and diastolic or neither)';



CREATE TABLE IF NOT EXISTS "public"."patient_vitals_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_template_id" "uuid" NOT NULL,
    "vital_type" character varying(50) NOT NULL,
    "value_systolic" integer,
    "value_diastolic" integer,
    "value_numeric" numeric(10,2),
    "unit" character varying(20) NOT NULL,
    "normal_range_min" numeric(10,2),
    "normal_range_max" numeric(10,2),
    "notes" "text",
    "frequency_minutes" integer DEFAULT 60,
    "is_critical" boolean DEFAULT false,
    "display_order" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "patient_vitals_templates_vital_type_check" CHECK ((("vital_type")::"text" = ANY (ARRAY[('blood_pressure'::character varying)::"text", ('heart_rate'::character varying)::"text", ('respiratory_rate'::character varying)::"text", ('temperature'::character varying)::"text", ('oxygen_saturation'::character varying)::"text", ('blood_glucose'::character varying)::"text", ('pain_scale'::character varying)::"text", ('weight'::character varying)::"text", ('height'::character varying)::"text"])))
);


ALTER TABLE "public"."patient_vitals_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patient_wounds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid",
    "location" "text" NOT NULL,
    "coordinates_x" numeric NOT NULL,
    "coordinates_y" numeric NOT NULL,
    "view" "text" NOT NULL,
    "type" "text" NOT NULL,
    "stage" "text" NOT NULL,
    "size_length" numeric NOT NULL,
    "size_width" numeric NOT NULL,
    "size_depth" numeric,
    "description" "text",
    "treatment" "text",
    "assessed_by" "text" NOT NULL,
    "assessment_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "healing_progress" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."patient_wounds" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."patients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "text" NOT NULL,
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "date_of_birth" "date" NOT NULL,
    "gender" "text" NOT NULL,
    "room_number" "text" NOT NULL,
    "bed_number" "text" NOT NULL,
    "admission_date" "date" NOT NULL,
    "condition" "text" NOT NULL,
    "diagnosis" "text" NOT NULL,
    "allergies" "text"[] DEFAULT '{}'::"text"[],
    "blood_type" "text" NOT NULL,
    "emergency_contact_name" "text" NOT NULL,
    "emergency_contact_relationship" "text" NOT NULL,
    "emergency_contact_phone" "text" NOT NULL,
    "assigned_nurse" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid",
    "avatar_id" "text"
);


ALTER TABLE "public"."patients" OWNER TO "postgres";


COMMENT ON COLUMN "public"."patients"."assigned_nurse" IS 'Optional assigned nurse name (TEXT field, not a foreign key). Legacy field from production nursing workflows. Not required for simulation environments.';



COMMENT ON COLUMN "public"."patients"."avatar_id" IS 'Patient avatar identifier (avatar-1 through avatar-10)';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text",
    "first_name" "text",
    "last_name" "text",
    "role" "text" DEFAULT 'nurse'::"text",
    "department" "text",
    "license_number" "text",
    "phone" "text",
    "is_active" boolean DEFAULT true,
    "permissions" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['nurse'::"text", 'doctor'::"text", 'admin'::"text", 'super_admin'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."programs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid"
);


ALTER TABLE "public"."programs" OWNER TO "postgres";


COMMENT ON TABLE "public"."programs" IS 'Programs within tenants (e.g., NESA, PN, SIM Hub, BNAD)';



COMMENT ON COLUMN "public"."programs"."code" IS 'Short code for program (e.g., NESA, PN) - used in simulation categories';



COMMENT ON COLUMN "public"."programs"."name" IS 'Full program name';



CREATE TABLE IF NOT EXISTS "public"."simulation_active" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "template_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "status" "public"."simulation_active_status" DEFAULT 'pending'::"public"."simulation_active_status",
    "duration_minutes" integer NOT NULL,
    "starts_at" timestamp with time zone DEFAULT "now"(),
    "ends_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "template_snapshot_version" integer NOT NULL,
    "allow_late_join" boolean DEFAULT false,
    "auto_cleanup" boolean DEFAULT true,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "primary_categories" "text"[] DEFAULT '{}'::"text"[],
    "sub_categories" "text"[] DEFAULT '{}'::"text"[],
    "template_snapshot_version_launched" integer DEFAULT 1,
    "template_snapshot_version_synced" integer,
    "current_state_id" "uuid",
    CONSTRAINT "valid_duration" CHECK (("duration_minutes" > 0))
);


ALTER TABLE "public"."simulation_active" OWNER TO "postgres";


COMMENT ON TABLE "public"."simulation_active" IS 'Active running simulations - RLS enforced';



COMMENT ON COLUMN "public"."simulation_active"."primary_categories" IS 'Primary program categories: PN, NESA, SIM Hub, BNAD';



COMMENT ON COLUMN "public"."simulation_active"."sub_categories" IS 'Sub-categories: Labs, Simulation, Testing';



COMMENT ON COLUMN "public"."simulation_active"."template_snapshot_version_launched" IS 'Template version when simulation was originally launched';



COMMENT ON COLUMN "public"."simulation_active"."template_snapshot_version_synced" IS 'Template version last synced to (NULL if never synced)';



COMMENT ON COLUMN "public"."simulation_active"."current_state_id" IS 'Named template state (simulation_template_states) this simulation was last reset into. NULL means the template''s default/current snapshot.';



CREATE TABLE IF NOT EXISTS "public"."simulation_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "simulation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "action_type" "text" NOT NULL,
    "action_details" "jsonb" DEFAULT '{}'::"jsonb",
    "entity_type" "text",
    "entity_id" "uuid",
    "occurred_at" timestamp with time zone DEFAULT "now"(),
    "notes" "text"
);


ALTER TABLE "public"."simulation_activity_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."simulation_activity_log" IS 'Simulation activity audit log - RLS enforced';



CREATE TABLE IF NOT EXISTS "public"."simulation_auto_students" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "simulation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "program_id" "uuid",
    "student_number" "text" NOT NULL,
    "email" "text" NOT NULL,
    "temp_password" "text" NOT NULL,
    "label" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."simulation_auto_students" OWNER TO "postgres";


COMMENT ON TABLE "public"."simulation_auto_students" IS 'Auto-generated simulation-only student logins created from Launch Simulation. Row (and the underlying auth.users account) is only removed when the owning simulation_active row is deleted, via delete_simulation().';



CREATE TABLE IF NOT EXISTS "public"."simulation_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "simulation_id" "uuid",
    "template_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "status" "public"."simulation_active_status" NOT NULL,
    "duration_minutes" integer NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "ended_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "metrics" "jsonb" DEFAULT '{}'::"jsonb",
    "debrief_data" "jsonb" DEFAULT '{}'::"jsonb",
    "participants" "jsonb" DEFAULT '[]'::"jsonb",
    "activity_summary" "jsonb" DEFAULT '{}'::"jsonb",
    "created_by" "uuid" NOT NULL,
    "archived_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "tenant_id" "uuid",
    "student_activities" "jsonb" DEFAULT '[]'::"jsonb",
    "primary_categories" "text"[] DEFAULT '{}'::"text"[],
    "sub_categories" "text"[] DEFAULT '{}'::"text"[],
    "archived" boolean DEFAULT false NOT NULL,
    "archived_by" "uuid",
    "instructor_name" "text",
    "archive_folder" "text"
);


ALTER TABLE "public"."simulation_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."simulation_history" IS 'Completed simulation history - RLS enforced';



COMMENT ON COLUMN "public"."simulation_history"."archived_at" IS 'Timestamp when the simulation was archived';



COMMENT ON COLUMN "public"."simulation_history"."student_activities" IS 'Snapshot of student activities at completion time for debrief reports';



COMMENT ON COLUMN "public"."simulation_history"."primary_categories" IS 'Primary program categories from active simulation';



COMMENT ON COLUMN "public"."simulation_history"."sub_categories" IS 'Sub-categories from active simulation';



COMMENT ON COLUMN "public"."simulation_history"."archived" IS 'Whether this simulation has been archived by an instructor';



COMMENT ON COLUMN "public"."simulation_history"."archived_by" IS 'User ID of the instructor who archived this simulation';



COMMENT ON COLUMN "public"."simulation_history"."instructor_name" IS 'Name of the instructor who completed and debriefed this simulation';



COMMENT ON COLUMN "public"."simulation_history"."archive_folder" IS 'Archive folder structure: InstructorName/CompletionDate (e.g., "John Smith/2025-11-30")';



CREATE TABLE IF NOT EXISTS "public"."simulation_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "simulation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."simulation_role" DEFAULT 'student'::"public"."simulation_role" NOT NULL,
    "granted_at" timestamp with time zone DEFAULT "now"(),
    "granted_by" "uuid" NOT NULL,
    "last_accessed_at" timestamp with time zone
);


ALTER TABLE "public"."simulation_participants" OWNER TO "postgres";


COMMENT ON TABLE "public"."simulation_participants" IS 'User access to simulations - RLS enforced';



CREATE TABLE IF NOT EXISTS "public"."simulation_table_config" (
    "id" integer NOT NULL,
    "table_name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "has_tenant_id" boolean DEFAULT false,
    "has_patient_id" boolean DEFAULT false,
    "parent_table" "text",
    "parent_column" "text",
    "requires_id_mapping" boolean DEFAULT false,
    "delete_order" integer NOT NULL,
    "enabled" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "valid_delete_order" CHECK (("delete_order" > 0))
);


ALTER TABLE "public"."simulation_table_config" OWNER TO "postgres";


COMMENT ON TABLE "public"."simulation_table_config" IS 'Configuration for patient-related tables in simulation snapshot/restore system';



COMMENT ON COLUMN "public"."simulation_table_config"."requires_id_mapping" IS 'TRUE if IDs must be preserved for barcodes (patients, medications, wounds, lab_panels)';



COMMENT ON COLUMN "public"."simulation_table_config"."delete_order" IS 'Order for deletion in reset: lower numbers first (delete children before parents)';



CREATE SEQUENCE IF NOT EXISTS "public"."simulation_table_config_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."simulation_table_config_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."simulation_table_config_id_seq" OWNED BY "public"."simulation_table_config"."id";



CREATE TABLE IF NOT EXISTS "public"."simulation_template_states" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "template_id" "uuid" NOT NULL,
    "label" "text" NOT NULL,
    "changelog_note" "text",
    "snapshot_data" "jsonb" NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."simulation_template_states" OWNER TO "postgres";


COMMENT ON TABLE "public"."simulation_template_states" IS 'Instructor-named snapshot states per template (e.g. "Week 1", "Week 2"), independently selectable when resetting an active simulation.';



CREATE TABLE IF NOT EXISTS "public"."simulation_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "tenant_id" "uuid" NOT NULL,
    "status" "public"."simulation_template_status" DEFAULT 'draft'::"public"."simulation_template_status",
    "snapshot_data" "jsonb" DEFAULT '{}'::"jsonb",
    "snapshot_version" integer DEFAULT 0,
    "snapshot_taken_at" timestamp with time zone,
    "default_duration_minutes" integer DEFAULT 120,
    "auto_cleanup_after_hours" integer DEFAULT 24,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "primary_categories" "text"[] DEFAULT '{}'::"text"[],
    "sub_categories" "text"[] DEFAULT '{}'::"text"[],
    "folder" "text",
    CONSTRAINT "valid_cleanup" CHECK (("auto_cleanup_after_hours" >= 0)),
    CONSTRAINT "valid_duration" CHECK (("default_duration_minutes" > 0))
);


ALTER TABLE "public"."simulation_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."simulation_templates" IS 'Simulation templates with snapshot data - RLS enforced';



COMMENT ON COLUMN "public"."simulation_templates"."folder" IS 'Optional display folder for organizing templates in the UI. No referential integrity — purely cosmetic. NULL = uncategorized.';



CREATE OR REPLACE VIEW "public"."student_roster_with_profiles" WITH ("security_invoker"='true') AS
 SELECT "sr"."id",
    "sr"."user_id",
    "sr"."program_id",
    "sr"."cohort_id",
    "sr"."student_number",
    "sr"."enrollment_date",
    "sr"."is_active",
    "sr"."notes",
    "sr"."created_at",
    "sr"."updated_at",
    "sr"."created_by",
    "up"."email" AS "user_email",
    "up"."first_name" AS "user_first_name",
    "up"."last_name" AS "user_last_name",
    "up"."role" AS "user_role",
    "up"."phone" AS "user_phone",
    "up"."simulation_only" AS "user_simulation_only"
   FROM ("public"."student_roster" "sr"
     LEFT JOIN "public"."user_profiles" "up" ON (("sr"."user_id" = "up"."id")));


ALTER VIEW "public"."student_roster_with_profiles" OWNER TO "postgres";


COMMENT ON VIEW "public"."student_roster_with_profiles" IS 'Student roster with joined user profile information for easy querying';



CREATE TABLE IF NOT EXISTS "public"."system_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "timestamp" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid",
    "tenant_id" "uuid",
    "log_level" character varying(20) NOT NULL,
    "log_type" character varying(50) NOT NULL,
    "component" character varying(255),
    "action" character varying(255),
    "error_message" "text",
    "error_stack" "text",
    "request_data" "jsonb",
    "response_data" "jsonb",
    "user_agent" "text",
    "browser_info" "jsonb",
    "ip_address" "inet",
    "session_id" "text",
    "current_url" "text",
    "previous_url" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "system_logs_log_level_check" CHECK ((("log_level")::"text" = ANY (ARRAY[('debug'::character varying)::"text", ('info'::character varying)::"text", ('warn'::character varying)::"text", ('error'::character varying)::"text", ('security'::character varying)::"text"])))
);


ALTER TABLE "public"."system_logs" OWNER TO "postgres";


COMMENT ON TABLE "public"."system_logs" IS 'Comprehensive system logging for super admin monitoring and troubleshooting. Tracks errors, user actions, and system events with full context.';



CREATE TABLE IF NOT EXISTS "public"."tenant_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" character varying(20) DEFAULT 'viewer'::character varying NOT NULL,
    "permissions" "text"[] DEFAULT '{}'::"text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_active" boolean DEFAULT true,
    CONSTRAINT "tenant_users_role_check" CHECK ((("role")::"text" = ANY (ARRAY[('super_admin'::character varying)::"text", ('coordinator'::character varying)::"text", ('admin'::character varying)::"text", ('instructor'::character varying)::"text", ('nurse'::character varying)::"text", ('student'::character varying)::"text", ('viewer'::character varying)::"text"])))
);


ALTER TABLE "public"."tenant_users" OWNER TO "postgres";


COMMENT ON TABLE "public"."tenant_users" IS 'Maps users to tenants with role-based access control';



COMMENT ON COLUMN "public"."tenant_users"."permissions" IS 'Array of permission strings for granular access control';



COMMENT ON CONSTRAINT "tenant_users_role_check" ON "public"."tenant_users" IS 'Validates role: super_admin, coordinator, admin, instructor, nurse, student, viewer';



CREATE OR REPLACE VIEW "public"."tenant_statistics" WITH ("security_invoker"='on') AS
 SELECT "t"."id",
    "t"."name",
    "t"."created_at",
    "count"(DISTINCT "tu"."user_id") AS "user_count",
    "count"(DISTINCT "p"."id") AS "patient_count"
   FROM (("public"."tenants" "t"
     LEFT JOIN "public"."tenant_users" "tu" ON ((("t"."id" = "tu"."tenant_id") AND ("tu"."is_active" = true))))
     LEFT JOIN "public"."patients" "p" ON (("t"."id" = "p"."tenant_id")))
  GROUP BY "t"."id", "t"."name", "t"."created_at";


ALTER VIEW "public"."tenant_statistics" OWNER TO "postgres";


COMMENT ON VIEW "public"."tenant_statistics" IS 'Tenant statistics view - Uses security_invoker=on to enforce calling user permissions and RLS policies';



CREATE TABLE IF NOT EXISTS "public"."tr_active_living_profiles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "is_baseline" boolean DEFAULT false NOT NULL,
    "narrative" "text",
    "recorded_by" "text",
    "recorded_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tr_active_living_profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tr_assessment_scores" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "is_baseline" boolean DEFAULT false NOT NULL,
    "tool_name" "text" NOT NULL,
    "subscale_scores" "jsonb",
    "total_score" numeric,
    "interpretation" "text",
    "date_administered" "date",
    "administered_by" "text",
    "recorded_by" "text",
    "recorded_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tr_assessment_scores" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tr_interdisciplinary_interps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "is_baseline" boolean DEFAULT false NOT NULL,
    "score_group" "text" NOT NULL,
    "interpretation" "text",
    "recorded_by" "text",
    "recorded_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tr_interdisciplinary_interps" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tr_progress_notes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "note_type" "text" DEFAULT 'soap'::"text" NOT NULL,
    "subjective" "text",
    "objective" "text",
    "assessment" "text",
    "plan" "text",
    "narrative" "text",
    "note_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "note_time" time without time zone,
    "clinician_name" "text",
    "recorded_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tr_progress_notes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tr_screening_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "is_baseline" boolean DEFAULT false NOT NULL,
    "experiences_boredom" boolean,
    "boredom_frequency" "text",
    "takes_initiative" boolean,
    "social_contact_frequency" "text",
    "social_support" "text"[],
    "social_contact_performance" "text",
    "social_engagement_rating" integer,
    "social_comments" "text",
    "community_frequency" "text",
    "community_participation_pattern" "text"[],
    "balance_active_passive" boolean,
    "community_accessibility" "text"[],
    "leisure_satisfaction_rating" integer,
    "leisure_participation_notes" "text",
    "leisure_barriers_description" "text",
    "personal_barriers" "text"[],
    "functional_barriers" "text"[],
    "social_barriers" "text"[],
    "environmental_barriers" "text"[],
    "readiness_to_participate" integer,
    "lcm_leisure_attitude_score" integer,
    "lcm_social_contact_score" integer,
    "lcm_community_participation_score" integer,
    "tr_recommendation" "text",
    "clinician_signature" "text",
    "completed_at" timestamp with time zone,
    "recorded_by" "text",
    "recorded_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "tr_screening_entries_leisure_satisfaction_rating_check" CHECK ((("leisure_satisfaction_rating" >= 1) AND ("leisure_satisfaction_rating" <= 4))),
    CONSTRAINT "tr_screening_entries_readiness_to_participate_check" CHECK ((("readiness_to_participate" >= 1) AND ("readiness_to_participate" <= 10))),
    CONSTRAINT "tr_screening_entries_social_engagement_rating_check" CHECK ((("social_engagement_rating" >= 1) AND ("social_engagement_rating" <= 5)))
);


ALTER TABLE "public"."tr_screening_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."tr_treatment_plan_rows" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "is_baseline" boolean DEFAULT false NOT NULL,
    "sort_order" integer DEFAULT 0 NOT NULL,
    "target_area" "text",
    "goal" "text",
    "objective_1" "text",
    "objective_2" "text",
    "objective_3" "text",
    "intervention" "text",
    "clinician_signature" "text",
    "plan_date" "date",
    "recorded_by" "text",
    "recorded_by_user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."tr_treatment_plan_rows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_programs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "program_id" "uuid" NOT NULL,
    "assigned_at" timestamp with time zone DEFAULT "now"(),
    "assigned_by" "uuid"
);


ALTER TABLE "public"."user_programs" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_programs" IS 'Many-to-many: users assigned to programs';



CREATE OR REPLACE VIEW "public"."user_roles" WITH ("security_invoker"='on') AS
 SELECT "id",
    "email",
    "role",
    "first_name",
    "last_name",
    "created_at"
   FROM "public"."user_profiles" "up";


ALTER VIEW "public"."user_roles" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_roles" IS 'User roles view - Uses security_invoker=on to enforce calling user permissions and RLS policies';



CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "ip_address" "inet",
    "user_agent" "text",
    "tenant_id" "uuid",
    "login_time" timestamp with time zone DEFAULT "now"(),
    "last_activity" timestamp with time zone DEFAULT "now"(),
    "logout_time" timestamp with time zone,
    "session_token" "text",
    "status" character varying(20) DEFAULT 'active'::character varying,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_sessions_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('active'::character varying)::"text", ('idle'::character varying)::"text", ('logged_out'::character varying)::"text"])))
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_sessions" IS 'Tracks user login sessions with IP addresses and timestamps';



CREATE OR REPLACE VIEW "public"."user_tenant_access" WITH ("security_invoker"='on') AS
 SELECT DISTINCT "tu"."user_id",
    "tu"."tenant_id",
    "up"."role" AS "user_role",
    "tu"."is_active"
   FROM ("public"."tenant_users" "tu"
     JOIN "public"."user_profiles" "up" ON (("tu"."user_id" = "up"."id")));


ALTER VIEW "public"."user_tenant_access" OWNER TO "postgres";


COMMENT ON VIEW "public"."user_tenant_access" IS 'User-tenant access mapping - Uses security_invoker=on to enforce calling user permissions and RLS policies';



CREATE MATERIALIZED VIEW "public"."user_tenant_cache" AS
 SELECT "user_id",
    "tenant_id",
    "role",
    "is_active",
    "created_at"
   FROM "public"."tenant_users"
  WHERE ("is_active" = true)
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."user_tenant_cache" OWNER TO "postgres";


COMMENT ON MATERIALIZED VIEW "public"."user_tenant_cache" IS 'Cached user-tenant relationships for performance. Currently accessible to authenticated users. TODO: Refactor application code to use RLS-protected functions instead of direct access.';



CREATE TABLE IF NOT EXISTS "public"."wound_assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "assessment_date" timestamp with time zone DEFAULT "now"(),
    "wound_location" "text",
    "wound_type" "text",
    "stage" "text",
    "length_cm" numeric(5,2) DEFAULT 0,
    "width_cm" numeric(5,2) DEFAULT 0,
    "depth_cm" numeric(5,2) DEFAULT 0,
    "wound_bed" "text",
    "exudate_amount" "text",
    "exudate_type" "text",
    "periwound_condition" "text",
    "pain_level" integer,
    "odor" "text",
    "signs_of_infection" "text",
    "assessment_notes" "text",
    "photos" "text"[],
    "assessor_id" "uuid",
    "assessor_name" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "student_name" "text",
    "device_id" "uuid",
    "wound_id" "uuid",
    "assessed_at" timestamp with time zone DEFAULT "now"(),
    "site_condition" "text",
    "surrounding_skin" "text",
    "treatment_applied" "text",
    "dressing_type" "text",
    "device_functioning" boolean,
    "output_amount_ml" integer,
    "drainage_type" "text"[],
    "drainage_amount" "text",
    "wound_length_cm" numeric(5,2),
    "wound_width_cm" numeric(5,2),
    "wound_depth_cm" numeric(5,2),
    "wound_appearance" "text",
    "notes" "text",
    "assessment_data" "jsonb" DEFAULT '{}'::"jsonb",
    "device_type" "text",
    CONSTRAINT "wound_assessments_exudate_amount_check" CHECK (("exudate_amount" = ANY (ARRAY['none'::"text", 'minimal'::"text", 'moderate'::"text", 'heavy'::"text"]))),
    CONSTRAINT "wound_assessments_exudate_type_check" CHECK (("exudate_type" = ANY (ARRAY['serous'::"text", 'sanguineous'::"text", 'serosanguineous'::"text", 'purulent'::"text", 'other'::"text"]))),
    CONSTRAINT "wound_assessments_pain_level_check" CHECK ((("pain_level" >= 0) AND ("pain_level" <= 10))),
    CONSTRAINT "wound_assessments_wound_bed_check" CHECK (("wound_bed" = ANY (ARRAY['red'::"text", 'yellow'::"text", 'black'::"text", 'mixed'::"text"]))),
    CONSTRAINT "wound_assessments_wound_type_check" CHECK (("wound_type" = ANY (ARRAY['surgical'::"text", 'pressure'::"text", 'venous'::"text", 'arterial'::"text", 'diabetic'::"text", 'traumatic'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."wound_assessments" OWNER TO "postgres";


COMMENT ON TABLE "public"."wound_assessments" IS 'Multi-purpose table: legacy wound care assessments + new hacMap device/wound assessments';



COMMENT ON COLUMN "public"."wound_assessments"."student_name" IS 'Full name of student who performed assessment';



COMMENT ON COLUMN "public"."wound_assessments"."device_id" IS 'Links to device being assessed (NULL if wound assessment)';



COMMENT ON COLUMN "public"."wound_assessments"."site_condition" IS 'Condition of IV site (devices) or surrounding skin (wounds)';



COMMENT ON COLUMN "public"."wound_assessments"."device_functioning" IS 'Is the device patent and functioning properly?';



COMMENT ON COLUMN "public"."wound_assessments"."output_amount_ml" IS 'Amount of drainage from device (for drains, tubes, catheters)';



COMMENT ON COLUMN "public"."wound_assessments"."drainage_type" IS 'Array of drainage types: serous, sanguineous, serosanguineous, purulent, none';



COMMENT ON COLUMN "public"."wound_assessments"."drainage_amount" IS 'Amount of drainage: none, scant, small, moderate, large, copious';



COMMENT ON COLUMN "public"."wound_assessments"."wound_length_cm" IS 'Wound length in centimeters';



COMMENT ON COLUMN "public"."wound_assessments"."wound_width_cm" IS 'Wound width in centimeters';



COMMENT ON COLUMN "public"."wound_assessments"."wound_depth_cm" IS 'Wound depth in centimeters';



COMMENT ON COLUMN "public"."wound_assessments"."wound_appearance" IS 'Wound appearance: clean, granulating, epithelializing, slough, eschar, necrotic, infected';



COMMENT ON COLUMN "public"."wound_assessments"."notes" IS 'Additional notes or observations about the assessment';



COMMENT ON COLUMN "public"."wound_assessments"."assessment_data" IS 'Device/wound-specific assessment fields stored as JSONB (e.g., IV site details, feeding tube residuals)';



COMMENT ON COLUMN "public"."wound_assessments"."device_type" IS 'Cached device type from devices table for quick filtering';



CREATE TABLE IF NOT EXISTS "public"."wound_treatments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "wound_assessment_id" "uuid",
    "treatment_date" timestamp with time zone DEFAULT "now"() NOT NULL,
    "treatment_type" "text" NOT NULL,
    "products_used" "text" NOT NULL,
    "procedure_notes" "text" NOT NULL,
    "administered_by" "text" NOT NULL,
    "administered_by_id" "uuid" NOT NULL,
    "administered_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "next_treatment_due" timestamp with time zone,
    "photos_after" "text"[],
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."wound_treatments" OWNER TO "postgres";


COMMENT ON TABLE "public"."wound_treatments" IS 'Tracks wound treatment history, procedures, and outcomes';



COMMENT ON COLUMN "public"."wound_treatments"."photos_after" IS 'Array of Supabase Storage URLs for post-treatment photos';



CREATE TABLE IF NOT EXISTS "public"."wounds" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "tenant_id" "uuid" NOT NULL,
    "patient_id" "uuid" NOT NULL,
    "location_id" "uuid" NOT NULL,
    "wound_type" "public"."wound_type_enum" NOT NULL,
    "peri_wound_temperature" "text",
    "wound_length_cm" numeric,
    "wound_width_cm" numeric,
    "wound_depth_cm" numeric,
    "wound_description" "text",
    "drainage_description" "text"[] DEFAULT '{}'::"text"[],
    "drainage_consistency" "text"[] DEFAULT '{}'::"text"[],
    "wound_odor" "text"[] DEFAULT '{}'::"text"[],
    "drainage_amount" "text",
    "wound_edges" "text",
    "closure" "text",
    "suture_staple_line" "text",
    "sutures_intact" "text",
    "notes" "text",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "entered_by" "text"
);


ALTER TABLE "public"."wounds" OWNER TO "postgres";


COMMENT ON COLUMN "public"."wounds"."entered_by" IS 'Name of the nurse/clinician who entered/documented this wound';



ALTER TABLE ONLY "public"."simulation_table_config" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."simulation_table_config_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."avatar_locations"
    ADD CONSTRAINT "avatar_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bowel_records"
    ADD CONSTRAINT "bowel_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_submissions"
    ADD CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."device_assessments"
    ADD CONSTRAINT "device_assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."diabetic_records"
    ADD CONSTRAINT "diabetic_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."doctors_orders"
    ADD CONSTRAINT "doctors_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."handover_notes"
    ADD CONSTRAINT "handover_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."kb_walkthroughs"
    ADD CONSTRAINT "kb_walkthroughs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_ack_events"
    ADD CONSTRAINT "lab_ack_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_orders"
    ADD CONSTRAINT "lab_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_panels"
    ADD CONSTRAINT "lab_panels_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_result_refs"
    ADD CONSTRAINT "lab_result_refs_pkey" PRIMARY KEY ("test_code");



ALTER TABLE ONLY "public"."lab_results"
    ADD CONSTRAINT "lab_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medication_administrations"
    ADD CONSTRAINT "medication_administrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."medications_catalog"
    ADD CONSTRAINT "medications_catalog_barcode_unique" UNIQUE ("barcode");



ALTER TABLE ONLY "public"."medications_catalog"
    ADD CONSTRAINT "medications_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."multi_tenant_admins"
    ADD CONSTRAINT "multi_tenant_admins_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."multi_tenant_admins"
    ADD CONSTRAINT "multi_tenant_admins_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."patient_admission_records"
    ADD CONSTRAINT "patient_admission_records_patient_id_key" UNIQUE ("patient_id");



ALTER TABLE ONLY "public"."patient_admission_records"
    ADD CONSTRAINT "patient_admission_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_advanced_directives"
    ADD CONSTRAINT "patient_advanced_directives_patient_id_key" UNIQUE ("patient_id");



ALTER TABLE ONLY "public"."patient_advanced_directives"
    ADD CONSTRAINT "patient_advanced_directives_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_alerts"
    ADD CONSTRAINT "patient_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_bbit_entries"
    ADD CONSTRAINT "patient_bbit_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_images"
    ADD CONSTRAINT "patient_images_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_intake_output_events"
    ADD CONSTRAINT "patient_intake_output_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_medications"
    ADD CONSTRAINT "patient_medications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_medications_templates"
    ADD CONSTRAINT "patient_medications_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_neuro_assessments"
    ADD CONSTRAINT "patient_neuro_assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_newborn_assessments"
    ADD CONSTRAINT "patient_newborn_assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_newborn_assessments"
    ADD CONSTRAINT "patient_newborn_assessments_unique" UNIQUE ("patient_id", "tenant_id");



ALTER TABLE ONLY "public"."patient_notes"
    ADD CONSTRAINT "patient_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_system_assessments"
    ADD CONSTRAINT "patient_system_assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_templates"
    ADD CONSTRAINT "patient_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_vitals"
    ADD CONSTRAINT "patient_vitals_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_vitals_templates"
    ADD CONSTRAINT "patient_vitals_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patient_wounds"
    ADD CONSTRAINT "patient_wounds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_patient_id_key" UNIQUE ("patient_id");



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_tenant_code_unique" UNIQUE ("tenant_id", "code");



ALTER TABLE ONLY "public"."simulation_active"
    ADD CONSTRAINT "simulation_active_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."simulation_activity_log"
    ADD CONSTRAINT "simulation_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."simulation_auto_students"
    ADD CONSTRAINT "simulation_auto_students_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."simulation_history"
    ADD CONSTRAINT "simulation_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."simulation_participants"
    ADD CONSTRAINT "simulation_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."simulation_table_config"
    ADD CONSTRAINT "simulation_table_config_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."simulation_table_config"
    ADD CONSTRAINT "simulation_table_config_table_name_key" UNIQUE ("table_name");



ALTER TABLE ONLY "public"."simulation_template_states"
    ADD CONSTRAINT "simulation_template_states_label_unique" UNIQUE ("template_id", "label");



ALTER TABLE ONLY "public"."simulation_template_states"
    ADD CONSTRAINT "simulation_template_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."simulation_templates"
    ADD CONSTRAINT "simulation_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_roster"
    ADD CONSTRAINT "student_roster_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."student_roster"
    ADD CONSTRAINT "student_roster_unique_student_number" UNIQUE ("student_number");



ALTER TABLE ONLY "public"."student_roster"
    ADD CONSTRAINT "student_roster_unique_user_program" UNIQUE ("user_id", "program_id");



ALTER TABLE ONLY "public"."system_logs"
    ADD CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_tenant_id_user_id_key" UNIQUE ("tenant_id", "user_id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tr_active_living_profiles"
    ADD CONSTRAINT "tr_active_living_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tr_assessment_scores"
    ADD CONSTRAINT "tr_assessment_scores_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tr_interdisciplinary_interps"
    ADD CONSTRAINT "tr_interdisciplinary_interps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tr_progress_notes"
    ADD CONSTRAINT "tr_progress_notes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tr_screening_entries"
    ADD CONSTRAINT "tr_screening_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tr_treatment_plan_rows"
    ADD CONSTRAINT "tr_treatment_plan_rows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."simulation_participants"
    ADD CONSTRAINT "unique_participant" UNIQUE ("simulation_id", "user_id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "unique_subdomain" UNIQUE ("subdomain");



ALTER TABLE ONLY "public"."simulation_templates"
    ADD CONSTRAINT "unique_template_name" UNIQUE ("name");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_programs"
    ADD CONSTRAINT "user_programs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_programs"
    ADD CONSTRAINT "user_programs_unique" UNIQUE ("user_id", "program_id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wound_assessments"
    ADD CONSTRAINT "wound_assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wound_treatments"
    ADD CONSTRAINT "wound_treatments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wounds"
    ADD CONSTRAINT "wounds_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_activity_log_simulation" ON "public"."simulation_activity_log" USING "btree" ("simulation_id", "occurred_at" DESC);



CREATE INDEX "idx_activity_log_user" ON "public"."simulation_activity_log" USING "btree" ("user_id", "occurred_at" DESC);



CREATE INDEX "idx_advanced_directives_student_name" ON "public"."patient_advanced_directives" USING "btree" ("student_name");



CREATE INDEX "idx_audit_logs_action" ON "public"."audit_logs" USING "btree" ("action");



CREATE INDEX "idx_audit_logs_target_id" ON "public"."audit_logs" USING "btree" ("target_id");



CREATE INDEX "idx_audit_logs_timestamp" ON "public"."audit_logs" USING "btree" ("timestamp");



CREATE INDEX "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");



CREATE INDEX "idx_avatar_locations_patient" ON "public"."avatar_locations" USING "btree" ("patient_id");



CREATE INDEX "idx_avatar_locations_tenant" ON "public"."avatar_locations" USING "btree" ("tenant_id");



CREATE INDEX "idx_bbit_patient" ON "public"."patient_bbit_entries" USING "btree" ("patient_id");



CREATE INDEX "idx_bbit_recorded_at" ON "public"."patient_bbit_entries" USING "btree" ("patient_id", "recorded_at");



CREATE INDEX "idx_bbit_tenant" ON "public"."patient_bbit_entries" USING "btree" ("tenant_id");



CREATE INDEX "idx_bowel_records_patient_id" ON "public"."bowel_records" USING "btree" ("patient_id");



CREATE INDEX "idx_bowel_records_recorded_at" ON "public"."bowel_records" USING "btree" ("recorded_at" DESC);



CREATE INDEX "idx_bowel_records_student_name" ON "public"."bowel_records" USING "btree" ("student_name") WHERE ("student_name" IS NOT NULL);



CREATE INDEX "idx_bowel_records_tenant_id" ON "public"."bowel_records" USING "btree" ("tenant_id");



CREATE INDEX "idx_contact_submissions_email" ON "public"."contact_submissions" USING "btree" ("email");



CREATE INDEX "idx_contact_submissions_processed" ON "public"."contact_submissions" USING "btree" ("processed") WHERE (NOT "processed");



CREATE INDEX "idx_contact_submissions_submitted_at" ON "public"."contact_submissions" USING "btree" ("submitted_at" DESC);



CREATE INDEX "idx_device_assessments_assessed_at" ON "public"."device_assessments" USING "btree" ("assessed_at" DESC);



CREATE INDEX "idx_device_assessments_data" ON "public"."device_assessments" USING "gin" ("assessment_data");



CREATE INDEX "idx_device_assessments_device_id" ON "public"."device_assessments" USING "btree" ("device_id");



CREATE INDEX "idx_device_assessments_device_type" ON "public"."device_assessments" USING "btree" ("device_type");



CREATE INDEX "idx_device_assessments_patient_id" ON "public"."device_assessments" USING "btree" ("patient_id");



CREATE INDEX "idx_device_assessments_student_name" ON "public"."device_assessments" USING "btree" ("student_name");



CREATE INDEX "idx_device_assessments_tenant_id" ON "public"."device_assessments" USING "btree" ("tenant_id");



CREATE INDEX "idx_devices_location" ON "public"."devices" USING "btree" ("location_id");



CREATE INDEX "idx_devices_patient" ON "public"."devices" USING "btree" ("patient_id");



CREATE INDEX "idx_devices_tenant" ON "public"."devices" USING "btree" ("tenant_id");



CREATE INDEX "idx_diabetic_records_date" ON "public"."diabetic_records" USING "btree" ("date");



CREATE INDEX "idx_diabetic_records_patient_date" ON "public"."diabetic_records" USING "btree" ("patient_id", "date");



CREATE INDEX "idx_diabetic_records_patient_id" ON "public"."diabetic_records" USING "btree" ("patient_id");



CREATE INDEX "idx_diabetic_records_recorded_at" ON "public"."diabetic_records" USING "btree" ("recorded_at");



CREATE INDEX "idx_diabetic_records_student_name" ON "public"."diabetic_records" USING "btree" ("student_name") WHERE ("student_name" IS NOT NULL);



CREATE INDEX "idx_diabetic_records_tenant_id" ON "public"."diabetic_records" USING "btree" ("tenant_id");



CREATE INDEX "idx_doctors_orders_acknowledged_by" ON "public"."doctors_orders" USING "btree" ("acknowledged_by_student") WHERE ("acknowledged_by_student" IS NOT NULL);



CREATE INDEX "idx_doctors_orders_is_acknowledged" ON "public"."doctors_orders" USING "btree" ("is_acknowledged");



CREATE INDEX "idx_doctors_orders_order_date" ON "public"."doctors_orders" USING "btree" ("order_date");



CREATE INDEX "idx_doctors_orders_patient_id" ON "public"."doctors_orders" USING "btree" ("patient_id");



CREATE INDEX "idx_doctors_orders_tenant_id" ON "public"."doctors_orders" USING "btree" ("tenant_id");



CREATE INDEX "idx_handover_notes_acknowledged" ON "public"."handover_notes" USING "btree" ("acknowledged_by") WHERE ("acknowledged_by" IS NOT NULL);



CREATE INDEX "idx_handover_notes_created_at" ON "public"."handover_notes" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_handover_notes_patient_id" ON "public"."handover_notes" USING "btree" ("patient_id");



CREATE INDEX "idx_handover_notes_priority" ON "public"."handover_notes" USING "btree" ("priority");



CREATE INDEX "idx_handover_notes_shift" ON "public"."handover_notes" USING "btree" ("shift");



CREATE INDEX "idx_handover_notes_student_name" ON "public"."handover_notes" USING "btree" ("student_name") WHERE ("student_name" IS NOT NULL);



CREATE INDEX "idx_io_direction" ON "public"."patient_intake_output_events" USING "btree" ("tenant_id", "patient_id", "direction");



CREATE INDEX "idx_io_student_name" ON "public"."patient_intake_output_events" USING "btree" ("student_name") WHERE ("student_name" IS NOT NULL);



CREATE INDEX "idx_io_tenant_patient_time" ON "public"."patient_intake_output_events" USING "btree" ("tenant_id", "patient_id", "event_timestamp" DESC);



CREATE INDEX "idx_kb_walkthroughs_active_order" ON "public"."kb_walkthroughs" USING "btree" ("is_active", "display_order");



CREATE INDEX "idx_lab_ack_events_ack_by" ON "public"."lab_ack_events" USING "btree" ("ack_by");



CREATE INDEX "idx_lab_ack_events_panel" ON "public"."lab_ack_events" USING "btree" ("panel_id");



CREATE INDEX "idx_lab_ack_events_student_name" ON "public"."lab_ack_events" USING "btree" ("student_name");



CREATE INDEX "idx_lab_ack_events_tenant_patient" ON "public"."lab_ack_events" USING "btree" ("tenant_id", "patient_id");



CREATE INDEX "idx_lab_orders_date" ON "public"."lab_orders" USING "btree" ("order_date" DESC);



CREATE INDEX "idx_lab_orders_patient" ON "public"."lab_orders" USING "btree" ("patient_id");



CREATE INDEX "idx_lab_orders_status" ON "public"."lab_orders" USING "btree" ("status");



CREATE INDEX "idx_lab_orders_student_name" ON "public"."lab_orders" USING "btree" ("student_name") WHERE ("student_name" IS NOT NULL);



CREATE INDEX "idx_lab_orders_tenant" ON "public"."lab_orders" USING "btree" ("tenant_id");



CREATE INDEX "idx_lab_panels_entered_by" ON "public"."lab_panels" USING "btree" ("entered_by");



CREATE INDEX "idx_lab_panels_panel_time" ON "public"."lab_panels" USING "btree" ("panel_time" DESC);



CREATE INDEX "idx_lab_panels_status" ON "public"."lab_panels" USING "btree" ("status");



CREATE INDEX "idx_lab_panels_tenant_patient" ON "public"."lab_panels" USING "btree" ("tenant_id", "patient_id");



CREATE INDEX "idx_lab_results_ack" ON "public"."lab_results" USING "btree" ("ack_by", "ack_at") WHERE ("ack_at" IS NULL);



CREATE INDEX "idx_lab_results_ack_by" ON "public"."lab_results" USING "btree" ("ack_by");



CREATE INDEX "idx_lab_results_acknowledged_by" ON "public"."lab_results" USING "btree" ("acknowledged_by_student") WHERE ("acknowledged_by_student" IS NOT NULL);



CREATE INDEX "idx_lab_results_category" ON "public"."lab_results" USING "btree" ("category");



CREATE INDEX "idx_lab_results_entered_by" ON "public"."lab_results" USING "btree" ("entered_by");



CREATE INDEX "idx_lab_results_flag" ON "public"."lab_results" USING "btree" ("flag");



CREATE INDEX "idx_lab_results_note" ON "public"."lab_results" USING "btree" ("note") WHERE ("note" IS NOT NULL);



CREATE INDEX "idx_lab_results_panel" ON "public"."lab_results" USING "btree" ("panel_id");



CREATE INDEX "idx_lab_results_tenant_patient" ON "public"."lab_results" USING "btree" ("tenant_id", "patient_id");



CREATE INDEX "idx_medication_administrations_administered_by_id" ON "public"."medication_administrations" USING "btree" ("administered_by_id");



CREATE INDEX "idx_medication_administrations_medication_id" ON "public"."medication_administrations" USING "btree" ("medication_id");



CREATE INDEX "idx_medication_administrations_patient_id" ON "public"."medication_administrations" USING "btree" ("patient_id");



CREATE INDEX "idx_medication_administrations_student_name" ON "public"."medication_administrations" USING "btree" ("student_name") WHERE ("student_name" IS NOT NULL);



CREATE INDEX "idx_medication_administrations_tenant_id" ON "public"."medication_administrations" USING "btree" ("tenant_id");



CREATE INDEX "idx_medication_administrations_timestamp" ON "public"."medication_administrations" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_medications_catalog_barcode" ON "public"."medications_catalog" USING "btree" ("barcode");



CREATE INDEX "idx_medications_catalog_name" ON "public"."medications_catalog" USING "btree" ("name");



CREATE INDEX "idx_medications_catalog_tenant_id" ON "public"."medications_catalog" USING "btree" ("tenant_id");



CREATE INDEX "idx_neuro_patient" ON "public"."patient_neuro_assessments" USING "btree" ("patient_id");



CREATE INDEX "idx_neuro_recorded_at" ON "public"."patient_neuro_assessments" USING "btree" ("patient_id", "recorded_at");



CREATE INDEX "idx_neuro_tenant" ON "public"."patient_neuro_assessments" USING "btree" ("tenant_id");



CREATE INDEX "idx_newborn_patient" ON "public"."patient_newborn_assessments" USING "btree" ("patient_id");



CREATE INDEX "idx_newborn_tenant" ON "public"."patient_newborn_assessments" USING "btree" ("tenant_id");



CREATE INDEX "idx_newborn_tenant_recorded" ON "public"."patient_newborn_assessments" USING "btree" ("tenant_id", "recorded_at" DESC);



CREATE INDEX "idx_patient_admission_records_patient_id" ON "public"."patient_admission_records" USING "btree" ("patient_id");



CREATE INDEX "idx_patient_admission_records_tenant_id" ON "public"."patient_admission_records" USING "btree" ("tenant_id");



CREATE INDEX "idx_patient_advanced_directives_patient_id" ON "public"."patient_advanced_directives" USING "btree" ("patient_id");



CREATE INDEX "idx_patient_advanced_directives_tenant_id" ON "public"."patient_advanced_directives" USING "btree" ("tenant_id");



CREATE INDEX "idx_patient_alerts_acknowledged" ON "public"."patient_alerts" USING "btree" ("acknowledged");



CREATE INDEX "idx_patient_alerts_created_at" ON "public"."patient_alerts" USING "btree" ("created_at");



CREATE INDEX "idx_patient_alerts_expires_at" ON "public"."patient_alerts" USING "btree" ("expires_at");



CREATE INDEX "idx_patient_alerts_patient_id" ON "public"."patient_alerts" USING "btree" ("patient_id");



CREATE INDEX "idx_patient_alerts_priority" ON "public"."patient_alerts" USING "btree" ("priority");



CREATE INDEX "idx_patient_alerts_tenant_id" ON "public"."patient_alerts" USING "btree" ("tenant_id");



CREATE INDEX "idx_patient_alerts_type" ON "public"."patient_alerts" USING "btree" ("alert_type");



CREATE INDEX "idx_patient_images_created_at" ON "public"."patient_images" USING "btree" ("created_at");



CREATE INDEX "idx_patient_images_image_type" ON "public"."patient_images" USING "btree" ("image_type");



CREATE INDEX "idx_patient_images_patient_id" ON "public"."patient_images" USING "btree" ("patient_id");



CREATE INDEX "idx_patient_medications_barcode" ON "public"."patient_medications" USING "btree" ("barcode");



CREATE INDEX "idx_patient_medications_catalog_id" ON "public"."patient_medications" USING "btree" ("catalog_id");



CREATE INDEX "idx_patient_medications_category" ON "public"."patient_medications" USING "btree" ("category");



CREATE INDEX "idx_patient_medications_next_due" ON "public"."patient_medications" USING "btree" ("next_due");



CREATE INDEX "idx_patient_medications_patient_id" ON "public"."patient_medications" USING "btree" ("patient_id");



CREATE INDEX "idx_patient_medications_tenant_id" ON "public"."patient_medications" USING "btree" ("tenant_id");



CREATE INDEX "idx_patient_notes_student_name" ON "public"."patient_notes" USING "btree" ("student_name") WHERE ("student_name" IS NOT NULL);



CREATE INDEX "idx_patient_notes_type" ON "public"."patient_notes" USING "btree" ("type");



CREATE INDEX "idx_patient_templates_primary_categories" ON "public"."patient_templates" USING "gin" ("primary_categories");



CREATE INDEX "idx_patient_templates_tenant_id" ON "public"."patient_templates" USING "btree" ("tenant_id");



CREATE INDEX "idx_patient_vitals_patient_id" ON "public"."patient_vitals" USING "btree" ("patient_id");



CREATE INDEX "idx_patient_vitals_recorded_at" ON "public"."patient_vitals" USING "btree" ("recorded_at");



CREATE INDEX "idx_patient_vitals_student_name" ON "public"."patient_vitals" USING "btree" ("student_name") WHERE ("student_name" IS NOT NULL);



CREATE INDEX "idx_patient_vitals_tenant_id" ON "public"."patient_vitals" USING "btree" ("tenant_id");



CREATE INDEX "idx_patient_vitals_tenant_patient" ON "public"."patient_vitals" USING "btree" ("tenant_id", "patient_id");



CREATE INDEX "idx_patient_wounds_assessment_date" ON "public"."patient_wounds" USING "btree" ("assessment_date");



CREATE INDEX "idx_patients_avatar_id" ON "public"."patients" USING "btree" ("avatar_id");



CREATE INDEX "idx_patients_patient_id" ON "public"."patients" USING "btree" ("patient_id");



CREATE INDEX "idx_patients_room" ON "public"."patients" USING "btree" ("room_number", "bed_number");



CREATE INDEX "idx_patients_tenant_created" ON "public"."patients" USING "btree" ("tenant_id", "created_at" DESC);



CREATE INDEX "idx_patients_tenant_id" ON "public"."patients" USING "btree" ("tenant_id");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_programs_code" ON "public"."programs" USING "btree" ("code");



CREATE INDEX "idx_programs_is_active" ON "public"."programs" USING "btree" ("is_active");



CREATE INDEX "idx_programs_tenant_id" ON "public"."programs" USING "btree" ("tenant_id");



CREATE INDEX "idx_psa_patient_tenant" ON "public"."patient_system_assessments" USING "btree" ("patient_id", "tenant_id");



CREATE INDEX "idx_psa_recorded_at" ON "public"."patient_system_assessments" USING "btree" ("recorded_at" DESC);



CREATE INDEX "idx_psa_student_entries" ON "public"."patient_system_assessments" USING "btree" ("tenant_id") WHERE ("is_baseline" = false);



CREATE INDEX "idx_psa_system_type" ON "public"."patient_system_assessments" USING "btree" ("system_type", "tenant_id");



CREATE INDEX "idx_psa_tenant" ON "public"."patient_system_assessments" USING "btree" ("tenant_id");



CREATE INDEX "idx_simulation_active_ends_at" ON "public"."simulation_active" USING "btree" ("ends_at") WHERE ("status" = 'running'::"public"."simulation_active_status");



CREATE INDEX "idx_simulation_active_status" ON "public"."simulation_active" USING "btree" ("status");



CREATE INDEX "idx_simulation_active_status_ends" ON "public"."simulation_active" USING "btree" ("status", "ends_at") WHERE ("status" = 'running'::"public"."simulation_active_status");



CREATE INDEX "idx_simulation_active_template" ON "public"."simulation_active" USING "btree" ("template_id");



CREATE INDEX "idx_simulation_active_tenant" ON "public"."simulation_active" USING "btree" ("tenant_id");



CREATE INDEX "idx_simulation_active_tenant_status" ON "public"."simulation_active" USING "btree" ("tenant_id", "status");



CREATE INDEX "idx_simulation_auto_students_simulation_id" ON "public"."simulation_auto_students" USING "btree" ("simulation_id");



CREATE INDEX "idx_simulation_history_archived" ON "public"."simulation_history" USING "btree" ("archived", "completed_at" DESC);



CREATE INDEX "idx_simulation_history_completed" ON "public"."simulation_history" USING "btree" ("completed_at" DESC);



CREATE INDEX "idx_simulation_history_created_by" ON "public"."simulation_history" USING "btree" ("created_by");



CREATE INDEX "idx_simulation_history_instructor_name" ON "public"."simulation_history" USING "btree" ("instructor_name");



CREATE INDEX "idx_simulation_history_template" ON "public"."simulation_history" USING "btree" ("template_id");



CREATE INDEX "idx_simulation_participants_simulation_id" ON "public"."simulation_participants" USING "btree" ("simulation_id");



CREATE INDEX "idx_simulation_participants_user_id" ON "public"."simulation_participants" USING "btree" ("user_id");



CREATE INDEX "idx_simulation_participants_user_role" ON "public"."simulation_participants" USING "btree" ("user_id", "role");



CREATE INDEX "idx_simulation_templates_created_by" ON "public"."simulation_templates" USING "btree" ("created_by");



CREATE INDEX "idx_simulation_templates_folder" ON "public"."simulation_templates" USING "btree" ("folder");



CREATE INDEX "idx_simulation_templates_status" ON "public"."simulation_templates" USING "btree" ("status");



CREATE INDEX "idx_simulation_templates_tenant" ON "public"."simulation_templates" USING "btree" ("tenant_id");



CREATE INDEX "idx_student_roster_cohort_id" ON "public"."student_roster" USING "btree" ("cohort_id") WHERE ("cohort_id" IS NOT NULL);



CREATE INDEX "idx_student_roster_program_active" ON "public"."student_roster" USING "btree" ("program_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_student_roster_program_id" ON "public"."student_roster" USING "btree" ("program_id");



CREATE INDEX "idx_student_roster_student_number" ON "public"."student_roster" USING "btree" ("student_number");



CREATE INDEX "idx_student_roster_user_id" ON "public"."student_roster" USING "btree" ("user_id");



CREATE INDEX "idx_system_logs_component" ON "public"."system_logs" USING "btree" ("component", "timestamp" DESC);



CREATE INDEX "idx_system_logs_level" ON "public"."system_logs" USING "btree" ("log_level", "timestamp" DESC);



CREATE INDEX "idx_system_logs_tenant_id" ON "public"."system_logs" USING "btree" ("tenant_id", "timestamp" DESC);



CREATE INDEX "idx_system_logs_timestamp" ON "public"."system_logs" USING "btree" ("timestamp" DESC);



CREATE INDEX "idx_system_logs_type" ON "public"."system_logs" USING "btree" ("log_type", "timestamp" DESC);



CREATE INDEX "idx_system_logs_user_id" ON "public"."system_logs" USING "btree" ("user_id", "timestamp" DESC);



CREATE INDEX "idx_template_states_template" ON "public"."simulation_template_states" USING "btree" ("template_id", "sort_order");



CREATE INDEX "idx_tenant_users_active" ON "public"."tenant_users" USING "btree" ("is_active");



CREATE INDEX "idx_tenant_users_tenant_id" ON "public"."tenant_users" USING "btree" ("tenant_id");



CREATE INDEX "idx_tenant_users_user_id" ON "public"."tenant_users" USING "btree" ("user_id");



CREATE INDEX "idx_tenant_users_user_tenant" ON "public"."tenant_users" USING "btree" ("user_id", "tenant_id");



CREATE INDEX "idx_tenant_users_user_tenant_active" ON "public"."tenant_users" USING "btree" ("user_id", "tenant_id", "is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_tenants_admin_user_id" ON "public"."tenants" USING "btree" ("admin_user_id");



CREATE INDEX "idx_tenants_id" ON "public"."tenants" USING "btree" ("id");



CREATE INDEX "idx_tenants_program_id" ON "public"."tenants" USING "btree" ("program_id");



CREATE INDEX "idx_tenants_simulation" ON "public"."tenants" USING "btree" ("is_simulation") WHERE ("is_simulation" = true);



CREATE INDEX "idx_tenants_status" ON "public"."tenants" USING "btree" ("status");



CREATE INDEX "idx_tenants_subdomain" ON "public"."tenants" USING "btree" ("subdomain");



CREATE INDEX "idx_tenants_type" ON "public"."tenants" USING "btree" ("tenant_type");



CREATE INDEX "idx_tr_alp_patient_tenant" ON "public"."tr_active_living_profiles" USING "btree" ("patient_id", "tenant_id");



CREATE INDEX "idx_tr_alp_tenant" ON "public"."tr_active_living_profiles" USING "btree" ("tenant_id");



CREATE INDEX "idx_tr_interps_group" ON "public"."tr_interdisciplinary_interps" USING "btree" ("tenant_id", "score_group");



CREATE INDEX "idx_tr_interps_patient_tenant" ON "public"."tr_interdisciplinary_interps" USING "btree" ("patient_id", "tenant_id");



CREATE INDEX "idx_tr_notes_patient_tenant" ON "public"."tr_progress_notes" USING "btree" ("patient_id", "tenant_id", "created_at" DESC);



CREATE INDEX "idx_tr_notes_tenant" ON "public"."tr_progress_notes" USING "btree" ("tenant_id");



CREATE INDEX "idx_tr_plan_patient_tenant" ON "public"."tr_treatment_plan_rows" USING "btree" ("patient_id", "tenant_id", "sort_order");



CREATE INDEX "idx_tr_plan_tenant" ON "public"."tr_treatment_plan_rows" USING "btree" ("tenant_id");



CREATE INDEX "idx_tr_scores_baseline" ON "public"."tr_assessment_scores" USING "btree" ("tenant_id", "is_baseline");



CREATE INDEX "idx_tr_scores_patient_tenant" ON "public"."tr_assessment_scores" USING "btree" ("patient_id", "tenant_id");



CREATE INDEX "idx_tr_scores_tool" ON "public"."tr_assessment_scores" USING "btree" ("tenant_id", "tool_name");



CREATE INDEX "idx_tr_screening_baseline" ON "public"."tr_screening_entries" USING "btree" ("tenant_id", "is_baseline");



CREATE INDEX "idx_tr_screening_patient_tenant" ON "public"."tr_screening_entries" USING "btree" ("patient_id", "tenant_id");



CREATE INDEX "idx_tr_screening_tenant" ON "public"."tr_screening_entries" USING "btree" ("tenant_id");



CREATE INDEX "idx_user_profiles_active" ON "public"."user_profiles" USING "btree" ("is_active");



CREATE INDEX "idx_user_profiles_default_tenant_id" ON "public"."user_profiles" USING "btree" ("default_tenant_id");



CREATE INDEX "idx_user_profiles_email" ON "public"."user_profiles" USING "btree" ("email");



CREATE INDEX "idx_user_profiles_id" ON "public"."user_profiles" USING "btree" ("id");



COMMENT ON INDEX "public"."idx_user_profiles_id" IS 'Speeds up user profile lookups during authentication';



CREATE INDEX "idx_user_profiles_id_role" ON "public"."user_profiles" USING "btree" ("id", "role");



CREATE INDEX "idx_user_profiles_role" ON "public"."user_profiles" USING "btree" ("role");



CREATE INDEX "idx_user_profiles_role_active" ON "public"."user_profiles" USING "btree" ("role", "is_active");



CREATE INDEX "idx_user_profiles_simulation_only" ON "public"."user_profiles" USING "btree" ("simulation_only") WHERE ("simulation_only" = true);



CREATE INDEX "idx_user_profiles_super_admin_check" ON "public"."user_profiles" USING "btree" ("id") WHERE (("role" = 'super_admin'::"public"."user_role") AND ("is_active" = true));



CREATE INDEX "idx_user_programs_program_id" ON "public"."user_programs" USING "btree" ("program_id");



CREATE INDEX "idx_user_programs_user_id" ON "public"."user_programs" USING "btree" ("user_id");



CREATE INDEX "idx_user_sessions_status" ON "public"."user_sessions" USING "btree" ("status");



CREATE INDEX "idx_user_sessions_tenant_id" ON "public"."user_sessions" USING "btree" ("tenant_id");



CREATE INDEX "idx_user_sessions_user_id" ON "public"."user_sessions" USING "btree" ("user_id");



CREATE INDEX "idx_user_tenant_active" ON "public"."tenant_users" USING "btree" ("user_id", "is_active") WHERE ("is_active" = true);



COMMENT ON INDEX "public"."idx_user_tenant_active" IS 'Optimizes tenant assignment queries for active users';



CREATE INDEX "idx_user_tenant_cache_tenant_id" ON "public"."user_tenant_cache" USING "btree" ("tenant_id");



CREATE INDEX "idx_user_tenant_cache_user" ON "public"."user_tenant_cache" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_user_tenant_cache_user_tenant" ON "public"."user_tenant_cache" USING "btree" ("user_id", "tenant_id");



COMMENT ON INDEX "public"."idx_user_tenant_cache_user_tenant" IS 'Allows users (especially super admins) to be cached for multiple tenants';



CREATE INDEX "idx_wound_assessments_assessed_at" ON "public"."wound_assessments" USING "btree" ("assessed_at" DESC);



CREATE INDEX "idx_wound_assessments_assessment_data" ON "public"."wound_assessments" USING "gin" ("assessment_data");



CREATE INDEX "idx_wound_assessments_assessment_date" ON "public"."wound_assessments" USING "btree" ("assessment_date");



CREATE INDEX "idx_wound_assessments_assessor_id" ON "public"."wound_assessments" USING "btree" ("assessor_id");



CREATE INDEX "idx_wound_assessments_device_id" ON "public"."wound_assessments" USING "btree" ("device_id");



CREATE INDEX "idx_wound_assessments_device_type" ON "public"."wound_assessments" USING "btree" ("device_type") WHERE ("device_type" IS NOT NULL);



CREATE INDEX "idx_wound_assessments_patient_id" ON "public"."wound_assessments" USING "btree" ("patient_id");



CREATE INDEX "idx_wound_assessments_student_name" ON "public"."wound_assessments" USING "btree" ("student_name");



CREATE INDEX "idx_wound_assessments_tenant_id" ON "public"."wound_assessments" USING "btree" ("tenant_id");



CREATE INDEX "idx_wound_assessments_wound_id" ON "public"."wound_assessments" USING "btree" ("wound_id");



CREATE INDEX "idx_wound_treatments_administered_by_id" ON "public"."wound_treatments" USING "btree" ("administered_by_id");



CREATE INDEX "idx_wound_treatments_assessment_id" ON "public"."wound_treatments" USING "btree" ("wound_assessment_id");



CREATE INDEX "idx_wound_treatments_patient_id" ON "public"."wound_treatments" USING "btree" ("patient_id");



CREATE INDEX "idx_wound_treatments_tenant_id" ON "public"."wound_treatments" USING "btree" ("tenant_id");



CREATE INDEX "idx_wound_treatments_treatment_date" ON "public"."wound_treatments" USING "btree" ("treatment_date");



CREATE INDEX "idx_wounds_location" ON "public"."wounds" USING "btree" ("location_id");



CREATE INDEX "idx_wounds_patient" ON "public"."wounds" USING "btree" ("patient_id");



CREATE INDEX "idx_wounds_tenant" ON "public"."wounds" USING "btree" ("tenant_id");



CREATE INDEX "patient_notes_patient_id_idx" ON "public"."patient_notes" USING "btree" ("patient_id");



CREATE INDEX "patient_notes_tenant_id_idx" ON "public"."patient_notes" USING "btree" ("tenant_id");



CREATE INDEX "patient_wounds_patient_id_idx" ON "public"."patient_wounds" USING "btree" ("patient_id");



CREATE INDEX "user_sessions_logout_time_idx" ON "public"."user_sessions" USING "btree" ("logout_time");



CREATE OR REPLACE TRIGGER "after_program_insert_create_tenant" AFTER INSERT ON "public"."programs" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_create_program_tenant"();



CREATE OR REPLACE TRIGGER "avatar_locations_set_tenant_id" BEFORE INSERT ON "public"."avatar_locations" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "devices_set_tenant_id" BEFORE INSERT ON "public"."devices" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "devices_set_updated_at" BEFORE UPDATE ON "public"."devices" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "lab_orders_set_tenant_id" BEFORE INSERT ON "public"."lab_orders" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "lab_orders_set_updated_at" BEFORE UPDATE ON "public"."lab_orders" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "medication_admin_set_tenant_id" BEFORE INSERT ON "public"."medication_administrations" FOR EACH ROW EXECUTE FUNCTION "public"."set_medication_admin_tenant_id"();



CREATE OR REPLACE TRIGGER "medication_administrations_updated_at" BEFORE UPDATE ON "public"."medication_administrations" FOR EACH ROW EXECUTE FUNCTION "public"."update_medication_administrations_updated_at"();



CREATE OR REPLACE TRIGGER "patient_alerts_tenant_trigger" BEFORE INSERT OR UPDATE ON "public"."patient_alerts" FOR EACH ROW EXECUTE FUNCTION "public"."set_alert_tenant_id"();



CREATE OR REPLACE TRIGGER "prevent_medication_id_changes" BEFORE UPDATE ON "public"."patient_medications" FOR EACH ROW EXECUTE FUNCTION "public"."protect_medication_identifiers"();



CREATE OR REPLACE TRIGGER "prevent_patient_id_changes" BEFORE UPDATE ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."protect_patient_identifiers"();



CREATE OR REPLACE TRIGGER "programs_updated_at_trigger" BEFORE UPDATE ON "public"."programs" FOR EACH ROW EXECUTE FUNCTION "public"."update_programs_updated_at"();



CREATE OR REPLACE TRIGGER "protect_super_admin_role_trigger" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_super_admin_role"();



CREATE OR REPLACE TRIGGER "set_patient_notes_updated_at" BEFORE UPDATE ON "public"."patient_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_patient_notes_updated_at"();



CREATE OR REPLACE TRIGGER "set_tenant_id_before_insert" BEFORE INSERT ON "public"."bowel_records" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_before_insert" BEFORE INSERT ON "public"."diabetic_records" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_before_insert" BEFORE INSERT ON "public"."medication_administrations" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_before_insert" BEFORE INSERT ON "public"."patient_admission_records" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_before_insert" BEFORE INSERT ON "public"."patient_advanced_directives" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_before_insert" BEFORE INSERT ON "public"."patient_alerts" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_before_insert" BEFORE INSERT ON "public"."patient_medications" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_before_insert" BEFORE INSERT ON "public"."patient_notes" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_before_insert" BEFORE INSERT ON "public"."patient_vitals" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_tenant_id_before_insert" BEFORE INSERT ON "public"."patients" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."tenant_users" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."user_profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "student_roster_updated_at_trigger" BEFORE UPDATE ON "public"."student_roster" FOR EACH ROW EXECUTE FUNCTION "public"."update_student_roster_updated_at"();



CREATE OR REPLACE TRIGGER "tenant_users_cache_refresh" AFTER INSERT OR DELETE OR UPDATE ON "public"."tenant_users" FOR EACH STATEMENT EXECUTE FUNCTION "public"."trigger_refresh_user_tenant_cache"();



CREATE OR REPLACE TRIGGER "trigger_auto_tag_simulation" BEFORE INSERT ON "public"."simulation_active" FOR EACH ROW EXECUTE FUNCTION "public"."auto_tag_simulation_from_template"();



CREATE OR REPLACE TRIGGER "trigger_set_wound_assessment_tenant_id" BEFORE INSERT ON "public"."wound_assessments" FOR EACH ROW EXECUTE FUNCTION "public"."set_wound_assessment_tenant_id"();



CREATE OR REPLACE TRIGGER "trigger_set_wound_treatment_tenant_id" BEFORE INSERT ON "public"."wound_treatments" FOR EACH ROW EXECUTE FUNCTION "public"."set_wound_treatment_tenant_id"();



CREATE OR REPLACE TRIGGER "trigger_update_patient_intake_output_events_updated_at" BEFORE UPDATE ON "public"."patient_intake_output_events" FOR EACH ROW EXECUTE FUNCTION "public"."update_patient_intake_output_events_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_wound_assessments_updated_at" BEFORE UPDATE ON "public"."wound_assessments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_wound_treatments_updated_at" BEFORE UPDATE ON "public"."wound_treatments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_contact_submissions_updated_at" BEFORE UPDATE ON "public"."contact_submissions" FOR EACH ROW EXECUTE FUNCTION "public"."update_contact_submissions_updated_at"();



CREATE OR REPLACE TRIGGER "update_device_assessments_updated_at" BEFORE UPDATE ON "public"."device_assessments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_handover_notes_updated_at" BEFORE UPDATE ON "public"."handover_notes" FOR EACH ROW EXECUTE FUNCTION "public"."update_handover_notes_updated_at"();



CREATE OR REPLACE TRIGGER "update_kb_walkthroughs_updated_at" BEFORE UPDATE ON "public"."kb_walkthroughs" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "update_lab_panels_updated_at" BEFORE UPDATE ON "public"."lab_panels" FOR EACH ROW EXECUTE FUNCTION "public"."update_lab_updated_at"();



CREATE OR REPLACE TRIGGER "update_lab_result_refs_updated_at" BEFORE UPDATE ON "public"."lab_result_refs" FOR EACH ROW EXECUTE FUNCTION "public"."update_lab_updated_at"();



CREATE OR REPLACE TRIGGER "update_lab_results_updated_at" BEFORE UPDATE ON "public"."lab_results" FOR EACH ROW EXECUTE FUNCTION "public"."update_lab_updated_at"();



CREATE OR REPLACE TRIGGER "update_panel_status_on_result_ack" AFTER UPDATE OF "ack_at" ON "public"."lab_results" FOR EACH ROW EXECUTE FUNCTION "public"."update_lab_panel_status"();



CREATE OR REPLACE TRIGGER "wounds_set_tenant_id" BEFORE INSERT ON "public"."wounds" FOR EACH ROW EXECUTE FUNCTION "public"."auto_set_tenant_id"();



CREATE OR REPLACE TRIGGER "wounds_set_updated_at" BEFORE UPDATE ON "public"."wounds" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."audit_logs"
    ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."avatar_locations"
    ADD CONSTRAINT "avatar_locations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."avatar_locations"
    ADD CONSTRAINT "avatar_locations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."avatar_locations"
    ADD CONSTRAINT "avatar_locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_assessments"
    ADD CONSTRAINT "device_assessments_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."device_assessments"
    ADD CONSTRAINT "device_assessments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."avatar_locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."devices"
    ADD CONSTRAINT "devices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."diabetic_records"
    ADD CONSTRAINT "diabetic_records_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."diabetic_records"
    ADD CONSTRAINT "diabetic_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctors_orders"
    ADD CONSTRAINT "doctors_orders_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."doctors_orders"
    ADD CONSTRAINT "doctors_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."doctors_orders"
    ADD CONSTRAINT "doctors_orders_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctors_orders"
    ADD CONSTRAINT "doctors_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."doctors_orders"
    ADD CONSTRAINT "doctors_orders_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "fk_user_sessions_tenant" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."handover_notes"
    ADD CONSTRAINT "handover_notes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."kb_walkthroughs"
    ADD CONSTRAINT "kb_walkthroughs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."lab_ack_events"
    ADD CONSTRAINT "lab_ack_events_ack_by_fkey" FOREIGN KEY ("ack_by") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



COMMENT ON CONSTRAINT "lab_ack_events_ack_by_fkey" ON "public"."lab_ack_events" IS 'Foreign key to user_profiles for Supabase joins';



ALTER TABLE ONLY "public"."lab_ack_events"
    ADD CONSTRAINT "lab_ack_events_panel_id_fkey" FOREIGN KEY ("panel_id") REFERENCES "public"."lab_panels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lab_ack_events"
    ADD CONSTRAINT "lab_ack_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lab_orders"
    ADD CONSTRAINT "lab_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."lab_orders"
    ADD CONSTRAINT "lab_orders_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lab_orders"
    ADD CONSTRAINT "lab_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lab_orders"
    ADD CONSTRAINT "lab_orders_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."lab_panels"
    ADD CONSTRAINT "lab_panels_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



COMMENT ON CONSTRAINT "lab_panels_entered_by_fkey" ON "public"."lab_panels" IS 'Foreign key to user_profiles for Supabase joins';



ALTER TABLE ONLY "public"."lab_panels"
    ADD CONSTRAINT "lab_panels_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lab_results"
    ADD CONSTRAINT "lab_results_ack_by_fkey" FOREIGN KEY ("ack_by") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



COMMENT ON CONSTRAINT "lab_results_ack_by_fkey" ON "public"."lab_results" IS 'Foreign key to user_profiles for Supabase joins';



ALTER TABLE ONLY "public"."lab_results"
    ADD CONSTRAINT "lab_results_entered_by_fkey" FOREIGN KEY ("entered_by") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



COMMENT ON CONSTRAINT "lab_results_entered_by_fkey" ON "public"."lab_results" IS 'Foreign key to user_profiles for Supabase joins';



ALTER TABLE ONLY "public"."lab_results"
    ADD CONSTRAINT "lab_results_panel_id_fkey" FOREIGN KEY ("panel_id") REFERENCES "public"."lab_panels"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lab_results"
    ADD CONSTRAINT "lab_results_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."medication_administrations"
    ADD CONSTRAINT "medication_administrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."medications_catalog"
    ADD CONSTRAINT "medications_catalog_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."medications_catalog"
    ADD CONSTRAINT "medications_catalog_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."multi_tenant_admins"
    ADD CONSTRAINT "multi_tenant_admins_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_alerts"
    ADD CONSTRAINT "patient_alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."patient_alerts"
    ADD CONSTRAINT "patient_alerts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_alerts"
    ADD CONSTRAINT "patient_alerts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."patient_bbit_entries"
    ADD CONSTRAINT "patient_bbit_entries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_images"
    ADD CONSTRAINT "patient_images_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_images"
    ADD CONSTRAINT "patient_images_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."patient_images"
    ADD CONSTRAINT "patient_images_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."patient_intake_output_events"
    ADD CONSTRAINT "patient_intake_output_events_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."patient_intake_output_events"
    ADD CONSTRAINT "patient_intake_output_events_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_intake_output_events"
    ADD CONSTRAINT "patient_intake_output_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_medications"
    ADD CONSTRAINT "patient_medications_catalog_id_fkey" FOREIGN KEY ("catalog_id") REFERENCES "public"."medications_catalog"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."patient_medications"
    ADD CONSTRAINT "patient_medications_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_medications_templates"
    ADD CONSTRAINT "patient_medications_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."patient_medications"
    ADD CONSTRAINT "patient_medications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."patient_neuro_assessments"
    ADD CONSTRAINT "patient_neuro_assessments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_newborn_assessments"
    ADD CONSTRAINT "patient_newborn_assessments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_notes"
    ADD CONSTRAINT "patient_notes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."patient_notes"
    ADD CONSTRAINT "patient_notes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_notes"
    ADD CONSTRAINT "patient_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_system_assessments"
    ADD CONSTRAINT "patient_system_assessments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_system_assessments"
    ADD CONSTRAINT "patient_system_assessments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_vitals"
    ADD CONSTRAINT "patient_vitals_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patient_vitals_templates"
    ADD CONSTRAINT "patient_vitals_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."patient_vitals"
    ADD CONSTRAINT "patient_vitals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."patient_wounds"
    ADD CONSTRAINT "patient_wounds_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."patients"
    ADD CONSTRAINT "patients_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."simulation_active"
    ADD CONSTRAINT "simulation_active_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."simulation_active"
    ADD CONSTRAINT "simulation_active_current_state_id_fkey" FOREIGN KEY ("current_state_id") REFERENCES "public"."simulation_template_states"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."simulation_active"
    ADD CONSTRAINT "simulation_active_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."simulation_templates"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."simulation_active"
    ADD CONSTRAINT "simulation_active_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."simulation_activity_log"
    ADD CONSTRAINT "simulation_activity_log_simulation_id_fkey" FOREIGN KEY ("simulation_id") REFERENCES "public"."simulation_active"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."simulation_activity_log"
    ADD CONSTRAINT "simulation_activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."simulation_auto_students"
    ADD CONSTRAINT "simulation_auto_students_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."simulation_auto_students"
    ADD CONSTRAINT "simulation_auto_students_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."simulation_auto_students"
    ADD CONSTRAINT "simulation_auto_students_simulation_id_fkey" FOREIGN KEY ("simulation_id") REFERENCES "public"."simulation_active"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."simulation_auto_students"
    ADD CONSTRAINT "simulation_auto_students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."simulation_history"
    ADD CONSTRAINT "simulation_history_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "public"."user_profiles"("id");



ALTER TABLE ONLY "public"."simulation_history"
    ADD CONSTRAINT "simulation_history_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."simulation_history"
    ADD CONSTRAINT "simulation_history_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."simulation_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."simulation_participants"
    ADD CONSTRAINT "simulation_participants_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."simulation_participants"
    ADD CONSTRAINT "simulation_participants_simulation_id_fkey" FOREIGN KEY ("simulation_id") REFERENCES "public"."simulation_active"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."simulation_participants"
    ADD CONSTRAINT "simulation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."simulation_template_states"
    ADD CONSTRAINT "simulation_template_states_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."simulation_template_states"
    ADD CONSTRAINT "simulation_template_states_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."simulation_templates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."simulation_template_states"
    ADD CONSTRAINT "simulation_template_states_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."simulation_templates"
    ADD CONSTRAINT "simulation_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."simulation_templates"
    ADD CONSTRAINT "simulation_templates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_roster"
    ADD CONSTRAINT "student_roster_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."student_roster"
    ADD CONSTRAINT "student_roster_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."student_roster"
    ADD CONSTRAINT "student_roster_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_logs"
    ADD CONSTRAINT "system_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."system_logs"
    ADD CONSTRAINT "system_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenant_users"
    ADD CONSTRAINT "tenant_users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "public"."user_profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_parent_tenant_id_fkey" FOREIGN KEY ("parent_tenant_id") REFERENCES "public"."tenants"("id");



ALTER TABLE ONLY "public"."tenants"
    ADD CONSTRAINT "tenants_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tr_active_living_profiles"
    ADD CONSTRAINT "tr_active_living_profiles_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tr_active_living_profiles"
    ADD CONSTRAINT "tr_active_living_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tr_assessment_scores"
    ADD CONSTRAINT "tr_assessment_scores_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tr_assessment_scores"
    ADD CONSTRAINT "tr_assessment_scores_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tr_interdisciplinary_interps"
    ADD CONSTRAINT "tr_interdisciplinary_interps_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tr_interdisciplinary_interps"
    ADD CONSTRAINT "tr_interdisciplinary_interps_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tr_progress_notes"
    ADD CONSTRAINT "tr_progress_notes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tr_progress_notes"
    ADD CONSTRAINT "tr_progress_notes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tr_screening_entries"
    ADD CONSTRAINT "tr_screening_entries_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tr_screening_entries"
    ADD CONSTRAINT "tr_screening_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tr_treatment_plan_rows"
    ADD CONSTRAINT "tr_treatment_plan_rows_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tr_treatment_plan_rows"
    ADD CONSTRAINT "tr_treatment_plan_rows_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_default_tenant_id_fkey" FOREIGN KEY ("default_tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_programs"
    ADD CONSTRAINT "user_programs_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_programs"
    ADD CONSTRAINT "user_programs_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_programs"
    ADD CONSTRAINT "user_programs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wound_assessments"
    ADD CONSTRAINT "wound_assessments_assessor_id_fkey" FOREIGN KEY ("assessor_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."wound_assessments"
    ADD CONSTRAINT "wound_assessments_device_id_fkey" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wound_assessments"
    ADD CONSTRAINT "wound_assessments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wound_assessments"
    ADD CONSTRAINT "wound_assessments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wound_assessments"
    ADD CONSTRAINT "wound_assessments_wound_id_fkey" FOREIGN KEY ("wound_id") REFERENCES "public"."wounds"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wound_treatments"
    ADD CONSTRAINT "wound_treatments_administered_by_id_fkey" FOREIGN KEY ("administered_by_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."wound_treatments"
    ADD CONSTRAINT "wound_treatments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wound_treatments"
    ADD CONSTRAINT "wound_treatments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wounds"
    ADD CONSTRAINT "wounds_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."wounds"
    ADD CONSTRAINT "wounds_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."avatar_locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wounds"
    ADD CONSTRAINT "wounds_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wounds"
    ADD CONSTRAINT "wounds_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;



CREATE POLICY "Anyone can submit contact form" ON "public"."contact_submissions" FOR INSERT TO "anon", "authenticated" WITH CHECK (true);



CREATE POLICY "Authenticated users can delete wound assessments" ON "public"."wound_assessments" FOR DELETE USING ((( SELECT ( SELECT "auth"."role"() AS "role") AS "role") = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can insert audit logs" ON "public"."audit_logs" FOR INSERT WITH CHECK (("user_id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")));



CREATE POLICY "Authenticated users can insert wound assessments" ON "public"."wound_assessments" FOR INSERT WITH CHECK ((( SELECT ( SELECT "auth"."role"() AS "role") AS "role") = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can update wound assessments" ON "public"."wound_assessments" FOR UPDATE USING ((( SELECT ( SELECT "auth"."role"() AS "role") AS "role") = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can view wound assessments" ON "public"."wound_assessments" FOR SELECT USING ((( SELECT ( SELECT "auth"."role"() AS "role") AS "role") = 'authenticated'::"text"));



CREATE POLICY "Authorized users can delete diabetic records within tenant" ON "public"."diabetic_records" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'nurse'::"public"."user_role"])) AND ("diabetic_records"."tenant_id" = "diabetic_records"."tenant_id")))));



CREATE POLICY "Multi-tenant admins can manage multi_tenant_admins" ON "public"."multi_tenant_admins" USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))) OR ("user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))));



CREATE POLICY "Super admins can update contact submissions" ON "public"."contact_submissions" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))));



CREATE POLICY "Super admins can view contact submissions" ON "public"."contact_submissions" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))));



CREATE POLICY "Tenant isolation for wound treatments" ON "public"."wound_treatments" USING (("tenant_id" = ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")) AND ("tenant_users"."is_active" = true)))));



CREATE POLICY "Users can create handover notes" ON "public"."handover_notes" FOR INSERT WITH CHECK ((( SELECT ( SELECT "auth"."role"() AS "role") AS "role") = 'authenticated'::"text"));



CREATE POLICY "Users can delete admission records for their tenant" ON "public"."patient_admission_records" FOR DELETE USING (("tenant_id" = ( SELECT "patient_admission_records"."tenant_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete advanced directives for their tenant" ON "public"."patient_advanced_directives" FOR DELETE USING (("tenant_id" = ( SELECT "patient_advanced_directives"."tenant_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete bowel records for their tenant" ON "public"."bowel_records" FOR DELETE USING (("tenant_id" = ( SELECT "bowel_records"."tenant_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete notes for their tenant" ON "public"."patient_notes" FOR DELETE USING (("tenant_id" = ( SELECT "patient_notes"."tenant_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can delete their own new handover notes" ON "public"."handover_notes" FOR DELETE USING ((((( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid"))::"text" = ("created_by")::"text") AND ("created_at" > ("now"() - '01:00:00'::interval))));



CREATE POLICY "Users can insert admission records for their tenant" ON "public"."patient_admission_records" FOR INSERT WITH CHECK (("tenant_id" = ( SELECT "patient_admission_records"."tenant_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert advanced directives for their tenant" ON "public"."patient_advanced_directives" FOR INSERT WITH CHECK (("tenant_id" = ( SELECT "patient_advanced_directives"."tenant_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert bowel records for their tenant" ON "public"."bowel_records" FOR INSERT WITH CHECK (("tenant_id" = ( SELECT "bowel_records"."tenant_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can insert diabetic records for their tenant" ON "public"."diabetic_records" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "diabetic_records"."tenant_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")))));



CREATE POLICY "Users can insert notes for their tenant" ON "public"."patient_notes" FOR INSERT WITH CHECK (("tenant_id" = ( SELECT "patient_notes"."tenant_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update admission records for their tenant" ON "public"."patient_admission_records" FOR UPDATE USING (("tenant_id" = ( SELECT "patient_admission_records"."tenant_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update advanced directives for their tenant" ON "public"."patient_advanced_directives" FOR UPDATE USING (("tenant_id" = ( SELECT "patient_advanced_directives"."tenant_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update bowel records for their tenant" ON "public"."bowel_records" FOR UPDATE USING (("tenant_id" = ( SELECT "bowel_records"."tenant_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update notes for their tenant" ON "public"."patient_notes" FOR UPDATE USING (("tenant_id" = ( SELECT "patient_notes"."tenant_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can update their own diabetic records within tenant" ON "public"."diabetic_records" FOR UPDATE USING ((("recorded_by" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")) AND ("tenant_id" IN ( SELECT "diabetic_records"."tenant_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid"))))));



CREATE POLICY "Users can view admission records for their tenant" ON "public"."patient_admission_records" FOR SELECT USING (("tenant_id" = ( SELECT "patient_admission_records"."tenant_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view advanced directives for their tenant" ON "public"."patient_advanced_directives" FOR SELECT USING (("tenant_id" = ( SELECT "patient_advanced_directives"."tenant_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view bowel records for their tenant" ON "public"."bowel_records" FOR SELECT USING (("tenant_id" = ( SELECT "bowel_records"."tenant_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "Users can view diabetic records for their tenant" ON "public"."diabetic_records" FOR SELECT USING (("tenant_id" IN ( SELECT "diabetic_records"."tenant_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")))));



CREATE POLICY "Users can view handover notes for accessible patients" ON "public"."handover_notes" FOR SELECT USING ((( SELECT ( SELECT "auth"."role"() AS "role") AS "role") = 'authenticated'::"text"));



CREATE POLICY "Users can view notes for their tenant" ON "public"."patient_notes" FOR SELECT USING (("tenant_id" = ( SELECT "patient_notes"."tenant_id"
   FROM "public"."user_profiles"
  WHERE ("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")))));



CREATE POLICY "active_delete_policy" ON "public"."simulation_active" FOR DELETE TO "authenticated" USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM ("public"."user_profiles" "up"
     JOIN "public"."tenant_users" "tu" ON (("tu"."user_id" = "up"."id")))
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'admin'::"public"."user_role") AND ("tu"."tenant_id" = "simulation_active"."tenant_id") AND ("tu"."is_active" = true)))) OR ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'instructor'::"public"."user_role")))) AND (("primary_categories" IS NULL) OR ("primary_categories" = '{}'::"text"[]) OR (EXISTS ( SELECT 1
   FROM ("public"."user_programs" "up_prog"
     JOIN "public"."programs" "prog" ON (("prog"."id" = "up_prog"."program_id")))
  WHERE (("up_prog"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("prog"."code" = ANY ("simulation_active"."primary_categories")))))))));



COMMENT ON POLICY "active_delete_policy" ON "public"."simulation_active" IS 'Instructors can delete simulations for their assigned programs. Super admins, coordinators, admins, and creators have full access.';



CREATE POLICY "active_insert_policy" ON "public"."simulation_active" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'admin'::"public"."user_role", 'instructor'::"public"."user_role", 'coordinator'::"public"."user_role"]))))));



COMMENT ON POLICY "active_insert_policy" ON "public"."simulation_active" IS 'Super admins, coordinators, admins, and instructors can create simulations. Categories are validated by application logic.';



CREATE POLICY "active_select_instructor_programs" ON "public"."simulation_active" FOR SELECT TO "authenticated" USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM ("public"."user_profiles" "up"
     JOIN "public"."tenant_users" "tu" ON (("tu"."user_id" = "up"."id")))
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'admin'::"public"."user_role") AND ("tu"."tenant_id" = "simulation_active"."tenant_id") AND ("tu"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."simulation_participants" "sp"
  WHERE (("sp"."simulation_id" = "simulation_active"."id") AND ("sp"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))) OR ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'instructor'::"public"."user_role")))) AND (("primary_categories" IS NULL) OR ("primary_categories" = '{}'::"text"[]) OR (EXISTS ( SELECT 1
   FROM ("public"."user_programs" "up_prog"
     JOIN "public"."programs" "prog" ON (("prog"."id" = "up_prog"."program_id")))
  WHERE (("up_prog"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("prog"."code" = ANY ("simulation_active"."primary_categories")))))))));



COMMENT ON POLICY "active_select_instructor_programs" ON "public"."simulation_active" IS 'Instructors see active simulations tagged with their assigned program codes. Super admins, coordinators, creators, and participants see relevant sims.';



CREATE POLICY "active_update_policy" ON "public"."simulation_active" FOR UPDATE TO "authenticated" USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM ("public"."user_profiles" "up"
     JOIN "public"."tenant_users" "tu" ON (("tu"."user_id" = "up"."id")))
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'admin'::"public"."user_role") AND ("tu"."tenant_id" = "simulation_active"."tenant_id") AND ("tu"."is_active" = true)))) OR ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'instructor'::"public"."user_role")))) AND (("primary_categories" IS NULL) OR ("primary_categories" = '{}'::"text"[]) OR (EXISTS ( SELECT 1
   FROM ("public"."user_programs" "up_prog"
     JOIN "public"."programs" "prog" ON (("prog"."id" = "up_prog"."program_id")))
  WHERE (("up_prog"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("prog"."code" = ANY ("simulation_active"."primary_categories"))))))))) WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role", 'admin'::"public"."user_role"]))))) OR ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'instructor'::"public"."user_role")))) AND (("primary_categories" IS NULL) OR ("primary_categories" = '{}'::"text"[]) OR (EXISTS ( SELECT 1
   FROM ("public"."user_programs" "up_prog"
     JOIN "public"."programs" "prog" ON (("prog"."id" = "up_prog"."program_id")))
  WHERE (("up_prog"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("prog"."code" = ANY ("simulation_active"."primary_categories")))))))));



COMMENT ON POLICY "active_update_policy" ON "public"."simulation_active" IS 'Instructors can update (start/stop/pause) simulations for their assigned programs. Super admins, coordinators, admins, and creators have full access.';



CREATE POLICY "activity_log_delete_policy" ON "public"."simulation_activity_log" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'super_admin'::"public"."user_role")))));



CREATE POLICY "activity_log_insert_policy" ON "public"."simulation_activity_log" FOR INSERT WITH CHECK (("user_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "activity_log_select_policy" ON "public"."simulation_activity_log" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR ("simulation_id" IN ( SELECT "simulation_participants"."simulation_id"
   FROM "public"."simulation_participants"
  WHERE ("simulation_participants"."user_id" = ( SELECT "auth"."uid"() AS "uid")))) OR ("simulation_id" IN ( SELECT "simulation_active"."id"
   FROM "public"."simulation_active"
  WHERE ("simulation_active"."created_by" = ( SELECT "auth"."uid"() AS "uid")))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'admin'::"public"."user_role", 'instructor'::"public"."user_role"])))))));



ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_logs_consolidated_select" ON "public"."audit_logs" FOR SELECT USING (("user_id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")));



ALTER TABLE "public"."avatar_locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "bbit_entries_tenant_isolation" ON "public"."patient_bbit_entries" TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))))) WITH CHECK ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role"))))));



ALTER TABLE "public"."bowel_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "catalog_admin_write" ON "public"."medications_catalog" TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."is_active" = true)))) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'coordinator'::"public"."user_role"]))))))) WITH CHECK ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."is_active" = true)))) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'coordinator'::"public"."user_role"])))))));



CREATE POLICY "catalog_read_all" ON "public"."medications_catalog" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "catalog_super_admin_write" ON "public"."medications_catalog" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))));



CREATE POLICY "config_modify_policy" ON "public"."simulation_table_config" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'super_admin'::"public"."user_role")))));



ALTER TABLE "public"."contact_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."device_assessments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "device_assessments_tenant_isolation" ON "public"."device_assessments" TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))))) WITH CHECK ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role"))))));



ALTER TABLE "public"."devices" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."diabetic_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."doctors_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "doctors_orders_access" ON "public"."doctors_orders" USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."tenant_id" = "doctors_orders"."tenant_id") AND ("tenant_users"."is_active" = true)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."tenant_id" = "doctors_orders"."tenant_id") AND ("tenant_users"."is_active" = true))))));



CREATE POLICY "hacmap_avatar_locations_access" ON "public"."avatar_locations" USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."tenant_id" = "avatar_locations"."tenant_id") AND ("tenant_users"."is_active" = true)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."tenant_id" = "avatar_locations"."tenant_id") AND ("tenant_users"."is_active" = true))))));



CREATE POLICY "hacmap_devices_access" ON "public"."devices" USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."tenant_id" = "devices"."tenant_id") AND ("tenant_users"."is_active" = true)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."tenant_id" = "devices"."tenant_id") AND ("tenant_users"."is_active" = true))))));



CREATE POLICY "hacmap_wounds_access" ON "public"."wounds" USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."tenant_id" = "wounds"."tenant_id") AND ("tenant_users"."is_active" = true)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."tenant_id" = "wounds"."tenant_id") AND ("tenant_users"."is_active" = true))))));



ALTER TABLE "public"."handover_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "handover_notes_update" ON "public"."handover_notes" FOR UPDATE TO "authenticated" USING ((("patient_id" IN ( SELECT "p"."id"
   FROM ("public"."patients" "p"
     JOIN "public"."tenant_users" "tu" ON (("tu"."tenant_id" = "p"."tenant_id")))
  WHERE (("tu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tu"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))))) WITH CHECK ((("patient_id" IN ( SELECT "p"."id"
   FROM ("public"."patients" "p"
     JOIN "public"."tenant_users" "tu" ON (("tu"."tenant_id" = "p"."tenant_id")))
  WHERE (("tu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tu"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role"))))));



CREATE POLICY "history_insert_policy" ON "public"."simulation_history" FOR INSERT WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'admin'::"public"."user_role", 'instructor'::"public"."user_role"])))))));



CREATE POLICY "history_select_policy" ON "public"."simulation_history" FOR SELECT USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR ("participants" @> "jsonb_build_array"("jsonb_build_object"('user_id', (( SELECT "auth"."uid"() AS "uid"))::"text"))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'admin'::"public"."user_role", 'instructor'::"public"."user_role"])))))));



CREATE POLICY "history_update_policy" ON "public"."simulation_history" FOR UPDATE USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'admin'::"public"."user_role"])))))));



CREATE POLICY "intake_output_events_tenant_isolation" ON "public"."patient_intake_output_events" TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))))) WITH CHECK ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role"))))));



ALTER TABLE "public"."kb_walkthroughs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "kb_walkthroughs_delete" ON "public"."kb_walkthroughs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = 'super_admin'::"public"."user_role")))));



CREATE POLICY "kb_walkthroughs_insert" ON "public"."kb_walkthroughs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = 'super_admin'::"public"."user_role")))));



CREATE POLICY "kb_walkthroughs_select" ON "public"."kb_walkthroughs" FOR SELECT TO "authenticated" USING ((("is_active" = true) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = 'super_admin'::"public"."user_role"))))));



CREATE POLICY "kb_walkthroughs_update" ON "public"."kb_walkthroughs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = 'super_admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = 'super_admin'::"public"."user_role")))));



ALTER TABLE "public"."lab_ack_events" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lab_ack_events_insert" ON "public"."lab_ack_events" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) AND ("ack_by" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "lab_ack_events_select" ON "public"."lab_ack_events" FOR SELECT TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role"))))));



ALTER TABLE "public"."lab_orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lab_orders_access" ON "public"."lab_orders" USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."tenant_id" = "lab_orders"."tenant_id") AND ("tenant_users"."is_active" = true)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."tenant_id" = "lab_orders"."tenant_id") AND ("tenant_users"."is_active" = true))))));



ALTER TABLE "public"."lab_panels" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lab_panels_delete" ON "public"."lab_panels" FOR DELETE TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"])))))));



CREATE POLICY "lab_panels_insert" ON "public"."lab_panels" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"])))))));



COMMENT ON POLICY "lab_panels_insert" ON "public"."lab_panels" IS 'Super admins bypass tenant check, regular admins must be in tenant cache';



CREATE POLICY "lab_panels_select" ON "public"."lab_panels" FOR SELECT TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role"))))));



CREATE POLICY "lab_panels_update" ON "public"."lab_panels" FOR UPDATE TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"])))))));



ALTER TABLE "public"."lab_result_refs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lab_result_refs_delete" ON "public"."lab_result_refs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))));



CREATE POLICY "lab_result_refs_insert" ON "public"."lab_result_refs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))));



CREATE POLICY "lab_result_refs_select" ON "public"."lab_result_refs" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "lab_result_refs_update" ON "public"."lab_result_refs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))));



ALTER TABLE "public"."lab_results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lab_results_delete" ON "public"."lab_results" FOR DELETE TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"])))))));



CREATE POLICY "lab_results_insert" ON "public"."lab_results" FOR INSERT TO "authenticated" WITH CHECK ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"])))))));



COMMENT ON POLICY "lab_results_insert" ON "public"."lab_results" IS 'Super admins bypass tenant check, regular admins must be in tenant cache';



CREATE POLICY "lab_results_select" ON "public"."lab_results" FOR SELECT TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role"))))));



CREATE POLICY "lab_results_update" ON "public"."lab_results" FOR UPDATE TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) AND ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"]))))) OR (("ack_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("ack_at" IS NOT NULL)))));



ALTER TABLE "public"."medication_administrations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "medication_administrations_secure_access" ON "public"."medication_administrations" USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR ("patient_id" IN ( SELECT ("p"."id")::"text" AS "id"
   FROM ("public"."patients" "p"
     JOIN "public"."tenant_users" "tu" ON (("p"."tenant_id" = "tu"."tenant_id")))
  WHERE (("tu"."user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) AND ("tu"."is_active" = true))))));



ALTER TABLE "public"."medications_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."multi_tenant_admins" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "neuro_assessments_tenant_isolation" ON "public"."patient_neuro_assessments" TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))))) WITH CHECK ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role"))))));



CREATE POLICY "newborn_assessments_tenant_isolation" ON "public"."patient_newborn_assessments" TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))))) WITH CHECK ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role"))))));



CREATE POLICY "participants_delete_policy" ON "public"."simulation_participants" FOR DELETE USING ((("granted_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'admin'::"public"."user_role"])))))));



CREATE POLICY "participants_insert_policy" ON "public"."simulation_participants" FOR INSERT WITH CHECK ((("simulation_id" IN ( SELECT "simulation_active"."id"
   FROM "public"."simulation_active"
  WHERE ("simulation_active"."created_by" = ( SELECT "auth"."uid"() AS "uid")))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'admin'::"public"."user_role", 'instructor'::"public"."user_role"])))))));



CREATE POLICY "participants_select_policy" ON "public"."simulation_participants" FOR SELECT USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'admin'::"public"."user_role", 'instructor'::"public"."user_role"])))))));



COMMENT ON POLICY "participants_select_policy" ON "public"."simulation_participants" IS 'Allow users to see their own participant records or admins/instructors to see all';



CREATE POLICY "participants_update_policy" ON "public"."simulation_participants" FOR UPDATE USING ((("simulation_id" IN ( SELECT "simulation_active"."id"
   FROM "public"."simulation_active"
  WHERE ("simulation_active"."created_by" = ( SELECT "auth"."uid"() AS "uid")))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'admin'::"public"."user_role"])))))));



ALTER TABLE "public"."patient_admission_records" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient_advanced_directives" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient_alerts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "patient_alerts_consolidated_delete" ON "public"."patient_alerts" FOR DELETE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")))));



CREATE POLICY "patient_alerts_consolidated_insert" ON "public"."patient_alerts" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")))));



CREATE POLICY "patient_alerts_consolidated_select" ON "public"."patient_alerts" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")))));



CREATE POLICY "patient_alerts_consolidated_update" ON "public"."patient_alerts" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid"))))) WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")))));



ALTER TABLE "public"."patient_bbit_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient_images" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "patient_images_consolidated_delete" ON "public"."patient_images" FOR DELETE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")))));



CREATE POLICY "patient_images_consolidated_insert" ON "public"."patient_images" FOR INSERT WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")))));



CREATE POLICY "patient_images_consolidated_select" ON "public"."patient_images" FOR SELECT USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")))));



CREATE POLICY "patient_images_consolidated_update" ON "public"."patient_images" FOR UPDATE USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid"))))) WITH CHECK (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE ("tenant_users"."user_id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")))));



ALTER TABLE "public"."patient_intake_output_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient_medications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "patient_medications_delete" ON "public"."patient_medications" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."tenant_id" = "patient_medications"."tenant_id") AND ("tenant_users"."is_active" = true))))));



CREATE POLICY "patient_medications_insert" ON "public"."patient_medications" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."tenant_id" = "patient_medications"."tenant_id") AND ("tenant_users"."is_active" = true))))));



CREATE POLICY "patient_medications_select" ON "public"."patient_medications" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."tenant_id" = "patient_medications"."tenant_id") AND ("tenant_users"."is_active" = true))))));



ALTER TABLE "public"."patient_medications_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "patient_medications_update" ON "public"."patient_medications" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."tenant_id" = "patient_medications"."tenant_id") AND ("tenant_users"."is_active" = true))))));



ALTER TABLE "public"."patient_neuro_assessments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient_newborn_assessments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient_notes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient_system_assessments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."patient_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "patient_templates_delete" ON "public"."patient_templates" FOR DELETE TO "authenticated" USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM ("public"."user_profiles" "up"
     JOIN "public"."tenant_users" "tu" ON (("tu"."user_id" = "up"."id")))
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'admin'::"public"."user_role") AND ("tu"."tenant_id" = "patient_templates"."tenant_id") AND ("tu"."is_active" = true)))) OR ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'instructor'::"public"."user_role")))) AND (("primary_categories" IS NULL) OR ("primary_categories" = '{}'::"text"[]) OR (EXISTS ( SELECT 1
   FROM ("public"."user_programs" "up_prog"
     JOIN "public"."programs" "prog" ON (("prog"."id" = "up_prog"."program_id")))
  WHERE (("up_prog"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("prog"."code" = ANY ("patient_templates"."primary_categories")))))))));



CREATE POLICY "patient_templates_insert_policy" ON "public"."patient_templates" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'admin'::"public"."user_role", 'instructor'::"public"."user_role"]))))));



CREATE POLICY "patient_templates_select" ON "public"."patient_templates" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM ("public"."user_profiles" "up"
     JOIN "public"."tenant_users" "tu" ON (("tu"."user_id" = "up"."id")))
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'admin'::"public"."user_role") AND ("tu"."tenant_id" = "patient_templates"."tenant_id") AND ("tu"."is_active" = true)))) OR ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'instructor'::"public"."user_role")))) AND (("primary_categories" IS NULL) OR ("primary_categories" = '{}'::"text"[]) OR (EXISTS ( SELECT 1
   FROM ("public"."user_programs" "up_prog"
     JOIN "public"."programs" "prog" ON (("prog"."id" = "up_prog"."program_id")))
  WHERE (("up_prog"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("prog"."code" = ANY ("patient_templates"."primary_categories")))))))));



CREATE POLICY "patient_templates_update" ON "public"."patient_templates" FOR UPDATE TO "authenticated" USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM ("public"."user_profiles" "up"
     JOIN "public"."tenant_users" "tu" ON (("tu"."user_id" = "up"."id")))
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'admin'::"public"."user_role") AND ("tu"."tenant_id" = "patient_templates"."tenant_id") AND ("tu"."is_active" = true)))) OR ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'instructor'::"public"."user_role")))) AND (("primary_categories" IS NULL) OR ("primary_categories" = '{}'::"text"[]) OR (EXISTS ( SELECT 1
   FROM ("public"."user_programs" "up_prog"
     JOIN "public"."programs" "prog" ON (("prog"."id" = "up_prog"."program_id")))
  WHERE (("up_prog"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("prog"."code" = ANY ("patient_templates"."primary_categories"))))))))) WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM ("public"."user_profiles" "up"
     JOIN "public"."tenant_users" "tu" ON (("tu"."user_id" = "up"."id")))
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'admin'::"public"."user_role") AND ("tu"."tenant_id" = "patient_templates"."tenant_id") AND ("tu"."is_active" = true)))) OR ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'instructor'::"public"."user_role")))) AND (("primary_categories" IS NULL) OR ("primary_categories" = '{}'::"text"[]) OR (EXISTS ( SELECT 1
   FROM ("public"."user_programs" "up_prog"
     JOIN "public"."programs" "prog" ON (("prog"."id" = "up_prog"."program_id")))
  WHERE (("up_prog"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("prog"."code" = ANY ("patient_templates"."primary_categories")))))))));



ALTER TABLE "public"."patient_vitals" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "patient_vitals_delete" ON "public"."patient_vitals" FOR DELETE USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM ("public"."patients" "p"
     JOIN "public"."tenant_users" "tu" ON (("tu"."tenant_id" = "p"."tenant_id")))
  WHERE (("p"."id" = "patient_vitals"."patient_id") AND ("tu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tu"."is_active" = true))))));



CREATE POLICY "patient_vitals_insert" ON "public"."patient_vitals" FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM ("public"."patients" "p"
     JOIN "public"."tenant_users" "tu" ON (("tu"."tenant_id" = "p"."tenant_id")))
  WHERE (("p"."id" = "patient_vitals"."patient_id") AND ("tu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tu"."is_active" = true))))));



CREATE POLICY "patient_vitals_select" ON "public"."patient_vitals" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM ("public"."patients" "p"
     JOIN "public"."tenant_users" "tu" ON (("tu"."tenant_id" = "p"."tenant_id")))
  WHERE (("p"."id" = "patient_vitals"."patient_id") AND ("tu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tu"."is_active" = true))))));



ALTER TABLE "public"."patient_vitals_templates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "patient_vitals_update" ON "public"."patient_vitals" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM ("public"."patients" "p"
     JOIN "public"."tenant_users" "tu" ON (("tu"."tenant_id" = "p"."tenant_id")))
  WHERE (("p"."id" = "patient_vitals"."patient_id") AND ("tu"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tu"."is_active" = true))))));



ALTER TABLE "public"."patient_wounds" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "patient_wounds_delete" ON "public"."patient_wounds" FOR DELETE TO "authenticated" USING ((("patient_id" IN ( SELECT "patients"."id"
   FROM "public"."patients"
  WHERE ("patients"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE (("tenant_users"."user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) AND ("tenant_users"."is_active" = true)))))) AND (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) AND ("user_profiles"."role" = ANY (ARRAY['admin'::"public"."user_role", 'super_admin'::"public"."user_role"])))))));



CREATE POLICY "patient_wounds_select" ON "public"."patient_wounds" FOR SELECT TO "authenticated" USING ((("patient_id" IN ( SELECT "patients"."id"
   FROM "public"."patients"
  WHERE ("patients"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE (("tenant_users"."user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) AND ("tenant_users"."is_active" = true)))))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role"))))));



CREATE POLICY "patient_wounds_tenant_insert" ON "public"."patient_wounds" FOR INSERT TO "authenticated" WITH CHECK (("patient_id" IN ( SELECT "patients"."id"
   FROM "public"."patients"
  WHERE ("patients"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))))));



CREATE POLICY "patient_wounds_update" ON "public"."patient_wounds" FOR UPDATE TO "authenticated" USING ((("patient_id" IN ( SELECT "patients"."id"
   FROM "public"."patients"
  WHERE ("patients"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE (("tenant_users"."user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) AND ("tenant_users"."is_active" = true)))))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))))) WITH CHECK ((("patient_id" IN ( SELECT "patients"."id"
   FROM "public"."patients"
  WHERE ("patients"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE (("tenant_users"."user_id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) AND ("tenant_users"."is_active" = true)))))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role"))))));



ALTER TABLE "public"."patients" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "patients_tenant_isolation" ON "public"."patients" TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."tenant_id" = "patients"."tenant_id") AND ("tenant_users"."is_active" = true)))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role") AND ("user_profiles"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."tenant_id" = "patients"."tenant_id") AND ("tenant_users"."is_active" = true))))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_consolidated_select" ON "public"."profiles" FOR SELECT USING (("id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")));



CREATE POLICY "profiles_consolidated_update" ON "public"."profiles" FOR UPDATE USING (("id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid"))) WITH CHECK (("id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")));



CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."programs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "programs_delete" ON "public"."programs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"]))))));



CREATE POLICY "programs_insert" ON "public"."programs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"]))))));



CREATE POLICY "programs_super_admin_select" ON "public"."programs" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))));



CREATE POLICY "programs_tenant_isolation" ON "public"."programs" FOR SELECT TO "authenticated" USING (("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))));



CREATE POLICY "programs_update" ON "public"."programs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"]))))));



CREATE POLICY "psa_tenant_isolation" ON "public"."patient_system_assessments" TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))))) WITH CHECK ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role"))))));



ALTER TABLE "public"."simulation_active" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."simulation_activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."simulation_auto_students" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "simulation_auto_students_insert" ON "public"."simulation_auto_students" FOR INSERT TO "authenticated" WITH CHECK (("created_by" = "auth"."uid"()));



CREATE POLICY "simulation_auto_students_select" ON "public"."simulation_auto_students" FOR SELECT TO "authenticated" USING ((("created_by" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."simulation_active" "sa"
     JOIN "public"."tenant_users" "tu" ON (("tu"."tenant_id" = "sa"."tenant_id")))
  WHERE (("sa"."id" = "simulation_auto_students"."simulation_id") AND ("tu"."user_id" = "auth"."uid"()) AND ("tu"."is_active" = true))))));



ALTER TABLE "public"."simulation_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "simulation_history_delete_instructor_programs" ON "public"."simulation_history" FOR DELETE TO "authenticated" USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM ("public"."user_profiles" "up"
     JOIN "public"."tenant_users" "tu" ON (("tu"."user_id" = "up"."id")))
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'admin'::"public"."user_role") AND ("tu"."tenant_id" = "simulation_history"."tenant_id") AND ("tu"."is_active" = true)))) OR ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'instructor'::"public"."user_role")))) AND (("primary_categories" IS NULL) OR ("primary_categories" = '{}'::"text"[]) OR (EXISTS ( SELECT 1
   FROM ("public"."user_programs" "up_prog"
     JOIN "public"."programs" "prog" ON (("prog"."id" = "up_prog"."program_id")))
  WHERE (("up_prog"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("prog"."code" = ANY ("simulation_history"."primary_categories")))))))));



COMMENT ON POLICY "simulation_history_delete_instructor_programs" ON "public"."simulation_history" IS 'Instructors can delete simulation history for their assigned programs. Super admins, coordinators, admins, and creators have full access.';



ALTER TABLE "public"."simulation_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."simulation_table_config" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."simulation_template_states" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."simulation_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_roster" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "student_roster_delete" ON "public"."student_roster" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role", 'admin'::"public"."user_role", 'instructor'::"public"."user_role"]))))));



CREATE POLICY "student_roster_insert" ON "public"."student_roster" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role", 'admin'::"public"."user_role", 'instructor'::"public"."user_role"]))))));



CREATE POLICY "student_roster_update" ON "public"."student_roster" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role", 'admin'::"public"."user_role", 'instructor'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role", 'admin'::"public"."user_role", 'instructor'::"public"."user_role"]))))));



CREATE POLICY "student_roster_view_program" ON "public"."student_roster" FOR SELECT TO "authenticated" USING (("program_id" IN ( SELECT "p"."id"
   FROM "public"."programs" "p"
  WHERE ("p"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))))));



CREATE POLICY "super_admin_delete_system_logs" ON "public"."system_logs" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))));



CREATE POLICY "super_admin_sessions_access" ON "public"."user_sessions" USING (
CASE
    WHEN "public"."current_user_is_super_admin"() THEN true
    ELSE ("user_id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid"))
END);



CREATE POLICY "super_admin_view_system_logs" ON "public"."system_logs" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))));



ALTER TABLE "public"."system_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "system_logs_insert_authenticated" ON "public"."system_logs" FOR INSERT TO "authenticated" WITH CHECK ((("user_id" IS NULL) OR ("user_id" = ( SELECT "auth"."uid"() AS "uid"))));



CREATE POLICY "template_states_delete" ON "public"."simulation_template_states" FOR DELETE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."tenant_id" = "simulation_template_states"."tenant_id") AND ("tu"."user_id" = "auth"."uid"()) AND ("tu"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"])))))));



CREATE POLICY "template_states_insert" ON "public"."simulation_template_states" FOR INSERT TO "authenticated" WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."tenant_id" = "simulation_template_states"."tenant_id") AND ("tu"."user_id" = "auth"."uid"()) AND ("tu"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"])))))));



CREATE POLICY "template_states_select" ON "public"."simulation_template_states" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."tenant_id" = "simulation_template_states"."tenant_id") AND ("tu"."user_id" = "auth"."uid"()) AND ("tu"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"])))))));



CREATE POLICY "template_states_update" ON "public"."simulation_template_states" FOR UPDATE TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."tenant_id" = "simulation_template_states"."tenant_id") AND ("tu"."user_id" = "auth"."uid"()) AND ("tu"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"]))))))) WITH CHECK (((EXISTS ( SELECT 1
   FROM "public"."tenant_users" "tu"
  WHERE (("tu"."tenant_id" = "simulation_template_states"."tenant_id") AND ("tu"."user_id" = "auth"."uid"()) AND ("tu"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = "auth"."uid"()) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"])))))));



CREATE POLICY "templates_delete" ON "public"."simulation_templates" FOR DELETE TO "authenticated" USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM ("public"."user_profiles" "up"
     JOIN "public"."tenant_users" "tu" ON (("tu"."user_id" = "up"."id")))
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'admin'::"public"."user_role") AND ("tu"."tenant_id" = "simulation_templates"."tenant_id") AND ("tu"."is_active" = true)))) OR ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'instructor'::"public"."user_role")))) AND (("primary_categories" IS NULL) OR ("primary_categories" = '{}'::"text"[]) OR (EXISTS ( SELECT 1
   FROM ("public"."user_programs" "up_prog"
     JOIN "public"."programs" "prog" ON (("prog"."id" = "up_prog"."program_id")))
  WHERE (("up_prog"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("prog"."code" = ANY ("simulation_templates"."primary_categories")))))))));



CREATE POLICY "templates_insert_policy" ON "public"."simulation_templates" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'admin'::"public"."user_role", 'instructor'::"public"."user_role"]))))));



CREATE POLICY "templates_select" ON "public"."simulation_templates" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM ("public"."user_profiles" "up"
     JOIN "public"."tenant_users" "tu" ON (("tu"."user_id" = "up"."id")))
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'admin'::"public"."user_role") AND ("tu"."tenant_id" = "simulation_templates"."tenant_id") AND ("tu"."is_active" = true)))) OR ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'instructor'::"public"."user_role")))) AND (("primary_categories" IS NULL) OR ("primary_categories" = '{}'::"text"[]) OR (EXISTS ( SELECT 1
   FROM ("public"."user_programs" "up_prog"
     JOIN "public"."programs" "prog" ON (("prog"."id" = "up_prog"."program_id")))
  WHERE (("up_prog"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("prog"."code" = ANY ("simulation_templates"."primary_categories"))))))) OR ("status" = 'ready'::"public"."simulation_template_status")));



CREATE POLICY "templates_update" ON "public"."simulation_templates" FOR UPDATE TO "authenticated" USING ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM ("public"."user_profiles" "up"
     JOIN "public"."tenant_users" "tu" ON (("tu"."user_id" = "up"."id")))
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'admin'::"public"."user_role") AND ("tu"."tenant_id" = "simulation_templates"."tenant_id") AND ("tu"."is_active" = true)))) OR ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'instructor'::"public"."user_role")))) AND (("primary_categories" IS NULL) OR ("primary_categories" = '{}'::"text"[]) OR (EXISTS ( SELECT 1
   FROM ("public"."user_programs" "up_prog"
     JOIN "public"."programs" "prog" ON (("prog"."id" = "up_prog"."program_id")))
  WHERE (("up_prog"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("prog"."code" = ANY ("simulation_templates"."primary_categories"))))))))) WITH CHECK ((("created_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"]))))) OR (EXISTS ( SELECT 1
   FROM ("public"."user_profiles" "up"
     JOIN "public"."tenant_users" "tu" ON (("tu"."user_id" = "up"."id")))
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'admin'::"public"."user_role") AND ("tu"."tenant_id" = "simulation_templates"."tenant_id") AND ("tu"."is_active" = true)))) OR ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'instructor'::"public"."user_role")))) AND (("primary_categories" IS NULL) OR ("primary_categories" = '{}'::"text"[]) OR (EXISTS ( SELECT 1
   FROM ("public"."user_programs" "up_prog"
     JOIN "public"."programs" "prog" ON (("prog"."id" = "up_prog"."program_id")))
  WHERE (("up_prog"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("prog"."code" = ANY ("simulation_templates"."primary_categories")))))))));



ALTER TABLE "public"."tenant_users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenant_users_auth_delete" ON "public"."tenant_users" FOR DELETE USING (("user_id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")));



CREATE POLICY "tenant_users_auth_insert" ON "public"."tenant_users" FOR INSERT WITH CHECK ((( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid") IS NOT NULL));



CREATE POLICY "tenant_users_auth_select" ON "public"."tenant_users" FOR SELECT USING ((( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid") IS NOT NULL));



CREATE POLICY "tenant_users_auth_update" ON "public"."tenant_users" FOR UPDATE USING (("user_id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid"))) WITH CHECK (("user_id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")));



ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tenants_auth_delete" ON "public"."tenants" FOR DELETE USING ((( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid") IS NOT NULL));



CREATE POLICY "tenants_auth_insert" ON "public"."tenants" FOR INSERT WITH CHECK ((( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid") IS NOT NULL));



CREATE POLICY "tenants_auth_update" ON "public"."tenants" FOR UPDATE USING ((( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid") IS NOT NULL)) WITH CHECK ((( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid") IS NOT NULL));



CREATE POLICY "tenants_authenticated_select" ON "public"."tenants" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'super_admin'::"public"."user_role")))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'coordinator'::"public"."user_role")))) OR ("id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))) OR (("tenant_type" = 'program'::"text") AND ("program_id" IN ( SELECT "p"."id"
   FROM ("public"."programs" "p"
     JOIN "public"."user_programs" "up_prog" ON (("up_prog"."program_id" = "p"."id")))
  WHERE (("up_prog"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("p"."is_active" = true)))))));



CREATE POLICY "tenants_super_admin_delete" ON "public"."tenants" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'super_admin'::"public"."user_role")))));



CREATE POLICY "tenants_super_admin_insert" ON "public"."tenants" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'super_admin'::"public"."user_role")))));



CREATE POLICY "tenants_super_admin_update" ON "public"."tenants" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'super_admin'::"public"."user_role"))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'super_admin'::"public"."user_role")))));



ALTER TABLE "public"."tr_active_living_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tr_alp_tenant_isolation" ON "public"."tr_active_living_profiles" TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))))) WITH CHECK ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role"))))));



ALTER TABLE "public"."tr_assessment_scores" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tr_interdisciplinary_interps" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tr_interps_tenant_isolation" ON "public"."tr_interdisciplinary_interps" TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))))) WITH CHECK ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role"))))));



CREATE POLICY "tr_notes_tenant_isolation" ON "public"."tr_progress_notes" TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))))) WITH CHECK ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role"))))));



CREATE POLICY "tr_plan_tenant_isolation" ON "public"."tr_treatment_plan_rows" TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))))) WITH CHECK ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role"))))));



ALTER TABLE "public"."tr_progress_notes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tr_scores_tenant_isolation" ON "public"."tr_assessment_scores" TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))))) WITH CHECK ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role"))))));



ALTER TABLE "public"."tr_screening_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "tr_screening_tenant_isolation" ON "public"."tr_screening_entries" TO "authenticated" USING ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))))) WITH CHECK ((("tenant_id" IN ( SELECT "tenant_users"."tenant_id"
   FROM "public"."tenant_users"
  WHERE (("tenant_users"."user_id" = "auth"."uid"()) AND ("tenant_users"."is_active" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = "auth"."uid"()) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role"))))));



ALTER TABLE "public"."tr_treatment_plan_rows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_profiles_auth_insert" ON "public"."user_profiles" FOR INSERT WITH CHECK (("id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")));



CREATE POLICY "user_profiles_auth_select" ON "public"."user_profiles" FOR SELECT USING ((( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid") IS NOT NULL));



CREATE POLICY "user_profiles_auth_update" ON "public"."user_profiles" FOR UPDATE USING (("id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid"))) WITH CHECK (("id" = ( SELECT ( SELECT ( SELECT "auth"."uid"() AS "uid") AS "uid") AS "uid")));



CREATE POLICY "user_profiles_delete" ON "public"."user_profiles" FOR DELETE TO "authenticated" USING ((("id" = ( SELECT "auth"."uid"() AS "uid")) OR "public"."current_user_is_super_admin"()));



ALTER TABLE "public"."user_programs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_programs_delete" ON "public"."user_programs" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"]))))));



CREATE POLICY "user_programs_insert" ON "public"."user_programs" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"]))))));



CREATE POLICY "user_programs_select" ON "public"."user_programs" FOR SELECT TO "authenticated" USING ((("user_id" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."user_profiles"
  WHERE (("user_profiles"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("user_profiles"."role" = 'super_admin'::"public"."user_role")))) OR ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = 'coordinator'::"public"."user_role")))) AND ("program_id" IN ( SELECT "p"."id"
   FROM "public"."programs" "p"
  WHERE ("p"."tenant_id" IN ( SELECT "tenant_users"."tenant_id"
           FROM "public"."tenant_users"
          WHERE (("tenant_users"."user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("tenant_users"."is_active" = true)))))))));



CREATE POLICY "user_programs_update" ON "public"."user_programs" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"])))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_profiles" "up"
  WHERE (("up"."id" = ( SELECT "auth"."uid"() AS "uid")) AND ("up"."role" = ANY (ARRAY['super_admin'::"public"."user_role", 'coordinator'::"public"."user_role"]))))));



ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wound_assessments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wound_treatments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wounds" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."acknowledge_alert_for_tenant"("p_alert_id" "uuid", "p_tenant_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."acknowledge_alert_for_tenant"("p_alert_id" "uuid", "p_tenant_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_patient_template_to_simulation_template"("p_patient_template_id" "uuid", "p_simulation_template_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_patient_template_to_simulation_template"("p_patient_template_id" "uuid", "p_simulation_template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_patient_template_to_simulation_template"("p_patient_template_id" "uuid", "p_simulation_template_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."student_roster" TO "anon";
GRANT ALL ON TABLE "public"."student_roster" TO "authenticated";
GRANT ALL ON TABLE "public"."student_roster" TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_student_to_roster_admin"("p_program_id" "uuid", "p_user_id" "uuid", "p_student_number" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_student_to_roster_admin"("p_program_id" "uuid", "p_user_id" "uuid", "p_student_number" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_student_to_roster_admin"("p_program_id" "uuid", "p_user_id" "uuid", "p_student_number" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."archive_landing_content_version"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."archive_landing_content_version"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."auto_set_tenant_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auto_set_tenant_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."auto_tag_simulation_from_template"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."auto_tag_simulation_from_template"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."bulk_assign_students_to_simulation"("p_simulation_id" "uuid", "p_student_user_ids" "uuid"[], "p_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bulk_assign_students_to_simulation"("p_simulation_id" "uuid", "p_student_user_ids" "uuid"[], "p_role" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."calculate_simulation_metrics"("p_simulation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."calculate_simulation_metrics"("p_simulation_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_all_problem_simulations"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_all_problem_simulations"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_backup_audit_logs"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_backup_audit_logs"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_expired_simulations"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_expired_simulations"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_old_sessions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_old_sessions"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_old_user_sessions"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_old_user_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_user_sessions"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."cleanup_orphaned_users"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."cleanup_orphaned_users"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."compare_simulation_template_patients"("p_simulation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."compare_simulation_template_patients"("p_simulation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."compare_simulation_template_patients"("p_simulation_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."compare_simulation_vs_template"("p_simulation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."compare_simulation_vs_template"("p_simulation_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."compare_simulation_vs_template"("p_simulation_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."complete_simulation"("p_simulation_id" "uuid", "p_activities" "jsonb", "p_instructor_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."complete_simulation"("p_simulation_id" "uuid", "p_activities" "jsonb", "p_instructor_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."complete_simulation"("p_simulation_id" "uuid", "p_activities" "jsonb", "p_instructor_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."confirm_simulation_student_email"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."confirm_simulation_student_email"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_simulation_student_email"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."confirm_user_email"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."confirm_user_email"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_user_email"("target_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_medication_super_admin"("p_patient_id" "uuid", "p_name" "text", "p_dosage" "text", "p_frequency" "text", "p_route" "text", "p_start_date" "date", "p_end_date" "date", "p_prescribed_by" "text", "p_category" "text", "p_admin_time" "text", "p_status" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_medication_super_admin"("p_patient_id" "uuid", "p_name" "text", "p_dosage" "text", "p_frequency" "text", "p_route" "text", "p_start_date" "date", "p_end_date" "date", "p_prescribed_by" "text", "p_category" "text", "p_admin_time" "text", "p_status" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_patient_template"("p_name" "text", "p_description" "text", "p_primary_categories" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_patient_template"("p_name" "text", "p_description" "text", "p_primary_categories" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_patient_template"("p_name" "text", "p_description" "text", "p_primary_categories" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_program_tenant"("p_program_id" "uuid", "p_parent_tenant_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_program_tenant"("p_program_id" "uuid", "p_parent_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_program_tenant"("p_program_id" "uuid", "p_parent_tenant_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_simulation_subtenant"("p_simulation_id" "uuid", "p_simulation_name" "text", "p_parent_tenant_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_simulation_subtenant"("p_simulation_id" "uuid", "p_simulation_name" "text", "p_parent_tenant_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_simulation_template"("p_name" "text", "p_description" "text", "p_default_duration_minutes" integer, "p_primary_categories" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_simulation_template"("p_name" "text", "p_description" "text", "p_default_duration_minutes" integer, "p_primary_categories" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_simulation_template"("p_name" "text", "p_description" "text", "p_default_duration_minutes" integer, "p_primary_categories" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_snapshot"("p_template_id" "uuid", "p_name" "text", "p_description" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_snapshot"("p_template_id" "uuid", "p_name" "text", "p_description" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_snapshot"("p_template_id" "uuid", "p_name" "text", "p_description" "text") TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_user_profile"("user_id" "uuid", "user_email" "text", "first_name" "text", "last_name" "text", "user_role" "public"."user_role") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_user_profile"("user_id" "uuid", "user_email" "text", "first_name" "text", "last_name" "text", "user_role" "public"."user_role") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_user_session"("p_ip_address" "inet", "p_user_agent" "text", "p_tenant_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_user_session"("p_ip_address" "inet", "p_user_agent" "text", "p_tenant_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_user_is_super_admin"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_is_super_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_is_super_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."deactivate_user"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."deactivate_user"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."deactivate_user"("target_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_medication_super_admin"("p_medication_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_medication_super_admin"("p_medication_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_patient_template"("p_patient_template_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_patient_template"("p_patient_template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_patient_template"("p_patient_template_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_simulation"("p_simulation_id" "uuid", "p_archive_to_history" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_simulation"("p_simulation_id" "uuid", "p_archive_to_history" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_simulation"("p_simulation_id" "uuid", "p_archive_to_history" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_simulation_history"("p_history_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_simulation_history"("p_history_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_simulation_template"("p_template_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_simulation_template"("p_template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_simulation_template"("p_template_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_tenant_secure"("target_tenant_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_tenant_secure"("target_tenant_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_user_permanently"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_user_permanently"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_permanently"("target_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."duplicate_patient_to_tenant"("p_source_patient_id" "text", "p_target_tenant_id" "uuid", "p_new_patient_id" "text", "p_include_vitals" boolean, "p_include_medications" boolean, "p_include_assessments" boolean, "p_include_handover_notes" boolean, "p_include_alerts" boolean, "p_include_diabetic_records" boolean, "p_include_bowel_records" boolean, "p_include_wound_care" boolean, "p_include_doctors_orders" boolean, "p_include_labs" boolean, "p_include_hacmap" boolean, "p_include_intake_output" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."duplicate_patient_to_tenant"("p_source_patient_id" "text", "p_target_tenant_id" "uuid", "p_new_patient_id" "text", "p_include_vitals" boolean, "p_include_medications" boolean, "p_include_assessments" boolean, "p_include_handover_notes" boolean, "p_include_alerts" boolean, "p_include_diabetic_records" boolean, "p_include_bowel_records" boolean, "p_include_wound_care" boolean, "p_include_doctors_orders" boolean, "p_include_labs" boolean, "p_include_hacmap" boolean, "p_include_intake_output" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."duplicate_patient_to_tenant"("p_source_patient_id" "text", "p_target_tenant_id" "uuid", "p_new_patient_id" "text", "p_include_vitals" boolean, "p_include_medications" boolean, "p_include_assessments" boolean, "p_include_handover_notes" boolean, "p_include_alerts" boolean, "p_include_diabetic_records" boolean, "p_include_bowel_records" boolean, "p_include_wound_care" boolean, "p_include_doctors_orders" boolean, "p_include_labs" boolean, "p_include_hacmap" boolean, "p_include_intake_output" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."enable_rls_on_new_tables"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."enable_rls_on_new_tables"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."end_user_session"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."end_user_session"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."ensure_user_profile"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_user_profile"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."ensure_user_profile"("user_id" "uuid", "user_email" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_user_profile"("user_id" "uuid", "user_email" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."fetch_medications_for_tenant"("target_tenant_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."fetch_medications_for_tenant"("target_tenant_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."find_user_by_email"("email_param" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."find_user_by_email"("email_param" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_user_by_email"("email_param" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."generate_simulation_id_sets"("p_template_id" "uuid", "p_session_count" integer, "p_session_names" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."generate_simulation_id_sets"("p_template_id" "uuid", "p_session_count" integer, "p_session_names" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_available_admin_users"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_available_admin_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_admin_users"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_available_tenants_for_transfer"("p_source_patient_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_available_tenants_for_transfer"("p_source_patient_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_tenants_for_transfer"("p_source_patient_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_cohort_students"("p_cohort_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_cohort_students"("p_cohort_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_secure_alerts"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_secure_alerts"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_simulation_label_data"("p_template_id" "uuid", "p_session_number" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_simulation_label_data"("p_template_id" "uuid", "p_session_number" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_simulation_students"("p_simulation_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_simulation_students"("p_simulation_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_super_admin_tenant_context"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_super_admin_tenant_context"() TO "service_role";



GRANT ALL ON TABLE "public"."tenants" TO "anon";
GRANT ALL ON TABLE "public"."tenants" TO "authenticated";
GRANT ALL ON TABLE "public"."tenants" TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_tenant_by_subdomain_public"("p_subdomain" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_tenant_by_subdomain_public"("p_subdomain" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_by_subdomain_public"("p_subdomain" "text") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_tenant_by_subdomain_public"("p_subdomain" "text") TO "anon";



REVOKE ALL ON FUNCTION "public"."get_tenant_users"("target_tenant_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_tenant_users"("target_tenant_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_tenant_users"("target_tenant_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_accessible_simulations"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_accessible_simulations"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_auth_status"("p_user_ids" "uuid"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_auth_status"("p_user_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_auth_status"("p_user_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_current_tenant"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_current_tenant"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_current_tenant"("target_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_program_codes"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_program_codes"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_program_codes"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_program_tenants"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_program_tenants"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_program_tenants"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_user_simulation_assignments"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_simulation_assignments"("p_user_id" "uuid") TO "service_role";
GRANT ALL ON FUNCTION "public"."get_user_simulation_assignments"("p_user_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."get_user_simulation_tenant_access"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_user_simulation_tenant_access"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_new_user"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_patient_tenant_assignment"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_patient_tenant_assignment"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."handle_user_profile_update"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."handle_user_profile_update"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."instantiate_simulation_patients"("p_simulation_id" "uuid", "p_scenario_template_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."instantiate_simulation_patients"("p_simulation_id" "uuid", "p_scenario_template_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_admin_user"("user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_admin_user"("user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_super_admin"("check_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_super_admin"("check_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_super_admin_direct"("user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_super_admin_direct"("user_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_super_admin_user"("user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_super_admin_user"("user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_tenant_admin"("tenant_uuid" "uuid", "user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_tenant_admin"("tenant_uuid" "uuid", "user_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."launch_run"("p_snapshot_id" "uuid", "p_run_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."launch_run"("p_snapshot_id" "uuid", "p_run_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."launch_run"("p_snapshot_id" "uuid", "p_run_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."launch_simulation"("p_template_id" "uuid", "p_name" "text", "p_duration_minutes" integer, "p_participant_user_ids" "uuid"[], "p_participant_roles" "text"[], "p_primary_categories" "text"[], "p_sub_categories" "text"[], "p_state_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."launch_simulation"("p_template_id" "uuid", "p_name" "text", "p_duration_minutes" integer, "p_participant_user_ids" "uuid"[], "p_participant_roles" "text"[], "p_primary_categories" "text"[], "p_sub_categories" "text"[], "p_state_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."launch_simulation"("p_template_id" "uuid", "p_name" "text", "p_duration_minutes" integer, "p_participant_user_ids" "uuid"[], "p_participant_roles" "text"[], "p_primary_categories" "text"[], "p_sub_categories" "text"[], "p_state_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."load_template_state"("p_template_id" "uuid", "p_state_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."load_template_state"("p_template_id" "uuid", "p_state_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."load_template_state"("p_template_id" "uuid", "p_state_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_welcome_seen"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_welcome_seen"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_welcome_seen"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."move_patient_to_tenant"("p_source_patient_id" "text", "p_target_tenant_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."move_patient_to_tenant"("p_source_patient_id" "text", "p_target_tenant_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."move_patient_to_tenant"("p_patient_id" "uuid", "p_target_tenant_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."move_patient_to_tenant"("p_patient_id" "uuid", "p_target_tenant_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."protect_medication_identifiers"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."protect_medication_identifiers"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."protect_patient_identifiers"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."protect_patient_identifiers"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."protect_super_admin_role"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."protect_super_admin_role"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reactivate_user"("target_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reactivate_user"("target_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reactivate_user"("target_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reassign_user_tenant"("p_user_id" "uuid", "p_new_tenant_id" "uuid", "p_role" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reassign_user_tenant"("p_user_id" "uuid", "p_new_tenant_id" "uuid", "p_role" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reassign_user_tenant"("p_user_id" "uuid", "p_new_tenant_id" "uuid", "p_role" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."refresh_user_tenant_cache"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."refresh_user_tenant_cache"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."remove_user_from_tenant"("tenant_uuid" "uuid", "user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."remove_user_from_tenant"("tenant_uuid" "uuid", "user_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."reset_run"("p_run_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reset_run"("p_run_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_run"("p_run_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_simulation_for_next_session"("p_simulation_id" "uuid", "p_state_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_simulation_for_next_session"("p_simulation_id" "uuid", "p_state_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_simulation_with_template_updates"("p_simulation_id" "uuid", "p_state_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_simulation_with_template_updates"("p_simulation_id" "uuid", "p_state_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."restore_snapshot_to_tenant"("p_tenant_id" "uuid", "p_snapshot" "jsonb", "p_id_mappings" "jsonb", "p_barcode_mappings" "jsonb", "p_preserve_barcodes" boolean, "p_skip_patients" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."restore_snapshot_to_tenant"("p_tenant_id" "uuid", "p_snapshot" "jsonb", "p_id_mappings" "jsonb", "p_barcode_mappings" "jsonb", "p_preserve_barcodes" boolean, "p_skip_patients" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."rls_auto_enable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."rls_auto_enable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_patient_template_snapshot"("p_patient_template_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_patient_template_snapshot"("p_patient_template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_patient_template_snapshot"("p_patient_template_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."save_template_snapshot_v2"("p_template_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."save_template_snapshot_v2"("p_template_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_template_snapshot_v2"("p_template_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."save_template_state"("p_template_id" "uuid", "p_label" "text", "p_changelog_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."save_template_state"("p_template_id" "uuid", "p_label" "text", "p_changelog_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_alert_tenant_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_alert_tenant_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_medication_admin_tenant_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_medication_admin_tenant_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_super_admin_tenant_context"("target_tenant_id" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_super_admin_tenant_context"("target_tenant_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_super_admin_tenant_context"("target_tenant_id" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_tenant_id_on_insert"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_tenant_id_on_insert"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_wound_assessment_tenant_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_wound_assessment_tenant_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_wound_treatment_tenant_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_wound_treatment_tenant_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."shift_snapshot_timestamps"("p_snapshot" "jsonb", "p_shift" interval) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."shift_snapshot_timestamps"("p_snapshot" "jsonb", "p_shift" interval) TO "authenticated";
GRANT ALL ON FUNCTION "public"."shift_snapshot_timestamps"("p_snapshot" "jsonb", "p_shift" interval) TO "service_role";



REVOKE ALL ON FUNCTION "public"."trigger_create_program_tenant"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."trigger_create_program_tenant"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."trigger_refresh_user_tenant_cache"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."trigger_refresh_user_tenant_cache"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_bowel_records_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_bowel_records_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_contact_submissions_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_contact_submissions_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_handover_notes_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_handover_notes_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_lab_panel_status"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_lab_panel_status"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_lab_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_lab_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_landing_content_timestamp"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_landing_content_timestamp"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_medication_administrations_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_medication_administrations_updated_at"() TO "service_role";



GRANT ALL ON TABLE "public"."patient_medications" TO "anon";
GRANT ALL ON TABLE "public"."patient_medications" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_medications" TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_medication_super_admin"("p_medication_id" "uuid", "p_updates" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_medication_super_admin"("p_medication_id" "uuid", "p_updates" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_patient_intake_output_events_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_patient_intake_output_events_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_patient_notes_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_patient_notes_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_programs_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_programs_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_simulation_categories"("p_simulation_id" "uuid", "p_primary_categories" "text"[], "p_sub_categories" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_simulation_categories"("p_simulation_id" "uuid", "p_primary_categories" "text"[], "p_sub_categories" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_simulation_history_categories"("p_simulation_id" "uuid", "p_primary_categories" "text"[], "p_sub_categories" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_simulation_history_categories"("p_simulation_id" "uuid", "p_primary_categories" "text"[], "p_sub_categories" "text"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_student_roster_updated_at"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_student_roster_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_template_state_snapshot"("p_template_id" "uuid", "p_state_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_template_state_snapshot"("p_template_id" "uuid", "p_state_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_template_state_snapshot"("p_template_id" "uuid", "p_state_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_updated_at_column"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_user_profile_admin"("p_user_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_role" "text", "p_department" "text", "p_license_number" "text", "p_phone" "text", "p_is_active" boolean, "p_simulation_only" boolean) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_user_profile_admin"("p_user_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_role" "text", "p_department" "text", "p_license_number" "text", "p_phone" "text", "p_is_active" boolean, "p_simulation_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_profile_admin"("p_user_id" "uuid", "p_first_name" "text", "p_last_name" "text", "p_role" "text", "p_department" "text", "p_license_number" "text", "p_phone" "text", "p_is_active" boolean, "p_simulation_only" boolean) TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_has_patient_access"("patient_tenant_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_has_patient_access"("patient_tenant_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_has_permission"("user_uuid" "uuid", "permission_name" "text", "tenant_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_has_permission"("user_uuid" "uuid", "permission_name" "text", "tenant_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_has_program_access"("p_user_id" "uuid", "p_program_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_has_program_access"("p_user_id" "uuid", "p_program_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_has_program_access"("p_user_id" "uuid", "p_program_code" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_has_tenant_access"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_has_tenant_access"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_has_tenant_access"("user_uuid" "uuid", "tenant_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_has_tenant_access"("user_uuid" "uuid", "tenant_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."user_is_super_admin"("user_uuid" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."user_is_super_admin"("user_uuid" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."validate_subdomain"("subdomain_input" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."validate_subdomain"("subdomain_input" "text") TO "service_role";



GRANT ALL ON TABLE "public"."audit_logs" TO "anon";
GRANT ALL ON TABLE "public"."audit_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_logs" TO "service_role";



GRANT ALL ON TABLE "public"."avatar_locations" TO "anon";
GRANT ALL ON TABLE "public"."avatar_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."avatar_locations" TO "service_role";



GRANT ALL ON TABLE "public"."bowel_records" TO "anon";
GRANT ALL ON TABLE "public"."bowel_records" TO "authenticated";
GRANT ALL ON TABLE "public"."bowel_records" TO "service_role";



GRANT ALL ON TABLE "public"."contact_submissions" TO "anon";
GRANT ALL ON TABLE "public"."contact_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."device_assessments" TO "anon";
GRANT ALL ON TABLE "public"."device_assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."device_assessments" TO "service_role";



GRANT ALL ON TABLE "public"."devices" TO "anon";
GRANT ALL ON TABLE "public"."devices" TO "authenticated";
GRANT ALL ON TABLE "public"."devices" TO "service_role";



GRANT ALL ON TABLE "public"."diabetic_records" TO "anon";
GRANT ALL ON TABLE "public"."diabetic_records" TO "authenticated";
GRANT ALL ON TABLE "public"."diabetic_records" TO "service_role";



GRANT ALL ON TABLE "public"."doctors_orders" TO "anon";
GRANT ALL ON TABLE "public"."doctors_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."doctors_orders" TO "service_role";



GRANT ALL ON TABLE "public"."handover_notes" TO "anon";
GRANT ALL ON TABLE "public"."handover_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."handover_notes" TO "service_role";



GRANT ALL ON TABLE "public"."kb_walkthroughs" TO "anon";
GRANT ALL ON TABLE "public"."kb_walkthroughs" TO "authenticated";
GRANT ALL ON TABLE "public"."kb_walkthroughs" TO "service_role";



GRANT ALL ON TABLE "public"."lab_ack_events" TO "anon";
GRANT ALL ON TABLE "public"."lab_ack_events" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_ack_events" TO "service_role";



GRANT ALL ON TABLE "public"."lab_orders" TO "anon";
GRANT ALL ON TABLE "public"."lab_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_orders" TO "service_role";



GRANT ALL ON TABLE "public"."lab_panels" TO "anon";
GRANT ALL ON TABLE "public"."lab_panels" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_panels" TO "service_role";



GRANT ALL ON TABLE "public"."lab_result_refs" TO "anon";
GRANT ALL ON TABLE "public"."lab_result_refs" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_result_refs" TO "service_role";



GRANT ALL ON TABLE "public"."lab_results" TO "anon";
GRANT ALL ON TABLE "public"."lab_results" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_results" TO "service_role";



GRANT ALL ON TABLE "public"."medication_administrations" TO "anon";
GRANT ALL ON TABLE "public"."medication_administrations" TO "authenticated";
GRANT ALL ON TABLE "public"."medication_administrations" TO "service_role";



GRANT ALL ON TABLE "public"."medications_catalog" TO "anon";
GRANT ALL ON TABLE "public"."medications_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."medications_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."multi_tenant_admins" TO "anon";
GRANT ALL ON TABLE "public"."multi_tenant_admins" TO "authenticated";
GRANT ALL ON TABLE "public"."multi_tenant_admins" TO "service_role";



GRANT ALL ON TABLE "public"."patient_admission_records" TO "anon";
GRANT ALL ON TABLE "public"."patient_admission_records" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_admission_records" TO "service_role";



GRANT ALL ON TABLE "public"."patient_advanced_directives" TO "anon";
GRANT ALL ON TABLE "public"."patient_advanced_directives" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_advanced_directives" TO "service_role";



GRANT ALL ON TABLE "public"."patient_alerts" TO "anon";
GRANT ALL ON TABLE "public"."patient_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_alerts" TO "service_role";



GRANT ALL ON TABLE "public"."patient_alerts_view" TO "anon";
GRANT ALL ON TABLE "public"."patient_alerts_view" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_alerts_view" TO "service_role";



GRANT ALL ON TABLE "public"."patient_bbit_entries" TO "anon";
GRANT ALL ON TABLE "public"."patient_bbit_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_bbit_entries" TO "service_role";



GRANT ALL ON TABLE "public"."patient_images" TO "anon";
GRANT ALL ON TABLE "public"."patient_images" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_images" TO "service_role";



GRANT ALL ON TABLE "public"."patient_intake_output_events" TO "anon";
GRANT ALL ON TABLE "public"."patient_intake_output_events" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_intake_output_events" TO "service_role";



GRANT ALL ON TABLE "public"."patient_medications_templates" TO "anon";
GRANT ALL ON TABLE "public"."patient_medications_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_medications_templates" TO "service_role";



GRANT ALL ON TABLE "public"."patient_neuro_assessments" TO "anon";
GRANT ALL ON TABLE "public"."patient_neuro_assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_neuro_assessments" TO "service_role";



GRANT ALL ON TABLE "public"."patient_newborn_assessments" TO "anon";
GRANT ALL ON TABLE "public"."patient_newborn_assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_newborn_assessments" TO "service_role";



GRANT ALL ON TABLE "public"."patient_notes" TO "anon";
GRANT ALL ON TABLE "public"."patient_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_notes" TO "service_role";



GRANT ALL ON TABLE "public"."patient_system_assessments" TO "anon";
GRANT ALL ON TABLE "public"."patient_system_assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_system_assessments" TO "service_role";



GRANT ALL ON TABLE "public"."patient_templates" TO "anon";
GRANT ALL ON TABLE "public"."patient_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_templates" TO "service_role";



GRANT ALL ON TABLE "public"."patient_vitals" TO "anon";
GRANT ALL ON TABLE "public"."patient_vitals" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_vitals" TO "service_role";



GRANT ALL ON TABLE "public"."patient_vitals_templates" TO "anon";
GRANT ALL ON TABLE "public"."patient_vitals_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_vitals_templates" TO "service_role";



GRANT ALL ON TABLE "public"."patient_wounds" TO "anon";
GRANT ALL ON TABLE "public"."patient_wounds" TO "authenticated";
GRANT ALL ON TABLE "public"."patient_wounds" TO "service_role";



GRANT ALL ON TABLE "public"."patients" TO "anon";
GRANT ALL ON TABLE "public"."patients" TO "authenticated";
GRANT ALL ON TABLE "public"."patients" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."programs" TO "anon";
GRANT ALL ON TABLE "public"."programs" TO "authenticated";
GRANT ALL ON TABLE "public"."programs" TO "service_role";



GRANT ALL ON TABLE "public"."simulation_active" TO "anon";
GRANT ALL ON TABLE "public"."simulation_active" TO "authenticated";
GRANT ALL ON TABLE "public"."simulation_active" TO "service_role";



GRANT ALL ON TABLE "public"."simulation_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."simulation_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."simulation_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."simulation_auto_students" TO "anon";
GRANT ALL ON TABLE "public"."simulation_auto_students" TO "authenticated";
GRANT ALL ON TABLE "public"."simulation_auto_students" TO "service_role";



GRANT ALL ON TABLE "public"."simulation_history" TO "anon";
GRANT ALL ON TABLE "public"."simulation_history" TO "authenticated";
GRANT ALL ON TABLE "public"."simulation_history" TO "service_role";



GRANT ALL ON TABLE "public"."simulation_participants" TO "anon";
GRANT ALL ON TABLE "public"."simulation_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."simulation_participants" TO "service_role";



GRANT ALL ON TABLE "public"."simulation_table_config" TO "anon";
GRANT ALL ON TABLE "public"."simulation_table_config" TO "authenticated";
GRANT ALL ON TABLE "public"."simulation_table_config" TO "service_role";



GRANT ALL ON SEQUENCE "public"."simulation_table_config_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."simulation_table_config_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."simulation_table_config_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."simulation_template_states" TO "anon";
GRANT ALL ON TABLE "public"."simulation_template_states" TO "authenticated";
GRANT ALL ON TABLE "public"."simulation_template_states" TO "service_role";



GRANT ALL ON TABLE "public"."simulation_templates" TO "anon";
GRANT ALL ON TABLE "public"."simulation_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."simulation_templates" TO "service_role";



GRANT ALL ON TABLE "public"."student_roster_with_profiles" TO "anon";
GRANT ALL ON TABLE "public"."student_roster_with_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."student_roster_with_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."system_logs" TO "anon";
GRANT ALL ON TABLE "public"."system_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."system_logs" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_users" TO "anon";
GRANT ALL ON TABLE "public"."tenant_users" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_users" TO "service_role";



GRANT ALL ON TABLE "public"."tenant_statistics" TO "anon";
GRANT ALL ON TABLE "public"."tenant_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."tenant_statistics" TO "service_role";



GRANT ALL ON TABLE "public"."tr_active_living_profiles" TO "anon";
GRANT ALL ON TABLE "public"."tr_active_living_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."tr_active_living_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."tr_assessment_scores" TO "anon";
GRANT ALL ON TABLE "public"."tr_assessment_scores" TO "authenticated";
GRANT ALL ON TABLE "public"."tr_assessment_scores" TO "service_role";



GRANT ALL ON TABLE "public"."tr_interdisciplinary_interps" TO "anon";
GRANT ALL ON TABLE "public"."tr_interdisciplinary_interps" TO "authenticated";
GRANT ALL ON TABLE "public"."tr_interdisciplinary_interps" TO "service_role";



GRANT ALL ON TABLE "public"."tr_progress_notes" TO "anon";
GRANT ALL ON TABLE "public"."tr_progress_notes" TO "authenticated";
GRANT ALL ON TABLE "public"."tr_progress_notes" TO "service_role";



GRANT ALL ON TABLE "public"."tr_screening_entries" TO "anon";
GRANT ALL ON TABLE "public"."tr_screening_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."tr_screening_entries" TO "service_role";



GRANT ALL ON TABLE "public"."tr_treatment_plan_rows" TO "anon";
GRANT ALL ON TABLE "public"."tr_treatment_plan_rows" TO "authenticated";
GRANT ALL ON TABLE "public"."tr_treatment_plan_rows" TO "service_role";



GRANT ALL ON TABLE "public"."user_programs" TO "anon";
GRANT ALL ON TABLE "public"."user_programs" TO "authenticated";
GRANT ALL ON TABLE "public"."user_programs" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."user_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."user_tenant_access" TO "anon";
GRANT ALL ON TABLE "public"."user_tenant_access" TO "authenticated";
GRANT ALL ON TABLE "public"."user_tenant_access" TO "service_role";



GRANT ALL ON TABLE "public"."user_tenant_cache" TO "service_role";



GRANT ALL ON TABLE "public"."wound_assessments" TO "anon";
GRANT ALL ON TABLE "public"."wound_assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."wound_assessments" TO "service_role";



GRANT ALL ON TABLE "public"."wound_treatments" TO "anon";
GRANT ALL ON TABLE "public"."wound_treatments" TO "authenticated";
GRANT ALL ON TABLE "public"."wound_treatments" TO "service_role";



GRANT ALL ON TABLE "public"."wounds" TO "anon";
GRANT ALL ON TABLE "public"."wounds" TO "authenticated";
GRANT ALL ON TABLE "public"."wounds" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







