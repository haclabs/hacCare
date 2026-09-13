-- ============================================================================
-- SHIFT SNAPSHOT TIMESTAMPS
-- ============================================================================
-- Shifts every timestamp/timestamptz column (except created_at/updated_at,
-- which already get a fresh DEFAULT now() on restore) across ALL tables in a
-- snapshot JSONB by a fixed interval, preserving relative spacing between
-- entries. Used by launch_simulation/reset_simulation_for_next_session/
-- reset_simulation_with_template_updates to re-base a template's baked-in
-- wall-clock times (I&O, vitals, orders, medication history/next_due, wound
-- treatments, etc.) around the actual launch/reset instant instead of
-- showing whenever the template was originally built/saved.
--
-- Schema-agnostic (auto-detects shiftable columns via information_schema)
-- rather than a hand-maintained per-table list, matching restore_snapshot_
-- to_tenant()'s own philosophy. `patients` has nothing to shift: its only
-- timestamptz columns are the excluded created_at/updated_at; admission_date/
-- date_of_birth are plain `date` columns, untouched by this function.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.shift_snapshot_timestamps(
  p_snapshot jsonb,
  p_shift interval
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_table_name text;
  v_actual_table_name text;
  v_shiftable_cols text[];
  v_rows jsonb;
  v_row jsonb;
  v_new_rows jsonb;
  i integer;
BEGIN
  IF p_shift IS NULL OR p_shift = interval '0' THEN
    RETURN p_snapshot;
  END IF;

  FOR v_table_name IN SELECT jsonb_object_keys(p_snapshot)
  LOOP
    IF v_table_name = 'snapshot_metadata' THEN
      CONTINUE;
    END IF;

    v_rows := p_snapshot->v_table_name;
    IF jsonb_typeof(v_rows) IS DISTINCT FROM 'array' OR jsonb_array_length(v_rows) = 0 THEN
      CONTINUE;
    END IF;

    -- Same 'medications' -> 'patient_medications' alias restore_snapshot_to_tenant uses
    v_actual_table_name := CASE WHEN v_table_name = 'medications' THEN 'patient_medications' ELSE v_table_name END;

    SELECT array_agg(column_name) INTO v_shiftable_cols
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = v_actual_table_name
      AND data_type IN ('timestamp with time zone', 'timestamp without time zone')
      AND column_name NOT IN ('created_at', 'updated_at');

    IF v_shiftable_cols IS NULL THEN
      CONTINUE;
    END IF;

    v_new_rows := '[]'::jsonb;
    FOR v_row IN SELECT * FROM jsonb_array_elements(v_rows)
    LOOP
      FOR i IN 1..array_length(v_shiftable_cols, 1) LOOP
        IF v_row ? v_shiftable_cols[i] AND (v_row->v_shiftable_cols[i]) IS DISTINCT FROM 'null'::jsonb THEN
          v_row := jsonb_set(
            v_row,
            ARRAY[v_shiftable_cols[i]],
            to_jsonb(((v_row->>v_shiftable_cols[i])::timestamptz + p_shift))
          );
        END IF;
      END LOOP;
      v_new_rows := v_new_rows || jsonb_build_array(v_row);
    END LOOP;

    p_snapshot := jsonb_set(p_snapshot, ARRAY[v_table_name], v_new_rows);
  END LOOP;

  RETURN p_snapshot;
END;
$$;

REVOKE ALL ON FUNCTION public.shift_snapshot_timestamps(jsonb, interval) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.shift_snapshot_timestamps(jsonb, interval) TO authenticated;

COMMENT ON FUNCTION public.shift_snapshot_timestamps(jsonb, interval) IS 'Shifts every timestamp/timestamptz column (except created_at/updated_at) across all tables in a snapshot JSONB by a fixed interval, preserving relative spacing. Used by launch_simulation/reset_simulation_for_next_session/reset_simulation_with_template_updates to re-base a template''s baked-in wall-clock times around the actual launch/reset instant.';
