# ✅ Implementation Checklist: Reusable Simulation Labels

## 📋 Pre-Implementation Checklist

- [ ] Read `QUICK_START_REUSABLE_LABELS.md`
- [ ] Read `REUSABLE_LABELS_SOLUTION_SUMMARY.md`
- [ ] Understand the visual guide in `VISUAL_GUIDE_REUSABLE_LABELS.md`
- [ ] Have access to Supabase SQL Editor or `psql` command line
- [ ] Know your template ID(s)
- [ ] Decide how many sessions you need (recommendation: 5-10)

---

## 🚀 Implementation Steps

### Step 1: Install Database Functions ⏱️ 5 minutes

**Option A: Using Supabase SQL Editor**
- [ ] Open Supabase dashboard → SQL Editor
- [ ] Open `docs/development/database/migrations/implement_reusable_simulation_labels.sql`
- [ ] Copy entire contents
- [ ] Paste into SQL Editor
- [ ] Click "Run"
- [ ] Verify: See "✅ Reusable simulation label system installed!" message

**Option B: Using psql Command Line**
```bash
cd /workspaces/hacCare
psql $DATABASE_URL -f docs/development/database/migrations/implement_reusable_simulation_labels.sql
```
- [ ] Command runs without errors
- [ ] See success message

### Step 2: Update Reset Function ⏱️ 2 minutes

**Option A: Using Supabase SQL Editor**
- [ ] Open `docs/development/database/migrations/update_reset_simulation_preserve_ids.sql`
- [ ] Copy entire contents
- [ ] Paste into SQL Editor
- [ ] Click "Run"
- [ ] Verify: See "✅ reset_simulation updated to preserve session IDs!" message

**Option B: Using psql Command Line**
```bash
psql $DATABASE_URL -f docs/development/database/migrations/update_reset_simulation_preserve_ids.sql
```
- [ ] Command runs without errors
- [ ] See success message

### Step 3: Generate Session ID Sets ⏱️ 2 minutes

- [ ] Find your template ID (from simulation_templates table)
- [ ] Decide session names (e.g., "Class A Morning", "Class B Afternoon")
- [ ] Run the generate command:

```sql
SELECT generate_simulation_id_sets(
  'YOUR-TEMPLATE-ID-HERE'::uuid,  -- ← Replace this
  5,  -- Number of sessions
  ARRAY[
    'Session 1 - Class A Morning',
    'Session 2 - Class A Afternoon',
    'Session 3 - Class B Morning',
    'Session 4 - Class B Afternoon',
    'Session 5 - Makeup Class'
  ]
);
```

- [ ] Command returns `{"success": true, "session_count": 5}`
- [ ] Note: IDs are now generated and stored in template

### Step 4: Get Label Data for Printing ⏱️ 1 minute per session

For each session you plan to use immediately:

```sql
-- Get Session 1 data
SELECT get_simulation_label_data(
  'YOUR-TEMPLATE-ID-HERE'::uuid,
  1  -- Session number
);
```

- [ ] Returns JSON with `patients` array
- [ ] Returns JSON with `medications` array
- [ ] Each item has `simulation_uuid` and `barcode` fields
- [ ] Save this data for label printing

### Step 5: Design and Print Labels ⏱️ Varies

**Patient Wristband Data Needed:**
- [ ] Session number
- [ ] `simulation_uuid` (for database lookup)
- [ ] `patient_id` (MRN like P94558)
- [ ] `full_name`
- [ ] `date_of_birth`
- [ ] `blood_type`
- [ ] `allergies`
- [ ] `room_number` and `bed_number`
- [ ] `barcode` (for scanning)

**Medication Label Data Needed:**
- [ ] Session number
- [ ] `simulation_uuid` (for database lookup)
- [ ] `medication_name`
- [ ] `dosage`
- [ ] `route`
- [ ] `frequency`
- [ ] `patient_name`
- [ ] `room_number`
- [ ] `barcode` (for scanning)

**Label Printing:**
- [ ] Design label template in your label software
- [ ] Include session number prominently
- [ ] Generate barcodes from `barcode` field
- [ ] Print test label and verify barcode scans
- [ ] Print all labels for Session 1
- [ ] Repeat for other sessions as needed

