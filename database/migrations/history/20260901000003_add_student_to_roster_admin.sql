-- ============================================================================
-- add_student_to_roster_admin — SECURITY DEFINER student_roster insert
-- ============================================================================
-- programService.ts's addStudentToRoster() was switched to call this RPC
-- instead of a direct `.from('student_roster').insert()` so student roster
-- creation doesn't depend on student_roster's RLS policy exactly matching
-- what's tracked in migration history (see 20260901000000/1/2 for the
-- session-hijack and RLS-drift debugging that led here). This function was
-- referenced by the client before it existed — this migration creates it.
--
-- Same caller gate as update_user_profile_admin (20260901000001): only
-- super_admin/coordinator/admin/instructor may add students to a roster.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.add_student_to_roster_admin(
  p_program_id uuid,
  p_user_id uuid,
  p_student_number text
)
RETURNS public.student_roster
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

GRANT EXECUTE ON FUNCTION public.add_student_to_roster_admin(uuid, uuid, text) TO authenticated;

COMMENT ON FUNCTION public.add_student_to_roster_admin IS
'Adds a student to a program roster, bypassing RLS. SECURITY DEFINER so this
works regardless of student_roster''s RLS policy state; caller must already
hold super_admin/coordinator/admin/instructor role (same gate as
update_user_profile_admin).';
