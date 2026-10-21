-- ============================================================================
-- Let instructors delete handover notes while editing a template
-- ============================================================================
-- The only DELETE policy on handover_notes was "Users can delete their own new
-- handover notes": creator only, within an hour of creation. Instructors editing
-- a template could not remove baseline SBAR notes written by someone else or
-- written earlier, and Supabase reports a policy-blocked delete as success with
-- zero rows, so nothing told them why.
--
-- This adds a second permissive policy (policies OR together, so the existing
-- one still applies everywhere):
--   * instructor / admin / coordinator / super_admin profile role, AND
--   * the note's patient lives in a template tenant (simulation_template or
--     patient_template) the caller is an active member of.
-- enterTemplateTenant() upserts the instructor into tenant_users, so membership
-- holds for the whole editing session. Live simulations and production are
-- unaffected -- student handover notes there remain part of the record.
--
-- handover_notes has no tenant_id column, so scoping goes through patient_id,
-- matching handover_notes_select / handover_notes_insert.
-- ============================================================================

DROP POLICY IF EXISTS handover_notes_delete_template ON public.handover_notes;

CREATE POLICY handover_notes_delete_template ON public.handover_notes
  FOR DELETE TO authenticated
  USING (
    public.caller_profile_role() IN ('super_admin', 'coordinator', 'admin', 'instructor')
    AND patient_id IN (
      SELECT p.id
      FROM patients p
      JOIN tenants t ON t.id = p.tenant_id
      WHERE t.tenant_type IN ('simulation_template', 'patient_template')
        AND p.tenant_id IN (SELECT public.caller_tenant_ids())
    )
  );