### Step 6: Organize Labels ⏱️ 10 minutes

Choose your organization method:

**Option A: Color Coding**
- [ ] Print Session 1 on blue label stock
- [ ] Print Session 2 on green label stock
- [ ] Print Session 3 on yellow label stock
- [ ] Print Session 4 on pink label stock
- [ ] Print Session 5 on orange label stock

**Option B: Binders**
- [ ] Create binder labeled "Session 1 - Class A Morning"
- [ ] Place Session 1 patient wristbands in front pocket
- [ ] Place Session 1 medication labels in back pocket
- [ ] Repeat for other sessions

**Option C: Labeled Bags**
- [ ] Get 5 large ziploc bags
- [ ] Label each: "SESSION X - [Class Name]"
- [ ] Place labels in appropriate bag
- [ ] Store in clearly marked location

---

## 🧪 Testing & Verification

### Test 1: Verify Functions Exist ⏱️ 1 minute

```sql
-- Should return 3 functions
SELECT proname, pronargs 
FROM pg_proc 
WHERE proname IN (
  'generate_simulation_id_sets',
  'get_simulation_label_data',
  'restore_snapshot_to_tenant'
);
```

- [ ] `generate_simulation_id_sets` exists
- [ ] `get_simulation_label_data` exists
- [ ] `restore_snapshot_to_tenant` exists (with 3 parameters)

### Test 2: Verify Session IDs Generated ⏱️ 1 minute

```sql
-- Check your template has sessions
SELECT 
  id, 
  name,
  jsonb_array_length(simulation_id_sets) as session_count
FROM simulation_templates
WHERE id = 'YOUR-TEMPLATE-ID'::uuid;
```

- [ ] Returns row with your template
- [ ] `session_count` matches what you generated (e.g., 5)

### Test 3: Launch Test Simulation ⏱️ 2 minutes

```sql
-- Launch with Session 1
SELECT launch_simulation(
  'YOUR-TEMPLATE-ID'::uuid,
  'Test Launch Session 1',
  30,
  ARRAY['YOUR-USER-ID'::uuid],
  ARRAY['student'],
  1  -- Session 1
);
```

- [ ] Returns simulation_id
- [ ] No errors
- [ ] Note the simulation_id for next tests

### Test 4: Verify Patient IDs Match Session ⏱️ 2 minutes

```sql
-- Get patient from simulation
SELECT p.id, p.patient_id, p.first_name, p.last_name
FROM patients p
JOIN simulation_active sa ON sa.tenant_id = p.tenant_id
WHERE sa.name = 'Test Launch Session 1'
LIMIT 1;
```

- [ ] Returns patient data
- [ ] Note the `id` (UUID)

Now check if this matches Session 1 label data:
- [ ] Find same patient in label data JSON from Step 4
- [ ] Compare `simulation_uuid` from label data to patient `id` from database
- [ ] They should match EXACTLY ✅

### Test 5: Test Barcode Scan (if barcode scanner available) ⏱️ 5 minutes

- [ ] Take a Session 1 patient label
- [ ] Scan the barcode
- [ ] System should find patient in Test Launch Session 1 simulation
- [ ] Patient details should display correctly

### Test 6: Test Reset Preserves IDs ⏱️ 3 minutes

```sql
-- Reset the test simulation
SELECT reset_simulation('YOUR-SIMULATION-ID'::uuid);
```

- [ ] Returns `{"success": true}`
- [ ] Check patients again:

```sql
SELECT p.id, p.patient_id, p.first_name, p.last_name
FROM patients p
JOIN simulation_active sa ON sa.tenant_id = p.tenant_id
WHERE sa.name = 'Test Launch Session 1'
LIMIT 1;
```

- [ ] Patient `id` (UUID) is EXACTLY the same as before reset ✅
- [ ] This means labels will still work!

### Test 7: Test Multiple Simultaneous Sessions ⏱️ 5 minutes

