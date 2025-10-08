# Critical Finding: tenant_id Not Set in Vitals Insert

## Discovery

The test revealed that `addVitalsWithTenant()` in `multiTenantPatientService.ts` **does NOT set tenant_id** when inserting vitals:

```typescript
// Line 245-256 in multiTenantPatientService.ts
const dbVitals = {
  patient_id: patientId,
  temperature: vitals.temperature,
  blood_pressure_systolic: vitals.bloodPressure.systolic,
  blood_pressure_diastolic: vitals.bloodPressure.diastolic,
  heart_rate: vitals.heartRate,
  respiratory_rate: vitals.respiratoryRate,
  oxygen_saturation: vitals.oxygenSaturation,
  recorded_at: vitals.recorded_at || new Date().toISOString()
  // ❌ NO tenant_id!
};

const { data: newVitals, error } = await supabase
  .from('patient_vitals')
  .insert([dbVitals]) // ← tenant_id missing!
```

## The Problem

**This explains why our test failed:**

```
❌ Error: new row violates row-level security policy for table "patient_vitals"
```

**RLS is blocking the insert because:**
1. No `tenant_id` is provided in the INSERT
2. RLS policy WITH CHECK requires `tenant_id` to match user's tenant
3. Without `tenant_id`, the check fails

## Why This Matters for Simulations

For tenant isolation to work, **tenant_id MUST be set** on every insert. Without it:

- ❌ Can't isolate simulation data from production
- ❌ Can't query simulation data for debrief reports
- ❌ Can't cleanup simulation data (no way to find it)
- ❌ Simulations can't record student actions

## Solution: Add tenant_id to All Inserts

### Fix 1: Update addVitalsWithTenant() 

```typescript
export async function addVitalsWithTenant(
  patientId: string, 
  vitals: Omit<VitalSigns, 'id'>, 
  tenantId: string // ← Already passed in!
): Promise<{ data: VitalSigns | null; error: any }> {
  try {
    const dbVitals = {
      patient_id: patientId,
      tenant_id: tenantId, // ← ADD THIS LINE
      temperature: vitals.temperature,
      blood_pressure_systolic: vitals.bloodPressure.systolic,
      blood_pressure_diastolic: vitals.bloodPressure.diastolic,
      heart_rate: vitals.heartRate,
      respiratory_rate: vitals.respiratoryRate,
      oxygen_saturation: vitals.oxygenSaturation,
      recorded_at: vitals.recorded_at || new Date().toISOString()
    };

    const { data: newVitals, error } = await supabase
      .from('patient_vitals')
      .insert([dbVitals]) // ← Now includes tenant_id!
      .select()
      .single();
    
    // ...
  }
}
```

### Fix 2: Update All Other Service Functions

Need to add `tenant_id` to inserts in:

- ✅ `addVitalsWithTenant()` - patient_vitals
- ⚠️ `createMedication()` - patient_medications (check if already has it)
- ⚠️ `recordMedicationAdministration()` - medication_administrations
- ⚠️ `addPatientNote()` - patient_notes
- ⚠️ `createAssessment()` - patient_assessments
- ⚠️ All other patient data services

### Fix 3: Verify RLS Policies Allow INSERT

RLS policies need to allow INSERT when tenant_id matches:

```sql
-- Example INSERT policy
CREATE POLICY "Users can insert vitals for their tenant"
  ON patient_vitals FOR INSERT
  WITH CHECK (
    tenant_id = (
      SELECT tenant_id FROM user_profiles 
      WHERE id = auth.uid()
    )
  );
```

## Testing After Fix

### Step 1: Update the Service

Add `tenant_id` to `dbVitals` object:

```typescript
const dbVitals = {
  patient_id: patientId,
  tenant_id: tenantId, // ← ADD THIS
  // ... rest of fields
};
```

### Step 2: Re-run Test

```bash
npm run test:tenant-isolation
```

**Expected Result:**
```
✅ Insert Vitals with Tenant ID - PASS
✅ RLS Filtering - PASS
✅ Tenant isolation working!
```

### Step 3: Test with Real Flow

