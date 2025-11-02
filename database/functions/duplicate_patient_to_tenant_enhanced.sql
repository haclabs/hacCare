-- ============================================================================
-- ENHANCED PATIENT DUPLICATION FUNCTION
-- ============================================================================
-- 
-- Purpose: Duplicate a patient and ALL their associated data to another tenant
-- 
-- This is an enhanced version that includes ALL patient data types:
-- - Basic patient info
-- - Vital signs
-- - Medications & administrations
-- - Notes
-- - Assessments (Nursing, Admission, Advanced Directives)
-- - Handover notes (SBAR)
-- - Patient alerts
-- - Diabetic records
-- - Bowel records
-- - Wound care assessments & treatments
-- - Doctors orders
-- - Patient admission records
-- - Patient advanced directives
-- 
-- IMPORTANT: Barcode Generation
-- - New patient will get a new UUID, which generates a unique patient barcode (PT{uuid})
-- - New medications will get new UUIDs, which generate unique medication barcodes (MED{uuid})
-- - All barcodes are automatically created when labels are printed from the new records
-- - No manual barcode generation needed - the BCMA system uses the record IDs
-- 
-- Usage:
--   SELECT * FROM duplicate_patient_to_tenant(
--     p_source_patient_id := 'P001',
--     p_target_tenant_id := 'target-tenant-uuid',
--     p_new_patient_id := 'P54321',  -- optional, auto-generates P##### if not provided
--     p_include_vitals := true,
--     p_include_medications := true,
--     p_include_assessments := true,
--     p_include_handover_notes := true,
--     p_include_alerts := true,
--     p_include_diabetic_records := true,
--     p_include_bowel_records := true,
--     p_include_wound_care := true,
--     p_include_doctors_orders := true
--   );
-- 
-- ============================================================================