```sql
-- Launch Session 1
SELECT launch_simulation(
  'YOUR-TEMPLATE-ID'::uuid,
  'Class A Session 1',
  60,
  ARRAY['USER-ID-1'::uuid],
  ARRAY['student'],
  1
);

-- Launch Session 2 simultaneously
SELECT launch_simulation(
  'YOUR-TEMPLATE-ID'::uuid,
  'Class B Session 2',
  60,
  ARRAY['USER-ID-2'::uuid],
  ARRAY['student'],
  2
);
```

- [ ] Both simulations launch successfully
- [ ] Get patient from Session 1 simulation
- [ ] Get patient from Session 2 simulation
- [ ] Their UUIDs should be DIFFERENT (no conflicts) ✅

---

## 📦 Label Printing Checklist

### For Each Session:

**Session 1 Labels:**
- [ ] Header label printed: "SESSION 1 - [Name]"
- [ ] Patient wristbands printed (X patients)
- [ ] Medication labels printed (Y medications)
- [ ] All barcodes scan correctly
- [ ] Session number visible on all labels
- [ ] Labels organized and stored

**Session 2 Labels:** (if needed now)
- [ ] Same checklist as Session 1

**Future Sessions:**
- [ ] Can print later as needed
- [ ] IDs already generated and waiting

---

## 🎯 Pre-Demo Checklist

**One Day Before Demo:**
- [ ] Labels printed and organized
- [ ] Test simulation launched
- [ ] One patient barcode scanned successfully
- [ ] One medication barcode scanned successfully
- [ ] Medication administration tested via barcode
- [ ] Vitals entry tested and working
- [ ] Reset tested - same labels still work
- [ ] Participants added to simulation
- [ ] RLS policies verified (nurses can see data)

**Demo Day Morning:**
- [ ] Verify simulation is still running
- [ ] Quick barcode scan test
- [ ] Labels organized and ready
- [ ] Backup labels printed (just in case)
- [ ] Know which session number you're using
- [ ] Session number matches label set being used

---

## 🐛 Troubleshooting Checklist

**If "Session not found" error:**
- [ ] Check you ran `generate_simulation_id_sets()`
- [ ] Verify session_count is correct
- [ ] Try getting label data to confirm sessions exist

**If barcodes don't scan:**
- [ ] Check barcode format is correct
- [ ] Verify barcode scanner is configured for your format
- [ ] Test with a known working barcode
- [ ] Check barcode printed clearly (not smudged)

**If patient not found after scan:**
- [ ] Verify simulation was launched with correct session_number
- [ ] Check you're using labels from correct session
- [ ] Verify simulation is still running (not completed/deleted)

**If IDs change after reset:**
- [ ] Verify you ran `update_reset_simulation_preserve_ids.sql`
- [ ] Check reset_simulation function has been updated
- [ ] Verify simulation has session_number in config

---

## ✅ Success Criteria

You know it's working when:
- [✅] Labels printed with barcodes
- [✅] Simulation launched with session_number
- [✅] Barcode scan finds correct patient
- [✅] Medication administration via barcode works
- [✅] Vitals entry works
- [✅] Simulation reset
- [✅] Same barcode still finds same patient
- [✅] Can run simulation multiple times with same labels
- [✅] Can run multiple sessions simultaneously without conflicts

---

## 📞 Support Resources

- **Quick Start:** `docs/QUICK_START_REUSABLE_LABELS.md`
- **Full Guide:** `docs/REUSABLE_SIMULATION_LABELS_GUIDE.md`
- **Visual Guide:** `docs/VISUAL_GUIDE_REUSABLE_LABELS.md`
- **Summary:** `docs/REUSABLE_LABELS_SOLUTION_SUMMARY.md`
- **SQL Migration 1:** `docs/development/database/migrations/implement_reusable_simulation_labels.sql`
- **SQL Migration 2:** `docs/development/database/migrations/update_reset_simulation_preserve_ids.sql`

---

## 🎉 Final Check

Before declaring success:
- [ ] All SQL migrations run successfully
- [ ] Session IDs generated for template
- [ ] Labels printed and organized
- [ ] Test simulation launched and working
- [ ] Barcodes scan correctly
- [ ] Reset tested - IDs preserved
- [ ] Ready for demo!

---

**Estimated Total Time:** 30-60 minutes setup, then ready forever! 🚀

**Benefits:** Never relabel medications again! Print once, use infinite times!
