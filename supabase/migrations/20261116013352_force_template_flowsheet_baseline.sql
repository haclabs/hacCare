-- ============================================================================
-- Flowsheet entries saved in a template are always instructor baselines
-- ============================================================================
-- Before 2026-10-13 the Flowsheets hub only treated simulation templates as
-- baseline, so an entry made in a patient template was stored with
-- is_baseline = false and then copied into simulation templates that used that
-- patient. Launched, such a row looks like student work: it shows up in the
-- debrief under the instructor's name and the first reset deletes it.
--
-- 1. A trigger forces is_baseline = true for any row in a template tenant,
--    whichever code path writes it.
-- 2. Existing template rows and the snapshots they were captured into are
--    corrected. No active simulation contains such a row.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.force_template_system_assessment_baseline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT NEW.is_baseline AND EXISTS (
    SELECT 1 FROM public.tenants t
    WHERE t.id = NEW.tenant_id
      AND t.tenant_type IN ('simulation_template', 'patient_template')
  ) THEN
    NEW.is_baseline := true;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.force_template_system_assessment_baseline() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER force_template_system_assessment_baseline
  BEFORE INSERT OR UPDATE OF is_baseline, tenant_id ON public.patient_system_assessments
  FOR EACH ROW EXECUTE FUNCTION public.force_template_system_assessment_baseline();

UPDATE public.patient_system_assessments a
SET is_baseline = true
FROM public.tenants t
WHERE t.id = a.tenant_id
  AND t.tenant_type IN ('simulation_template', 'patient_template')
  AND NOT a.is_baseline;

CREATE FUNCTION pg_temp.mark_snapshot_baseline(p_snapshot jsonb)
RETURNS jsonb
LANGUAGE sql
AS $$
  SELECT jsonb_set(p_snapshot, '{patient_system_assessments}',
           (SELECT coalesce(jsonb_agg(e || '{"is_baseline": true}'::jsonb), '[]'::jsonb)
            FROM jsonb_array_elements(p_snapshot->'patient_system_assessments') e))
$$;

UPDATE public.simulation_templates
SET snapshot_data = pg_temp.mark_snapshot_baseline(snapshot_data)
WHERE jsonb_typeof(snapshot_data->'patient_system_assessments') = 'array'
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(snapshot_data->'patient_system_assessments') e
              WHERE NOT coalesce((e->>'is_baseline')::boolean, false));

UPDATE public.patient_templates
SET snapshot_data = pg_temp.mark_snapshot_baseline(snapshot_data)
WHERE jsonb_typeof(snapshot_data->'patient_system_assessments') = 'array'
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(snapshot_data->'patient_system_assessments') e
              WHERE NOT coalesce((e->>'is_baseline')::boolean, false));

UPDATE public.simulation_template_states
SET snapshot_data = pg_temp.mark_snapshot_baseline(snapshot_data)
WHERE jsonb_typeof(snapshot_data->'patient_system_assessments') = 'array'
  AND EXISTS (SELECT 1 FROM jsonb_array_elements(snapshot_data->'patient_system_assessments') e
              WHERE NOT coalesce((e->>'is_baseline')::boolean, false));
