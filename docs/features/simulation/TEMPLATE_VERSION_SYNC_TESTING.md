# Template Version Sync - Testing Guide

**Feature**: Sync active simulations with updated templates while preserving barcodes

## Setup (Run SQL Files First)

Run these SQL files in order via Supabase Dashboard → SQL Editor:

```bash
1️⃣ database/migrations/20260205000000_add_template_versioning.sql
2️⃣ database/functions/compare_simulation_template_patients.sql
3️⃣ database/functions/reset_simulation_with_template_updates.sql
```

## Test Scenario: Week 2 Medication Addition

### Step 1: Create Template & Launch Simulation
1. **Create a template** with 2 patients and Week 1 medications
2. **Save snapshot** - This becomes version 1
3. **Launch a simulation** from the template
4. **Print barcode labels** (note the patient and medication IDs)

### Step 2: Edit Template (Add Week 2 Content)
1. Click **"Edit"** on the template card
2. Navigate to a patient's medication list
3. **Add 2-3 new medications** for Week 2
4. Optionally: Add new doctor's orders, wounds, or devices
5. Click **"Save & Exit Editing"**
   - ✅ Template snapshot saved as version 2
   - ✅ Previous version archived automatically

### Step 3: Check Version Indicator
1. Go to **Active Simulations** tab
2. Look for your simulation card
3. **You should see an amber banner**:
   ```
   📦 Template Updated
   Template has been updated to v2. Running v1.
   [View Changes & Sync →]
   ```

### Step 4: View Changes
1. Click **"View Changes & Sync"** button
2. **Version Comparison Modal** opens showing:
   - ✅ Patients unchanged (green badge)
   - ➕ 3 medications added
   - ➕ 2 orders added (if you added any)
   - **"Barcodes Can Be Preserved"** message

### Step 5: Sync Simulation
1. Click **"Sync to v2 - Keep Barcodes"** button
2. Confirmation: "Simulation synced to template v2! Status set to Ready to Start. Barcodes preserved."
3. **Verify**:
   - ✅ Simulation status = "Ready to Start"
   - ✅ Amber banner **disappears** (now on v2)
   - ✅ New medications appear in patient's MAR
   - ✅ **Old barcode labels still scan** (patient IDs unchanged)

### Step 6: Print New Med Labels (Optional)
1. Click **🖨️ Print Labels** button
2. Print **only the new medications** added in Week 2
3. Old patient labels still work

## Test Scenario: Patient List Changed (Requires Relaunch)

### Step 1: Edit Template to Add Patient
1. Edit template
2. **Add a new patient** (3rd patient)
3. Save & Exit

### Step 2: Attempt to Sync
1. Active Simulations tab shows amber banner
2. Click "View Changes & Sync"
3. **⚠️ Warning modal shows**:
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
   ```

4. Button changes to: **"Delete & Relaunch - New Barcodes Required"**
5. Click button → Alert explains you must manually delete and relaunch

## Verify Database State

### Check Version History
```sql
-- See all archived versions for a template
SELECT 
  version,
  saved_at,
  change_notes,
  patient_count,
  medication_count
FROM simulation_template_versions
WHERE template_id = 'YOUR_TEMPLATE_ID'
ORDER BY version DESC;
```

### Check Simulation Version Tracking
```sql
-- See what version simulation is running
SELECT 
  sa.name,
  sa.template_snapshot_version_launched as launched_on_version,
  sa.template_snapshot_version_synced as synced_to_version,
  st.snapshot_version as template_current_version,
  (st.snapshot_version > COALESCE(sa.template_snapshot_version_synced, sa.template_snapshot_version_launched, 1)) as needs_sync
FROM simulation_active sa
JOIN simulation_templates st ON st.id = sa.template_id;
```

### Verify Patient List Comparison
```sql
-- Test patient comparison for a simulation
SELECT * FROM compare_simulation_template_patients('SIMULATION_ID');

-- Expected result:
{
  "patient_list_identical": true,
  "barcodes_can_preserve": true,
  "requires_relaunch": false,
  "patients_unchanged": [...],
  "patients_added": [],
  "patients_removed": []
}
```

## Expected Behaviors

### ✅ Sync Works (Patient List Unchanged)
- Medications added → **Sync preserves barcodes**
- Orders added → **Sync preserves barcodes**
- Wounds added → **Sync preserves barcodes**
- Devices added → **Sync preserves barcodes**
- Patient demographics changed (same patients) → **Sync works**

### ⚠️ Relaunch Required (Patient List Changed)
- Patient added → **Must relaunch with new barcodes**
- Patient removed → **Must relaunch with new barcodes**
- Patient count changed → **Must relaunch with new barcodes**

### 🔍 Version Indicator Logic
- **No banner**: Simulation is on latest template version
- **Amber banner**: Template updated, sync available
- **Banner disappears after sync**: Now on latest version

## Troubleshooting

### "Function does not exist" error
**Fix**: Run the SQL migration files (Step 1 in Setup)

### Amber banner not showing
**Fix**: 
```sql
-- Verify template has higher version
SELECT id, name, snapshot_version FROM simulation_templates WHERE id = 'TEMPLATE_ID';

-- Verify simulation tracking columns exist
SELECT template_snapshot_version_launched, template_snapshot_version_synced 
FROM simulation_active WHERE id = 'SIM_ID';
```

### "Cannot read property 'template_updated'" error
**Fix**: Reload the Active Simulations page to fetch updated query with version data

### Version comparison modal not opening
**Fix**: Check browser console for errors. Ensure `compareSimulationTemplatePatients` RPC function exists:
```sql
SELECT proname FROM pg_proc WHERE proname = 'compare_simulation_template_patients';
```

## Manual SQL Testing (Advanced)

### Force a template version update
```sql
-- Test manually creating a version
SELECT save_template_version(
  'TEMPLATE_ID'::uuid,
  '{"test": "snapshot"}'::jsonb,
  'Manual test version'
);
```

### Test reset with template updates
```sql
-- Manually trigger sync
SELECT * FROM reset_simulation_with_template_updates('SIMULATION_ID');

-- Should return:
{
  "success": true,
  "simulation_id": "...",
  "template_version_synced": 2,
  "patient_comparison": {...},
  "restore_result": {...}
}
```

### Restore previous template version
```sql
-- Rollback template to version 1
SELECT restore_template_version(
  'TEMPLATE_ID'::uuid,
  1,  -- version to restore
  null,
  'Rolled back to v1 for testing'
);
```

## Success Criteria

- ✅ Amber banner appears when template updated
- ✅ Version comparison modal shows accurate diffs
- ✅ Sync preserves patient & medication barcodes
- ✅ Old printed labels still scan after sync
- ✅ New medications from Week 2 appear in MAR
- ✅ Warning shown when patient list changes
- ✅ Version history tracked in database
- ✅ Automatic version archiving on save

## Next Steps (Optional Enhancements)

1. **Version History Tab** - Show full version list in template detail view
2. **Change Notes Input** - Add text field for instructors to describe changes
3. **Version Comparison UI** - Show side-by-side diff of two versions
4. **Bulk Sync** - "Sync All Simulations" button when template updated
5. **Rollback UI** - "Restore v3" button in version history

---

**Documentation**: See [SIMULATION_RESET_SYSTEM.md](../../operations/SIMULATION_RESET_SYSTEM.md) for technical details
