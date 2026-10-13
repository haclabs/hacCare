-- Super admins / coordinators saw no auto-generated student logins: the old SELECT policy only
-- allowed the creator or any active member of the simulation tenant. That membership check also let
-- the student accounts themselves (tenant_users.role = 'nurse') read every classmate's password.

DROP POLICY IF EXISTS simulation_auto_students_select ON public.simulation_auto_students;

CREATE POLICY simulation_auto_students_select
  ON public.simulation_auto_students
  FOR SELECT TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND up.is_active
        AND up.role IN ('super_admin', 'coordinator')
    )
    OR EXISTS (
      SELECT 1
      FROM public.simulation_active sa
      JOIN public.tenant_users tu ON tu.tenant_id = sa.tenant_id
      WHERE sa.id = simulation_auto_students.simulation_id
        AND tu.user_id = (SELECT auth.uid())
        AND tu.is_active = true
        AND tu.role = 'admin'
    )
  );
