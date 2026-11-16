-- ============================================================================
-- Fix tenant isolation on five clinical tables
-- ============================================================================
-- bowel_records, diabetic_records, patient_admission_records,
-- patient_advanced_directives and patient_notes had policies of the form
--
--   tenant_id = (SELECT <table>.tenant_id FROM user_profiles WHERE id = auth.uid())
--
-- The subquery reads the outer row's own tenant_id, so the check compares the
-- row with itself and passes for every signed-in user: anyone could read,
-- edit or delete these records in any institution.
--
-- They now use the same rule as `patients`: an active super_admin, or an
-- active tenant_users membership in the row's tenant. Anyone who can see a
-- patient can still see that patient's records. diabetic_records keeps its
-- extra conditions (only the recorder may update; only admins and nurses may
-- delete). Policies now target `authenticated` instead of `public`, so the
-- anon role gets nothing.
-- ============================================================================

DO $$
DECLARE
  v_table text;
  v_policy record;
  v_access constant text := $rule$
    (EXISTS (SELECT 1 FROM public.user_profiles
             WHERE user_profiles.id = (SELECT auth.uid())
               AND user_profiles.role = 'super_admin'::public.user_role
               AND user_profiles.is_active = true))
    OR (EXISTS (SELECT 1 FROM public.tenant_users
                WHERE tenant_users.user_id = (SELECT auth.uid())
                  AND tenant_users.tenant_id = %1$I.tenant_id
                  AND tenant_users.is_active = true))
  $rule$;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'bowel_records', 'diabetic_records', 'patient_admission_records',
    'patient_advanced_directives', 'patient_notes'
  ] LOOP
    FOR v_policy IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = v_table
    LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', v_policy.policyname, v_table);
    END LOOP;

    IF v_table = 'diabetic_records' THEN
      EXECUTE format(
        'CREATE POLICY diabetic_records_select ON public.diabetic_records
           FOR SELECT TO authenticated USING (%s)',
        format(v_access, v_table));
      EXECUTE format(
        'CREATE POLICY diabetic_records_insert ON public.diabetic_records
           FOR INSERT TO authenticated WITH CHECK (%s)',
        format(v_access, v_table));
      EXECUTE format(
        'CREATE POLICY diabetic_records_update ON public.diabetic_records
           FOR UPDATE TO authenticated
           USING (recorded_by = (SELECT auth.uid()) AND (%1$s))
           WITH CHECK (recorded_by = (SELECT auth.uid()) AND (%1$s))',
        format(v_access, v_table));
      EXECUTE format(
        'CREATE POLICY diabetic_records_delete ON public.diabetic_records
           FOR DELETE TO authenticated
           USING ((%s) AND EXISTS (SELECT 1 FROM public.user_profiles
                    WHERE user_profiles.id = (SELECT auth.uid())
                      AND user_profiles.role = ANY (ARRAY[''admin''::public.user_role,
                                                          ''nurse''::public.user_role])))',
        format(v_access, v_table));
    ELSE
      EXECUTE format(
        'CREATE POLICY %1$I ON public.%2$I
           FOR ALL TO authenticated USING (%3$s) WITH CHECK (%3$s)',
        v_table || '_tenant_isolation', v_table, format(v_access, v_table));
    END IF;
  END LOOP;
END $$;
