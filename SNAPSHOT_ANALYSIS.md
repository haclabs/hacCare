# 📸 Simulation Snapshot Analysis

## What Gets Saved in Template Snapshot

### Function: `save_template_snapshot(p_template_id)`
Location: `database/migrations/011_simulation_functions.sql` (lines 91-188)

### Complete Snapshot Structure

```json
{
  "patients": [
    {
      // ALL columns from patients table
      "id": "uuid",
      "tenant_id": "uuid",
      "patient_id": "PT12345",
      "first_name": "John",
      "last_name": "Doe",
      "date_of_birth": "1990-01-01",
      "gender": "Male",
      "room_number": "101",
      "bed_number": "A",
      "diagnosis": "Pneumonia",
      "condition": "Stable",
      "allergies": [...],
      "code_status": "Full Code",
      "advance_directives": [...],
      // ... every other column in patients table
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  
  "patient_medications": [
    {
      // ALL columns from patient_medications table
      "id": "uuid",
      "patient_id": "uuid",
      "tenant_id": "uuid",
      "name": "Amoxicillin",
      "dosage": "500mg",
      "route": "PO",
      "frequency": "TID",
      // ... every other column
      "created_at": "...",
      "updated_at": "..."
    }
  ],
  
  "patient_vitals": [
    {
      // ALL columns from patient_vitals table
      "id": "uuid",
      "patient_id": "uuid",
      "temperature": 98.6,
      "heart_rate": 72,
      "blood_pressure_systolic": 120,
      // ... all vital fields
      "recorded_at": "...",
      "recorded_by": "..."
    }
  ],
  
  "patient_notes": [
    {
      // ALL columns from patient_notes table
      "id": "uuid",
      "patient_id": "uuid",
      "note_type": "admission",
      "content": "Patient admitted with...",
      "created_by": "...",
      "created_at": "..."
    }
  ],
  
  "patient_alerts": [
    {
      // ALL columns from patient_alerts table
      "id": "uuid",
      "tenant_id": "uuid",
      "patient_id": "uuid",
      "alert_type": "critical",
      "message": "...",
      "priority": "high"
    }
  ],
  
  "advanced_directives": [
    {
      // ALL columns from advanced_directives table
      "id": "uuid",
      "patient_id": "uuid",
      "directive_type": "DNR",
      "details": "...",
      "effective_date": "..."
    }
  ],
  
  "admission_records": [
    {
      // ALL columns from admission_records table
      "id": "uuid",
      "patient_id": "uuid",
      "admission_date": "...",
      "admission_type": "Emergency",
      "chief_complaint": "..."
    }
  ],
  
  "diabetic_records": [
    {
      // ALL columns from diabetic_records table
      "id": "uuid",
      "patient_id": "uuid",
      "blood_glucose": 120,
      "insulin_dose": "...",
      "recorded_at": "..."
    }
  ],
  
  "wound_care_assessments": [
    {
      // ALL columns from wound_care_assessments table
      "id": "uuid",
      "patient_id": "uuid",
      "wound_location": "...",
      "wound_type": "...",
      "assessment_date": "..."
    }
  ],
  
  "snapshot_metadata": {
    "created_at": "2025-10-25T10:00:00Z",
    "created_by": "user-uuid",
    "tenant_id": "template-tenant-uuid"
  }
}
```

## 🔍 Key Findings

### ✅ What IS Saved (Good!)
1. **Patients** - Complete patient records with ALL fields
2. **Medications** - All prescriptions with dosage, route, frequency
3. **Vitals** - Initial vital sign readings
4. **Notes** - Clinical notes (admission notes, etc.)
5. **Alerts** - Patient alerts
6. **Advanced Directives** - DNR, living will, etc.
7. **Admission Records** - Admission data
8. **Diabetic Records** - Blood glucose, insulin doses
9. **Wound Care** - Wound assessments

### ❌ What is NOT Saved
1. **Labs** - Laboratory results NOT included!
2. **Doctor's Orders** - Orders NOT included!
3. **Bowel Records** - NOT included!
4. **Images** - Patient photos NOT included!
5. **BCMA History** - Medication administration records (expected - should be empty)
6. **User Assignments** - Who's assigned to simulation (expected)
7. **Activity Logs** - Actions taken (expected)

## 🚨 CRITICAL ISSUE: Missing Data!

