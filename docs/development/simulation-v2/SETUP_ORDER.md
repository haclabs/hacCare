# CORRECTED SETUP GUIDE - Run in This Order!

## Issue Discovered

The test revealed that **`patient_vitals` and other tables are missing the `tenant_id` column**!

This is why the test failed. We need to add the column first, then create the triggers.

## ✅ Correct Setup Order

### Step 1: Add tenant_id Columns (FIRST!)

**File:** `docs/development/simulation-v2/add_tenant_id_columns.sql`

**What it does:**
- Adds `tenant_id` column to all patient data tables
- Populates existing data with tenant_id from patients table
- Creates indexes for performance

**Run in Supabase SQL Editor:**
1. Copy entire file
2. Paste in SQL Editor
3. Click "Run"

**Expected output:**
```
✅ Added tenant_id column to patient_vitals
✅ Added tenant_id column to patient_medications
✅ Added tenant_id column to medication_administrations
...
```

### Step 2: Create Auto-Set Triggers (SECOND!)

**File:** `docs/development/simulation-v2/auto_set_tenant_id_trigger.sql`

**What it does:**
- Creates trigger function
- Applies trigger to all tables with tenant_id

**Run in Supabase SQL Editor:**
1. Copy entire file
2. Paste in SQL Editor
3. Click "Run"

**Expected output:**
```
✅ Created trigger on table: patient_vitals
✅ Created trigger on table: patient_medications
...
```

### Step 3: Verify Setup

Run this in Supabase SQL Editor:

```sql
-- Check columns were added
SELECT 
  table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'tenant_id'
AND table_name LIKE '%patient%'
ORDER BY table_name;

-- Check triggers were created
SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'set_tenant_id_before_insert'
ORDER BY event_object_table;
```

### Step 4: Re-run Test

```bash
npm run test:tenant-isolation
```

**Expected:**
```
✅ Find Simulation Tenant - PASS
✅ Find Simulation Patient - PASS
✅ Insert Vitals - PASS ← Should now pass!
✅ RLS Filtering - PASS
✅ Tenant isolation working!
```

## Why This Order Matters

**❌ Wrong order:**
```
1. Create triggers
2. Add columns
   ↓
   Triggers fail because column doesn't exist!
```

**✅ Correct order:**
```
1. Add columns
2. Create triggers
   ↓
   Triggers work because column exists!
```

## What We Learned

The system was **partially** multi-tenant:
- ✅ `patients` table has `tenant_id`
- ❌ `patient_vitals` missing `tenant_id`
- ❌ `patient_medications` missing `tenant_id`
- ❌ Other tables missing `tenant_id`

**This explains:**
- Why production might have had issues
- Why simulations couldn't work
- Why the test failed

**The fix adds complete multi-tenancy to all patient data tables.**

## Summary

1. **Run:** `add_tenant_id_columns.sql` (adds columns)
2. **Run:** `auto_set_tenant_id_trigger.sql` (adds triggers)
3. **Test:** `npm run test:tenant-isolation` (verifies it works)
4. **Result:** Complete tenant isolation for simulations! ✅

---

**Total time:** ~10 minutes  
**Risk:** Low (can rollback by dropping columns/triggers)  
**Benefit:** Complete multi-tenant isolation + automatic simulation support
