# Simulation Reset/Stop Bug - Root Cause & Fix

## Problem Summary
After working simulations timed out, users could not:
- Reset simulations (got "column 'severity' does not exist" error)
- Stop/complete simulations (same error)
- Launch new simulations (same error after timeout)

## Timeline of Events

### October 30, 2025 - Evening
1. **9:28 PM (commit e9a119a)** - Fixed timer reset issue
   - Updated `reset_simulation_for_next_session_v2` to reset timer when resetting
   - Added: `starts_at = NOW()`, `ends_at = NOW() + duration`, `status = 'running'`
   - This function works correctly and doesn't use `restore_snapshot_to_tenant`

2. **11:19 PM (commit 15cd953)** - "Fix: Simulation Services bug"
   - **BROKE EVERYTHING** by changing function calls:
   - Changed from: `reset_simulation_for_next_session_v2` ✅ (good function)
   - Changed to: `reset_simulation` ❌ (old buggy function from commit 01ec049)
   - This old function calls 3-param `restore_snapshot_to_tenant` with hardcoded columns

3. **User left work** with active simulations running

4. **Simulations timed out** overnight

5. **Next day** - User tried to launch new simulation → ERROR
   - "column 'severity' of relation 'patient_alerts' does not exist"

## Root Cause Analysis

### Two Different Reset Functions Exist:

1. **`reset_simulation_for_next_session_v2`** (in DEPLOY_TO_CLOUD_SUPABASE.sql)
   - ✅ Modern function with timer reset
   - ✅ Does NOT call `restore_snapshot_to_tenant`
   - ✅ Directly restores data from template snapshot using dynamic SQL
   - ✅ Preserves medication IDs for barcode continuity
   - ✅ Works correctly with any schema

2. **`reset_simulation`** (in schema.sql from commit 01ec049)
   - ❌ Old function with hardcoded column names
   - ❌ Calls 3-parameter `restore_snapshot_to_tenant(tenant, snapshot, id_mappings)`
   - ❌ The 3-param restore function had hardcoded INSERT statements:
     ```sql
     INSERT INTO patient_medications (
       id, patient_id, tenant_id, medication_name, generic_name,
       dosage, route, frequency, indication, start_date, end_date,
       prescribing_physician, notes, is_prn, prn_parameters,
       last_administered, next_due, status, barcode
     )
     ```
   - ❌ Similar hardcoded columns for patient_vitals (including pain_level)
   - ❌ Similar hardcoded columns for patient_alerts (including severity)
   - ❌ These columns don't exist in the actual schema → ERROR

### What Went Wrong:

1. Commit 15cd953 changed the code to call `reset_simulation` instead of `reset_simulation_for_next_session_v2`
2. When simulations timed out, they triggered reset logic
3. Reset logic called the old `reset_simulation` function
4. Old function called 3-param `restore_snapshot_to_tenant` with hardcoded columns
5. Hardcoded columns don't match actual schema → **ERROR**

## The Fix Applied

### Step 1: Reverted Function Calls (MAIN FIX)
**File:** `src/services/simulation/simulationService.ts`

Changed `resetSimulationForNextSession` back to calling the v2 function:
```typescript
// Before (broken):
await supabase.rpc('reset_simulation', { ... });

// After (fixed):
await supabase.rpc('reset_simulation_for_next_session_v2', { ... });
```

Changed `resetSimulation` to be an alias:
```typescript
// Now just calls the working v2 function
export async function resetSimulation(simulationId: string) {
  return resetSimulationForNextSession(simulationId);
}
```

### Step 2: Fixed 3-Param Restore Function (BACKUP FIX)
**File:** `FIX_3_PARAM_RESTORE_FUNCTION.sql` (deployed to Supabase)

Even though we're no longer calling it, we fixed the 3-param `restore_snapshot_to_tenant` with dynamic INSERT:
- Medications: Dynamic column detection
- Vitals: Dynamic column detection (no hardcoded pain_level)
- Alerts: Dynamic column detection (no hardcoded severity)

### Step 3: Updated Local Schema
**File:** `database/schema.sql`

Updated local schema.sql to match the deployed fix (for consistency).

## Testing Verification

After the fix, you should be able to:
- ✅ Launch new simulations
- ✅ Reset running simulations
- ✅ Stop/complete simulations
- ✅ Resume paused simulations
- ✅ Handle simulation timeouts gracefully

## Lesson Learned

**Two versions of reset function exist:**
- `reset_simulation_for_next_session_v2` - Modern, dynamic, timer-aware ✅
- `reset_simulation` - Old, hardcoded, buggy ❌

**Always use the v2 version** for simulation resets in production!

## Files Modified

1. ✅ `src/services/simulation/simulationService.ts` - Reverted to v2 function
2. ✅ `database/schema.sql` - Updated 3-param restore with dynamic INSERT
3. ✅ `FIX_3_PARAM_RESTORE_FUNCTION.sql` - Created backup fix (deployed)

## Deployment Status

- ✅ Code changes committed (change function calls to v2)
- ✅ 3-param restore fix deployed to Supabase (backup)
- ✅ Build completed successfully
- ⏳ Needs testing: Try reset/stop on running simulation

## Next Steps

1. Test the running simulation - try to stop or reset it
2. Launch a new simulation and verify it works
3. Test full lifecycle: Launch → Pause → Resume → Reset → Complete
4. Monitor for any other timeout-related issues

## Prevention

To prevent this from happening again:
1. Document which functions are production-ready vs deprecated
2. Add deprecation warnings to old `reset_simulation` function
3. Consider removing old `reset_simulation` entirely
4. Add integration tests for reset/timeout scenarios
