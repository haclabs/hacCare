-- ============================================================================
-- REVOKE authenticated from internal/obsolete SECURITY DEFINER functions
-- ============================================================================
-- Supabase Security Advisor lint 0029 — partial fix
--
-- Strategy: Revoke authenticated from the ~75 functions that are NOT called
-- via supabase.rpc() in the TypeScript codebase. The remaining ~36 actively
-- called functions retain authenticated and are accepted as intentional.
--
-- Verified by searching src/**/*.ts(x) for all .rpc('...') call sites.
-- The 36 kept functions are listed at the bottom of this file.
--
-- Three categories of revocations:
--   A. Trigger functions — only fired by DB trigger mechanism, never via RPC
--   B. Obsolete API versions — superseded by direct inserts or newer functions
--   C. Internal helpers & admin maintenance — no browser-side RPC surface needed
-- ============================================================================

-- ============================================================================
-- A. TRIGGER FUNCTIONS
--    These are SECURITY DEFINER because triggers need elevated privileges,
--    but they must never be callable via /rest/v1/rpc/.
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.auto_set_tenant_id()
  FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.archive_landing_content_version()
  FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.protect_super_admin_role()
  FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.set_wound_assessment_tenant_id()
  FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.trigger_create_program_tenant()
  FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.trigger_refresh_user_tenant_cache()
  FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.update_medication_administrations_updated_at()
  FROM authenticated;

-- ============================================================================
-- B. OBSOLETE / SUPERSEDED API VERSIONS
--    Old RPC wrappers replaced by direct table inserts or newer functions.
--    The TypeScript service layer now writes directly to the tables.
-- ============================================================================

