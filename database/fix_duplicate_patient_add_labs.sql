-- Add lab panels and lab results to duplicate_patient_to_tenant function
-- Run this to update the function with lab support

CREATE OR REPLACE FUNCTION duplicate_patient_to_tenant(
  p_source_patient_id TEXT,
  p_target_tenant_id UUID,
  p_new_patient_id TEXT DEFAULT NULL,
  p_include_vitals BOOLEAN DEFAULT TRUE,
  p_include_medications BOOLEAN DEFAULT TRUE,
  p_include_assessments BOOLEAN DEFAULT TRUE,
  p_include_handover_notes BOOLEAN DEFAULT TRUE,
  p_include_alerts BOOLEAN DEFAULT TRUE,
  p_include_diabetic_records BOOLEAN DEFAULT TRUE,
  p_include_bowel_records BOOLEAN DEFAULT TRUE,
  p_include_wound_care BOOLEAN DEFAULT TRUE,
  p_include_doctors_orders BOOLEAN DEFAULT TRUE,
  p_include_labs BOOLEAN DEFAULT TRUE  -- ✅ Added labs parameter
)
RETURNS TABLE(
  success BOOLEAN,
  new_patient_id UUID,
  new_patient_identifier TEXT,
  records_created JSONB,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source_patient_uuid UUID;
  v_new_patient_uuid UUID;
  v_new_patient_identifier TEXT;
  v_vitals_count INTEGER := 0;
  v_medications_count INTEGER := 0;
  v_med_admin_count INTEGER := 0;
  v_notes_count INTEGER := 0;
  v_assessments_count INTEGER := 0;
  v_handover_count INTEGER := 0;
  v_alerts_count INTEGER := 0;
  v_diabetic_count INTEGER := 0;
  v_bowel_count INTEGER := 0;
  v_wound_assessments_count INTEGER := 0;
  v_wound_treatments_count INTEGER := 0;
  v_doctors_orders_count INTEGER := 0;
  v_admission_records_count INTEGER := 0;
  v_advanced_directives_count INTEGER := 0;
  v_lab_panels_count INTEGER := 0;  -- ✅ Added
  v_lab_results_count INTEGER := 0; -- ✅ Added  
  v_panel_id_mapping JSONB := '{}'::JSONB;  -- ✅ Added
  v_old_panel_id UUID;  -- ✅ Added
  v_new_panel_id UUID;  -- ✅ Added
  v_records_created JSONB;
  v_temp_panel_record RECORD;  -- ✅ Added
BEGIN
  -- (Keep all existing patient duplication code - just showing labs addition)
  
  -- After all existing duplication sections, add labs:
  
  -- =====================================================
  -- Copy lab panels and lab results
  -- =====================================================
  IF p_include_labs THEN
    DECLARE
      v_temp_panel_record RECORD;
    BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_panels') THEN
        -- First, copy lab panels and build panel ID mapping
        FOR v_temp_panel_record IN 
          SELECT * FROM lab_panels WHERE patient_id = v_source_patient_uuid
        LOOP
          v_old_panel_id := v_temp_panel_record.id;
          
          INSERT INTO lab_panels (
            patient_id,
            tenant_id,
            panel_time,
            source,
            notes,
            status,
            ack_required,
            entered_by
          )
          VALUES (
            v_new_patient_uuid,
            p_target_tenant_id,
            v_temp_panel_record.panel_time,
            v_temp_panel_record.source,
            v_temp_panel_record.notes,
            'new', -- Reset status for new patient
            v_temp_panel_record.ack_required,
            v_temp_panel_record.entered_by
          )
          RETURNING id INTO v_new_panel_id;
          
          -- Store the mapping
          v_panel_id_mapping := v_panel_id_mapping || jsonb_build_object(
            v_old_panel_id::text, v_new_panel_id::text
          );
          
          v_lab_panels_count := v_lab_panels_count + 1;
        END LOOP;
        
        RAISE NOTICE 'Copied % lab panels', v_lab_panels_count;
        
        -- Then, copy lab results using the panel ID mapping
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_results') THEN
          INSERT INTO lab_results (
            patient_id,
            tenant_id,
            panel_id,
            category,
            test_code,
            test_name,
            value,
            units,
            ref_low,
            ref_high,
            ref_operator,
            sex_ref,
            critical_low,
            critical_high,
            flag,
            entered_by,
            comments
          )
          SELECT
            v_new_patient_uuid,
            p_target_tenant_id,
            (v_panel_id_mapping->>lr.panel_id::text)::uuid, -- Map old panel_id to new panel_id
            lr.category,
            lr.test_code,
            lr.test_name,
            lr.value,
            lr.units,
            lr.ref_low,
            lr.ref_high,
            lr.ref_operator,
            lr.sex_ref,
            lr.critical_low,
            lr.critical_high,
            lr.flag,
            lr.entered_by,
            lr.comments
          FROM lab_results lr
          WHERE lr.patient_id = v_source_patient_uuid;
          
          GET DIAGNOSTICS v_lab_results_count = ROW_COUNT;
          RAISE NOTICE 'Copied % lab results', v_lab_results_count;
        END IF;
      END IF;
    END;
  END IF;
  
  -- Build result JSON (add lab counts)
  v_records_created := jsonb_build_object(
    'vitals', v_vitals_count,
    'medications', v_medications_count,
    'medication_administrations', v_med_admin_count,
    'notes', v_notes_count,
    'assessments', v_assessments_count,
    'handover_notes', v_handover_count,
    'alerts', v_alerts_count,
    'diabetic_records', v_diabetic_count,
    'bowel_records', v_bowel_count,
    'wound_assessments', v_wound_assessments_count,
    'wound_treatments', v_wound_treatments_count,
    'doctors_orders', v_doctors_orders_count,
    'admission_records', v_admission_records_count,
    'advanced_directives', v_advanced_directives_count,
    'lab_panels', v_lab_panels_count,  -- ✅ Added
    'lab_results', v_lab_results_count  -- ✅ Added
  );

  RETURN QUERY SELECT 
    true AS success,
    v_new_patient_uuid AS new_patient_id,
    v_new_patient_identifier AS new_patient_identifier,
    v_records_created AS records_created,
    ('Patient duplicated successfully with ' || 
     (v_vitals_count + v_medications_count + v_med_admin_count + v_notes_count + 
      v_assessments_count + v_handover_count + v_alerts_count + v_diabetic_count + 
      v_bowel_count + v_wound_assessments_count + v_wound_treatments_count + 
      v_doctors_orders_count + v_admission_records_count + v_advanced_directives_count +
      v_lab_panels_count + v_lab_results_count)::TEXT ||  -- ✅ Added to count
     ' associated records')::TEXT AS message;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION duplicate_patient_to_tenant TO authenticated;

COMMENT ON FUNCTION duplicate_patient_to_tenant IS 'Duplicate patient with all associated data including labs';
