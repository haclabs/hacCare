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
- `wound_assessments` - All wound assessments (hacMap v2)
- `device_assessments` - All device assessments (hacMap v2)
- `lab_results` - All lab results students ordered
- `lab_panels` - All lab panels students ordered
- `diabetic_records` - All blood sugar readings
- `doctors_orders` - All orders students created

**Baseline Data** (deleted then restored from snapshot):
- `wounds` - Baseline wounds from template (hacMap v2)
- `devices` - Baseline devices with IV/Feeding Tube fields (hacMap v2)
- `avatar_locations` - Body map marker locations (hacMap v2)

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

## RLS Policy Configuration (CRITICAL)

### device_assessments Table

The `device_assessments` table uses a simplified RLS policy:

```sql
CREATE POLICY device_assessments_allow_authenticated
  ON device_assessments
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

**Why NOT use `current_setting('app.current_tenant_id')`?**

The application **never sets** `current_setting('app.current_tenant_id')` in the PostgreSQL session. This is by design:
- Application explicitly passes `tenant_id` in all INSERT/UPDATE/SELECT queries
- RLS policy just needs to allow authenticated users through
- Tenant isolation happens at the **application level**, not database level

**DO NOT** change this to:
```sql
-- ❌ WRONG - This will cause 403 Forbidden errors!
USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
```

**Migrations**:
- `20251117100000_create_device_assessments_table.sql` - Initial table with correct RLS
- `20251117150000_fix_device_assessments_rls_allow_authenticated.sql` - RLS hotfix migration
- `fix_device_assessments_rls_remove_check.sql` - Manual SQL for emergency deployment

### Other Clinical Tables

Most clinical tables follow the same pattern:
- `wound_assessments` - Uses `USING (true)` (working correctly)
- Application handles tenant_id filtering explicitly
- No session variables required

## Student Activity Tracking (Debrief System)

**Location**: `/src/services/simulation/studentActivityService.ts`

Device and wound assessments are captured for the debrief report by:

1. **Query by `student_name`**:
```typescript
const { data: deviceAssessmentsData } = await supabase
  .from('device_assessments')
  .select('*')
  .eq('tenant_id', tenantId)
  .eq('patient_id', patientId)
  .not('student_name', 'is', null)
  .order('assessed_at', { ascending: false });
```

2. **Group by student**:
```typescript
deviceAssessmentsData.data?.forEach((assessment: any) => {
  const student = getOrCreateStudent(assessment.student_name);
  student.activities.deviceAssessments.push({
    id: assessment.id,
    assessed_at: assessment.assessed_at,
    device_type: assessment.device_type,
    status: assessment.status,
    output_amount_ml: assessment.output_amount_ml,
    notes: assessment.notes,
    assessment_data: assessment.assessment_data // JSONB with device-specific fields
  });
  student.totalEntries++;
});
```

3. **Display in debrief**:
- Each assessment shows as a card with expandable JSONB details
- Students see all their device/wound assessment entries
- Instructors can review what each student documented

**CRITICAL**: `student_name` is **required** in device_assessments schema. Without it, assessments won't appear in debrief!

## History

- **Nov 20, 2025**: Added simulation category tag system
  - Added `primary_categories` TEXT[] and `sub_categories` TEXT[] columns to both `simulation_active` and `simulation_history` tables
  - Categories: Primary (PN, NESA, SIM Hub, BNAD), Sub (Labs, Simulation, Testing)
  - Categories preserved through simulation lifecycle:
    * Selected via checkboxes during launch
    * Displayed with color-coded badges on active simulations
    * Can be edited retroactively via purple Tag button (doesn't disrupt running simulation)
    * Filtered by clicking category badges in filter panel
    * Auto-copied to history when simulation completes
    * Displayed on history/debrief page
  - **CRITICAL COLUMN NAME DIFFERENCE**: 
    * `simulation_active` uses `starts_at` and `ends_at`
    * `simulation_history` uses `started_at` and `ended_at`
    * Reset function maps: `NEW.starts_at` → `started_at` when copying to history
  - Updated `complete_simulation()` RPC function to include category fields in INSERT
  - Updated `complete_simulation_with_categories()` trigger to use correct column names
  - Categories NOT affected by reset - preserved through reset operations
  - Files modified:
    * `/supabase/migrations/20251120000000_add_simulation_categories.sql`
    * `/database/functions/launch_simulation_with_categories.sql`
    * `/database/functions/update_simulation_categories.sql`
    * `/database/functions/complete_simulation_with_categories.sql`
    * `/src/features/simulation/types/simulation.ts`
    * `/src/features/simulation/components/LaunchSimulationModal.tsx`
    * `/src/features/simulation/components/ActiveSimulations.tsx`
    * `/src/features/simulation/components/SimulationHistory.tsx`
    * `/src/services/simulation/simulationService.ts`

- **Nov 17, 2025**: Integrated hacMap v2 into simulation system
  - Added `device_assessments` table (student work - deleted on reset)
  - Added device-specific fields to `devices` table (IV: gauge, site; Feeding Tube: route, placement verification)
  - Updated reset function to DELETE device_assessments (student work)
  - Devices, wounds, avatar_locations restored from snapshot (baseline data)
  - Fixed RLS policy - removed `current_setting('app.current_tenant_id')` requirement
  - Device and wound assessments fully captured in debrief report
  - Enhanced debrief with all 12 activity types and proportional progress bars

- **Nov 14, 2025**: Complete rewrite of reset system
  - Fixed patient duplication
  - Fixed barcode preservation
  - Fixed duplicate wounds/devices
  - Simplified to single function call from frontend

---

**If you encounter issues with simulation reset, READ THIS FILE FIRST before changing any code!**
