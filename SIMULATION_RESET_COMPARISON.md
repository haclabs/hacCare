# 🚨 SIMULATION RESET: OLD vs NEW

## The Problem with OLD reset_simulation

### What Happened to Your Demo
```sql
-- OLD FUNCTION (015_reset_simulation_update_in_place.sql)
-- Lines 199-237: DELETES medications not in template

DELETE FROM patient_medications pm
WHERE pm.tenant_id = v_tenant_id
AND pm.id NOT IN (
  SELECT pm2.id FROM patient_medications pm2
  WHERE pm2.tenant_id = v_tenant_id
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(v_snapshot->'medications') m
    WHERE pm2.patient_id IN (...)
  )
);
```

**Result**: All medications you added AFTER creating the template were DELETED ❌

### Your Workflow (What Actually Happens)
1. ✅ Create simulation template from existing tenant
2. ✅ Activate simulation → gets fresh tenant
3. ✅ Print medication labels (IDs like MED-001, MED-002)
4. ✅ Add NEW medications during simulation prep
5. ✅ Run first student session
6. ❌ **RESET SIMULATION** → ALL new medications DELETED!
7. ❌ Printed labels now invalid (medications don't exist)
8. ❌ Demo fails because meds are missing

---

## The NEW reset_simulation_for_next_session

### What It Does DIFFERENTLY

#### PRESERVES (Never Deletes)
✅ **Patient IDs** - All patients keep same UUID  
✅ **Patient patient_id** - "PT12345" stays the same  
✅ **Medication IDs** - All medications keep same UUID  
✅ **ALL Medications** - Even ones added after template creation  
✅ **Template Notes** - Admission notes, provider notes

#### CLEARS (Student Work)
🗑️ **Vitals** - All vital sign recordings  
🗑️ **Student Notes** - Progress notes, nursing notes  
🗑️ **BCMA Records** - Medication administration history  
🗑️ **Images** - Photos uploaded during session  
🗑️ **Bowel Records** - Student assessments  
🗑️ **Diabetic Records** - Blood glucose logs

#### RESETS (To Template)
🔄 **Patient Demographics** - Name, DOB, gender (back to template)  
🔄 **Patient Clinical** - Diagnosis, condition, allergies (back to template)  
🔄 **Room Assignment** - Room/bed numbers (back to template)

### Example Output
```json
{
  "success": true,
  "reset_type": "session_reset",
  "stats": {
    "vitals_cleared": 45,
    "notes_cleared": 12,
    "bcma_cleared": 38,
    "images_cleared": 3,
    "bowel_records_cleared": 8,
    "diabetic_records_cleared": 15,
    "patients_reset": 4,
    "medications_preserved": 24  // ✅ ALL KEPT!
  },
  "message": "Patient/Medication IDs preserved. Student work cleared."
}
```

---

## Comparison Table

| Feature | OLD Function | NEW Function |
|---------|-------------|--------------|
| **Medications in template** | ✅ Preserved | ✅ Preserved |
| **Medications added later** | ❌ **DELETED** | ✅ **PRESERVED** |
| **Patient IDs** | ✅ Preserved | ✅ Preserved |
| **Medication IDs** | ✅ Preserved | ✅ Preserved |
| **Vitals** | ❌ Deleted ALL | ✅ Cleared ALL (expected) |
| **Student notes** | ❌ Deleted ALL | ✅ Cleared (keeps template notes) |
| **BCMA records** | ❌ Deleted | ✅ Cleared (expected) |
| **Session tracking** | ❌ None | ✅ Session number incremented |
| **Printed labels** | ❌ **CAN BREAK** | ✅ **ALWAYS VALID** |

---

## Use Cases

### ✅ NEW Function is Perfect For:
- **Classroom simulations** (multiple student groups)
- **Multi-day simulations** (reset each morning)
- **Printed labels** (IDs never change)
- **Dynamic scenarios** (instructor adds meds during sim)
- **Reusable simulations** (same setup, different students)

### ❌ OLD Function Would Only Work For:
- **Static templates** (never add meds after creation)
- **One-time use** (delete and recreate for next session)
- **Digital-only** (no printed labels)
- **Exact restoration** (need template exactly as was)

---

## What You Need to Do

### Immediate (Copy-Paste This SQL)

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy entire contents** of `database/migrations/016_reset_simulation_preserve_meds.sql`
3. **Run it** (creates new function)
4. **Test with your simulation**:

```sql
-- Test the new reset
SELECT reset_simulation_for_next_session('your-simulation-id');

-- Check medications still exist
SELECT id, name, patient_id 
FROM patient_medications 
WHERE tenant_id = 'your-simulation-tenant-id';

-- Verify session number incremented
SELECT session_number, reset_count, last_reset_at
FROM simulation_active
WHERE id = 'your-simulation-id';
```

### Update Your Code

Find where you call the reset function and change:

**OLD:**
```typescript
await supabase.rpc('reset_simulation', { 
  p_simulation_id: simId 
});
```

**NEW:**
```typescript
await supabase.rpc('reset_simulation_for_next_session', { 
  p_simulation_id: simId 
});
```

### Update UI Text

Change button labels from:
- ❌ "Reset Simulation"
- ❌ "Restore to Template"

To:
- ✅ "Reset for Next Session"
- ✅ "Clear Student Work"
- ✅ "Prepare for Next Group"

This makes it clear you're NOT deleting everything!

---

## Safety: Keep BOTH Functions

### reset_simulation_for_next_session
**Use 95% of the time** - Your default reset
- Between student sessions
- Daily resets
- Normal classroom use

### reset_simulation (old one)
**Use 5% of the time** - Nuclear option
- Starting completely new scenario
- Template changed significantly  
- Need exact restore (willing to reprint labels)

---

## Future Improvements

### Session Metrics
Track per-session data:
```sql
CREATE TABLE simulation_session_metrics (
  id uuid PRIMARY KEY,
  simulation_id uuid REFERENCES simulation_active(id),
  session_number integer,
  started_at timestamptz,
  ended_at timestamptz,
  students jsonb,  -- [{id, name, actions}]
  performance jsonb  -- {accuracy, speed, errors}
);
```

### Smart Reset Options
Add parameters for granular control:
```sql
reset_simulation_for_next_session(
  p_simulation_id uuid,
  p_clear_vitals boolean DEFAULT true,
  p_clear_notes boolean DEFAULT true,
  p_clear_bcma boolean DEFAULT true,
  p_reset_patient_data boolean DEFAULT true
)
```

### Medication Status Reset
Reset medication "given" status without clearing records:
```sql
-- Mark all meds as "not given" but keep the medication
UPDATE patient_medications
SET status = 'scheduled'
WHERE tenant_id = v_tenant_id
AND status = 'given';
```

---

## Questions Before You Deploy?

1. **Vitals**: Clear ALL vitals, or keep template vitals?
   - Current: Clears ALL (students record fresh)
   - Alternative: Keep initial vitals from template

2. **Notes**: Keep template notes only?
   - Current: Keeps notes with type 'admission' or 'template'
   - Alternative: Keep all notes? Clear all notes?

3. **Labs**: Should lab results reset?
   - Current: NOT touched (labs preserved)
   - Alternative: Clear lab results?

4. **Doctor's Orders**: Keep all orders?
   - Current: NOT touched (orders preserved)
   - Alternative: Clear completed orders?

Let me know and I can adjust! 🚀
