# 🏷️ Reusable Simulation Labels - Complete Guide

## 🎯 Problem Solved

**Before:** Every time you reset or restart a simulation, new patient IDs and medication IDs were generated, requiring you to reprint and relabel all medications.

**After:** Pre-generate fixed IDs for each session that remain constant across resets. Print labels once, reuse forever!

---

## 📋 Workflow Overview

```
1. Create Template → 2. Generate ID Sets → 3. Print Labels ONCE → 4. Run Simulation
                                                                  ↓
                                                          5. Reset & Rerun
                                                                  ↓
                                                     (Same IDs = Labels still work!)
```

---

## 🚀 Step-by-Step Setup

### Step 1: Install the Database Functions

```bash
# Run the migration SQL
psql $DATABASE_URL -f /workspaces/hacCare/docs/development/database/migrations/implement_reusable_simulation_labels.sql
```

Or via Supabase SQL Editor:
- Copy contents of `implement_reusable_simulation_labels.sql`
- Paste into SQL Editor
- Run

### Step 2: Generate ID Sets for Your Template

```sql
-- Generate 5 reusable session ID sets
SELECT generate_simulation_id_sets(
  '8155df2e-a2f1-4c56-9bb0-6732a4560e8b'::uuid,  -- Your template ID
  5,  -- Number of sessions you plan to run
  ARRAY[
    'Nursing 101 - Class A - Morning',
    'Nursing 101 - Class A - Afternoon',
    'Nursing 101 - Class B - Morning',
    'Nursing 101 - Class B - Afternoon',
    'Advanced Care - Class C'
  ]
);
```

**Result:**
```json
{
  "success": true,
  "session_count": 5,
  "message": "ID sets generated successfully. You can now print labels..."
}
```

### Step 3: Get Label Data for Printing

```sql
-- Get printable label data for Session 1
SELECT get_simulation_label_data(
  '8155df2e-a2f1-4c56-9bb0-6732a4560e8b'::uuid,
  1  -- Session number
);
```

**Result:**
```json
{
  "session_name": "Nursing 101 - Class A - Morning",
  "session_number": 1,
  "patients": [
    {
      "simulation_uuid": "abc123-...",
      "patient_id": "P94558",
      "full_name": "John Doe",
      "date_of_birth": "1955-06-15",
      "blood_type": "A+",
      "allergies": ["Penicillin"],
      "room_number": "101",
      "bed_number": "A",
      "barcode": "SIM-P-abc123-..."
    }
  ],
  "medications": [
    {
      "simulation_uuid": "def456-...",
      "medication_name": "Metformin",
      "dosage": "500mg",
      "route": "PO",
      "frequency": "BID",
      "patient_name": "John Doe",
      "barcode": "SIM-M-def456-..."
    }
  ]
}
```

### Step 4: Print Labels

Use the barcode values to print your labels. Each session gets unique barcodes.

**Patient Wristband:**
```
┌──────────────────────────────────┐
│ SESSION 1 - CLASS A MORNING     │
│ JOHN DOE                        │
│ MRN: P94558    DOB: 06/15/1955 │
│ Room: 101-A    Blood: A+       │
│ ⚠️ Allergies: Penicillin       │
│ [████▌██▌█████▌██]            │
│ SIM-P-abc123-...               │
└──────────────────────────────────┘
```

**Medication Label:**
```
┌──────────────────────────────────┐
│ SESSION 1                       │
│ METFORMIN 500mg                │
│ PO - BID                       │
│ Patient: JOHN DOE (101-A)      │
│ [████▌██▌█████▌██]            │
│ SIM-M-def456-...               │
└──────────────────────────────────┘
```

### Step 5: Launch Simulation with Session IDs

When launching the simulation, specify which session to use:

```typescript
// Frontend code
const { data, error } = await supabase.rpc('launch_simulation', {
  template_id: '8155df2e-a2f1-4c56-9bb0-6732a4560e8b',
  name: 'Class A Morning Session',
  duration_minutes: 60,
  participant_user_ids: [nurseUserId],
  participant_roles: ['student'],
  session_number: 1  // 🎯 Use Session 1 IDs = matches printed labels!
});
```

### Step 6: Reset and Rerun

When you reset the simulation, it will restore using the SAME session IDs:

```sql
-- Reset simulation
SELECT reset_simulation('simulation-id'::uuid);

-- The patients and medications will have the SAME IDs as before
-- Your printed labels still work! 🎉
```

---

## 🎨 Label Organization Strategies

### Strategy 1: Color-Coded Sessions
- Session 1: Print on **Blue** labels
- Session 2: Print on **Green** labels  
- Session 3: Print on **Yellow** labels
- Session 4: Print on **Pink** labels
- Session 5: Print on **Orange** labels

### Strategy 2: Separate Label Binders
- Binder 1: "Class A Morning - Session 1"
- Binder 2: "Class A Afternoon - Session 2"
- Binder 3: "Class B Morning - Session 3"

