-- FIXED VITALS RESTORATION FUNCTION
-- Based on successful duplicate_patient_to_tenant pattern

CREATE OR REPLACE FUNCTION debug_vitals_restoration_fixed(
  _template_id UUID
)
RETURNS TABLE(
  action_taken TEXT,
  details TEXT,
  vitals_in_snapshot INTEGER,
  vitals_restored INTEGER,
  sample_error TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  _patient_record RECORD;
  _vitals_record RECORD;
  _snapshot_count INTEGER := 0;
  _restored_count INTEGER := 0;
  _sample_error TEXT := NULL;
BEGIN
  -- Count vitals in snapshot
  SELECT COUNT(*) INTO _snapshot_count
  FROM simulation_template_snapshots 
  WHERE template_id = _template_id 
    AND table_name = 'patient_vitals';

  RETURN QUERY SELECT 
    'ANALYSIS'::TEXT,
    format('Found %s vitals in snapshot for template %s', _snapshot_count, _template_id)::TEXT,
    _snapshot_count,
    0,
    NULL::TEXT;

  -- Get the cyclical patient assignments like the working system
  FOR _patient_record IN 
    SELECT 
      patient_id,
      patient_identifier,
      tenant_id,
      ROW_NUMBER() OVER (ORDER BY patient_identifier) as rn
    FROM (
      SELECT DISTINCT 
        data->>'patient_id' as patient_id,
        data->>'patient_identifier' as patient_identifier,
        data->>'tenant_id' as tenant_id
      FROM simulation_template_snapshots 
      WHERE template_id = _template_id 
        AND table_name = 'patients'
    ) patients
  LOOP
    RETURN QUERY SELECT 
      'PROCESSING_PATIENT'::TEXT,
      format('Patient: %s (UUID: %s, Tenant: %s)', 
        _patient_record.patient_identifier, 
        _patient_record.patient_id,
        _patient_record.tenant_id)::TEXT,
      _snapshot_count,
      _restored_count,
      _sample_error;

    -- Try to restore vitals for this patient using the successful pattern
    BEGIN
      -- Get vitals for this specific patient from snapshot
      FOR _vitals_record IN
        SELECT 
          data->>'patient_id' as patient_id_text,
          (data->>'temperature')::DECIMAL as temperature,
          (data->>'blood_pressure_systolic')::INTEGER as blood_pressure_systolic,
          (data->>'blood_pressure_diastolic')::INTEGER as blood_pressure_diastolic,
          (data->>'heart_rate')::INTEGER as heart_rate,
          (data->>'respiratory_rate')::INTEGER as respiratory_rate,
          (data->>'oxygen_saturation')::INTEGER as oxygen_saturation,
          data->>'oxygen_delivery' as oxygen_delivery,
          (data->>'recorded_at')::TIMESTAMPTZ as recorded_at,
          data->>'tenant_id' as tenant_id_text
        FROM simulation_template_snapshots 
        WHERE template_id = _template_id 
          AND table_name = 'patient_vitals'
          AND data->>'patient_id' = _patient_record.patient_id
      LOOP
        BEGIN
          -- Use the working pattern: cast UUIDs to text for comparison
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
          ) VALUES (
            _vitals_record.patient_id_text::UUID,
            _vitals_record.tenant_id_text::UUID,
            _vitals_record.temperature,
            _vitals_record.blood_pressure_systolic,
            _vitals_record.blood_pressure_diastolic,
            _vitals_record.heart_rate,
            _vitals_record.respiratory_rate,
            _vitals_record.oxygen_saturation,
            _vitals_record.oxygen_delivery,
            COALESCE(_vitals_record.recorded_at, NOW())
          );

          _restored_count := _restored_count + 1;

        EXCEPTION WHEN OTHERS THEN
          _sample_error := SQLSTATE || ': ' || SQLERRM;
          
          RETURN QUERY SELECT 
            'VITALS_ERROR'::TEXT,
            format('Error inserting vitals for patient %s: %s', 
              _patient_record.patient_identifier, 
              _sample_error)::TEXT,
            _snapshot_count,
            _restored_count,
            _sample_error;
        END;
      END LOOP;

    EXCEPTION WHEN OTHERS THEN
      _sample_error := SQLSTATE || ': ' || SQLERRM;
      
      RETURN QUERY SELECT 
        'PATIENT_ERROR'::TEXT,
        format('Error processing patient %s: %s', 
          _patient_record.patient_identifier, 
          _sample_error)::TEXT,
        _snapshot_count,
        _restored_count,
        _sample_error;
    END;
  END LOOP;

  -- Final summary
  RETURN QUERY SELECT 
    'SUMMARY'::TEXT,
    format('Attempted to restore %s vitals, successfully restored %s', 
      _snapshot_count, _restored_count)::TEXT,
    _snapshot_count,
    _restored_count,
    _sample_error;

END;
$$;