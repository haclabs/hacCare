-- Remove the legacy "Transfer Patient" feature (copy a patient into another tenant).
--
-- Superseded by patient templates. The only caller was the Transfer button in Patient Management,
-- removed in the same change. Verified against the live DB (2026-10-18) that no other function
-- references either of these.
--
-- Also closes a follow-up from 20260907000001_relock_unused_security_definer_functions.sql, which
-- left get_available_tenants_for_transfer executable by authenticated pending an internal
-- permission check that was never added.

DROP FUNCTION IF EXISTS public.duplicate_patient_to_tenant(
  p_source_patient_id text,
  p_target_tenant_id uuid,
  p_new_patient_id text,
  p_include_vitals boolean,
  p_include_medications boolean,
  p_include_assessments boolean,
  p_include_handover_notes boolean,
  p_include_alerts boolean,
  p_include_diabetic_records boolean,
  p_include_bowel_records boolean,
  p_include_wound_care boolean,
  p_include_doctors_orders boolean,
  p_include_labs boolean,
  p_include_hacmap boolean,
  p_include_intake_output boolean
);

DROP FUNCTION IF EXISTS public.get_available_tenants_for_transfer(p_source_patient_id text);
