-- ===========================================================================
-- CORRECTED: Fix for diabetic_records using patient_id as TEXT
-- ===========================================================================

DROP FUNCTION IF EXISTS save_template_snapshot(uuid) CASCADE;

CREATE OR REPLACE FUNCTION save_template_snapshot(p_template_id uuid)
RETURNS json AS $$
DECLARE
  v_tenant_id uuid;
  v_snapshot jsonb;
  v_user_id uuid;
  v_result json;
BEGIN
  v_user_id := auth.uid();
  
  -- Get template tenant_id
  SELECT tenant_id INTO v_tenant_id
  FROM simulation_templates
  WHERE id = p_template_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found';
  END IF;
  
  -- Build snapshot of all data in template tenant
  v_snapshot := jsonb_build_object(
    'patients', (
      SELECT COALESCE(json_agg(row_to_json(p.*)), '[]'::json)
      FROM patients p
      WHERE p.tenant_id = v_tenant_id
    ),
    'patient_medications', (
      SELECT COALESCE(json_agg(row_to_json(pm.*)), '[]'::json)
      FROM patient_medications pm
      JOIN patients p ON p.id = pm.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'patient_vitals', (
      SELECT COALESCE(json_agg(row_to_json(pv.*)), '[]'::json)
      FROM patient_vitals pv
      JOIN patients p ON p.id = pv.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'patient_notes', (
      SELECT COALESCE(json_agg(row_to_json(pn.*)), '[]'::json)
      FROM patient_notes pn
      JOIN patients p ON p.id = pn.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'patient_alerts', (
      SELECT COALESCE(json_agg(row_to_json(pa.*)), '[]'::json)
      FROM patient_alerts pa
      WHERE pa.tenant_id = v_tenant_id
    ),
    'patient_admission_records', (
      SELECT COALESCE(json_agg(row_to_json(par.*)), '[]'::json)
      FROM patient_admission_records par
      JOIN patients p ON p.id = par.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'patient_advanced_directives', (
      SELECT COALESCE(json_agg(row_to_json(pad.*)), '[]'::json)
      FROM patient_advanced_directives pad
      JOIN patients p ON p.id = pad.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'diabetic_records', (
      SELECT COALESCE(json_agg(row_to_json(dr.*)), '[]'::json)
      FROM diabetic_records dr
      JOIN patients p ON p.patient_id = dr.patient_id  -- << FIXED: Join on TEXT column!
      WHERE p.tenant_id = v_tenant_id
    ),
    'bowel_records', (
      SELECT COALESCE(json_agg(row_to_json(br.*)), '[]'::json)
      FROM bowel_records br
      JOIN patients p ON p.id = br.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'patient_wounds', (
      SELECT COALESCE(json_agg(row_to_json(pw.*)), '[]'::json)
      FROM patient_wounds pw
      JOIN patients p ON p.id = pw.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'wound_assessments', (
      SELECT COALESCE(json_agg(row_to_json(wa.*)), '[]'::json)
      FROM wound_assessments wa
      JOIN patients p ON p.id = wa.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'handover_notes', (
      SELECT COALESCE(json_agg(row_to_json(hn.*)), '[]'::json)
      FROM handover_notes hn
      JOIN patients p ON p.id = hn.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'doctors_orders', (
      SELECT COALESCE(json_agg(row_to_json(do_.*)), '[]'::json)
      FROM doctors_orders do_
      JOIN patients p ON p.id = do_.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'patient_images', (
      SELECT COALESCE(json_agg(row_to_json(pi.*)), '[]'::json)
      FROM patient_images pi
      JOIN patients p ON p.id = pi.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    'snapshot_metadata', jsonb_build_object(
      'created_at', now(),
      'created_by', v_user_id,
      'tenant_id', v_tenant_id
    )
  );
  
  -- Update template with snapshot
  UPDATE simulation_templates
  SET 
    snapshot_data = v_snapshot,
    snapshot_version = snapshot_version + 1,
    snapshot_taken_at = now(),
    status = 'ready',
    updated_at = now()
  WHERE id = p_template_id;
  
  v_result := json_build_object(
    'success', true,
    'template_id', p_template_id,
    'snapshot_version', (SELECT snapshot_version FROM simulation_templates WHERE id = p_template_id),
    'message', 'Snapshot saved successfully. Template is now ready to launch.'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION save_template_snapshot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION save_template_snapshot(uuid) TO anon;

-- Test it
SELECT '✅ Function save_template_snapshot CORRECTED and recreated!' as status;
