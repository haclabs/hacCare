# Tenant Isolation Test Results

**Date:** October 7, 2025  
**Test:** `npm run test:tenant-isolation`

## Test Results Summary

### ✅ What Worked

1. **Simulation Tenant Found**
   - Found simulation tenant: `sim_template_The Nursing Shift TE2225`
   - Tenant ID: `b9035f18-6b06-4794-b8d5-a5c3825b821e`
   - Type: `simulation_template`
   - **Status:** ✅ PASS

2. **Simulation Patient Found**
   - Patient: Rory Arbuckle
   - Patient ID: SIM001
   - Tenant ID matches simulation tenant
   - **Status:** ✅ PASS

### ❌ What Failed

3. **Insert Vitals with Tenant ID**
   - **Error:** `new row violates row-level security policy for table "patient_vitals"`
   - **Code:** 42501 (Insufficient privilege)
   - **Status:** ❌ FAIL

## Root Cause Analysis

### The Problem

The RLS policy on `patient_vitals` is blocking inserts. This means one of two things:

1. **Missing INSERT Policy:** There's no RLS policy allowing users to INSERT into patient_vitals
2. **tenant_id Not Set:** The INSERT policy checks tenant_id, but it's not being set automatically

### Why This Matters

For the tenant isolation architecture to work, we need:

```typescript
// This should work automatically
await supabase.from('patient_vitals').insert({
  patient_id: 'abc',
  temperature: 98.6,
  // tenant_id should be set automatically by RLS or trigger
});
```

**Currently:** ❌ RLS blocks this insert

**Expected:** ✅ RLS allows insert and sets tenant_id automatically

## Solution Options

### Option A: Fix RLS Policies (RECOMMENDED)

Add INSERT policies that automatically set tenant_id:

```sql
-- Allow INSERT with automatic tenant_id from user's profile
CREATE POLICY "Users can insert vitals for their tenant"
  ON patient_vitals FOR INSERT
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );
```

**Pros:**
- ✅ Works with current architecture
- ✅ Automatic tenant isolation
- ✅ No code changes needed

**Cons:**
- ⚠️ Requires explicit tenant_id in INSERT
- ⚠️ Need to ensure TenantContext provides correct tenant_id

### Option B: Database Trigger (CLEANER)

Add a trigger that automatically sets tenant_id:

```sql
-- Trigger function to auto-set tenant_id
CREATE OR REPLACE FUNCTION auto_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Get tenant_id from user's profile if not provided
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to patient_vitals
CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON patient_vitals
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_tenant_id();
```

**Pros:**
- ✅ Completely automatic
- ✅ No code changes needed
- ✅ Works for all tables
- ✅ Can't be bypassed

**Cons:**
- ⚠️ Requires database migration
- ⚠️ Need to apply to all tables

### Option C: Application-Level tenant_id (CURRENT ISSUE)

Services must explicitly set tenant_id:

```typescript
// In service layer
export const addVitals = async (patientId: string, vitals: VitalSigns) => {
  // Get current tenant from context
  const currentTenant = getTenantFromContext();
  
  const { data, error } = await supabase
    .from('patient_vitals')
    .insert({
      patient_id: patientId,
      tenant_id: currentTenant.id, // ← Explicitly set
      ...vitals
    });
  
  return data;
};
```

**Pros:**
- ✅ Explicit and clear
- ✅ No database changes needed
- ✅ Easy to debug

**Cons:**
- ❌ Must remember to set tenant_id in every service
- ❌ Easy to forget and cause bugs
- ❌ More code to maintain

## Current State Assessment

### What We Know

1. **Multi-tenancy exists:** Tables have tenant_id column ✅
2. **RLS is enabled:** Policies are active and blocking ✅
3. **Simulation tenants exist:** Can query simulation_template tenants ✅
4. **Patients are isolated:** Patient has correct tenant_id ✅
5. **INSERT is blocked:** RLS policy prevents vitals insertion ❌

### What We Need to Check

