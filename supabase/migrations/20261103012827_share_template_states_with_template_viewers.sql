-- Named template states (e.g. "Week 2") were readable only by members of the template's own
-- tenant, which an instructor becomes only by opening the template editor. Instructors who ran a
-- simulation without ever editing its template saw no states in the Reset / Launch dialogs.
-- Staff who can see a template now see its states; template visibility already applies program
-- and institution scoping, and template_states_institution_scope still applies on top.
DROP POLICY IF EXISTS template_states_select ON public.simulation_template_states;

CREATE POLICY template_states_select ON public.simulation_template_states
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.tenant_id = simulation_template_states.tenant_id
        AND tu.user_id = (SELECT auth.uid())
        AND tu.is_active = true
    )
    OR public.caller_has_role(ARRAY['super_admin', 'coordinator'])
    OR (
      public.caller_has_role(ARRAY['admin', 'instructor'])
      AND EXISTS (
        SELECT 1 FROM public.simulation_templates t
        WHERE t.id = simulation_template_states.template_id
      )
    )
  );
