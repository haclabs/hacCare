# 🚨 Medication Barcode Mismatch Issue

## Problem Statement

**Symptom:** Printed medication labels have different barcodes than the active simulation medications.

**Example:**
- Printed Label: `MZ30512` for ZOFRAN
- Active Simulation: `MZ65956` for ZOFRAN  
- Result: Label won't scan correctly in the simulation

## Root Cause Analysis

### How Medication Barcodes Are Generated

The barcode generation happens in `bcmaService.generateMedicationBarcode()`:

```typescript
generateMedicationBarcode(medication: Medication): string {
  // Format: M + 1 char (from name) + 5 digits (hash of UUID)
  const cleanName = medication.name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  const namePrefix = cleanName.charAt(0) || 'X'; // 'Z' for ZOFRAN
  
  // Hash the medication UUID to create 5-digit code
  const cleanId = medication.id.replace(/[^A-Z0-9]/g, '').toUpperCase();
  let numericCode = 0;
  for (let i = 0; i < cleanId.length; i++) {
    numericCode = (numericCode * 37 + cleanId.charCodeAt(i)) % 100000;
  }
  const idSuffix = numericCode.toString().padStart(5, '0');
  
  return `M${namePrefix}${idSuffix}`; // MZ30512
}
```

**Critical Insight:** The barcode is generated from the **medication's UUID**, not its name.

### Why Barcodes Change

The current `reset_simulation_for_next_session` function:

```sql
-- DELETES all medications
DELETE FROM patient_medications WHERE tenant_id = v_tenant_id;

-- RESTORES from snapshot with NEW UUIDs
SELECT restore_snapshot_to_tenant(
  p_tenant_id := v_tenant_id,
  p_snapshot := v_snapshot,
  p_barcode_mappings := v_patient_barcodes,
  p_preserve_barcodes := true  -- This only preserves PATIENT barcodes!
);
```

**Problem:** When medications are deleted and restored, they get **new UUIDs**, which means **new barcodes**.

## Impact

1. ❌ Pre-printed medication labels become invalid after simulation reset
2. ❌ Students cannot scan medications correctly
3. ❌ Expensive label waste (must reprint after every reset)
4. ❌ Workflow disruption between class sessions

## Solution Options

### Option 1: ⭐ PRESERVE Medication UUIDs on Reset (RECOMMENDED)

Modify `reset_simulation_for_next_session` to preserve medication IDs like it preserves patient IDs.

**Approach:**
1. Save medication UUID mappings before reset (like we do for patients)
2. Update medications IN PLACE instead of delete/restore
3. Pass medication barcode mappings to `restore_snapshot_to_tenant`

**Reference:** See `backup/simulation-legacy/migrations/016_reset_simulation_preserve_meds.sql`

```sql
-- Save medication barcode mappings
FOR v_medication_id, v_med_name IN 
  SELECT id, name 
  FROM patient_medications 
  WHERE tenant_id = v_tenant_id
LOOP
  v_medication_barcodes := v_medication_barcodes || 
    jsonb_build_object(v_medication_id::text, v_med_name);
END LOOP;

-- Don't delete medications - update them in place
-- (Skip the DELETE FROM patient_medications line)

-- Restore with medication barcode preservation
SELECT restore_snapshot_to_tenant(
  p_tenant_id := v_tenant_id,
  p_snapshot := v_snapshot,
  p_barcode_mappings := v_patient_barcodes,
  p_medication_mappings := v_medication_barcodes,  -- NEW PARAMETER
  p_preserve_barcodes := true
);
```

**Pros:**
- ✅ Labels work forever (print once, use many times)
- ✅ No workflow disruption
- ✅ Cost-effective
- ✅ Matches existing patient barcode preservation logic

**Cons:**
- ⚠️ Requires modifying `restore_snapshot_to_tenant` function
- ⚠️ More complex logic

### Option 2: Print Labels FROM Simulation Tenant

Always print labels AFTER simulation starts, never before.

**Workflow:**
1. Launch simulation
2. Wait for snapshot restore to complete
3. Print labels from the SIMULATION tenant
4. Use same labels for entire simulation lifecycle

**Pros:**
- ✅ Simple - no code changes needed
- ✅ Labels always match active simulation