1. **Do INSERT policies exist?**
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename = 'patient_vitals' 
   AND cmd = 'INSERT';
   ```

2. **Does tenant_id get set automatically?**
   - Check for database triggers
   - Check service layer code
   - Check TenantContext implementation

3. **How does production currently work?**
   - If production vitals work, how is tenant_id set?
   - Is it set in the service layer?
   - Is it set by a trigger?

## Recommended Next Steps

### Step 1: Audit Current RLS Policies (30 min)

Run this in Supabase SQL Editor:

```sql
-- Check all policies on patient_vitals
SELECT * FROM pg_policies WHERE tablename = 'patient_vitals';

-- Check all policies on patient_medications
SELECT * FROM pg_policies WHERE tablename = 'patient_medications';

-- Check all policies on patient_notes
SELECT * FROM pg_policies WHERE tablename = 'patient_notes';

-- Check for triggers
SELECT 
  trigger_name, 
  event_manipulation, 
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('patient_vitals', 'patient_medications', 'patient_notes');
```

### Step 2: Test Production Vitals (15 min)

Check how production currently inserts vitals:

```typescript
// Find where vitals are inserted in production
// Check: src/lib/patientService.ts, src/lib/multiTenantPatientService.ts
// Look for: supabase.from('patient_vitals').insert(...)
// Check: Is tenant_id explicitly set?
```

### Step 3: Choose Architecture (1 hour)

Based on findings from Step 1 & 2:

**If tenant_id is already set in services:**
- ✅ Architecture already supports simulations
- ✅ Just need to ensure TenantContext switches correctly
- ✅ Test with actual simulation login (not direct insert)

**If tenant_id is NOT set anywhere:**
- ⚠️ Need to choose Option A, B, or C
- 🎯 **Recommendation:** Option B (trigger) - cleanest and most automatic

### Step 4: Test with Real User Flow (30 min)

Instead of direct database insert, test the full flow:

```typescript
// 1. Login as student
// 2. Enter simulation (TenantContext switches)
// 3. Navigate to patient vitals
// 4. Record vitals through UI
// 5. Check database - does tenant_id match simulation?
```

This tests the REAL flow, not just direct database access.

## Key Insight

**The test revealed a critical question:**

> How does production currently set tenant_id when inserting vitals?

If production works, we need to understand that mechanism. Then we can verify if it also works for simulations when TenantContext switches to a simulation tenant.

## Hypothesis

**I suspect one of these is true:**

1. **tenant_id is set in services** (like multiTenantPatientService.ts)
   - If so: Should work for simulations when tenant context switches
   - Need to verify: Does TenantContext actually switch to simulation tenant?

2. **tenant_id is NOT set anywhere** (relying on RLS default)
   - If so: Need to add INSERT policies or triggers
   - This would be a bug in production too

3. **Super admin bypass** (production uses super_admin RPC)
   - If so: Regular users can't insert vitals at all
   - This would explain the RLS block

## Action Items

### Immediate (Today)

- [ ] Check Supabase SQL Editor for RLS policies
- [ ] Review `multiTenantPatientService.ts` for how tenant_id is set
- [ ] Review `patientService.ts` for vitals insertion
- [ ] Check if production vitals actually work for regular nurses

### Short-term (This Week)

- [ ] Decide on architecture (Option A, B, or C)
- [ ] Implement chosen solution
- [ ] Test with real user flow (not direct SQL)
- [ ] Update test script to match real usage pattern

### Long-term (Next Sprint)

- [ ] Add debrief report generation
- [ ] Add cleanup process
- [ ] Document final architecture
- [ ] Train team on tenant isolation

## Conclusion

**Good News:** 
- ✅ Simulation tenants exist
- ✅ Patients are properly isolated
- ✅ RLS is active and protecting data

**Needs Attention:**
- ⚠️ RLS policies need INSERT support
- ⚠️ tenant_id needs to be set (trigger, policy, or code)
- ⚠️ Test with real user flow, not direct insert

**Next Step:**
Audit the current production code to see how tenant_id is set for vitals. Once we understand that, we can verify if simulations will work the same way.

---

**Test Command:** `npm run test:tenant-isolation`  
**Test File:** `test-tenant-isolation.ts`  
**Status:** ⚠️ Partially passing - needs RLS policy fixes
