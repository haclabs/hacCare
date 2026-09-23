-- ============================================================================
-- SECURITY FIX: Re-lock down more unused SECURITY DEFINER / trigger functions
-- ============================================================================
-- Found via a full live pg_proc grant audit (2026-09-07) cross-referenced
-- against every supabase.rpc() call in src/** + supabase/functions/** (using
-- a multi-line-tolerant node scan this time, not grep -- see the earlier
-- get_user_simulation_assignments regression same session for why).
--
-- Before writing this, additionally verified none of these are invoked any
-- other way that would require the `authenticated` role to hold EXECUTE:
--   - pg_trigger / pg_event_trigger: most of these ARE real trigger/event-
--     trigger functions (set_updated_at, update_*_updated_at, protect_*_
--     identifiers, set_*_tenant_id, enable_rls_on_new_tables, rls_auto_enable,
--     auto_tag_simulation_from_template) -- triggers run as the function
--     owner, the invoking role's EXECUTE grant is never checked, so revoking
--     is a safe no-op for their real usage.
--   - pg_policies.qual/with_check: none of these appear inside any RLS policy
--     expression (would require authenticated to keep EXECUTE, since policies
--     evaluate as the querying role). NOTE: current_user_is_super_admin()
--     DOES appear in 2 policies (user_sessions, user_profiles) -- deliberately
--     EXCLUDED from this revoke list for that reason.
--   - pg_proc.prosrc cross-refs: user_is_super_admin() is called internally
--     by get_super_admin_tenant_context/set_super_admin_tenant_context/
--     user_has_patient_access, but all three callers are SECURITY DEFINER, so
--     the nested call runs as the function owner, not as `authenticated`--
--     safe to revoke.
--   - handle_new_user/handle_patient_tenant_assignment/handle_user_profile_
--     update are NOT currently attached as triggers anywhere (the live
--     on_auth_user_created trigger uses `ensure_user_profile`, already
--     revoked in 20260907000001) -- these three look like dead/superseded
--     code, safe to revoke (candidates for a future DROP FUNCTION cleanup).
--   - No pg_views or pg_constraint definitions reference any of these.
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.auto_tag_simulation_from_template() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_simulations() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_old_sessions() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_simulation_subtenant(p_simulation_id uuid, p_simulation_name text, p_parent_tenant_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_user_session(p_ip_address inet, p_user_agent text, p_tenant_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.enable_rls_on_new_tables() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.end_user_session() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_patient_tenant_assignment() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_user_profile_update() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.instantiate_simulation_patients(p_simulation_id uuid, p_scenario_template_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin_user(user_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin_direct(user_uuid uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin_user(user_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_tenant_admin(tenant_uuid uuid, user_uuid uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_medication_identifiers() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_patient_identifiers() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_alert_tenant_id() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_medication_admin_tenant_id() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_tenant_id_on_insert() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.set_wound_treatment_tenant_id() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_bowel_records_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_contact_submissions_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_handover_notes_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_lab_panel_status() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_lab_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_landing_content_timestamp() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_patient_intake_output_events_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_patient_notes_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_programs_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_student_roster_updated_at() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_patient_access(patient_tenant_id uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_tenant_access() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.user_has_tenant_access(user_uuid uuid, tenant_uuid uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.user_is_super_admin(user_uuid uuid) FROM authenticated;

-- ============================================================================
-- DELIBERATELY NOT TOUCHED: current_user_is_super_admin() -- used directly in
-- RLS policies on user_sessions/user_profiles (must stay executable by
-- authenticated or those policies fail for every signed-in user).
-- ============================================================================
