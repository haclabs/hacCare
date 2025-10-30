-- =====================================================
-- FIX: Snapshot function - ONLY query tables that exist
-- =====================================================
-- Based on actual database schema query results:
-- ✅ patients
-- ✅ patient_medications  
-- ✅ patient_vitals
-- ✅ patient_notes
-- ✅ patient_alerts
-- ✅ diabetic_records
-- ✅ doctors_orders
-- ✅ lab_panels
-- ✅ lab_results
-- ✅ patient_images
-- ✅ wound_assessments (NOT wound_care_assessments!)
-- ❌ admission_records (doesn't exist)
-- ❌ patient_bowel_records (doesn't exist)
-- ❌ bcma_records (doesn't exist)
-- ❌ advanced_directives (doesn't exist)
-- =====================================================

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
  
  RAISE NOTICE '📸 Creating snapshot for template % (tenant %)', p_template_id, v_tenant_id;
  
  -- Build snapshot - ONLY tables that actually exist
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
    
    'diabetic_records', (
      SELECT COALESCE(json_agg(row_to_json(dr.*)), '[]'::json)
      FROM diabetic_records dr
      WHERE dr.tenant_id = v_tenant_id
    ),
    
    'wound_assessments', (
      SELECT COALESCE(json_agg(row_to_json(wa.*)), '[]'::json)
      FROM wound_assessments wa
      JOIN patients p ON p.id = wa.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    'doctors_orders', (
      SELECT COALESCE(json_agg(row_to_json(dord.*)), '[]'::json)
      FROM doctors_orders dord
      JOIN patients p ON p.id = dord.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    'lab_panels', (
      SELECT COALESCE(json_agg(row_to_json(lp.*)), '[]'::json)
      FROM lab_panels lp
      JOIN patients p ON p.id = lp.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    'lab_results', (
      SELECT COALESCE(json_agg(row_to_json(lr.*)), '[]'::json)
      FROM lab_results lr
      JOIN lab_panels lp ON lp.id = lr.panel_id
      JOIN patients p ON p.id = lp.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    'patient_images', (
      SELECT COALESCE(json_agg(row_to_json(pi.*)), '[]'::json)
      FROM patient_images pi
      JOIN patients p ON p.id = pi.patient_id
      WHERE p.tenant_id = v_tenant_id
    )
  );
  
  RAISE NOTICE '📦 Snapshot contains % patients', jsonb_array_length(v_snapshot->'patients');
  
    -- Update template with snapshot AND mark as ready
  UPDATE simulation_templates
  SET 
    snapshot_data = v_snapshot,
    snapshot_taken_at = NOW(),
    snapshot_version = COALESCE(snapshot_version, 0) + 1,
    status = 'ready',  -- ✅ Mark template as ready to launch
    updated_at = NOW()
  WHERE id = p_template_id;
  
  -- Return success result
  v_result := json_build_object(
    'success', true,
    'template_id', p_template_id,
    'snapshot_size', pg_column_size(v_snapshot),
    'patient_count', jsonb_array_length(v_snapshot->'patients'),
    'snapshot_taken_at', NOW()
  );
  
  RAISE NOTICE '✅ Snapshot saved successfully';
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION save_template_snapshot IS 
'Saves snapshot of 11 clinical data tables that actually exist in the database.';
