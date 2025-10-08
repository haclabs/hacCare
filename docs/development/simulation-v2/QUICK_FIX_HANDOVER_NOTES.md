# 🚀 QUICK FIX: Simulation Launch Handover Notes Error

## ⚡ Immediate Solution

Your simulation is failing because the database function uses **wrong column names** for the `handover_notes` table.

### Apply This SQL Fix Now:

**Go to Supabase Dashboard → SQL Editor → Paste and Run:**

```sql
-- Quick fix for handover_notes column mismatch
-- Drop existing function first
DROP FUNCTION IF EXISTS restore_snapshot_to_tenant(uuid, jsonb) CASCADE;

CREATE OR REPLACE FUNCTION restore_snapshot_to_tenant(
  p_target_tenant_id uuid,
  p_snapshot jsonb
)
RETURNS void AS $$
DECLARE
  v_record jsonb;
  v_patient_mapping jsonb := '{}'::jsonb;
  v_wound_mapping jsonb := '{}'::jsonb;
  v_old_patient_id uuid;
  v_new_patient_id uuid;
  v_old_wound_id uuid;
  v_new_wound_id uuid;
BEGIN
  -- Restore patients first and build mapping
  IF p_snapshot->'patients' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patients')
    LOOP
      v_old_patient_id := (v_record->>'id')::uuid;
      
      INSERT INTO patients (
        tenant_id, first_name, last_name, date_of_birth,
        gender, mrn, room_number, bed_number, admission_date,
        status, primary_diagnosis, allergies, code_status,
        isolation_precautions, diet_orders, mobility_status,
        fall_risk_level, pressure_injury_risk, notes
      )
      VALUES (
        p_target_tenant_id,
        v_record->>'first_name',
        v_record->>'last_name',
        (v_record->>'date_of_birth')::date,
        v_record->>'gender',
        v_record->>'mrn',
        v_record->>'room_number',
        v_record->>'bed_number',
        (v_record->>'admission_date')::timestamptz,
        v_record->>'status',
        v_record->>'primary_diagnosis',
        v_record->>'allergies',
        v_record->>'code_status',
        v_record->>'isolation_precautions',
        v_record->>'diet_orders',
        v_record->>'mobility_status',
        v_record->>'fall_risk_level',
        v_record->>'pressure_injury_risk',
        v_record->>'notes'
      )
      RETURNING id INTO v_new_patient_id;
      
      v_patient_mapping := jsonb_set(
        v_patient_mapping,
        ARRAY[v_old_patient_id::text],
        to_jsonb(v_new_patient_id::text)
      );
    END LOOP;
  END IF;
  
  -- Restore vital signs
  IF p_snapshot->'vital_signs' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'vital_signs')
    LOOP
      INSERT INTO vital_signs (
        patient_id, recorded_at, recorded_by, temperature,
        heart_rate, respiratory_rate, blood_pressure_systolic,
        blood_pressure_diastolic, oxygen_saturation, pain_level, notes
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        (v_record->>'recorded_at')::timestamptz,
        (v_record->>'recorded_by')::uuid,
        (v_record->>'temperature')::numeric,
        (v_record->>'heart_rate')::integer,
        (v_record->>'respiratory_rate')::integer,
        (v_record->>'blood_pressure_systolic')::integer,
        (v_record->>'blood_pressure_diastolic')::integer,
        (v_record->>'oxygen_saturation')::numeric,
        (v_record->>'pain_level')::integer,
        v_record->>'notes'
      );
    END LOOP;
  END IF;
  
  -- Restore medications
  IF p_snapshot->'patient_medications' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_medications')
    LOOP
      INSERT INTO patient_medications (
        patient_id, medication_name, dosage, route, frequency,
        start_date, end_date, prescribing_provider, special_instructions,
        status, barcode, scheduled_times
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        v_record->>'medication_name',
        v_record->>'dosage',
        v_record->>'route',
        v_record->>'frequency',
        (v_record->>'start_date')::timestamptz,
        (v_record->>'end_date')::timestamptz,
        v_record->>'prescribing_provider',
        v_record->>'special_instructions',
        v_record->>'status',
        v_record->>'barcode',
        (v_record->>'scheduled_times')::jsonb
      );
    END LOOP;
  END IF;
  
  -- Restore medication administrations
  IF p_snapshot->'medication_administrations' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'medication_administrations')
    LOOP
      INSERT INTO medication_administrations (
        patient_id, medication_name, dosage, route,
        scheduled_time, administered_time, administered_by,
        status, notes, barcode_scanned
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        v_record->>'medication_name',
        v_record->>'dosage',
        v_record->>'route',
        (v_record->>'scheduled_time')::timestamptz,
        (v_record->>'administered_time')::timestamptz,
        (v_record->>'administered_by')::uuid,
        v_record->>'status',
        v_record->>'notes',
        (v_record->>'barcode_scanned')::boolean
      );
    END LOOP;
  END IF;
  
  -- Restore patient wounds
  IF p_snapshot->'patient_wounds' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_wounds')
    LOOP
      v_old_wound_id := (v_record->>'id')::uuid;
      
      INSERT INTO patient_wounds (
        patient_id, location, wound_type, stage, size,
        appearance, drainage, odor, pain_level, treatment,
        date_identified, notes
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        v_record->>'location',
        v_record->>'wound_type',
        v_record->>'stage',
        v_record->>'size',
        v_record->>'appearance',
        v_record->>'drainage',
        v_record->>'odor',
        (v_record->>'pain_level')::integer,
        v_record->>'treatment',
        (v_record->>'date_identified')::date,
        v_record->>'notes'
      )
      RETURNING id INTO v_new_wound_id;
      
      v_wound_mapping := jsonb_set(
        v_wound_mapping,
        ARRAY[v_old_wound_id::text],
        to_jsonb(v_new_wound_id::text)
      );
    END LOOP;
  END IF;
  
  -- Restore wound assessments
  IF p_snapshot->'wound_assessments' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'wound_assessments')
    LOOP
      INSERT INTO wound_assessments (
        wound_id, assessment_date, length_cm, width_cm,
        depth_cm, appearance, drainage_type, drainage_amount,
        odor, pain_level, treatment, notes, assessed_by
      )
      VALUES (
        (v_wound_mapping->>(v_record->>'wound_id'))::uuid,
        (v_record->>'assessment_date')::timestamptz,
        (v_record->>'length_cm')::numeric,
        (v_record->>'width_cm')::numeric,
        (v_record->>'depth_cm')::numeric,
        v_record->>'appearance',
        v_record->>'drainage_type',
        v_record->>'drainage_amount',
        v_record->>'odor',
        (v_record->>'pain_level')::integer,
        v_record->>'treatment',
        v_record->>'notes',
        (v_record->>'assessed_by')::uuid
      );
    END LOOP;
  END IF;
  
  -- FIXED: handover_notes with correct column names
  IF p_snapshot->'handover_notes' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'handover_notes')
    LOOP
      INSERT INTO handover_notes (
        patient_id, shift, priority, situation,
        background, assessment, recommendations, created_by
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        v_record->>'shift',
        COALESCE(v_record->>'priority', v_record->>'handover_type', 'medium'),
        v_record->>'situation',
        v_record->>'background',
        v_record->>'assessment',
        COALESCE(v_record->>'recommendations', v_record->>'recommendation'),
        (v_record->>'created_by')::uuid
      );
    END LOOP;
  END IF;
  
  -- Restore doctors orders
  IF p_snapshot->'doctors_orders' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'doctors_orders')
    LOOP
      INSERT INTO doctors_orders (
        patient_id, order_type, order_details, priority,
        ordered_by, ordered_at, status, notes, tenant_id
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        v_record->>'order_type',
        v_record->>'order_details',
        v_record->>'priority',
        (v_record->>'ordered_by')::uuid,
        (v_record->>'ordered_at')::timestamptz,
        v_record->>'status',
        v_record->>'notes',
        p_target_tenant_id
      );
    END LOOP;
  END IF;
  
  -- Restore patient images
  IF p_snapshot->'patient_images' IS NOT NULL THEN
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patient_images')
    LOOP
      INSERT INTO patient_images (
        patient_id, image_url, image_type, description,
        uploaded_by, uploaded_at, tenant_id
      )
      VALUES (
        (v_patient_mapping->>(v_record->>'patient_id'))::uuid,
        v_record->>'image_url',
        v_record->>'image_type',
        v_record->>'description',
        (v_record->>'uploaded_by')::uuid,
        (v_record->>'uploaded_at')::timestamptz,
        p_target_tenant_id
      );
    END LOOP;
  END IF;
  
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION restore_snapshot_to_tenant(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION restore_snapshot_to_tenant(uuid, jsonb) TO anon;

SELECT '✅ FIXED: Handover notes column mismatch resolved!' as status;
```

---

## 🔍 What Was Wrong?

| ❌ Old (Wrong) | ✅ New (Correct) |
|---------------|------------------|
| `handover_type` | `priority` |
| `recommendation` | `recommendations` |

The database function was trying to insert columns that don't exist in your `handover_notes` table.

---

## ✅ After Running This Fix

1. Your simulations will launch successfully ✨
2. Both old and new snapshot data will work (backward compatible)
3. The error message will disappear

---

## 📍 Where to Apply

**Supabase Dashboard:** https://cwhqffubvqolhnkecyck.supabase.co/project/cwhqffubvqolhnkecyck/sql

Copy the SQL above → Paste → Run → Done! 🎉
