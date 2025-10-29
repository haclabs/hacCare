-- =====================================================
-- FIX: Add Missing Tables to Simulation Snapshot
-- =====================================================
-- PROBLEM: save_template_snapshot was NOT saving:
--   - doctors_orders
--   - lab_results (and related lab tables)
--   - patient_bowel_records  
--   - patient_images
--
-- RESULT: Templates missing critical clinical data!
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
  
  -- Build snapshot of ALL data in template tenant
  v_snapshot := jsonb_build_object(
    -- Core patient data
    'patients', (
      SELECT COALESCE(json_agg(row_to_json(p.*)), '[]'::json)
      FROM patients p
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- Medications
    'patient_medications', (
      SELECT COALESCE(json_agg(row_to_json(pm.*)), '[]'::json)
      FROM patient_medications pm
      JOIN patients p ON p.id = pm.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- Vitals
    'patient_vitals', (
      SELECT COALESCE(json_agg(row_to_json(pv.*)), '[]'::json)
      FROM patient_vitals pv
      JOIN patients p ON p.id = pv.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- Notes
    'patient_notes', (
      SELECT COALESCE(json_agg(row_to_json(pn.*)), '[]'::json)
      FROM patient_notes pn
      JOIN patients p ON p.id = pn.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- Alerts
    'patient_alerts', (
      SELECT COALESCE(json_agg(row_to_json(pa.*)), '[]'::json)
      FROM patient_alerts pa
      WHERE pa.tenant_id = v_tenant_id
    ),
    
    -- Advanced Directives
    'advanced_directives', (
      SELECT COALESCE(json_agg(row_to_json(ad.*)), '[]'::json)
      FROM advanced_directives ad
      JOIN patients p ON p.id = ad.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- Admission Records
    'admission_records', (
      SELECT COALESCE(json_agg(row_to_json(ar.*)), '[]'::json)
      FROM admission_records ar
      JOIN patients p ON p.id = ar.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- Diabetic Records
    'diabetic_records', (
      SELECT COALESCE(json_agg(row_to_json(dr.*)), '[]'::json)
      FROM diabetic_records dr
      JOIN patients p ON p.id = dr.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- Wound Care
    'wound_care_assessments', (
      SELECT COALESCE(json_agg(row_to_json(wca.*)), '[]'::json)
      FROM wound_care_assessments wca
      JOIN patients p ON p.id = wca.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- ✅ NEW: Doctor's Orders
    'doctors_orders', (
      SELECT COALESCE(json_agg(row_to_json(dord.*)), '[]'::json)
      FROM doctors_orders dord
      WHERE dord.tenant_id = v_tenant_id
    ),
    
    -- ✅ NEW: Lab Results
    'lab_results', (
      SELECT COALESCE(json_agg(row_to_json(lr.*)), '[]'::json)
      FROM lab_results lr
      WHERE lr.tenant_id = v_tenant_id
    ),
    
    -- ✅ NEW: Lab Panels (for grouping results)
    'lab_panels', (
      SELECT COALESCE(json_agg(row_to_json(lp.*)), '[]'::json)
      FROM lab_panels lp
      WHERE lp.tenant_id = v_tenant_id
    ),
    
    -- ✅ NEW: Bowel Records
    'patient_bowel_records', (
      SELECT COALESCE(json_agg(row_to_json(pbr.*)), '[]'::json)
      FROM patient_bowel_records pbr
      JOIN patients p ON p.id = pbr.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- ✅ NEW: Patient Images (for wound care, etc.)
    'patient_images', (
      SELECT COALESCE(json_agg(row_to_json(pi.*)), '[]'::json)
      FROM patient_images pi
      JOIN patients p ON p.id = pi.patient_id
      WHERE p.tenant_id = v_tenant_id
    ),
    
    -- Metadata
    'snapshot_metadata', jsonb_build_object(
      'created_at', now(),
      'created_by', v_user_id,
      'tenant_id', v_tenant_id,
      'version', 2,  -- Increment version since we added new tables
      'tables_included', jsonb_build_array(
        'patients',
        'patient_medications',
        'patient_vitals',
        'patient_notes',
        'patient_alerts',
        'advanced_directives',
        'admission_records',
        'diabetic_records',
        'wound_care_assessments',
        'doctors_orders',      -- NEW
        'lab_results',         -- NEW
        'lab_panels',          -- NEW
        'patient_bowel_records', -- NEW
        'patient_images'       -- NEW
      )
    )
  );
  
  -- Log what we captured
  RAISE NOTICE '✅ Snapshot contains:';
  RAISE NOTICE '  - Patients: %', jsonb_array_length(v_snapshot->'patients');
  RAISE NOTICE '  - Medications: %', jsonb_array_length(v_snapshot->'patient_medications');
  RAISE NOTICE '  - Vitals: %', jsonb_array_length(v_snapshot->'patient_vitals');
  RAISE NOTICE '  - Notes: %', jsonb_array_length(v_snapshot->'patient_notes');
  RAISE NOTICE '  - Alerts: %', jsonb_array_length(v_snapshot->'patient_alerts');
  RAISE NOTICE '  - Doctors Orders: %', jsonb_array_length(v_snapshot->'doctors_orders');
  RAISE NOTICE '  - Lab Results: %', jsonb_array_length(v_snapshot->'lab_results');
  RAISE NOTICE '  - Lab Panels: %', jsonb_array_length(v_snapshot->'lab_panels');
  RAISE NOTICE '  - Bowel Records: %', jsonb_array_length(v_snapshot->'patient_bowel_records');
  RAISE NOTICE '  - Images: %', jsonb_array_length(v_snapshot->'patient_images');
  
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
    'tables_captured', 14,  -- Number of tables in snapshot
    'message', 'Snapshot saved successfully with ALL clinical data. Template is ready to launch.',
    'counts', jsonb_build_object(
      'patients', jsonb_array_length(v_snapshot->'patients'),
      'medications', jsonb_array_length(v_snapshot->'patient_medications'),
      'vitals', jsonb_array_length(v_snapshot->'patient_vitals'),
      'notes', jsonb_array_length(v_snapshot->'patient_notes'),
      'doctors_orders', jsonb_array_length(v_snapshot->'doctors_orders'),
      'lab_results', jsonb_array_length(v_snapshot->'lab_results'),
      'lab_panels', jsonb_array_length(v_snapshot->'lab_panels')
    )
  );
  
  RAISE NOTICE '🎉 Snapshot complete! Version: %', (SELECT snapshot_version FROM simulation_templates WHERE id = p_template_id);
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Grant permissions
-- =====================================================

GRANT EXECUTE ON FUNCTION save_template_snapshot(uuid) TO authenticated;

-- =====================================================
-- Update comment
-- =====================================================

COMMENT ON FUNCTION save_template_snapshot IS 
'Save complete snapshot of template tenant data including:
- Patients, medications, vitals, notes, alerts
- Advanced directives, admission records
- Diabetic records, wound care assessments
- Doctors orders, lab results/panels
- Bowel records, patient images

Version 2: Added doctors_orders, lab_results, lab_panels, patient_bowel_records, patient_images';

-- =====================================================
-- Test query
-- =====================================================

-- Run this to test:
-- SELECT save_template_snapshot('your-template-id-here');
