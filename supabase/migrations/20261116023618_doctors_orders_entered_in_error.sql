-- ============================================================================
-- Doctor's orders can be marked "entered in error"; student logins can no
-- longer edit or delete orders
-- ============================================================================
-- doctors_orders had one policy letting any tenant member do anything, so a
-- simulation login could silently rewrite or delete an order (the UI only hid
-- the buttons). Now:
--
-- * Anyone in a running simulation can mark an order entered in error with a
--   name and a reason, once. The order is kept (struck through in the UI,
--   debrief and print). The time is set here. Marks can't be changed or
--   removed. Template orders are edited directly instead, so they can't be
--   marked.
-- * Marking a medication order discontinues its MAR medication (status
--   'Discontinued'); the medication and its administration history are kept,
--   and a discontinued medication can't be given.
-- * Student and nurse logins may only acknowledge orders or mark them. They
--   can't edit or delete, except to remove a medication order they created in
--   the last 5 minutes whose MAR medication was never created (the cleanup in
--   createMedicationOrder).
-- * Both reset functions turn discontinued medications back to Active.
--
-- Staff roles and SECURITY DEFINER functions are otherwise unaffected.
-- ============================================================================

ALTER TABLE public.doctors_orders
  ADD COLUMN entered_in_error_at timestamptz,
  ADD COLUMN entered_in_error_by text,
  ADD COLUMN entered_in_error_reason text,
  ADD CONSTRAINT doctors_orders_entered_in_error_complete CHECK (
    (entered_in_error_at IS NULL AND entered_in_error_by IS NULL AND entered_in_error_reason IS NULL)
    OR (entered_in_error_at IS NOT NULL
        AND btrim(coalesce(entered_in_error_by, '')) <> ''
        AND btrim(coalesce(entered_in_error_reason, '')) <> '')
  );

-- Lookups the invoker-rights trigger below can't rely on RLS for.
CREATE OR REPLACE FUNCTION public.caller_is_simulation_participant()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles
                 WHERE id = auth.uid() AND role IN ('student'::user_role, 'nurse'::user_role));
$$;

CREATE OR REPLACE FUNCTION public.order_linked_medication_exists(p_tenant_id uuid, p_order_link_key uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM patient_medications
                 WHERE tenant_id = p_tenant_id AND order_link_key = p_order_link_key);
$$;

CREATE OR REPLACE FUNCTION public.tenant_is_template(p_tenant_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM tenants
                 WHERE id = p_tenant_id AND tenant_type IN ('simulation_template', 'patient_template'));
$$;

REVOKE ALL ON FUNCTION public.caller_is_simulation_participant() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.order_linked_medication_exists(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.tenant_is_template(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.caller_is_simulation_participant() TO authenticated;
GRANT EXECUTE ON FUNCTION public.order_linked_medication_exists(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tenant_is_template(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_doctors_order_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_ack_cols text[] := ARRAY['is_acknowledged', 'acknowledged_by', 'acknowledged_at',
                             'acknowledged_by_student', 'updated_by', 'updated_at'];
  v_mark_cols text[] := ARRAY['entered_in_error_at', 'entered_in_error_by', 'entered_in_error_reason',
                              'updated_by', 'updated_at'];
BEGIN
  IF current_user <> 'authenticated' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    IF public.caller_is_simulation_participant()
       AND NOT (OLD.created_by = auth.uid()
                AND OLD.order_link_key IS NOT NULL
                AND OLD.created_at > now() - interval '5 minutes'
                AND NOT public.order_linked_medication_exists(OLD.tenant_id, OLD.order_link_key)) THEN
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
    IF public.tenant_is_template(NEW.tenant_id) THEN
      RAISE EXCEPTION 'Template orders are edited directly, not marked as entered in error'
        USING ERRCODE = 'check_violation';
    END IF;
    IF (to_jsonb(NEW) - v_mark_cols) IS DISTINCT FROM (to_jsonb(OLD) - v_mark_cols) THEN
      RAISE EXCEPTION 'Marking an order as entered in error can''t change the order itself'
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.entered_in_error_by := btrim(NEW.entered_in_error_by);
    NEW.entered_in_error_reason := btrim(NEW.entered_in_error_reason);
    NEW.entered_in_error_at := now();
    RETURN NEW;
  END IF;

  NEW.entered_in_error_at := NULL;
  IF public.caller_is_simulation_participant()
     AND (to_jsonb(NEW) - v_ack_cols) IS DISTINCT FROM (to_jsonb(OLD) - v_ack_cols) THEN
    RAISE EXCEPTION 'Orders can''t be edited; mark the order as entered in error and enter a new one'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_doctors_order_change
  BEFORE UPDATE OR DELETE ON public.doctors_orders
  FOR EACH ROW EXECUTE FUNCTION public.guard_doctors_order_change();

CREATE OR REPLACE FUNCTION public.discontinue_medication_for_order_in_error()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE patient_medications
     SET status = 'Discontinued'
   WHERE tenant_id = NEW.tenant_id
     AND order_link_key = NEW.order_link_key;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.discontinue_medication_for_order_in_error() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER discontinue_medication_for_order_in_error
  AFTER UPDATE OF entered_in_error_at ON public.doctors_orders
  FOR EACH ROW
  WHEN (OLD.entered_in_error_at IS NULL AND NEW.entered_in_error_at IS NOT NULL AND NEW.order_link_key IS NOT NULL)
  EXECUTE FUNCTION public.discontinue_medication_for_order_in_error();

CREATE OR REPLACE FUNCTION public.block_discontinued_medication_administration()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' AND EXISTS (
    SELECT 1 FROM patient_medications
    WHERE id::text = NEW.medication_id AND status = 'Discontinued'
  ) THEN
    RAISE EXCEPTION 'This medication was discontinued because its order was entered in error, so it can''t be given'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER block_discontinued_medication_administration
  BEFORE INSERT ON public.medication_administrations
  FOR EACH ROW EXECUTE FUNCTION public.block_discontinued_medication_administration();

-- Resets keep MAR medications in place, so turn discontinued ones back on.
DO $$
DECLARE
  v_fn text;
  v_def text;
  v_new text;
BEGIN
  FOREACH v_fn IN ARRAY ARRAY['reset_simulation_for_next_session', 'reset_simulation_with_template_updates'] LOOP
    v_def := pg_get_functiondef(format('public.%I(uuid, uuid)', v_fn)::regprocedure);
    IF (SELECT count(*) FROM regexp_matches(v_def, 'SET last_administered = NULL', 'g')) <> 1 THEN
      RAISE EXCEPTION '%: expected exactly one "SET last_administered = NULL"', v_fn;
    END IF;
    v_new := replace(v_def, 'SET last_administered = NULL',
      'SET last_administered = NULL, status = CASE WHEN status = ''Discontinued'' THEN ''Active'' ELSE status END');
    IF v_new !~ 'PERFORM public\.assert_can_manage_simulation' THEN
      RAISE EXCEPTION '%: access guard missing, not redeploying', v_fn;
    END IF;
    EXECUTE v_new;
  END LOOP;
END $$;
