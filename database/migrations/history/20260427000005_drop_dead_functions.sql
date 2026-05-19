-- ============================================================================
-- DROP Obsolete/Dead SECURITY DEFINER Functions
-- ============================================================================
-- Companion to:
--   20260427000004_revoke_authenticated_from_internal_functions.sql
--
-- This drops functions that are:
--   1. Not called via supabase.rpc() anywhere in src/
--   2. Not called as sub-functions inside any active DB function in database/functions/
--   3. Superseded by direct table inserts or newer RPC patterns
--
-- After running this migration, regenerate TypeScript types:
--   npm run supabase:types
--
-- Functions kept (not dropped) even though authenticated was revoked:
--   Internal helpers that may still be referenced by older DB function bodies
--   in the live DB (cache refresh trigger, maintenance procedures) — those
--   are revoked from the API surface but left in place for internal use.
-- ============================================================================

-- ============================================================================
-- SIMULATION V1 STUBS — superseded by launch_simulation + restore_snapshot_to_tenant
-- ============================================================================
DROP FUNCTION IF EXISTS public.create_simulation_snapshot(
  p_template_id uuid, p_name character varying, p_user_id uuid, p_description text
);

DROP FUNCTION IF EXISTS public.launch_simulation_instance(
  p_template_id uuid, p_snapshot_id uuid, p_name character varying, p_user_id uuid
);

DROP FUNCTION IF EXISTS public.restore_snapshot_to_tenant_v2(
  p_tenant_id uuid, p_snapshot jsonb
);

DROP FUNCTION IF EXISTS public.reset_simulation_instance(
  p_instance_id uuid, p_user_id uuid
);

DROP FUNCTION IF EXISTS public.reset_simulation_for_next_session_v2(
  p_simulation_id uuid
);

-- ============================================================================
-- SIMULATION USER STUBS — simulation_only user flow removed
-- ============================================================================
DROP FUNCTION IF EXISTS public.add_simulation_user(
  p_simulation_tenant_id uuid, p_email text, p_username text,
  p_role text, p_password text
);

DROP FUNCTION IF EXISTS public.authenticate_simulation_user(
  p_username text, p_password text, p_simulation_tenant_id uuid
);

-- ============================================================================
-- TENANT ASSIGNMENT STUBS
-- Superseded by direct tenant_users inserts in launch_simulation and TenantContext.
-- These were also a privilege escalation risk (any user adding themselves to any tenant).
-- ============================================================================
DROP FUNCTION IF EXISTS public.assign_user_to_tenant(
  user_id_param uuid, tenant_id_param uuid
);

DROP FUNCTION IF EXISTS public.assign_current_user_to_tenant(
  target_tenant_id uuid
);

DROP FUNCTION IF EXISTS public.assign_users_to_simulation(
  p_run_id uuid, p_user_ids uuid[], p_role text
);

-- ============================================================================
-- ALERT CREATION STUBS — superseded by direct inserts in alertService.ts
-- ============================================================================
DROP FUNCTION IF EXISTS public.create_alert_for_tenant(
  p_tenant_id uuid, p_patient_id uuid, p_alert_type text, p_message text,
  p_patient_name text, p_priority text, p_expires_at timestamp with time zone
);

DROP FUNCTION IF EXISTS public.create_alert_for_tenant_v2(
  p_tenant_id uuid, p_patient_id uuid, p_alert_type text, p_message text,
  p_patient_name text, p_priority text, p_expires_at timestamp with time zone
);

DROP FUNCTION IF EXISTS public.create_patient_alert_v2(
  p_patient_id uuid, p_tenant_id uuid, p_alert_type text, p_message text,
  p_patient_name text, p_priority text, p_expires_at timestamp with time zone
);

DROP FUNCTION IF EXISTS public.create_patient_alert_v3(
  p_patient_id uuid, p_tenant_id uuid, p_alert_type text, p_message text,
  p_patient_name text, p_priority text, p_expires_at timestamp with time zone
);

