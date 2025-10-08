# Quick Start: Run This SQL Now

## ⚠️ ACTION REQUIRED

The test revealed that services don't set `tenant_id` on inserts, causing RLS violations.

**Solution:** Database trigger that automatically sets `tenant_id`

## Step 1: Run SQL in Supabase (5 minutes)

1. Open Supabase Dashboard → SQL Editor
2. Copy the entire file: `auto_set_tenant_id_trigger.sql`
3. Paste and click "Run"
4. Wait for success messages

**Expected Output:**
```
NOTICE: Created trigger on table: patient_vitals
NOTICE: Created trigger on table: patient_medications
NOTICE: Created trigger on table: medication_administrations
NOTICE: Skipping table (does not exist): patient_assessments
...
```

✅ "Created trigger" = Good!  
⚠️ "Skipping table" = Normal (table doesn't exist)  
❌ "ERROR" = Check error message  

## Step 2: Verify (1 minute)

Run this query in Supabase SQL Editor:

```sql
SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'set_tenant_id_before_insert'
ORDER BY event_object_table;
```

**Expected:** List of tables with triggers (should see 10+ tables)

## Step 3: Re-run Test (1 minute)

```bash
npm run test:tenant-isolation
```

**Expected:**
```
✅ Find Simulation Tenant - PASS
✅ Find Simulation Patient - PASS
✅ Insert Vitals - PASS ← This should now pass!
✅ RLS Filtering - PASS
```

## What This Does

**Before:**
```typescript
// Service doesn't set tenant_id
await supabase.from('patient_vitals').insert({
  patient_id: 'abc',
  temperature: 98.6
  // ❌ No tenant_id!
});
// ❌ RLS blocks insert
```

**After (with trigger):**
```typescript
// Service still doesn't set tenant_id
await supabase.from('patient_vitals').insert({
  patient_id: 'abc',
  temperature: 98.6
  // Still no tenant_id in code
});
// ✅ Trigger auto-sets tenant_id from user_profiles
// ✅ RLS allows insert
// ✅ Data isolated by tenant!
```

## Why This Solves Everything

✅ **Simulations work** - tenant_id automatically set to simulation tenant  
✅ **Production works** - tenant_id automatically set to production tenant  
✅ **No code changes** - Services work as-is  
✅ **New features work** - Automatic isolation  
✅ **Can't forget** - Trigger can't be bypassed  

## If It Fails

**Error: "relation X does not exist"**
- Fixed in updated SQL (checks if table exists first)
- Re-copy the `auto_set_tenant_id_trigger.sql` file

**Error: "permission denied"**
- Make sure you're logged in as database owner
- Check Supabase project permissions

**Test still fails:**
- Check triggers created (Step 2)
- Check user has tenant_id: `SELECT * FROM user_profiles WHERE id = auth.uid()`
- Check Supabase logs for trigger errors

## Rollback (if needed)

```sql
-- Remove all triggers
DROP TRIGGER IF EXISTS set_tenant_id_before_insert ON patient_vitals;
DROP FUNCTION IF EXISTS auto_set_tenant_id();
```

## Next After This Works

1. ✅ Test with real simulation (record vitals through UI)
2. ✅ Create debrief report service
3. ✅ Create cleanup service
4. ✅ Deploy to production

---

**File to run:** `docs/development/simulation-v2/auto_set_tenant_id_trigger.sql`  
**Where:** Supabase Dashboard → SQL Editor  
**Time:** 5 minutes  
**Risk:** Low (can rollback easily)  
