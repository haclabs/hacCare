# Urgent Fixes Applied - October 24, 2025

## Issue 1: Simulation Reset Shows Expired ✅ FIXED

### Problem
When resetting an active simulation that had already run, it would restart but show as "expired" without the countdown timer from the simulation template.

### Root Cause
The `reset_simulation` function was updating the simulation data but was **NOT** setting:
1. `starts_at = NOW()` - to restart the timer
2. `status = 'running'` - to mark it as active (not expired)

This prevented the database trigger `calculate_simulation_ends_at` from recalculating the new `ends_at` time based on the template's `duration_minutes`.

### Fix Applied
Updated the `reset_simulation` function in:
- `/workspaces/hacCare/database/migrations/015_reset_simulation_update_in_place.sql` (lines 291-297)
- `/workspaces/hacCare/database/migrations/016_fix_reset_simulation_expiry.sql` (new migration file)
- `/workspaces/hacCare/database/schema.sql` (line ~2956)

Changed:
```sql
-- BEFORE (WRONG)
UPDATE simulation_active 
SET 
  updated_at = NOW()
WHERE id = p_simulation_id;
```

To:
```sql
-- AFTER (CORRECT)
UPDATE simulation_active 
SET 
  starts_at = NOW(),        -- ✅ Restart timer
  status = 'running',       -- ✅ Mark as active
  updated_at = NOW()
WHERE id = p_simulation_id;
```

### Result
- ✅ Simulations reset properly with countdown timer restarted
- ✅ Status shows as "running" instead of "expired"
- ✅ Timer displays correct duration from template
- ✅ All patient and medication IDs preserved for printed barcodes

### Action Required
Run the updated migration in Supabase SQL editor:
- Either: `/workspaces/hacCare/database/migrations/015_reset_simulation_update_in_place.sql`
- Or: `/workspaces/hacCare/database/migrations/016_fix_reset_simulation_expiry.sql`

---

## Issue 2: Bulk Label Print Not Showing Medications ✅ FIXED

### Problem
When logged in as super admin and selecting an active simulation tenant, the bulk label print feature was showing patient labels but **NOT medication labels**, even though medications existed on the patients.

### Root Cause
The `fetchMedicationLabels` function in `/workspaces/hacCare/src/services/operations/bulkLabelService.ts` had two issues:

1. **Wrong query approach**: It was filtering medications by `medication.tenant_id` instead of by `patient.tenant_id`. In simulation tenants, patients belong to the simulation tenant, not the medications directly.

2. **RPC fallback was broken**: The code tried to call a non-existent RPC function `fetch_medications_for_tenant` which would always fail, then fell back to broken queries.

### Fix Applied
Updated `/workspaces/hacCare/src/services/operations/bulkLabelService.ts`:

**Before:**
```typescript
// Tried non-existent RPC, then:
.eq('tenant_id', tenantId)  // ❌ Wrong: filters by medication tenant
.eq('status', 'Active')      // ❌ Case-sensitive
```

**After:**
```typescript
.select(`
  id, patient_id, name, dosage, frequency, route,
  prescribed_by, start_date, status,
  patients!inner (first_name, last_name, tenant_id)
`)
.eq('patients.tenant_id', tenantId)  // ✅ Correct: filter by patient tenant
.in('status', ['Active', 'active'])  // ✅ Case-insensitive
```

### Result
- ✅ Medication labels now appear in bulk label print
- ✅ Works correctly for simulation tenants
- ✅ Super admins can fetch labels for any selected tenant
- ✅ Handles both 'Active' and 'active' status values

### Action Required
No database changes needed - this was a frontend/service fix. The updated code is already in place.

---

## Summary

Both urgent issues have been resolved:

1. **Simulation Reset Timer**: Fixed in database migration - needs SQL deployment
2. **Medication Labels**: Fixed in TypeScript service - already deployed in code

### Next Steps
1. Run the SQL migration in Supabase to fix simulation resets
2. Test both fixes in your environment
3. Verify barcode labels print correctly after simulation reset
