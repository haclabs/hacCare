-- ============================================================================
-- Charting-integrity follow-ups to #488
-- ============================================================================
-- 1. Flowsheet entries can't be deleted by signed-in users. The update guard
--    didn't cover DELETE, so a student could remove an entry (or a baseline)
--    over the API instead of marking it entered in error. Reset, launch and
--    ON DELETE CASCADE from patients run as the owner and are unaffected.
-- 2. Student and nurse logins can't save flowsheet baselines in a running
--    simulation. is_baseline came from the browser; a student-saved baseline
--    would survive resets, couldn't be marked in error and would be hidden
--    from the debrief.
-- 3. Error marks record the login that made them (entered_in_error_user_id),
--    alongside the typed name.
-- 4. Student and nurse logins can read but not write patient_admission_records
--    (the screen already limited editing to staff).
-- 5. The helper functions added in #488 move to a `private` schema the Data
--    API doesn't expose, so they can't be called as RPCs. Triggers and
--    policies still call them as the signed-in user. This also separates the
--    no-argument caller_is_simulation_participant() from the older
--    public.caller_is_simulation_participant(uuid), which stays where it is.
--    `private` must never be added to the Data API's exposed schemas.
-- ============================================================================

-- 5. private schema ---------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

ALTER FUNCTION public.caller_is_simulation_participant() SET SCHEMA private;
ALTER FUNCTION public.user_is_simulation_participant(uuid) SET SCHEMA private;
ALTER FUNCTION public.tenant_is_template(uuid) SET SCHEMA private;
ALTER FUNCTION public.order_linked_medication_exists(uuid, uuid) SET SCHEMA private;

-- 3. Login behind each error mark -------------------------------------------
ALTER TABLE public.patient_system_assessments ADD COLUMN entered_in_error_user_id uuid;
ALTER TABLE public.doctors_orders ADD COLUMN entered_in_error_user_id uuid;
COMMENT ON COLUMN public.patient_system_assessments.entered_in_error_user_id IS
  'Login that marked the entry entered in error (set by trigger; entered_in_error_by is the typed name).';
COMMENT ON COLUMN public.doctors_orders.entered_in_error_user_id IS
  'Login that marked the order entered in error (set by trigger; entered_in_error_by is the typed name).';

CREATE OR REPLACE FUNCTION public.guard_doctors_order_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ack_cols text[] := ARRAY['is_acknowledged', 'acknowledged_by', 'acknowledged_at',
                             'acknowledged_by_student', 'updated_by', 'updated_at'];
  v_mark_cols text[] := ARRAY['entered_in_error_at', 'entered_in_error_by', 'entered_in_error_reason',
                              'entered_in_error_user_id', 'updated_by', 'updated_at'];
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF private.caller_is_simulation_participant()
       AND NOT (OLD.created_by = auth.uid()
                AND OLD.order_link_key IS NOT NULL
                AND OLD.created_at > now() - interval '5 minutes'
                AND NOT private.order_linked_medication_exists(OLD.tenant_id, OLD.order_link_key)) THEN
      RAISE EXCEPTION 'Orders can''t be deleted; mark the order as entered in error instead'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.entered_in_error_at IS NOT NULL THEN
    RAISE EXCEPTION 'This order was entered in error and can''t be changed'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.entered_in_error_by IS NOT NULL OR NEW.entered_in_error_reason IS NOT NULL THEN
    IF private.tenant_is_template(NEW.tenant_id) THEN
      RAISE EXCEPTION 'Template orders are edited directly, not marked as entered in error'
        USING ERRCODE = 'check_violation';
    END IF;
    IF private.caller_is_simulation_participant()
       AND NOT private.user_is_simulation_participant(OLD.created_by) THEN
      RAISE EXCEPTION 'Students can only mark orders a student entered; ask your instructor about this order'
        USING ERRCODE = 'check_violation';
    END IF;
    IF (to_jsonb(NEW) - v_mark_cols) IS DISTINCT FROM (to_jsonb(OLD) - v_mark_cols) THEN
      RAISE EXCEPTION 'Marking an order as entered in error can''t change the order itself'
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.entered_in_error_by := btrim(NEW.entered_in_error_by);
    NEW.entered_in_error_reason := btrim(NEW.entered_in_error_reason);
    NEW.entered_in_error_at := now();
    NEW.entered_in_error_user_id := auth.uid();
    RETURN NEW;
  END IF;

  NEW.entered_in_error_at := NULL;
  NEW.entered_in_error_user_id := NULL;
  IF private.caller_is_simulation_participant()
     AND (to_jsonb(NEW) - v_ack_cols) IS DISTINCT FROM (to_jsonb(OLD) - v_ack_cols) THEN
    RAISE EXCEPTION 'Orders can''t be edited; mark the order as entered in error and enter a new one'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

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
  NEW.entered_in_error_user_id := CASE WHEN NEW.entered_in_error_at IS NULL THEN NULL ELSE auth.uid() END;
  RETURN NEW;
END;
$$;

-- 1 and 2. Flowsheet delete and student-baseline guards ----------------------
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

CREATE TRIGGER guard_system_assessment_write
  BEFORE INSERT OR DELETE ON public.patient_system_assessments
  FOR EACH ROW EXECUTE FUNCTION public.guard_system_assessment_write();

-- 4. Admission records: staff-only writes ----------------------------------
CREATE POLICY patient_admission_records_staff_insert ON public.patient_admission_records
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (NOT private.caller_is_simulation_participant());
CREATE POLICY patient_admission_records_staff_update ON public.patient_admission_records
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (NOT private.caller_is_simulation_participant())
  WITH CHECK (NOT private.caller_is_simulation_participant());
CREATE POLICY patient_admission_records_staff_delete ON public.patient_admission_records
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (NOT private.caller_is_simulation_participant());