### Strategy 3: Session Header Labels
Print a header label for each set:
```
┌──────────────────────────────────┐
│ ⚠️  SESSION 1 ONLY              │
│ Class A - Morning               │
│ Do NOT mix with other sessions! │
└──────────────────────────────────┘
```

---

## 💡 Best Practices

### ✅ DO:
- Print all labels for a session at once
- Store each session's labels separately
- Mark labels clearly with session number
- Generate more sessions than you think you need
- Test scan one label from each session before printing all

### ❌ DON'T:
- Mix labels from different sessions
- Use Session 1 labels when launching Session 2
- Forget which session you're running (check before launch)
- Reuse a session number for different classes simultaneously

---

## 🔧 Common Scenarios

### Scenario 1: Running Same Simulation Multiple Times
```
Week 1: Launch Session 1, run simulation, reset
Week 2: Launch Session 1 again, run simulation, reset
Week 3: Launch Session 1 again, run simulation
→ Same labels work every time! 🎯
```

### Scenario 2: Multiple Simultaneous Classes
```
Room A: Launch Session 1 (Class A uses blue labels)
Room B: Launch Session 2 (Class B uses green labels)
→ No ID conflicts, separate barcodes! 🎯
```

### Scenario 3: Pre-Demo Setup
```
Monday: Generate ID sets, print labels
Tuesday-Friday: Practice setup, test scans
Next Week: Run actual demo
→ Labels ready days in advance! 🎯
```

---

## 🐛 Troubleshooting

### Error: "Session not found"
**Cause:** You haven't generated ID sets yet
**Fix:** Run `generate_simulation_id_sets()` first

### Error: "Invalid session number"
**Cause:** Asking for Session 6 when only 5 exist
**Fix:** Check how many sessions you generated or generate more

### Issue: Barcode scan finds wrong patient
**Cause:** Mixed up labels from different sessions
**Fix:** Double-check session number when launching, use color coding

### Issue: Want to add more sessions
**Solution:** Run `generate_simulation_id_sets()` again with higher count:
```sql
-- Already have 5 sessions, want 10 total
SELECT generate_simulation_id_sets(
  'template-id'::uuid,
  10,  -- Now have 10 sessions
  ARRAY['Session 1', ..., 'Session 10']
);
```

---

## 📊 Database Schema

```sql
-- simulation_templates table gets new column:
simulation_id_sets jsonb

-- Structure:
[
  {
    "session_number": 1,
    "session_name": "Class A Morning",
    "created_at": "2025-10-15T...",
    "patient_count": 8,
    "medication_count": 45,
    "id_mappings": {
      "patients": {
        "template_patient_uuid": "session1_patient_uuid"
      },
      "medications": {
        "template_med_uuid": "session1_med_uuid"
      }
    }
  },
  { ... session 2 ... },
  { ... session 3 ... }
]
```

---

## 🎯 Frontend Integration Example

```typescript
// simulationLabelService.ts

export async function generateSessionLabels(
  templateId: string,
  sessionCount: number,
  sessionNames: string[]
) {
  // 1. Generate ID sets
  const { data, error } = await supabase.rpc('generate_simulation_id_sets', {
    template_id: templateId,
    session_count: sessionCount,
    session_names: sessionNames
  });

  if (error) throw error;
  return data;
}

export async function getLabelData(templateId: string, sessionNumber: number) {
  const { data, error } = await supabase.rpc('get_simulation_label_data', {
    template_id: templateId,
    session_number: sessionNumber
  });

  if (error) throw error;
  return data;
}

export async function printLabelsForSession(templateId: string, sessionNumber: number) {
  const labelData = await getLabelData(templateId, sessionNumber);
  
  // Generate PDF with barcodes
  const pdf = await generateLabelPDF(labelData);
  pdf.autoPrint();
  pdf.output('dataurlnewwindow');
}
```

---

## ✅ Checklist

Before your demo:
- [ ] Run `implement_reusable_simulation_labels.sql`
- [ ] Generate ID sets for your template
- [ ] Print labels for each session
- [ ] Test scan a few barcodes
- [ ] Organize labels by session (color/binder/folder)
- [ ] Launch simulation with correct session number
- [ ] Test medication administration with barcode scan
- [ ] Verify vitals entry works
- [ ] Practice reset and relaunch
- [ ] Confirm same labels still work after reset

---

## 📞 Support

If you encounter issues:
1. Check `REUSABLE_SIMULATION_LABELS_GUIDE.md` (this file)
2. Review SQL migration logs for errors
3. Verify session numbers match between labels and launch
4. Check that `simulation_id_sets` column exists in `simulation_templates`

---

## 🎉 Benefits Summary

✅ **Print labels once** - No more relabeling between sessions
✅ **Reusable IDs** - Reset and run again with same barcodes
✅ **Multiple simultaneous simulations** - Each session has unique IDs
✅ **Pre-demo ready** - Print days/weeks in advance
✅ **Cost savings** - No wasted label sheets
✅ **Time savings** - No setup time between runs

---

**Ready to implement? Run the SQL migration and start generating your reusable label sets!** 🚀