### Labs & Doctor's Orders Are NOT Snapshotted!

This means:
- ❌ If you create template with labs, they DON'T get saved
- ❌ If you create template with doctor's orders, they DON'T get saved
- ❌ When launching simulation, labs/orders won't be restored

### Current Code (Lines 104-172)
```sql
v_snapshot := jsonb_build_object(
  'patients', (...),
  'patient_medications', (...),
  'patient_vitals', (...),
  'patient_notes', (...),
  'patient_alerts', (...),
  'advanced_directives', (...),
  'admission_records', (...),
  'diabetic_records', (...),
  'wound_care_assessments', (...),
  'snapshot_metadata', (...)
  -- ❌ 'labs' is MISSING!
  -- ❌ 'doctors_orders' is MISSING!
  -- ❌ 'bowel_records' is MISSING!
);
```

## 🔧 What We Need to Fix

### 1. Add Missing Tables to Snapshot

```sql
v_snapshot := jsonb_build_object(
  'patients', (...),
  'patient_medications', (...),
  'patient_vitals', (...),
  'patient_notes', (...),
  'patient_alerts', (...),
  'advanced_directives', (...),
  'admission_records', (...),
  'diabetic_records', (...),
  'wound_care_assessments', (...),
  
  -- ADD THESE:
  'labs', (
    SELECT json_agg(row_to_json(l.*))
    FROM labs l
    JOIN patients p ON p.id = l.patient_id
    WHERE p.tenant_id = v_tenant_id
  ),
  'doctors_orders', (
    SELECT json_agg(row_to_json(do.*))
    FROM doctors_orders do
    JOIN patients p ON p.id = do.patient_id
    WHERE p.tenant_id = v_tenant_id
  ),
  'patient_bowel_records', (
    SELECT json_agg(row_to_json(pbr.*))
    FROM patient_bowel_records pbr
    JOIN patients p ON p.id = pbr.patient_id
    WHERE p.tenant_id = v_tenant_id
  ),
  'patient_images', (
    SELECT json_agg(row_to_json(pi.*))
    FROM patient_images pi
    JOIN patients p ON p.id = pi.patient_id
    WHERE p.tenant_id = v_tenant_id
  ),
  
  'snapshot_metadata', (...)
);
```

### 2. Update reset_simulation Functions

Both reset functions need to handle new data:
- `reset_simulation` (old - exact restore)
- `reset_simulation_for_next_session` (new - preserve meds)

### 3. Update launch_simulation Function

Make sure it restores labs/orders when launching from template.

## 📊 Table Structure Reference

### What columns exist in each table?

To get complete column lists, run:
```sql
-- Check labs table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'labs'
ORDER BY ordinal_position;

-- Check doctors_orders table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'doctors_orders'
ORDER BY ordinal_position;

-- Check patient_bowel_records table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'patient_bowel_records'
ORDER BY ordinal_position;
```

## 🎯 Action Items

### IMMEDIATE (Fix Snapshot)
1. ✅ Update `save_template_snapshot` to include labs
2. ✅ Update `save_template_snapshot` to include doctors_orders
3. ✅ Update `save_template_snapshot` to include bowel_records
4. ✅ Update `save_template_snapshot` to include patient_images
5. ✅ Test snapshot creation with all data types

### MEDIUM (Fix Restore Functions)
1. ⏳ Update `launch_simulation` to restore labs
2. ⏳ Update `launch_simulation` to restore doctors_orders
3. ⏳ Update `reset_simulation` to handle labs/orders
4. ⏳ Update `reset_simulation_for_next_session` to handle labs/orders

### DOCUMENTATION
1. ⏳ Document what goes in snapshot vs what doesn't
2. ⏳ Create checklist for template creation
3. ⏳ Add validation warnings if template is missing data

## 🤔 Questions for You

1. **Labs**: Should labs be preserved across resets or cleared?
   - Option A: Preserve (students see baseline lab values)
   - Option B: Clear (students order new labs)

2. **Doctor's Orders**: Should orders be preserved or cleared?
   - Option A: Preserve (students follow existing orders)
   - Option B: Clear (students write new orders)

3. **Bowel Records**: Include in template?
   - Usually this is student work, but baseline records might be useful

4. **Images**: Include patient photos in template?
   - Could be useful for wound care scenarios

Let me know your preferences and I'll create the fixes! 🚀