-- ============================================================================
-- CLINICAL DATA STUBS — superseded by direct table inserts in service layer
-- ============================================================================
DROP FUNCTION IF EXISTS public.create_patient_medication(
  p_patient_id uuid, p_name text, p_dosage text, p_frequency text,
  p_route text, p_start_date date, p_end_date date, p_prescribed_by text,
  p_admin_time time without time zone, p_admin_times text[],
  p_status text, p_category text
);

DROP FUNCTION IF EXISTS public.create_patient_note(
  p_patient_id uuid, p_note_type text, p_content text,
  p_priority text, p_created_by uuid
);

DROP FUNCTION IF EXISTS public.create_patient_vitals(
  p_patient_id uuid, p_temperature numeric,
  p_blood_pressure_systolic integer, p_blood_pressure_diastolic integer,
  p_heart_rate integer, p_respiratory_rate integer,
  p_oxygen_saturation numeric, p_oxygen_delivery text,
  p_recorded_at timestamp with time zone
);

-- ============================================================================
-- USER CREATION STUBS — admin uses Supabase Auth Admin API directly
-- ============================================================================
DROP FUNCTION IF EXISTS public.create_confirmed_user(
  user_email text, user_password text, first_name text,
  last_name text, user_role text
);

-- ============================================================================
-- ONE-TIME DATA FIX UTILITIES — already ran, no longer needed
-- ============================================================================
DROP FUNCTION IF EXISTS public.fix_user_role_mismatches();

-- ============================================================================
-- ACTIVITY RECORDER — old debrief pattern, superseded by studentActivityService.ts
-- ============================================================================
DROP FUNCTION IF EXISTS public.record_simulation_activity(
  p_simulation_id uuid, p_student_id uuid,
  p_action_type character varying, p_action_data jsonb
);

-- ============================================================================
-- DELETE STUBS — admin operations done via delete_simulation RPC or direct SQL
-- ============================================================================
DROP FUNCTION IF EXISTS public.delete_patient_template(
  p_patient_template_id uuid
);

DROP FUNCTION IF EXISTS public.delete_scenario_template(
  p_scenario_template_id uuid
);

DROP FUNCTION IF EXISTS public.delete_simulation_template(
  p_template_id uuid
);

-- ============================================================================
-- DEPRECATED TENANT LOOKUP OVERLOADS
-- Superseded by get_user_current_tenant(uuid) which is still called from TS
-- ============================================================================
DROP FUNCTION IF EXISTS public.get_user_tenant();
DROP FUNCTION IF EXISTS public.get_user_tenant(user_uuid uuid);
DROP FUNCTION IF EXISTS public.get_user_tenant_id() CASCADE; -- recent_login_history view (already dropped) depended on this
DROP FUNCTION IF EXISTS public.get_user_tenant_ids(user_uuid uuid);
DROP FUNCTION IF EXISTS public.get_user_tenant_direct(user_uuid uuid);
DROP FUNCTION IF EXISTS public.get_user_tenant_assignments(target_user_id uuid);
DROP FUNCTION IF EXISTS public.get_user_tenant_ids(user_uuid uuid);
DROP FUNCTION IF EXISTS public.get_current_user_tenant_id();
DROP FUNCTION IF EXISTS public.get_user_active_tenants(user_uuid uuid);

-- ============================================================================
-- WHAT TO DO AFTER RUNNING THIS
-- ============================================================================
-- 1. Regenerate TypeScript types from the updated DB schema:
--      npm run supabase:types
--
-- 2. Verify the dropped functions no longer appear in supabase.ts:
--      grep "create_simulation_snapshot\|launch_simulation_instance\|assign_user_to_tenant" src/types/supabase.ts
--    Expected: 0 matches
--
-- 3. Run a Security Advisor re-scan in Supabase dashboard — the revocations
--    from migration 20260427000004 + these drops should clear the majority of
--    remaining lint 0029 warnings.