-- Drop old function if it exists (handles any old signatures)
DROP FUNCTION IF EXISTS duplicate_patient_to_tenant(TEXT, UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS duplicate_patient_to_tenant(TEXT, UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);
DROP FUNCTION IF EXISTS duplicate_patient_to_tenant(TEXT, UUID, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);

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
  p_include_doctors_orders BOOLEAN DEFAULT TRUE
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
  v_lab_orders_count INTEGER := 0;
  v_hacmap_markers_count INTEGER := 0;
  v_records_created JSONB;
BEGIN
  -- Get source patient UUID
  SELECT id INTO v_source_patient_uuid
  FROM patients
  WHERE patient_id = p_source_patient_id;

  IF v_source_patient_uuid IS NULL THEN
    RETURN QUERY SELECT 
      false AS success, 
      NULL::UUID AS new_patient_id, 
      NULL::TEXT AS new_patient_identifier,
      NULL::JSONB AS records_created,
      'Source patient not found'::TEXT AS message;
    RETURN;
  END IF;

  -- Generate new patient_id if not provided
  -- Note: Barcodes will be auto-generated from new UUIDs when labels are printed
  -- Generate short numeric ID for better barcode scanning
  IF p_new_patient_id IS NULL OR p_new_patient_id = '' THEN
    -- Generate a random 5-digit number (10000-99999)
    v_new_patient_identifier := 'P' || (10000 + floor(random() * 90000))::TEXT;
  ELSE
    v_new_patient_identifier := p_new_patient_id;
  END IF;

  -- Check if new patient_id already exists in target tenant
  IF EXISTS (
    SELECT 1 FROM patients 
    WHERE patient_id = v_new_patient_identifier 
    AND tenant_id = p_target_tenant_id
  ) THEN
    RETURN QUERY SELECT 
      false AS success, 
      NULL::UUID AS new_patient_id, 
      NULL::TEXT AS new_patient_identifier,
      NULL::JSONB AS records_created,
      ('Patient ID ' || v_new_patient_identifier || ' already exists in target tenant')::TEXT AS message;
    RETURN;
  END IF;

  -- Create new patient record
  INSERT INTO patients (
    tenant_id,
    patient_id,
    first_name,
    last_name,
    date_of_birth,
    gender,
    admission_date,
    room_number,
    bed_number,
    allergies,
    condition,
    diagnosis,
    blood_type,
    emergency_contact_name,
    emergency_contact_relationship,
    emergency_contact_phone,
    assigned_nurse
  )
  SELECT
    p_target_tenant_id,
    v_new_patient_identifier,
    first_name,
    last_name,
    date_of_birth,
    gender,
    admission_date,
    room_number,
    bed_number,
    allergies,
    condition,
    diagnosis,
    blood_type,
    emergency_contact_name,
    emergency_contact_relationship,
    emergency_contact_phone,
    assigned_nurse
  FROM patients
  WHERE id = v_source_patient_uuid
  RETURNING id INTO v_new_patient_uuid;

  RAISE NOTICE 'Created new patient: %', v_new_patient_uuid;

  -- Copy patient vitals
  IF p_include_vitals THEN
    INSERT INTO patient_vitals (
      patient_id,
      tenant_id,
      temperature,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      heart_rate,
      respiratory_rate,
      oxygen_saturation,
      oxygen_delivery,
      recorded_at
    )
    SELECT
      v_new_patient_uuid,
      p_target_tenant_id,
      temperature,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      heart_rate,
      respiratory_rate,
      oxygen_saturation,
      oxygen_delivery,
      recorded_at
    FROM patient_vitals
    WHERE patient_id::text = v_source_patient_uuid::text;
    
    GET DIAGNOSTICS v_vitals_count = ROW_COUNT;
    RAISE NOTICE 'Copied % vital records', v_vitals_count;
  END IF;

  -- Copy medications
  IF p_include_medications THEN
    INSERT INTO patient_medications (
      patient_id,
      tenant_id,
      name,
      dosage,
      frequency,
      route,
      start_date,
      end_date,
      prescribed_by,
      admin_time,
      admin_times,
      last_administered,
      next_due,
      status,
      category
    )
    SELECT
      v_new_patient_uuid,
      p_target_tenant_id,
      name,
      dosage,
      frequency,
      route,
      start_date,
      end_date,
      prescribed_by,
      admin_time,
      admin_times,
      last_administered,
      next_due,
      status,
      category
    FROM patient_medications
    WHERE patient_id::text = v_source_patient_uuid::text;
    
    GET DIAGNOSTICS v_medications_count = ROW_COUNT;
    RAISE NOTICE 'Copied % medication records', v_medications_count;

    -- Copy medication administrations (if table exists)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bcma_medication_administrations') THEN
      INSERT INTO bcma_medication_administrations (
        patient_id,
        medication_id,
        administered_by,
        administered_by_id,
        timestamp,
        notes,
        dosage,
        route,
        status
      )
      SELECT
        v_new_patient_uuid,
        medication_id,
        administered_by,
        administered_by_id,
        timestamp,
        notes,
        dosage,
        route,
        status
      FROM bcma_medication_administrations
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_med_admin_count = ROW_COUNT;
      RAISE NOTICE 'Copied % medication administration records', v_med_admin_count;
    END IF;
  END IF;

  -- Copy assessments
  IF p_include_assessments THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_assessments') THEN
      INSERT INTO patient_assessments (
        patient_id,
        assessment_type,
        assessment_data,
        assessed_by,
        assessed_at
      )
      SELECT
        v_new_patient_uuid,
        assessment_type,
        assessment_data,
        assessed_by,
        assessed_at
      FROM patient_assessments
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_assessments_count = ROW_COUNT;
      RAISE NOTICE 'Copied % assessment records', v_assessments_count;
    END IF;
  END IF;

  -- Copy handover notes
  IF p_include_handover_notes THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'handover_notes') THEN
      INSERT INTO handover_notes (
        patient_id,
        situation,
        background,
        assessment,
        recommendations,
        shift,
        priority,
        created_by,
        created_by_name,
        created_by_role
      )
      SELECT
        v_new_patient_uuid,
        situation,
        background,
        assessment,
        recommendations,
        shift,
        priority,
        created_by,
        created_by_name,
        created_by_role
      FROM handover_notes
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_handover_count = ROW_COUNT;
      RAISE NOTICE 'Copied % handover notes', v_handover_count;
    END IF;
  END IF;

  -- Copy patient alerts
  IF p_include_alerts THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_alerts') THEN
      INSERT INTO patient_alerts (
        patient_id,
        tenant_id,
        patient_name,
        alert_type,
        priority,
        message,
        acknowledged,
        acknowledged_by,
        acknowledged_at,
        expires_at
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        pa.patient_name,
        pa.alert_type,
        pa.priority,
        pa.message,
        pa.acknowledged,
        pa.acknowledged_by,
        pa.acknowledged_at,
        pa.expires_at
      FROM patient_alerts pa
      WHERE pa.patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_alerts_count = ROW_COUNT;
      RAISE NOTICE 'Copied % patient alerts', v_alerts_count;
    END IF;
  END IF;

  -- Copy diabetic records
  IF p_include_diabetic_records THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'diabetic_records') THEN
      INSERT INTO diabetic_records (
        tenant_id,
        patient_id,
        recorded_by,
        date,
        time_cbg_taken,
        reading_type,
        glucose_reading,
        basal_insulin,
        bolus_insulin,
        correction_insulin,
        other_insulin,
        treatments_given,
        comments_for_physician,
        signature,
        prompt_frequency,
        recorded_at
      )
      SELECT
        p_target_tenant_id,
        v_new_patient_uuid,
        recorded_by,
        date,
        time_cbg_taken,
        reading_type,
        glucose_reading,
        basal_insulin,
        bolus_insulin,
        correction_insulin,
        other_insulin,
        treatments_given,
        comments_for_physician,
        signature,
        prompt_frequency,
        recorded_at
      FROM diabetic_records
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_diabetic_count = ROW_COUNT;
      RAISE NOTICE 'Copied % diabetic records', v_diabetic_count;
    END IF;
  END IF;

  -- Copy bowel records
  IF p_include_bowel_records THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bowel_records') THEN
      INSERT INTO bowel_records (
        patient_id,
        tenant_id,
        nurse_id,
        nurse_name,
        recorded_at,
        bowel_incontinence,
        stool_appearance,
        stool_consistency,
        stool_colour,
        stool_amount,
        notes
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        nurse_id,
        nurse_name,
        recorded_at,
        bowel_incontinence,
        stool_appearance,
        stool_consistency,
        stool_colour,
        stool_amount,
        notes
      FROM bowel_records
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_bowel_count = ROW_COUNT;
      RAISE NOTICE 'Copied % bowel records', v_bowel_count;
    END IF;
  END IF;

  -- Copy patient admission records (Admission Assessment)
  IF p_include_assessments THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_admission_records') THEN
      INSERT INTO patient_admission_records (
        patient_id,
        tenant_id,
        admission_type,
        attending_physician,
        insurance_provider,
        insurance_policy,
        admission_source,
        chief_complaint,
        height,
        weight,
        bmi,
        smoking_status,
        alcohol_use,
        exercise,
        occupation,
        family_history,
        marital_status,
        secondary_contact_name,
        secondary_contact_relationship,
        secondary_contact_phone,
        secondary_contact_address
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        admission_type,
        attending_physician,
        insurance_provider,
        insurance_policy,
        admission_source,
        chief_complaint,
        height,
        weight,
        bmi,
        smoking_status,
        alcohol_use,
        exercise,
        occupation,
        family_history,
        marital_status,
        secondary_contact_name,
        secondary_contact_relationship,
        secondary_contact_phone,
        secondary_contact_address
      FROM patient_admission_records
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_admission_records_count = ROW_COUNT;
      RAISE NOTICE 'Copied % admission records', v_admission_records_count;
    END IF;
  END IF;

  -- Copy patient advanced directives
  IF p_include_assessments THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patient_advanced_directives') THEN
      INSERT INTO patient_advanced_directives (
        patient_id,
        tenant_id,
        living_will_status,
        living_will_date,
        healthcare_proxy_name,
        healthcare_proxy_phone,
        dnr_status,
        organ_donation_status,
        organ_donation_details,
        religious_preference,
        special_instructions
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        living_will_status,
        living_will_date,
        healthcare_proxy_name,
        healthcare_proxy_phone,
        dnr_status,
        organ_donation_status,
        organ_donation_details,
        religious_preference,
        special_instructions
      FROM patient_advanced_directives
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_advanced_directives_count = ROW_COUNT;
      RAISE NOTICE 'Copied % advanced directives', v_advanced_directives_count;
    END IF;
  END IF;

  -- Copy wound care
  IF p_include_wound_care THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wound_assessments') THEN
      INSERT INTO wound_assessments (
        patient_id,
        tenant_id,
        assessment_date,
        wound_location,
        wound_type,
        stage,
        length_cm,
        width_cm,
        depth_cm,
        wound_bed,
        exudate_amount,
        exudate_type,
        periwound_condition,
        pain_level,
        odor,
        signs_of_infection,
        assessment_notes,
        photos,
        assessor_id,
        assessor_name
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        assessment_date,
        wound_location,
        wound_type,
        stage,
        length_cm,
        width_cm,
        depth_cm,
        wound_bed,
        exudate_amount,
        exudate_type,
        periwound_condition,
        pain_level,
        odor::boolean,
        signs_of_infection::boolean,
        assessment_notes,
        photos,
        assessor_id,
        assessor_name
      FROM wound_assessments
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_wound_assessments_count = ROW_COUNT;
      RAISE NOTICE 'Copied % wound assessments', v_wound_assessments_count;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wound_treatments') THEN
      INSERT INTO wound_treatments (
        patient_id,
        tenant_id,
        wound_assessment_id,
        treatment_date,
        treatment_type,
        products_used,
        procedure_notes,
        administered_by,
        administered_by_id,
        administered_at,
        next_treatment_due,
        photos_after
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        wound_assessment_id,
        treatment_date,
        treatment_type,
        products_used,
        procedure_notes,
        administered_by,
        administered_by_id,
        administered_at,
        next_treatment_due,
        photos_after
      FROM wound_treatments
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_wound_treatments_count = ROW_COUNT;
      RAISE NOTICE 'Copied % wound treatments', v_wound_treatments_count;
    END IF;
  END IF;

  -- Copy doctors orders
  IF p_include_doctors_orders THEN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'doctors_orders') THEN
      INSERT INTO doctors_orders (
        patient_id,
        tenant_id,
        order_date,
        order_time,
        order_text,
        ordering_doctor,
        notes,
        order_type,
        is_acknowledged,
        acknowledged_by,
        acknowledged_at,
        created_by,
        doctor_name
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        order_date,
        order_time,
        order_text,
        ordering_doctor,
        notes,
        order_type,
        is_acknowledged,
        acknowledged_by,
        acknowledged_at,
        created_by,
        doctor_name
      FROM doctors_orders
      WHERE patient_id::text = v_source_patient_uuid::text;
      
      GET DIAGNOSTICS v_doctors_orders_count = ROW_COUNT;
      RAISE NOTICE 'Copied % doctors orders', v_doctors_orders_count;
    END IF;
  END IF;

  -- Copy lab orders
  DECLARE
    v_lab_orders_count INTEGER := 0;
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_orders') THEN
      INSERT INTO lab_orders (
        patient_id,
        tenant_id,
        order_date,
        order_time,
        procedure_category,
        procedure_type,
        source_category,
        source_type,
        initials,
        verified_by,
        status,
        notes,
        label_printed,
        created_by
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        order_date,
        order_time,
        procedure_category,
        procedure_type,
        source_category,
        source_type,
        initials,
        verified_by,
        status,
        notes,
        false, -- Reset label_printed for new patient
        created_by
      FROM lab_orders
      WHERE patient_id = v_source_patient_uuid;
      
      GET DIAGNOSTICS v_lab_orders_count = ROW_COUNT;
      RAISE NOTICE 'Copied % lab orders', v_lab_orders_count;
    END IF;
  END;

  -- Copy hacMap markers (devices and wounds)
  DECLARE
    v_hacmap_markers_count INTEGER := 0;
  BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hacmap_markers') THEN
      INSERT INTO hacmap_markers (
        patient_id,
        tenant_id,
        marker_type,
        x,
        y,
        body_side,
        label,
        device_type,
        device_subtype,
        insertion_date,
        insertion_site,
        size_gauge,
        length_depth,
        site_condition,
        securing_method,
        wound_type,
        wound_stage,
        wound_size,
        wound_depth,
        exudate_amount,
        exudate_type,
        wound_bed,
        surrounding_skin,
        pain_level,
        odor,
        notes,
        created_by
      )
      SELECT
        v_new_patient_uuid,
        p_target_tenant_id,
        marker_type,
        x,
        y,
        body_side,
        label,
        device_type,
        device_subtype,
        insertion_date,
        insertion_site,
        size_gauge,
        length_depth,
        site_condition,
        securing_method,
        wound_type,
        wound_stage,
        wound_size,
        wound_depth,
        exudate_amount,
        exudate_type,
        wound_bed,
        surrounding_skin,
        pain_level,
        odor,
        notes,
        created_by
      FROM hacmap_markers
      WHERE patient_id = v_source_patient_uuid;
      
      GET DIAGNOSTICS v_hacmap_markers_count = ROW_COUNT;
      RAISE NOTICE 'Copied % hacMap markers', v_hacmap_markers_count;
    END IF;
  END;

  -- Build result JSON
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
    'lab_orders', v_lab_orders_count,
    'hacmap_markers', v_hacmap_markers_count
  );

  -- Return success
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
      v_lab_orders_count + v_hacmap_markers_count)::TEXT || ' associated records')::TEXT AS message;

END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION duplicate_patient_to_tenant TO authenticated;

-- Add comment
COMMENT ON FUNCTION duplicate_patient_to_tenant IS 
  'Duplicates a patient and all their associated data to another tenant. Supports selective copying of different data types.';
