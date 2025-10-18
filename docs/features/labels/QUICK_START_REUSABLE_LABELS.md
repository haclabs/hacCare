# 🚀 Quick Start: Reusable Simulation Labels

## For Your Immediate Demo Setup

### Step 1: Install (Run Once)
```bash
# In terminal or Supabase SQL Editor
psql $DATABASE_URL -f docs/development/database/migrations/implement_reusable_simulation_labels.sql
```

### Step 2: Generate Reusable IDs for Your Template
```sql
-- Replace with your actual template ID
SELECT generate_simulation_id_sets(
  '8155df2e-a2f1-4c56-9bb0-6732a4560e8b'::uuid,
  5,  -- How many sessions you need
  ARRAY[
    'Demo Session 1',
    'Demo Session 2', 
    'Demo Session 3',
    'Demo Session 4',
    'Demo Session 5'
  ]
);
```

### Step 3: Get Label Data to Print
```sql
-- Get data for Session 1
SELECT get_simulation_label_data(
  '8155df2e-a2f1-4c56-9bb0-6732a4560e8b'::uuid,
  1  -- Session number
);
```

### Step 4: Print Your Labels
- Copy the `simulation_uuid` and `barcode` values from the results
- Print patient wristbands with: Name, MRN, DOB, Room, Barcode
- Print medication labels with: Med Name, Dosage, Route, Patient, Barcode
- **Mark all labels clearly: "SESSION 1"**

### Step 5: Launch Simulation with Session IDs

**IMPORTANT:** You must update your launch function to accept and use session_number!

Check if your current `launch_simulation` function has this parameter:
```sql
-- Check function signature
\df launch_simulation
```

If it doesn't have `p_session_number integer` parameter, you need to update it first.

### Step 6: Run, Reset, Repeat!
```
1. Launch with Session 1 → Scan labels → Works! ✅
2. Reset simulation → Restore with Session 1 IDs
3. Launch again → Same labels still work! ✅
```

---

## 🎯 Key Benefits for Your Demo

1. **Print labels TODAY** - Use them all week
2. **Reset anytime** - Same IDs = same labels work
3. **Multiple rooms** - Session 1 (Room A), Session 2 (Room B)
4. **No relabeling** - Save time between demo runs

---

## ⚠️ Important Notes

1. **Always specify session_number** when launching
2. **Don't mix sessions** - Use Session 1 labels only with Session 1 launch
3. **Color-code if possible** - Session 1 = Blue, Session 2 = Green, etc.
4. **Test one barcode** before printing all labels

---

## 🐛 Quick Fixes

**"Session not found"**
→ Run `generate_simulation_id_sets()` first

**"Function doesn't exist"**
→ Run the SQL migration file

**Barcode scans wrong patient**
→ Check you launched with correct session_number

---

## 📋 Quick Checklist

- [ ] Run SQL migration
- [ ] Generate 5 ID sets
- [ ] Print labels for Session 1
- [ ] Mark labels "SESSION 1"
- [ ] Launch with `session_number: 1`
- [ ] Test medication scan
- [ ] Test vitals entry
- [ ] Reset simulation
- [ ] Launch again with Session 1
- [ ] Verify same labels work

---

**Need full details?** See `docs/REUSABLE_SIMULATION_LABELS_GUIDE.md`

**Ready for your demo!** 🎉
