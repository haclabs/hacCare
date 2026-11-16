-- ============================================================================
-- Staff can delete flowsheet baselines while building a template
-- ============================================================================
-- 20261116032701 blocked all flowsheet deletes by signed-in users. In a
-- template every entry is a baseline, and baselines already can't be edited or
-- marked in error, so a wrong baseline could never be removed and would copy
-- into every simulation launched from the template. Staff (any login that
-- isn't a student or nurse) may now delete entries in simulation and patient
-- template tenants. Running simulations are unchanged: no deletes, corrections
-- go through "entered in error".
-- ============================================================================

CREATE OR REPLACE FUNCTION public.guard_system_assessment_write()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF private.tenant_is_template(OLD.tenant_id)
       AND NOT private.caller_is_simulation_participant() THEN
      RETURN OLD;
    END IF;
    RAISE EXCEPTION 'Flowsheet entries can''t be deleted; mark the entry as entered in error instead'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.is_baseline
     AND private.caller_is_simulation_participant()
     AND NOT private.tenant_is_template(NEW.tenant_id) THEN
    RAISE EXCEPTION 'Only instructors can save baseline entries, and only in templates'
      USING ERRCODE = 'check_violation';
  END IF;
  NEW.entered_in_error_at := NULL;
  NEW.entered_in_error_by := NULL;
  NEW.entered_in_error_reason := NULL;
  NEW.entered_in_error_user_id := NULL;
  RETURN NEW;
END;
$$;
