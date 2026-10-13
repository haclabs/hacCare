-- Instructors and coordinators build simulation templates, so they need to enter
-- lab panels/results directly (e.g. a pre-collected CBC). Write access was
-- admin/super_admin only, and super_admin still needed tenant_users membership
-- (403 on tenants they aren't a member of). Now: tenant members with a staff
-- role, or any super_admin.

DROP POLICY IF EXISTS lab_panels_insert ON public.lab_panels;
CREATE POLICY lab_panels_insert ON public.lab_panels
  FOR INSERT
  WITH CHECK (
    (
      tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = (SELECT auth.uid()) AND is_active = true)
      AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = ANY (ARRAY['admin', 'coordinator', 'instructor']::user_role[]))
    )
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = 'super_admin')
  );

DROP POLICY IF EXISTS lab_panels_update ON public.lab_panels;
CREATE POLICY lab_panels_update ON public.lab_panels
  FOR UPDATE
  USING (
    (
      tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = (SELECT auth.uid()) AND is_active = true)
      AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = ANY (ARRAY['admin', 'coordinator', 'instructor']::user_role[]))
    )
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = 'super_admin')
  );

DROP POLICY IF EXISTS lab_panels_delete ON public.lab_panels;
CREATE POLICY lab_panels_delete ON public.lab_panels
  FOR DELETE
  USING (
    (
      tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = (SELECT auth.uid()) AND is_active = true)
      AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = ANY (ARRAY['admin', 'coordinator', 'instructor']::user_role[]))
    )
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = 'super_admin')
  );

DROP POLICY IF EXISTS lab_results_insert ON public.lab_results;
CREATE POLICY lab_results_insert ON public.lab_results
  FOR INSERT
  WITH CHECK (
    (
      tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = (SELECT auth.uid()) AND is_active = true)
      AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = ANY (ARRAY['admin', 'coordinator', 'instructor']::user_role[]))
    )
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = 'super_admin')
  );

-- Keeps the existing clause that lets a user update a result they acknowledged.
DROP POLICY IF EXISTS lab_results_update ON public.lab_results;
CREATE POLICY lab_results_update ON public.lab_results
  FOR UPDATE
  USING (
    (
      tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = (SELECT auth.uid()) AND is_active = true)
      AND (
        EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = ANY (ARRAY['admin', 'coordinator', 'instructor']::user_role[]))
        OR (ack_by = (SELECT auth.uid()) AND ack_at IS NOT NULL)
      )
    )
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = 'super_admin')
  );

DROP POLICY IF EXISTS lab_results_delete ON public.lab_results;
CREATE POLICY lab_results_delete ON public.lab_results
  FOR DELETE
  USING (
    (
      tenant_id IN (SELECT tenant_id FROM public.tenant_users WHERE user_id = (SELECT auth.uid()) AND is_active = true)
      AND EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = ANY (ARRAY['admin', 'coordinator', 'instructor']::user_role[]))
    )
    OR EXISTS (SELECT 1 FROM public.user_profiles WHERE id = (SELECT auth.uid()) AND role = 'super_admin')
  );
