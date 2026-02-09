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
**Location**: Database function (created via migrations, see database/functions/launch_simulation_with_categories.sql line 94 for usage)

**Parameters**:
- `p_tenant_id` - The simulation tenant to restore to
- `p_snapshot` - The JSONB snapshot data from template
- `p_barcode_mappings` - Existing patient barcode IDs (optional)
- `p_preserve_barcodes` - Boolean flag for reset mode
- `p_skip_patients` - Skip patient table entirely
- `p_id_mappings` - Manual patient ID mappings (optional)

**Behavior**:

**When to Use Each Mode:**

**Launch Mode** (`p_preserve_barcodes = false`):
- New simulation from template
- Creates fresh tenant, fresh barcodes
- Students get new printed labels

**Reset Mode** (`p_preserve_barcodes = true`):
- Resetting existing simulation for next session
- Same template snapshot as original launch
- Preserves all barcodes

**🆕 Update Mode** (`p_preserve_barcodes = true` + fetch latest snapshot):
- Syncing simulation with updated template
- Template was edited to add Week 2 content
- Preserves barcodes, pulls latest clinical data
- See "Template Updates & Reset" section below

**Technical Behavior:**

When `p_preserve_barcodes = true` (RESET/UPDATE MODE):
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

### Why Medications Are Preserved (Like Patients)

**Critical for Barcode Reusability**:
- Medication barcodes = `M{FirstLetter}{5-digit-hash}` based on UUID
- Barcodes printed on physical labels (semester-long reuse)
- Changing UUID = different hash = new barcode = labels unusable
- Therefore: Medications preserved across resets (DELETE student work, KEEP meds)

**What Happens on Reset**:
- `medication_administrations` deleted (student work)
- `patient_medications` table preserved (baseline + UUIDs)
- `last_administered` timestamp cleared (fresh session)
- Barcode labels still scan correctly

## Template Updates & Reset (Feb 2026)

### The Problem

Instructors need to update templates mid-semester (add Week 2 medications, new orders) without:
- Deleting the active simulation
- Generating new patient/medication barcodes
- Requiring students to get new printed labels

### Current Workaround

1. Edit template → Save snapshot (updates template's snapshot_data)
2. Delete active simulation
3. Launch new simulation → **NEW BARCODES** ❌
4. Print new labels for all patients & meds ❌

### Solution: Smart Reset with Template Sync

**New Function**: `reset_simulation_with_template_updates(p_simulation_id)`
**New Helper**: `compare_simulation_template_patients(p_simulation_id)`
**New Table**: `simulation_template_versions` - Archives every template change

**How It Works**:
1. Check if template has newer snapshot version
2. **Validate patient lists match** (critical safety check)
3. Save existing patient/medication barcode IDs (like current reset)
4. Delete student work (like current reset)
5. Fetch template's **CURRENT** snapshot (not simulation's frozen snapshot)
6. Restore with barcode preservation
7. Update simulation's `template_snapshot_version_synced`

**Key Difference from Standard Reset**:
```sql
-- Standard reset (current)
SELECT template_snapshot INTO v_snapshot 
FROM simulation_active WHERE id = p_simulation_id;

-- Update reset (new)
SELECT st.snapshot_data INTO v_snapshot
FROM simulation_active sa
JOIN simulation_templates st ON st.id = sa.template_id
WHERE sa.id = p_simulation_id;
```

**Database Changes**:
- ✅ Added `template_snapshot_version_launched` column to `simulation_active`
- ✅ Added `template_snapshot_version_synced` column to `simulation_active`
- ✅ Created `simulation_template_versions` table for version archiving
- ✅ Created `compare_simulation_template_patients()` function
- ✅ Created `reset_simulation_with_template_updates()` function
- ✅ Created `save_template_version()` function for auto-archiving
- ✅ Created `restore_template_version()` function for rollback
- ✅ Created `compare_template_versions()` function for diff views

**UI Changes** (In Progress):
- 🔄 Amber banner on Active Simulations: "📦 Template updated!"
- 🔄 Button text: "Reset & Sync Template" vs "Reset for Next Session"
- 🔄 Confirmation modal explaining what gets updated
- 🔄 Template editing banner shows affected simulations
- ✅ Version comparison modal component created

