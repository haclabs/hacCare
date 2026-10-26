-- ============================================================================
-- Let users read the programs they are assigned to
-- ============================================================================
-- programs was only readable by super_admin or by members of the program's
-- INSTITUTION tenant. Instructors are members of PROGRAM tenants, so they could
-- read no programs at all -- and every policy of the form
--
--   EXISTS (SELECT 1 FROM user_programs JOIN programs ... WHERE prog.code = ANY (...))
--
-- evaluates programs under the caller's RLS, so it never matched for them.
-- Instructors therefore saw no patient templates, and only saw simulation
-- templates through templates_select's catch-all `status = 'ready'` clause.
--
-- user_programs_select already reads programs, so this policy cannot read
-- user_programs directly (infinite recursion); the SECURITY DEFINER helper
-- reads it with RLS bypassed.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.caller_program_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT up.program_id FROM user_programs up WHERE up.user_id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION public.caller_program_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.caller_program_ids() TO authenticated;

DROP POLICY IF EXISTS programs_select_assigned ON public.programs;
CREATE POLICY programs_select_assigned ON public.programs
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.caller_program_ids()));
