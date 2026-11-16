-- ============================================================================
-- Flowsheet entries can be marked "entered in error"
-- ============================================================================
-- Charting rule: a wrong entry is never edited or deleted. The student marks
-- it as entered in error with their name and a reason, it stays visible
-- (struck through) in the history, debrief and printed record, and they save
-- a corrected entry.
--
-- For signed-in users (role authenticated) the trigger only allows adding the
-- mark, once, to a student entry (is_baseline = false); the entry itself and
-- an existing mark can't be changed. The time is set by the server. SECURITY
-- DEFINER functions (launch, reset, snapshot) run as the owner and are not
-- affected.
-- ============================================================================

ALTER TABLE public.patient_system_assessments
  ADD COLUMN entered_in_error_at timestamptz,
  ADD COLUMN entered_in_error_by text,
  ADD COLUMN entered_in_error_reason text,
  ADD CONSTRAINT patient_system_assessments_entered_in_error_complete CHECK (
    (entered_in_error_at IS NULL AND entered_in_error_by IS NULL AND entered_in_error_reason IS NULL)
    OR (entered_in_error_at IS NOT NULL
        AND btrim(coalesce(entered_in_error_by, '')) <> ''
        AND btrim(coalesce(entered_in_error_reason, '')) <> '')
  );

COMMENT ON COLUMN public.patient_system_assessments.entered_in_error_at IS
  'When the entry was marked entered in error (set by trigger). The entry is kept, struck through.';

CREATE OR REPLACE FUNCTION public.guard_system_assessment_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF OLD.entered_in_error_at IS NOT NULL THEN
    RAISE EXCEPTION 'This entry is already marked as entered in error'
      USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.is_baseline THEN
    RAISE EXCEPTION 'Baseline entries are corrected in the template, not marked in error'
      USING ERRCODE = 'check_violation';
  END IF;
  IF (NEW.id, NEW.patient_id, NEW.tenant_id, NEW.system_type, NEW.assessment_data,
      NEW.nurse_id, NEW.nurse_name, NEW.recorded_at, NEW.created_at, NEW.is_baseline)
     IS DISTINCT FROM
     (OLD.id, OLD.patient_id, OLD.tenant_id, OLD.system_type, OLD.assessment_data,
      OLD.nurse_id, OLD.nurse_name, OLD.recorded_at, OLD.created_at, OLD.is_baseline) THEN
    RAISE EXCEPTION 'Flowsheet entries can''t be edited; mark the entry as entered in error and save a new one'
      USING ERRCODE = 'check_violation';
  END IF;

  NEW.entered_in_error_by := btrim(NEW.entered_in_error_by);
  NEW.entered_in_error_reason := btrim(NEW.entered_in_error_reason);
  NEW.entered_in_error_at := CASE
    WHEN NEW.entered_in_error_by IS NULL AND NEW.entered_in_error_reason IS NULL THEN NULL
    ELSE now()
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_system_assessment_update
  BEFORE UPDATE ON public.patient_system_assessments
  FOR EACH ROW EXECUTE FUNCTION public.guard_system_assessment_update();
