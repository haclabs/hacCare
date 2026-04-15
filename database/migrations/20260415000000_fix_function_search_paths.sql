-- ============================================================================
-- FIX FUNCTION SEARCH PATH MUTABLE (Supabase Security Advisor)
-- ============================================================================
-- All SECURITY DEFINER functions must have a fixed search_path to prevent
-- schema injection attacks. Without this, a malicious user could shadow
-- public.user_profiles or auth functions by manipulating their search_path,
-- causing these functions to operate on attacker-controlled objects.
--
-- Fix: ALTER FUNCTION ... SET search_path = public
-- This locks name resolution to the public schema without requiring function
-- body rewrites. All existing unqualified table references continue to work.
-- ============================================================================

-- ============================================================================
-- SECURITY DEFINER functions (highest priority — run with elevated privileges)
-- ============================================================================

ALTER FUNCTION public.get_user_program_tenants(UUID)
  SET search_path = public;

ALTER FUNCTION public.protect_super_admin_role()
  SET search_path = public;

ALTER FUNCTION public.reset_simulation_with_template_updates(UUID)
  SET search_path = public;

ALTER FUNCTION public.reset_simulation_for_next_session(UUID)
  SET search_path = public;

ALTER FUNCTION public.launch_simulation(UUID, TEXT, INTEGER, UUID[], TEXT[], TEXT[], TEXT[])
  SET search_path = public;

ALTER FUNCTION public.complete_simulation(UUID, JSONB, TEXT)
  SET search_path = public;

ALTER FUNCTION public.compare_simulation_template_patients(UUID)
  SET search_path = public;

ALTER FUNCTION public.compare_simulation_vs_template(UUID)
  SET search_path = public;

ALTER FUNCTION public.compare_template_versions(UUID, INT, INT)
  SET search_path = public;

ALTER FUNCTION public.save_template_version(UUID, JSONB, TEXT, UUID)
  SET search_path = public;

ALTER FUNCTION public.restore_template_version(UUID, INT, UUID, TEXT)
  SET search_path = public;

ALTER FUNCTION public.get_user_accessible_simulations(UUID)
  SET search_path = public;

ALTER FUNCTION public.get_user_program_codes(UUID)
  SET search_path = public;

ALTER FUNCTION public.user_has_program_access(UUID, TEXT)
  SET search_path = public;

ALTER FUNCTION public.update_simulation_categories(UUID, TEXT[], TEXT[])
  SET search_path = public;

ALTER FUNCTION public.update_simulation_history_categories(UUID, TEXT[], TEXT[])
  SET search_path = public;

ALTER FUNCTION public.get_simulation_students(UUID)
  SET search_path = public;

ALTER FUNCTION public.get_cohort_students(UUID)
  SET search_path = public;

-- Note: prune_system_logs() is defined in create_system_logs.sql but has not
-- been deployed to the live database yet. SET search_path is already embedded
-- in the function definition so it will be correct when first deployed.

-- ============================================================================
-- Trigger functions (updated_at maintenance + auto-tagging)
-- ============================================================================

ALTER FUNCTION public.update_program_announcements_updated_at()
  SET search_path = public;

ALTER FUNCTION public.update_programs_updated_at()
  SET search_path = public;

ALTER FUNCTION public.update_scheduled_simulations_updated_at()
  SET search_path = public;

ALTER FUNCTION public.update_student_roster_updated_at()
  SET search_path = public;

ALTER FUNCTION public.auto_tag_simulation_from_template()
  SET search_path = public;

-- ============================================================================
-- VERIFY: Confirm search_path is now set on all 7 functions
-- (Run manually to validate after applying migration)
-- ============================================================================
-- SELECT proname, proconfig
-- FROM pg_proc
-- JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
-- WHERE pg_namespace.nspname = 'public'
--   AND proname IN (
--     'get_user_program_tenants',
--     'protect_super_admin_role',
--     'reset_simulation_with_template_updates',
--     'update_program_announcements_updated_at',
--     'update_programs_updated_at',
--     'update_scheduled_simulations_updated_at',
--     'auto_tag_simulation_from_template'
--   )
-- ORDER BY proname;
-- Expected: proconfig should contain 'search_path=public' for each row.
