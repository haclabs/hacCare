# Simulation Reset System - How It Works

**CRITICAL REFERENCE DOCUMENT - READ THIS BEFORE TOUCHING SIMULATION RESET CODE**

## The Problem We Solved (Nov 14, 2025)

Simulation reset was duplicating patients and data because:
1. Reset function wasn't deleting old data before restoring
2. Restore function was creating new patients instead of mapping to existing ones
3. Patient barcode IDs (printed on labels) were changing on reset

## The Solution

### Key Database Functions

#### 1. `restore_snapshot_to_tenant()`
**Location**: `/workspaces/hacCare/database/fix_restore_snapshot_SCHEMA_AGNOSTIC.sql`

**Parameters**:
- `p_tenant_id` - The simulation tenant to restore to
- `p_snapshot` - The JSONB snapshot data from template
- `p_barcode_mappings` - Existing patient barcode IDs (optional)
- `p_preserve_barcodes` - Boolean flag for reset mode
- `p_skip_patients` - Skip patient table entirely
- `p_id_mappings` - Manual patient ID mappings (optional)

**Behavior**:

When `p_preserve_barcodes = true` (RESET MODE):
- Maps snapshot patient IDs to EXISTING tenant patient IDs
- Does NOT create new patient records
- Does NOT change patient barcode IDs
- Restores all other data (devices, wounds, labs, etc.)

When `p_preserve_barcodes = false` (LAUNCH MODE):
- Creates NEW patients with NEW IDs
- Generates NEW barcode IDs
- Restores all baseline data

**Critical Code Section**:
```sql
IF p_preserve_barcodes AND p_snapshot ? 'patients' THEN
    -- Map to existing patients - DO NOT CREATE NEW!
    FOR v_record IN SELECT * FROM jsonb_array_elements(p_snapshot->'patients')
    LOOP
      SELECT id INTO v_new_patient_id
      FROM patients
      WHERE tenant_id = p_tenant_id
      ORDER BY created_at
      OFFSET v_count
      LIMIT 1;
      
      v_patient_mapping := v_patient_mapping || 
        jsonb_build_object(v_old_patient_id::text, v_new_patient_id);
    END LOOP;
```

#### 2. `reset_simulation_for_next_session()`
**Location**: `/workspaces/hacCare/database/functions/reset_simulation_for_next_session.sql`

**What It Does**:

**Step 1**: Save existing patient barcode IDs
```sql
FOR v_patient_id, v_barcode IN 
  SELECT id, patient_id FROM patients WHERE tenant_id = v_tenant_id
LOOP
  v_patient_barcodes := v_patient_barcodes || 
    jsonb_build_object(v_patient_id::text, v_barcode);
END LOOP;
```

**Step 2**: DELETE ALL TENANT DATA (except patients!)
```sql
DELETE FROM medication_administrations WHERE tenant_id = v_tenant_id;
DELETE FROM patient_vitals WHERE tenant_id = v_tenant_id;
DELETE FROM patient_notes WHERE tenant_id = v_tenant_id;
DELETE FROM patient_alerts WHERE tenant_id = v_tenant_id;
DELETE FROM wounds WHERE tenant_id = v_tenant_id;
DELETE FROM devices WHERE tenant_id = v_tenant_id;
DELETE FROM avatar_locations WHERE tenant_id = v_tenant_id;
-- ... etc
```

**Step 3**: Restore from snapshot with barcode preservation
```sql
SELECT restore_snapshot_to_tenant(
  p_tenant_id := v_tenant_id,
  p_snapshot := v_snapshot,
  p_barcode_mappings := v_patient_barcodes,
  p_preserve_barcodes := true  -- KEY FLAG!
) INTO v_result;
```

**Step 4**: Reset simulation timer
```sql
UPDATE simulation_active
SET
  status = 'running',
  starts_at = NOW(),
  ends_at = NOW() + (v_duration_minutes || ' minutes')::interval,
  completed_at = NULL
WHERE id = p_simulation_id;
```

### Frontend Integration

**Location**: `/workspaces/hacCare/src/services/simulation/simulationService.ts`

**Function**: `resetSimulationForNextSession()`

```typescript
const { data, error } = await supabase.rpc('reset_simulation_for_next_session', {
  p_simulation_id: simulationId,
});
```

