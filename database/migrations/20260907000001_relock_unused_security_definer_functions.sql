-- ============================================================================
-- SECURITY FIX: Re-apply authenticated-role lockdown on unused internal functions
-- ============================================================================
-- Found via Supabase Security Advisor (2026-09-07) — 98 SECURITY DEFINER
-- functions currently executable by `authenticated`. Most are intentional
-- (called directly via supabase.rpc() from the client). This migration
-- re-locks down the ones that are NOT.
--
-- ROOT CAUSE: database/migrations/history/20260427000004_revoke_authenticated_
-- from_internal_functions.sql already revoked `authenticated` from these exact
-- functions in April. Live DB shows the grants are back — the known regression
-- pattern documented in this repo: CREATE OR REPLACE FUNCTION resets a
-- function's ACL to the Postgres default (EXECUTE granted to PUBLIC, which
-- Supabase then re-grants to authenticated) whenever the signature changes.
--
-- VERIFIED before writing this (2026-09-07 session): grepped every function
-- name below against `rpc('<name>'` across all of src/ — none are called by
-- the client. Two functions from the original list ARE now used
-- (delete_patient_template, delete_simulation_template, find_user_by_email)
-- and are deliberately EXCLUDED here — they need an internal permission check
-- added instead of a blanket revoke (separate follow-up), since revoking
-- would break real admin features.
--
-- Some functions from the original 2026-04-27 list no longer exist at all
-- (dropped since) and are simply omitted below.
--
-- Highest-severity finding fixed here: `create_user_profile` had ZERO caller
-- check and would let any authenticated user upsert a user_profiles row for
-- an arbitrary user_id with an arbitrary role (including super_admin) — a
-- self-escalation path. `remove_user_from_tenant` had ZERO check and would
-- let any authenticated user deactivate anyone's access to any tenant.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.acknowledge_alert_for_tenant(p_alert_id uuid, p_tenant_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.archive_landing_content_version() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.auto_set_tenant_id() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.bulk_assign_students_to_simulation(p_simulation_id uuid, p_student_user_ids uuid[], p_role text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_simulation_metrics(p_simulation_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_all_problem_simulations() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_backup_audit_logs() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_orphaned_users() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_medication_super_admin(p_patient_id uuid, p_name text, p_dosage text, p_frequency text, p_route text, p_start_date date, p_end_date date, p_prescribed_by text, p_category text, p_admin_time text, p_status text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_user_profile(user_id uuid, user_email text, first_name text, last_name text, user_role user_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_medication_super_admin(p_medication_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_simulation_history(p_history_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_tenant_secure(target_tenant_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_user_profile() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_user_profile(user_id uuid, user_email text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fetch_medications_for_tenant(target_tenant_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_simulation_id_sets(p_template_id uuid, p_session_count integer, p_session_names text[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_cohort_students(p_cohort_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_secure_alerts() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_simulation_label_data(p_template_id uuid, p_session_number integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_simulation_students(p_simulation_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_super_admin_tenant_context() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_accessible_simulations(p_user_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(user_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_simulation_assignments(p_user_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_simulation_tenant_access() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(check_user_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.move_patient_to_tenant(p_source_patient_id text, p_target_tenant_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.move_patient_to_tenant(p_patient_id uuid, p_target_tenant_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_super_admin_role() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_user_tenant_cache() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.remove_user_from_tenant(tenant_uuid uuid, user_uuid uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_snapshot_to_tenant(p_tenant_id uuid, p_snapshot jsonb, p_id_mappings jsonb, p_barcode_mappings jsonb, p_preserve_barcodes boolean, p_skip_patients boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_wound_assessment_tenant_id() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_create_program_tenant() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trigger_refresh_user_tenant_cache() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_medication_administrations_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_medication_super_admin(p_medication_id uuid, p_updates jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_simulation_categories(p_simulation_id uuid, p_primary_categories text[], p_sub_categories text[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_simulation_history_categories(p_simulation_id uuid, p_primary_categories text[], p_sub_categories text[]) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_permission(user_uuid uuid, permission_name text, tenant_uuid uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_subdomain(subdomain_input text) FROM authenticated;

-- ============================================================================
-- DELIBERATELY NOT TOUCHED HERE (actively called by client, need an internal
-- permission check added instead of a blanket revoke — tracked as follow-up):
--   delete_patient_template, delete_simulation_template, find_user_by_email,
--   get_available_admin_users, get_available_tenants_for_transfer,
--   save_template_version, restore_template_version
-- ============================================================================