1. Login as student
2. Enter simulation (TenantContext switches to simulation tenant)
3. Navigate to patient
4. Record vitals through UI
5. Check database:
   ```sql
   SELECT * FROM patient_vitals 
   WHERE tenant_id = 'simulation-tenant-id'
   ORDER BY recorded_at DESC LIMIT 1;
   ```

## Impact on Architecture Decision

**This finding changes everything:**

### Before This Discovery

I recommended Option 3 (Tenant-Based Isolation) assuming tenant_id was being set automatically.

### After This Discovery

**We have two paths:**

**Path A: Fix Application Code (Manual tenant_id)**
- Add `tenant_id` to every service insert
- Explicit and clear
- More code to maintain
- Must remember for every new feature

**Path B: Add Database Trigger (Automatic tenant_id)**
- Create trigger to auto-set tenant_id from user_profiles
- Automatic for all tables
- Less code to maintain
- Works for new features automatically

**My Updated Recommendation: Path B (Trigger)**

## Recommended Implementation: Database Trigger

### Step 1: Create Trigger Function

```sql
-- Auto-set tenant_id on INSERT if not provided
CREATE OR REPLACE FUNCTION auto_set_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set if tenant_id is NULL
  IF NEW.tenant_id IS NULL THEN
    -- Get tenant_id from user's profile
    NEW.tenant_id := (
      SELECT tenant_id 
      FROM user_profiles 
      WHERE id = auth.uid()
    );
    
    -- Log for debugging
    RAISE NOTICE 'Auto-set tenant_id to % for table %', NEW.tenant_id, TG_TABLE_NAME;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Step 2: Apply to All Patient Data Tables

```sql
-- Apply trigger to all patient data tables
CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON patient_vitals
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON patient_medications
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_tenant_id();

CREATE TRIGGER set_tenant_id_before_insert
  BEFORE INSERT ON medication_administrations
  FOR EACH ROW
  EXECUTE FUNCTION auto_set_tenant_id();

-- Repeat for all tables...
```

### Step 3: Test

```bash
npm run test:tenant-isolation
```

**Expected:**
- ✅ INSERT succeeds (trigger sets tenant_id)
- ✅ tenant_id matches user's current tenant
- ✅ RLS filters correctly
- ✅ Simulation isolation works

## Why Trigger is Better

**Comparison:**

| Aspect | Manual (Path A) | Trigger (Path B) |
|--------|-----------------|------------------|
| Code Changes | ~50 files | 1 SQL file |
| New Features | Must remember | Automatic |
| Debugging | Check each service | Check one place |
| Maintainability | ❌ High burden | ✅ Low burden |
| Error Prone | ❌ Easy to forget | ✅ Can't forget |
| Performance | Same | Same |
| Simulation Support | Manual | Automatic |

**Winner:** Path B (Trigger)

## Action Plan

### Immediate (Next 2 Hours)

1. **Create trigger SQL file**
   - File: `docs/development/simulation-v2/auto_set_tenant_id_trigger.sql`
   - Create function + apply to all tables

2. **Run in Supabase SQL Editor**
   - Execute the trigger SQL
   - Verify triggers are created

3. **Re-run test**
   - `npm run test:tenant-isolation`
   - Should pass now

### Short-term (This Week)

4. **Test with real user flow**
   - Login → Enter simulation → Record vitals
   - Verify tenant_id is correct

5. **Update all services (optional)**
   - Can still explicitly set tenant_id in services
   - Trigger acts as safety net

### Long-term (Next Sprint)

6. **Add debrief report generation**
7. **Add cleanup process**
8. **Document final architecture**

## Key Insight

**The test revealed a critical architectural gap:**

The system was missing a mechanism to set `tenant_id` on inserts. This would have affected:
- ✅ Simulations (discovered by test)
- ⚠️ Production multi-tenancy (may already be broken)
- ⚠️ Data isolation (incomplete without tenant_id)

**The fix (trigger) solves all three issues at once.**

## Next Steps

1. Create the trigger SQL file
2. Apply to database
3. Re-run test
4. Verify simulations work

Want me to create the trigger SQL file now?
