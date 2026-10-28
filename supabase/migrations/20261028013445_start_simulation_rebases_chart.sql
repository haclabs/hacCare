-- Start re-bases the chart to the moment the group begins.
--
-- Launch and reset re-base a snapshot's timestamps (vitals, I&O, orders, medication next_due,
-- lab times, ...) to the moment they run (shift_snapshot_timestamps). A simulation then waits at
-- Ready to Start until the instructor presses Start, and the chart doesn't move with it: launch the
-- night before and the morning group sees yesterday's vitals and overdue medications.
--
-- 1. simulation_active.ready_at records when the simulation last landed in Ready to Start. A
--    trigger stamps it on launch (INSERT as pending) and whenever an UPDATE moves it back to
--    pending with no clock (reset, reset with template updates), so the launch and reset
--    functions don't need redeploying.
-- 2. start_simulation() replaces the client-side status update behind the Start button. It shifts
--    every clinical timestamp in the simulation's tenant forward by now() - ready_at (the same
--    columns shift_snapshot_timestamps moves: every timestamp except created_at/updated_at), then
--    sets running/starts_at/ends_at. Rows are only ever shifted by the wait since the last
--    launch/reset, so starting is idempotent per Ready to Start.

ALTER TABLE public.simulation_active ADD COLUMN IF NOT EXISTS ready_at timestamptz;

COMMENT ON COLUMN public.simulation_active.ready_at IS
  'When the simulation last became Ready to Start (launch or reset). start_simulation() shifts the chart forward by now() - ready_at.';

-- Existing Ready to Start simulations: the reset functions set updated_at = now(), and launch sets
-- created_at, so this is when their chart was last re-based.
UPDATE public.simulation_active
SET ready_at = COALESCE(updated_at, created_at)
WHERE status = 'pending' AND starts_at IS NULL AND ready_at IS NULL;

CREATE OR REPLACE FUNCTION public.stamp_simulation_ready_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'pending' AND NEW.starts_at IS NULL AND (
       TG_OP = 'INSERT'
    OR OLD.status IS DISTINCT FROM 'pending'
    OR OLD.starts_at IS NOT NULL
    -- reset/sync of a simulation that was already pending
    OR NEW.current_state_id IS DISTINCT FROM OLD.current_state_id
    OR NEW.template_snapshot_version_synced IS DISTINCT FROM OLD.template_snapshot_version_synced
  ) THEN
    NEW.ready_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_stamp_simulation_ready_at ON public.simulation_active;
CREATE TRIGGER trigger_stamp_simulation_ready_at
  BEFORE INSERT OR UPDATE ON public.simulation_active
  FOR EACH ROW EXECUTE FUNCTION public.stamp_simulation_ready_at();

CREATE OR REPLACE FUNCTION public.start_simulation(p_simulation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sim     simulation_active%ROWTYPE;
  v_shift   interval := interval '0';
  v_now     timestamptz := now();
  v_table   record;
  v_rows    integer;
  v_total   integer := 0;
BEGIN
  PERFORM public.assert_can_manage_simulation(p_simulation_id); -- access guard

  SELECT * INTO v_sim FROM simulation_active WHERE id = p_simulation_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Simulation not found: %', p_simulation_id;
  END IF;

  -- Rows paused before pausing was removed: resume without touching the clock.
  IF v_sim.status = 'paused' THEN
    UPDATE simulation_active SET status = 'running', updated_at = v_now WHERE id = p_simulation_id;
    RETURN jsonb_build_object('success', true, 'resumed', true);
  END IF;

  IF v_sim.status IS DISTINCT FROM 'pending' THEN
    RAISE EXCEPTION 'Simulation is not Ready to Start (status: %)', v_sim.status;
  END IF;

  IF v_sim.ready_at IS NOT NULL AND v_sim.ready_at < v_now THEN
    v_shift := v_now - v_sim.ready_at;
  END IF;

  IF v_shift > interval '0' THEN
    -- Every table carrying this tenant's clinical rows, minus the ones that describe the
    -- simulation/template itself or the platform rather than the patient's chart.
    FOR v_table IN
      SELECT c.table_name,
             string_agg(format('%1$I = %1$I + $2', c.column_name), ', ') AS set_clause
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
      WHERE c.table_schema = 'public'
        AND c.data_type IN ('timestamp with time zone', 'timestamp without time zone')
        AND c.column_name NOT IN ('created_at', 'updated_at')
        AND c.table_name NOT IN ('simulation_active', 'simulation_history', 'simulation_templates',
                                 'patient_templates', 'system_logs', 'user_sessions')
        AND EXISTS (
          SELECT 1 FROM information_schema.columns tc
          WHERE tc.table_schema = 'public' AND tc.table_name = c.table_name AND tc.column_name = 'tenant_id'
        )
      GROUP BY c.table_name
    LOOP
      EXECUTE format('UPDATE public.%I SET %s WHERE tenant_id = $1', v_table.table_name, v_table.set_clause)
        USING v_sim.tenant_id, v_shift;
      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_total := v_total + v_rows;
    END LOOP;

    -- handover_notes has no tenant_id; it hangs off the patient.
    UPDATE handover_notes
    SET acknowledged_at = acknowledged_at + v_shift
    WHERE acknowledged_at IS NOT NULL
      AND patient_id IN (SELECT id FROM patients WHERE tenant_id = v_sim.tenant_id);
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    v_total := v_total + v_rows;
  END IF;

  UPDATE simulation_active
  SET status = 'running',
      starts_at = v_now,
      ends_at = v_now + make_interval(mins => v_sim.duration_minutes),
      updated_at = v_now
  WHERE id = p_simulation_id;

  RETURN jsonb_build_object(
    'success', true,
    'starts_at', v_now,
    'ends_at', v_now + make_interval(mins => v_sim.duration_minutes),
    'shifted_minutes', floor(extract(epoch FROM v_shift) / 60),
    'rows_shifted', v_total
  );
END;
$$;

COMMENT ON FUNCTION public.start_simulation(uuid) IS
  'Start button: shifts the simulation''s chart timestamps forward by the time it waited at Ready to Start, then starts the clock.';

REVOKE EXECUTE ON FUNCTION public.start_simulation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.start_simulation(uuid) TO authenticated;
