-- Fix snapshot data to match current tenant and patient IDs
-- This updates the template snapshot to use current simulation patient IDs

DO $$
DECLARE
  v_current_tenant_id uuid;
  v_template_id uuid;
  v_snapshot jsonb;
  v_updated_snapshot jsonb;
  v_patient_mapping jsonb := '{}';
  rec record;
BEGIN
  -- Get current simulation info
  SELECT 
    sa.tenant_id,
    sa.template_id,
    st.snapshot_data
  INTO 
    v_current_tenant_id,
    v_template_id,
    v_snapshot
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  ORDER BY sa.created_at DESC
  LIMIT 1;

  RAISE NOTICE '🔧 Fixing snapshot for tenant: % template: %', v_current_tenant_id, v_template_id;

  -- Build patient ID mapping by matching names and room numbers
  FOR rec IN
    WITH snapshot_patients AS (
      SELECT 
        (p->>'id')::uuid as old_patient_id,
        p->>'first_name' as first_name,
        p->>'last_name' as last_name,
        p->>'room_number' as room_number
      FROM jsonb_array_elements(v_snapshot->'patients') as p
    ),
    current_patients AS (
      SELECT 
        id as new_patient_id,
        first_name,
        last_name,
        room_number
      FROM patients 
      WHERE tenant_id = v_current_tenant_id
    )
    SELECT 
      sp.old_patient_id,
      cp.new_patient_id
    FROM snapshot_patients sp
    JOIN current_patients cp ON (
      sp.first_name = cp.first_name 
      AND sp.last_name = cp.last_name
      AND COALESCE(sp.room_number, '') = COALESCE(cp.room_number, '')
    )
  LOOP
    v_patient_mapping := jsonb_set(
      v_patient_mapping, 
      ARRAY[rec.old_patient_id::text], 
      to_jsonb(rec.new_patient_id::text)
    );
    RAISE NOTICE '📋 Mapped patient % -> %', rec.old_patient_id, rec.new_patient_id;
  END LOOP;

  RAISE NOTICE '🗺️ Patient ID mapping: %', v_patient_mapping;

  -- Start with original snapshot
  v_updated_snapshot := v_snapshot;

  -- Update patients section
  IF v_snapshot ? 'patients' THEN
    WITH updated_patients AS (
      SELECT jsonb_agg(
        jsonb_set(
          jsonb_set(p, '{id}', to_jsonb((v_patient_mapping->>((p->>'id')::text))::uuid)),
          '{tenant_id}', to_jsonb(v_current_tenant_id)
        )
      ) as new_patients
      FROM jsonb_array_elements(v_snapshot->'patients') as p
      WHERE v_patient_mapping ? (p->>'id')
    )
    SELECT jsonb_set(v_updated_snapshot, '{patients}', up.new_patients)
    INTO v_updated_snapshot
    FROM updated_patients up;
  END IF;

  -- Update doctors_orders section
  IF v_snapshot ? 'doctors_orders' THEN
    WITH updated_orders AS (
      SELECT jsonb_agg(
        jsonb_set(
          jsonb_set(
            jsonb_set(o, '{patient_id}', to_jsonb((v_patient_mapping->>((o->>'patient_id')::text))::uuid)),
            '{tenant_id}', to_jsonb(v_current_tenant_id)
          ),
          '{is_acknowledged}', 'false'::jsonb  -- Reset to unacknowledged
        )
      ) as new_orders
      FROM jsonb_array_elements(v_snapshot->'doctors_orders') as o
      WHERE v_patient_mapping ? (o->>'patient_id')
    )
    SELECT jsonb_set(v_updated_snapshot, '{doctors_orders}', uo.new_orders)
    INTO v_updated_snapshot
    FROM updated_orders uo;
  END IF;

  -- Update patient_vitals section (if exists and not empty)
  IF v_snapshot ? 'patient_vitals' AND jsonb_array_length(v_snapshot->'patient_vitals') > 0 THEN
    WITH updated_vitals AS (
      SELECT jsonb_agg(
        jsonb_set(
          jsonb_set(v, '{patient_id}', to_jsonb((v_patient_mapping->>((v->>'patient_id')::text))::uuid)),
          '{tenant_id}', to_jsonb(v_current_tenant_id)
        )
      ) as new_vitals
      FROM jsonb_array_elements(v_snapshot->'patient_vitals') as v
      WHERE v_patient_mapping ? (v->>'patient_id')
    )
    SELECT jsonb_set(v_updated_snapshot, '{patient_vitals}', uv.new_vitals)
    INTO v_updated_snapshot
    FROM updated_vitals uv;
  END IF;

  -- Update the template with fixed snapshot
  UPDATE simulation_templates 
  SET 
    snapshot_data = v_updated_snapshot,
    updated_at = now()
  WHERE id = v_template_id;

  RAISE NOTICE '✅ Updated snapshot data with current tenant and patient IDs';
  
  -- Log what we fixed
  RAISE NOTICE '📊 Updated snapshot summary:';
  RAISE NOTICE '  - Patients: %', 
    CASE WHEN v_updated_snapshot ? 'patients' THEN jsonb_array_length(v_updated_snapshot->'patients') ELSE 0 END;
  RAISE NOTICE '  - Doctors Orders: %', 
    CASE WHEN v_updated_snapshot ? 'doctors_orders' THEN jsonb_array_length(v_updated_snapshot->'doctors_orders') ELSE 0 END;
  RAISE NOTICE '  - Vitals: %', 
    CASE WHEN v_updated_snapshot ? 'patient_vitals' THEN jsonb_array_length(v_updated_snapshot->'patient_vitals') ELSE 0 END;

END $$;