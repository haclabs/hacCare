-- Drop 49 unused database functions (47 names, two overloaded).
--
-- None is called by the app (src/), an edge function, a script, another function in any schema, an
-- RLS policy, a view, a trigger or an event trigger, and pg_depend lists no dependents. They are
-- left over from earlier designs: pre-guard role checks (is_super_admin*, user_has_*), the old
-- session tracking, sub-tenant simulations, and admin/medication helpers replaced by guarded RPCs.
-- Several were SECURITY DEFINER without a caller check, so dropping them also shrinks what a
-- signed-in user can call directly. The last six are trigger functions no trigger uses.
-- See docs/operations/ACTIVE_SUPABASE_FUNCTIONS.md for how they were identified.
--
-- No CASCADE: if anything did depend on one of these, the migration fails instead of removing it.

-- Old role/permission checks (superseded by caller_has_role / assert_* guards)
DROP FUNCTION IF EXISTS public.get_user_role(uuid);
DROP FUNCTION IF EXISTS public.is_admin_user(uuid);
DROP FUNCTION IF EXISTS public.is_super_admin(uuid);
DROP FUNCTION IF EXISTS public.is_super_admin_direct(uuid);
DROP FUNCTION IF EXISTS public.is_super_admin_user(uuid);
DROP FUNCTION IF EXISTS public.is_tenant_admin(uuid, uuid);
DROP FUNCTION IF EXISTS public.user_is_super_admin(uuid);
DROP FUNCTION IF EXISTS public.user_has_patient_access(uuid);
DROP FUNCTION IF EXISTS public.user_has_permission(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.user_has_tenant_access();
DROP FUNCTION IF EXISTS public.user_has_tenant_access(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_user_simulation_tenant_access();
DROP FUNCTION IF EXISTS public.get_super_admin_tenant_context();

-- Old session tracking
DROP FUNCTION IF EXISTS public.create_user_session(inet, text, uuid);
DROP FUNCTION IF EXISTS public.end_user_session();
DROP FUNCTION IF EXISTS public.cleanup_old_sessions();

-- Users and tenants
DROP FUNCTION IF EXISTS public.create_user_profile(uuid, text, text, text, user_role);
DROP FUNCTION IF EXISTS public.cleanup_orphaned_users();
DROP FUNCTION IF EXISTS public.remove_user_from_tenant(uuid, uuid);
DROP FUNCTION IF EXISTS public.delete_tenant_secure(uuid);
DROP FUNCTION IF EXISTS public.validate_subdomain(text);
DROP FUNCTION IF EXISTS public.cleanup_backup_audit_logs();

-- Patients, medications, alerts
DROP FUNCTION IF EXISTS public.move_patient_to_tenant(text, uuid);
DROP FUNCTION IF EXISTS public.move_patient_to_tenant(uuid, uuid);
DROP FUNCTION IF EXISTS public.fetch_medications_for_tenant(uuid);
DROP FUNCTION IF EXISTS public.update_medication_super_admin(uuid, jsonb);
DROP FUNCTION IF EXISTS public.delete_medication_super_admin(uuid);
DROP FUNCTION IF EXISTS public.acknowledge_alert_for_tenant(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_secure_alerts();

-- Simulations
DROP FUNCTION IF EXISTS public.bulk_assign_students_to_simulation(uuid, uuid[], text);
DROP FUNCTION IF EXISTS public.get_cohort_students(uuid);
DROP FUNCTION IF EXISTS public.get_simulation_students(uuid);
DROP FUNCTION IF EXISTS public.confirm_simulation_student_email(uuid);
DROP FUNCTION IF EXISTS public.calculate_simulation_metrics(uuid);
DROP FUNCTION IF EXISTS public.cleanup_all_problem_simulations();
DROP FUNCTION IF EXISTS public.cleanup_expired_simulations();
DROP FUNCTION IF EXISTS public.create_simulation_subtenant(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.instantiate_simulation_patients(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_simulation_label_data(uuid, integer);
DROP FUNCTION IF EXISTS public.get_user_accessible_simulations(uuid);
DROP FUNCTION IF EXISTS public.delete_simulation_history(uuid);
DROP FUNCTION IF EXISTS public.update_simulation_categories(uuid, text[], text[]);
DROP FUNCTION IF EXISTS public.update_simulation_history_categories(uuid, text[], text[]);

-- Trigger functions not attached to any trigger
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.handle_user_profile_update();
DROP FUNCTION IF EXISTS public.handle_patient_tenant_assignment();
DROP FUNCTION IF EXISTS public.update_bowel_records_updated_at();
DROP FUNCTION IF EXISTS public.archive_landing_content_version();
DROP FUNCTION IF EXISTS public.update_landing_content_timestamp();
