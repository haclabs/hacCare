-- ============================================================================
-- Students may only mark orders a student entered as entered in error
-- ============================================================================
-- 20261116023618 let anyone in a running simulation mark any order, so a
-- student could void an instructor's order (and discontinue its medication).
-- A nurse can't void a physician's order; they clarify with the prescriber.
-- Student and nurse logins may now only mark orders created by a student or
-- nurse login (the phone/verbal orders they took). Staff can still mark any
-- order. Template orders keep the instructor as created_by after launch and
-- reset, so they are protected.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.user_is_simulation_participant(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM user_profiles
                 WHERE id = p_user_id AND role IN ('student'::user_role, 'nurse'::user_role));
$$;

REVOKE ALL ON FUNCTION public.user_is_simulation_participant(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_is_simulation_participant(uuid) TO authenticated;

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
    IF public.caller_is_simulation_participant()
       AND NOT public.user_is_simulation_participant(OLD.created_by) THEN
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
