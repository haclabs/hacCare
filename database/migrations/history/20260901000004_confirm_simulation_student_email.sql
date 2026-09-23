-- ============================================================================
-- confirm_simulation_student_email — auto-confirm simulation-only accounts
-- ============================================================================
-- Auto-generated students (autoStudentService.ts) sign up with a fake,
-- non-deliverable @simulation.haccare.local address — if "Confirm email" is
-- enabled in Supabase Auth settings, GoTrue blocks sign-in with "Email not
-- confirmed" and they can never click a link to clear it. Manually-added
-- students (AddStudentModal.tsx) use real emails but are also created
-- directly by an instructor, so the same instant-active behavior is intended.
--
-- This function marks the account confirmed at the auth.users level. Scoped
-- tightly to reduce blast radius: caller must already hold
-- super_admin/coordinator/admin/instructor role (same gate as
-- update_user_profile_admin), AND the target account must already be
-- simulation_only=true — it can never be used to auto-confirm a regular
-- production account.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.confirm_simulation_student_email(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.confirm_simulation_student_email(uuid) TO authenticated;

COMMENT ON FUNCTION public.confirm_simulation_student_email IS
'Marks a simulation-only student account as email-confirmed so it can sign in
immediately, without needing to click a confirmation link (auto-generated
accounts use a fake, non-deliverable address and could never receive one).
Restricted to simulation_only=true targets, callable only by
super_admin/coordinator/admin/instructor.';