**That's it!** The database function handles everything:
- Saving barcodes
- Deleting data
- Restoring baseline
- Resetting timer
- Logging activity

## What Gets Deleted on Reset

**Student Work** (always deleted):
- `medication_administrations` - All med administrations
- `patient_vitals` - All vital signs students added
- `patient_notes` - All notes students wrote
- `patient_alerts` - All alerts generated
- `patient_images` - All images uploaded
- `wound_assessments` - All wound assessments
- `lab_results` - All lab results students ordered
- `lab_panels` - All lab panels students ordered
- `diabetic_records` - All blood sugar readings
- `doctors_orders` - All orders students created

**Baseline Data** (deleted then restored from snapshot):
- `wounds` - Baseline wounds from template
- `devices` - Baseline devices (IVs, catheters, etc.)
- `avatar_locations` - Body map marker locations

**NEVER DELETED**:
- `patients` - Patient demographics and barcode IDs

## What Gets Restored from Snapshot

From the template's `snapshot_data` JSONB:
- `avatar_locations` - All body map markers
- `devices` - All baseline devices
- `wounds` - All baseline wounds
- Any other baseline data in the snapshot

**NOT RESTORED**:
- `patients` - Uses existing patients
- `medication_administrations` - Student work only, never in snapshot

## Critical Rules

### ✅ DO:
- Always call `reset_simulation_for_next_session()` for reset operations
- Let the database function handle all deletion and restoration
- Trust that patient barcodes will be preserved

### ❌ DON'T:
- Never call `restore_snapshot_to_tenant()` directly for reset
- Never manually delete patients during reset
- Never create new patients during reset
- Never change patient barcode IDs after launch

## Testing Reset

```sql
-- 1. Check before reset
SELECT 
  (SELECT COUNT(*) FROM patients WHERE tenant_id = 'TENANT_ID') as patients,
  (SELECT array_agg(patient_id) FROM patients WHERE tenant_id = 'TENANT_ID') as barcodes,
  (SELECT COUNT(*) FROM devices WHERE tenant_id = 'TENANT_ID') as devices,
  (SELECT COUNT(*) FROM wounds WHERE tenant_id = 'TENANT_ID') as wounds;

-- 2. Call reset
SELECT reset_simulation_for_next_session('SIMULATION_ID');

-- 3. Check after reset - barcodes should be IDENTICAL
SELECT 
  (SELECT COUNT(*) FROM patients WHERE tenant_id = 'TENANT_ID') as patients,
  (SELECT array_agg(patient_id) FROM patients WHERE tenant_id = 'TENANT_ID') as barcodes,
  (SELECT COUNT(*) FROM devices WHERE tenant_id = 'TENANT_ID') as devices,
  (SELECT COUNT(*) FROM wounds WHERE tenant_id = 'TENANT_ID') as wounds;
```

**Expected Results**:
- Patient count: SAME
- Barcodes: IDENTICAL
- Devices: Reset to template count
- Wounds: Reset to template count

## Troubleshooting

### "Duplicate patients after reset"
- Check if `p_preserve_barcodes` is set to `true`
- Verify `restore_snapshot_to_tenant` is NOT creating new patients when flag is true

### "Duplicate devices/wounds after reset"
- Check if reset function is deleting data before calling restore
- Verify all DELETE statements are executed before restore

### "Patient barcodes changed after reset"
- Check if barcode mapping is being saved correctly
- Verify `p_barcode_mappings` is passed to restore function

### "Timer shows 'Expired' after reset"
- Check `ends_at` calculation in reset function
- Verify `duration_minutes` is not NULL

## File Structure

**Keep these files**:
- `/database/fix_restore_snapshot_SCHEMA_AGNOSTIC.sql` - Main restore function
- `/database/functions/reset_simulation_for_next_session.sql` - Reset function
- `/src/services/simulation/simulationService.ts` - Frontend service
- `/docs/SIMULATION_RESET_SYSTEM.md` - This file!

**Delete anything else related to old simulation debugging.**

## History

- **Nov 14, 2025**: Complete rewrite of reset system
  - Fixed patient duplication
  - Fixed barcode preservation
  - Fixed duplicate wounds/devices
  - Simplified to single function call from frontend

---

**If you encounter issues with simulation reset, READ THIS FILE FIRST before changing any code!**