-- Simulation user creation — superseded (simulation_only flow removed)
REVOKE EXECUTE ON FUNCTION public.add_simulation_user(
  p_simulation_tenant_id uuid, p_email text, p_username text,
  p_role text, p_password text
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.authenticate_simulation_user(
  p_username text, p_password text, p_simulation_tenant_id uuid
) FROM authenticated;

-- Alert creation — superseded by direct inserts with deduplication in alertService.ts
REVOKE EXECUTE ON FUNCTION public.create_alert_for_tenant(
  p_tenant_id uuid, p_patient_id uuid, p_alert_type text, p_message text,
  p_patient_name text, p_priority text, p_expires_at timestamp with time zone
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.create_alert_for_tenant_v2(
  p_tenant_id uuid, p_patient_id uuid, p_alert_type text, p_message text,
  p_patient_name text, p_priority text, p_expires_at timestamp with time zone
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.create_patient_alert_v2(
  p_patient_id uuid, p_tenant_id uuid, p_alert_type text, p_message text,
  p_patient_name text, p_priority text, p_expires_at timestamp with time zone
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.create_patient_alert_v3(
  p_patient_id uuid, p_tenant_id uuid, p_alert_type text, p_message text,
  p_patient_name text, p_priority text, p_expires_at timestamp with time zone
) FROM authenticated;

-- Clinical data RPC wrappers — superseded by direct table inserts in service layer
REVOKE EXECUTE ON FUNCTION public.create_patient_medication(
  p_patient_id uuid, p_name text, p_dosage text, p_frequency text,
  p_route text, p_start_date date, p_end_date date, p_prescribed_by text,
  p_admin_time time without time zone, p_admin_times text[],
  p_status text, p_category text
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.create_patient_note(
  p_patient_id uuid, p_note_type text, p_content text,
  p_priority text, p_created_by uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.create_patient_vitals(
  p_patient_id uuid, p_temperature numeric,
  p_blood_pressure_systolic integer, p_blood_pressure_diastolic integer,
  p_heart_rate integer, p_respiratory_rate integer,
  p_oxygen_saturation numeric, p_oxygen_delivery text,
  p_recorded_at timestamp with time zone
) FROM authenticated;

-- Simulation/snapshot obsolete versions
REVOKE EXECUTE ON FUNCTION public.create_simulation_snapshot(
  p_template_id uuid, p_name character varying, p_user_id uuid, p_description text
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.launch_simulation_instance(
  p_template_id uuid, p_snapshot_id uuid, p_name character varying, p_user_id uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.reset_simulation_for_next_session_v2(
  p_simulation_id uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.reset_simulation_instance(
  p_instance_id uuid, p_user_id uuid
) FROM authenticated;

-- Snapshot restore — called internally by launch_simulation/reset functions
-- as SECURITY DEFINER; never called directly via supabase.rpc()
REVOKE EXECUTE ON FUNCTION public.restore_snapshot_to_tenant(
  p_tenant_id uuid, p_snapshot jsonb, p_id_mappings jsonb,
  p_barcode_mappings jsonb, p_preserve_barcodes boolean, p_skip_patients boolean
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.restore_snapshot_to_tenant_v2(
  p_tenant_id uuid, p_snapshot jsonb
) FROM authenticated;

-- ============================================================================
-- C. INTERNAL HELPERS & ADMIN MAINTENANCE
--    These are never called via supabase.rpc() in the TypeScript codebase.
--    Admin/maintenance operations run via service_role or cron, not the browser.
-- ============================================================================

-- Alert acknowledgment — service layer writes directly to alerts table
REVOKE EXECUTE ON FUNCTION public.acknowledge_alert_for_tenant(
  p_alert_id uuid, p_tenant_id uuid
) FROM authenticated;

-- Tenant assignment helpers — dangerous if exposed; admin uses reassign_user_tenant (kept)
REVOKE EXECUTE ON FUNCTION public.assign_current_user_to_tenant(
  target_tenant_id uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.assign_user_to_tenant(
  user_id_param uuid, tenant_id_param uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.assign_users_to_simulation(
  p_run_id uuid, p_user_ids uuid[], p_role text
) FROM authenticated;

-- Bulk student assignment — feature removed (bulk_create_students migration 20260427000001)
REVOKE EXECUTE ON FUNCTION public.bulk_assign_students_to_simulation(
  p_simulation_id uuid, p_student_user_ids uuid[], p_role text
) FROM authenticated;

-- Metrics / reporting — not exposed in UI
REVOKE EXECUTE ON FUNCTION public.calculate_simulation_metrics(
  p_simulation_id uuid
) FROM authenticated;

-- Maintenance / cron — should only run via service_role or pg_cron
REVOKE EXECUTE ON FUNCTION public.cleanup_all_problem_simulations()
  FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.cleanup_backup_audit_logs()
  FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.cleanup_orphaned_users()
  FROM authenticated;

-- User creation helpers — admin creates users via Supabase Auth Admin API, not these
REVOKE EXECUTE ON FUNCTION public.create_confirmed_user(
  user_email text, user_password text, first_name text,
  last_name text, user_role text
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.create_medication_super_admin(
  p_patient_id uuid, p_name text, p_dosage text, p_frequency text,
  p_route text, p_start_date date, p_end_date date, p_prescribed_by text,
  p_category text, p_admin_time text, p_status text
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.create_user_profile(
  user_id uuid, user_email text, first_name text,
  last_name text, user_role public.user_role
) FROM authenticated;

-- Delete helpers — old stubs, admin uses direct SQL or the delete_simulation RPC (kept)
REVOKE EXECUTE ON FUNCTION public.delete_medication_super_admin(
  p_medication_id uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.delete_patient_template(
  p_patient_template_id uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.delete_scenario_template(
  p_scenario_template_id uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.delete_simulation_history(
  p_history_id uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.delete_simulation_template(
  p_template_id uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.delete_tenant_secure(
  target_tenant_id uuid
) FROM authenticated;

-- Profile bootstrap — fired by auth trigger, not by browser RPC
REVOKE EXECUTE ON FUNCTION public.ensure_user_profile()
  FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.ensure_user_profile(
  user_id uuid, user_email text
) FROM authenticated;

-- Medication fetcher — superseded by direct tenant-filtered queries
REVOKE EXECUTE ON FUNCTION public.fetch_medications_for_tenant(
  target_tenant_id uuid
) FROM authenticated;

-- One-time data fix utilities — run via dashboard, not browser
REVOKE EXECUTE ON FUNCTION public.fix_user_role_mismatches()
  FROM authenticated;

-- Label generation — not wired to any UI component
REVOKE EXECUTE ON FUNCTION public.generate_simulation_id_sets(
  p_template_id uuid, p_session_count integer, p_session_names text[]
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.get_backup_statistics()
  FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.get_cohort_students(
  p_cohort_id uuid
) FROM authenticated;

-- Tenant context helpers — internal, replaced by TenantContext React state
REVOKE EXECUTE ON FUNCTION public.get_current_user_tenant_id()
  FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.get_secure_alerts()
  FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.get_simulation_label_data(
  p_template_id uuid, p_session_number integer
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.get_simulation_students(
  p_simulation_id uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.get_super_admin_tenant_context()
  FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_accessible_simulations(
  p_user_id uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_active_tenants(
  user_uuid uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_role(
  user_id uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_simulation_assignments(
  p_user_id uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_simulation_tenant_access()
  FROM authenticated;

-- get_user_tenant overloads — superseded by get_user_current_tenant (kept)
REVOKE EXECUTE ON FUNCTION public.get_user_tenant()
  FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_tenant(
  user_uuid uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_tenant_assignments(
  target_user_id uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_tenant_direct(
  user_uuid uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_tenant_id()
  FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_tenant_ids(
  user_uuid uuid
) FROM authenticated;

-- is_super_admin — superseded; internal role checks use user_profiles table directly
REVOKE EXECUTE ON FUNCTION public.is_super_admin(
  check_user_id uuid
) FROM authenticated;

-- Maintenance / cron
REVOKE EXECUTE ON FUNCTION public.mark_expired_backups()
  FROM authenticated;

-- Patient transfer — superseded, not in UI
REVOKE EXECUTE ON FUNCTION public.move_patient_to_tenant(
  p_patient_id uuid, p_target_tenant_id uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.move_patient_to_tenant(
  p_source_patient_id text, p_target_tenant_id uuid
) FROM authenticated;

-- Activity recorder — old debrief pattern, superseded
REVOKE EXECUTE ON FUNCTION public.record_simulation_activity(
  p_simulation_id uuid, p_student_id uuid,
  p_action_type character varying, p_action_data jsonb
) FROM authenticated;

-- Cache refresh — internal, fired by trigger; refresh_user_tenant_cache runs as postgres owner
REVOKE EXECUTE ON FUNCTION public.refresh_user_tenant_cache()
  FROM authenticated;

-- Tenant user removal — admin-only, no direct RPC in UI
REVOKE EXECUTE ON FUNCTION public.remove_user_from_tenant(
  tenant_uuid uuid, user_uuid uuid
) FROM authenticated;

-- Medication admin — superseded by direct table updates
REVOKE EXECUTE ON FUNCTION public.update_medication_super_admin(
  p_medication_id uuid, p_updates jsonb
) FROM authenticated;

-- Simulation category updates — service layer uses direct UPDATE, not RPC
REVOKE EXECUTE ON FUNCTION public.update_simulation_categories(
  p_simulation_id uuid, p_primary_categories text[], p_sub_categories text[]
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.update_simulation_history_categories(
  p_simulation_id uuid, p_primary_categories text[], p_sub_categories text[]
) FROM authenticated;

-- Permission helpers — never called via RPC; internal RLS use only
REVOKE EXECUTE ON FUNCTION public.user_has_permission(
  user_uuid uuid, permission_name text, tenant_uuid uuid
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.validate_subdomain(
  subdomain_input text
) FROM authenticated;

-- ============================================================================
-- FUNCTIONS INTENTIONALLY KEPT (actively called via supabase.rpc() in src/)
-- ============================================================================
-- check_expired_simulations        cleanup_old_sessions
-- compare_simulation_template_patients  compare_simulation_vs_template
-- compare_template_versions        complete_simulation
-- confirm_user_email               create_program_tenant
-- create_simulation_template       create_snapshot
-- create_user_session              deactivate_user
-- delete_simulation                delete_user_permanently
-- duplicate_patient_to_tenant      end_user_session
-- find_user_by_email               get_available_admin_users
-- get_available_tenants_for_transfer  get_tenant_users
-- get_user_current_tenant          get_user_program_codes
-- get_user_program_tenants         get_user_simulation_assignments
-- launch_run
-- launch_simulation                reactivate_user
-- reassign_user_tenant             reset_run
-- reset_simulation_for_next_session  reset_simulation_with_template_updates
-- restore_template_version         save_template_snapshot_v2
-- save_template_version            set_super_admin_tenant_context
-- update_user_profile_admin        user_has_program_access