**Cons:**
- ❌ Must reprint after EVERY reset
- ❌ Label waste
- ❌ Workflow disruption (wait for labels before class)
- ❌ Students might start before labels ready

### Option 3: Use Medication NAME Instead of UUID

Change barcode generation to use medication name instead of UUID.

**Approach:**
```typescript
generateMedicationBarcode(medication: Medication): string {
  // Use medication name hash instead of UUID
  const cleanName = medication.name.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  let nameHash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    nameHash = (nameHash * 37 + cleanName.charCodeAt(i)) % 100000;
  }
  return `M${cleanName.charAt(0)}${nameHash.toString().padStart(5, '0')}`;
}
```

**Pros:**
- ✅ Same medication = same barcode every time
- ✅ Works across all tenants and resets
- ✅ Simple to implement

**Cons:**
- ❌ Collision risk (two medications with same name = same barcode)
- ❌ Cannot distinguish same medication for different patients
- ❌ Less secure/traceable

## Recommended Solution: Option 1

**Preserve medication UUIDs on reset, just like patient UUIDs.**

This aligns with the existing design philosophy:
- Patient barcodes are preserved → wristband labels work forever
- Medication barcodes should be preserved → medication labels work forever

## Implementation Plan

### Phase 1: Update `reset_simulation_for_next_session`

1. Add medication barcode mapping logic (similar to patient mapping)
2. Skip deletion of `patient_medications` table
3. Pass medication mappings to restore function

### Phase 2: Update `restore_snapshot_to_tenant`

1. Add `p_medication_mappings` parameter
2. When restoring medications, check if UUID already exists
3. If exists, UPDATE instead of INSERT
4. Map snapshot medication IDs to existing UUIDs

### Phase 3: Testing

1. Print medication labels
2. Run simulation session
3. Reset simulation
4. Verify labels still scan correctly
5. Repeat for multiple reset cycles

## Diagnostic Query

To investigate your specific issue, run this query in Supabase SQL Editor:

```sql
-- Find all ZOFRAN medications in your tenant
SELECT 
  pm.id,
  pm.name,
  pm.patient_id,
  p.first_name || ' ' || p.last_name as patient_name,
  p.tenant_id,
  -- Simulate barcode generation
  'M' || 
  UPPER(SUBSTRING(REGEXP_REPLACE(UPPER(pm.name), '[^A-Z0-9]', '', 'g') FROM 1 FOR 1)) ||
  LPAD(
    (ABS(('x' || SUBSTRING(MD5(REGEXP_REPLACE(UPPER(pm.id::text), '[^A-Z0-9]', '', 'g')) FROM 1 FOR 8))::bit(32)::int) % 100000)::text,
    5, '0'
  ) as generated_barcode,
  pm.created_at
FROM patient_medications pm
JOIN patients p ON p.id = pm.patient_id
WHERE p.tenant_id = '2f466ac2-96b1-4911-87db-9a86176c2d11'
  AND pm.name ILIKE '%ZOFRAN%'
ORDER BY pm.created_at;
```

This will show you:
- The current ZOFRAN medication UUID
- The barcode it would generate
- When it was created

## Immediate Workaround

Until the code is fixed:

1. **Always print labels AFTER launching simulation**
2. **Reprint labels after each reset**
3. **Keep labels organized by session number**

Or:

1. **Don't reset simulations** - create new ones instead
2. This wastes tenant resources but preserves barcodes

## Files to Modify

1. **`/workspaces/hacCare/database/functions/reset_simulation_for_next_session.sql`**
   - Add medication barcode mapping
   - Remove medication deletion
   - Pass mappings to restore function

2. **`/workspaces/hacCare/database/functions/simulation/restore_snapshot_to_tenant.sql`**
   - Add medication mapping parameter
   - Update instead of insert for existing medications
   - Map snapshot IDs to preserved IDs

3. **Testing:**
   - Test reset preserves medication barcodes
   - Verify labels scan correctly after reset
   - Document new reset behavior

## References

- Existing patient barcode preservation: Lines 56-65 in `reset_simulation_for_next_session.sql`
- Legacy medication preservation: `backup/simulation-legacy/migrations/016_reset_simulation_preserve_meds.sql`
- Barcode generation: `src/services/clinical/bcmaService.ts` line 41-67
- Bulk label printing: `src/features/admin/components/BulkLabelPrint.tsx`