**Safety Checks**:
- ✅ Abort if patient list changed (can't preserve barcodes)
- ✅ Require patients to match by demographics (name + DOB)
- ✅ Log sync events in simulation history
- ✅ Instructor can choose to ignore updates (keep old version)
- ✅ Warning modal if patients added/removed (must relaunch)

### Patient List Changes - Smart Warnings

When template patient list changes (patients added/removed):

**Detection**:
- `compare_simulation_template_patients()` returns diff analysis
- Shows: unchanged patients, added patients, removed patients
- `barcodes_can_preserve` flag indicates if sync is possible

**UI Warning Modal**:
```
⚠️ Template Patient List Changed

Current simulation has: 2 patients
Updated template has: 3 patients

Changes detected:
✅ Unchanged: Sarah Johnson, Michael Chen
➕ Added: Emma Rodriguez

⚠️ IMPACT:
- All patients will get NEW barcodes
- All medications will get NEW barcodes
- You must print new labels for everyone
- Existing printed labels will NOT work

This is equivalent to deleting and relaunching.

[Cancel - Keep Current] [Delete & Relaunch with New Barcodes]
```

**Three Possible Outcomes**:
1. **No patient changes** → Standard sync (preserve barcodes) ✅
2. **Patients added/removed** → Warning + offer relaunch with new barcodes ⚠️
3. **Patient demographics changed** → Warning + offer relaunch ⚠️

### Template Versioning System

**Purpose**: Archive every template edit with notes for rollback and comparison

**Database Schema**:
```sql
-- simulation_template_versions table
CREATE TABLE simulation_template_versions (
  id UUID PRIMARY KEY,
  template_id UUID NOT NULL,
  version INT NOT NULL,
  snapshot_data JSONB NOT NULL,
  saved_at TIMESTAMP DEFAULT NOW(),
  saved_by UUID REFERENCES auth.users(id),
  change_notes TEXT,
  patient_count INT,
  medication_count INT,
  order_count INT,
  wound_count INT,
  device_count INT
);
```

**Automatic Archiving**:
- Every `save_template_snapshot_v2()` call auto-archives previous version
- Function: `save_template_version(p_template_id, p_new_snapshot, p_change_notes)`
- Instructor can add change notes: "Added Week 2 medications and wound care orders"

**Version Comparison**:
- Function: `compare_template_versions(p_template_id, v_old, v_new)`
- Returns: patient/medication/order/wound/device count diffs
- UI shows color-coded changes (added/removed)

**Rollback Support**:
- Function: `restore_template_version(p_template_id, p_version_to_restore)`
- Creates new version entry (doesn't delete history)
- Instructor can undo mistakes: "Restore v4" after bad v5 edit

**Benefits**:
- ✅ **Undo mistakes** - Accidentally deleted wound → Restore v4
- ✅ **See what changed** - Compare v5 vs v4
- ✅ **Audit trail** - HIPAA compliance, show who changed what
- ✅ **A/B testing** - Run two groups with different template versions
- ✅ **Week-by-week versions** - v1 = Week 1, v2 = Week 2, etc.
- ✅ **Selective updates** - Sync to v4, skip v5

**Implementation Status**: ✅ Database layer complete, 🔄 UI in progress

## Critical Rules

### ✅ DO:
- Always call `reset_simulation_for_next_session()` for reset operations
- Use `reset_simulation_with_template_updates()` when template has been edited
- Validate patient lists match before syncing template updates
- Let the database function handle all deletion and restoration
- Trust that patient barcodes will be preserved
- Archive template versions with descriptive change notes

### ❌ DON'T:
- Never call `restore_snapshot_to_tenant()` directly for reset
- Never manually delete patients during reset
- Never create new patients during reset
- Never change patient barcode IDs after launch
- Don't sync template updates if patients were added/removed
- Don't assume template snapshot is unchanged - always check version

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

- **Feb 5, 2026 (Evening)**: Fixed critical medication sync bug in `reset_simulation_with_template_updates()`
  - **BUG**: Function was matching patients by **barcode** instead of demographics
  - **PROBLEM**: Template patient barcode (P91543) ≠ Simulation patient barcode (P58763)
  - **SYMPTOM**: New medications from template wouldn't sync to simulations (0 added despite template having them)
  - **ROOT CAUSE**: Lines 147-151 searched for simulation patient by `patient_id` (barcode), but barcodes are regenerated on simulation launch
  - **FIX**: Changed patient matching to use **demographics** (first_name, last_name, date_of_birth) instead of barcode
  - **NEW FEATURE**: Added medication removal - deletes medications removed from template during sync
  - **IMPACT**: Template sync now correctly adds/removes medications even when patient barcodes differ
  - **CRITICAL LESSON**: Never assume UUIDs or barcodes stay consistent across template → simulation. Always match by immutable properties.
  - Updated function signature added: `v_first_name`, `v_last_name`, `v_dob` variables
  - Updated return object: Added `medications_removed` count
  - Updated activity log: Now shows "X added, Y removed" format
  - Files modified:
    * `/database/functions/reset_simulation_with_template_updates.sql` (lines 130-169, 238-269, 310-332)

- **Feb 5, 2026**: Implemented Template Update Sync System
  - Added template versioning with automatic archiving
  - Created `simulation_template_versions` table for version history
  - Added `template_snapshot_version_launched` and `template_snapshot_version_synced` tracking columns
  - Implemented `compare_simulation_template_patients()` for patient list validation
  - Created `reset_simulation_with_template_updates()` for syncing simulations to updated templates
  - Added `save_template_version()`, `restore_template_version()`, `compare_template_versions()` functions
  - Patient list change detection with smart warnings
  - Barcode preservation when patient lists match
  - Version comparison UI component created
  - Solves instructor workflow: Edit template → Sync simulation (no delete/relaunch)
  - Rollback support: Restore previous template versions
  - Audit trail: Track who changed what and when
  - Files added:
    * `/database/migrations/20260205000000_add_template_versioning.sql`
    * `/database/functions/compare_simulation_template_patients.sql`
    * `/database/functions/reset_simulation_with_template_updates.sql`
    * `/src/features/simulation/components/VersionComparisonModal.tsx`
    * Updated `/src/services/simulation/simulationService.ts` with version functions

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
