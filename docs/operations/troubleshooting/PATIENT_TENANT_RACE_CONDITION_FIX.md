# Patient Creation Tenant Race Condition Fix

**Date Fixed:** November 7, 2025  
**Severity:** CRITICAL - Patients being created in wrong tenant  
**Status:** RESOLVED

## Problem Summary

Patients were consistently being created in the wrong tenant (`4590329e-6619-4b74-9024-421c4931316d`) despite:
- UI showing correct tenant selection
- localStorage containing correct `superAdminTenantId`
- Console logs showing correct tenant ID for fetching operations
- User switching to different tenants in UI

This affected **ALL** super admin patient creation operations across the entire application.

## Root Cause Analysis

### Issue 1: Race Condition in Context Initialization

**Problem:** `TenantContext` loads tenant information asynchronously from localStorage, but dependent contexts captured stale values during initial mount.

**Component Hierarchy:**
```tsx
// main.tsx
<TenantProvider>           // ← Loads asynchronously
  <AlertProvider>
    <PatientProvider>      // ← Mounted before TenantContext ready
```

**Code Flow:**
1. `TenantProvider` mounts and starts async initialization
2. `PatientProvider` mounts BEFORE `TenantContext` finishes loading
3. `PatientProvider` captures `selectedTenantId = null` (initial state)
4. `TenantContext` eventually loads `superAdminTenantId` from localStorage
5. But `PatientContext.addPatient` still uses the captured `null` value (closure)

**Location:** 
- `/workspaces/hacCare/src/contexts/TenantContext.tsx` (line 71)
- `/workspaces/hacCare/src/contexts/PatientContext.tsx` (line 163)

### Issue 2: React Query Hook Bypassing PatientContext

**Problem:** The actual patient creation path completely bypassed `PatientContext`, rendering all fixes there ineffective.

**Actual Code Path:**
```
PatientManagement.tsx
  └─> useCreatePatient() hook
      └─> patientService.createPatient()
          └─> Direct Supabase insert (NO tenant_id set for super admins)
```

**Expected Path (but NOT used):**
```
PatientManagement.tsx
  └─> PatientContext.addPatient()  // ← Never called!
```

**Location:**
- `/workspaces/hacCare/src/features/patients/components/PatientManagement.tsx` (line 38)
- `/workspaces/hacCare/src/features/patients/hooks/usePatients.ts` (line 103)
- `/workspaces/hacCare/src/services/patient/patientService.ts` (line 356)

### Issue 3: No Tenant ID Assignment in patientService

**Problem:** `patientService.createPatient()` converted patient data to database format but never checked or set `tenant_id` for super admin users.

**Missing Logic:**
```typescript
// ❌ BEFORE: No tenant_id handling
export const createPatient = async (patient: Patient): Promise<Patient> => {
  const dbPatient = convertToDatabase(patient);
  
  const { data, error } = await supabase
    .from('patients')
    .insert(dbPatient)  // ← tenant_id undefined or wrong value
    .select()
    .single();
```

## The Fix

### Solution 1: Read Tenant ID at Call Time (PRIMARY FIX)

Modified `patientService.createPatient()` to read `superAdminTenantId` directly from localStorage **at the time of patient creation**, avoiding the race condition entirely.

**File:** `/workspaces/hacCare/src/services/patient/patientService.ts`

**Change:**
```typescript
export const createPatient = async (patient: Patient): Promise<Patient> => {
  try {
    const dbPatient = convertToDatabase(patient);
    
    // 🔥 CRITICAL FIX: For super admins, read tenant ID from localStorage at call time
    // This prevents race condition where tenant context isn't initialized yet
    const freshTenantId = localStorage.getItem('superAdminTenantId');
    if (freshTenantId && !dbPatient.tenant_id) {
      console.log('🎯 PATIENT SERVICE: Setting tenant_id from localStorage:', freshTenantId);
      dbPatient.tenant_id = freshTenantId;
    }
    
    console.log('📝 PATIENT SERVICE: Creating patient with tenant_id:', dbPatient.tenant_id);
    
    const { data, error } = await supabase
      .from('patients')
      .insert(dbPatient)
      .select()
      .single();
    
    // ... rest of function
  }
};
```

**Lines Changed:** 356-372

### Solution 2: PatientContext Fallback (SECONDARY FIX)

Also updated `PatientContext.tsx` to read from localStorage at call time as a fallback for any code paths that DO use the context.

**File:** `/workspaces/hacCare/src/contexts/PatientContext.tsx`

**Change:**
```typescript
const addPatient = async (patient: Patient) => {
  // ... health checks ...
  
  if (isMultiTenantAdmin) {
    // 🔥 CRITICAL FIX: Read tenant ID from localStorage at CALL TIME
    const freshTenantId = localStorage.getItem('superAdminTenantId');
    
    console.log('🔍 TENANT CONTEXT CHECK (AT CALL TIME):', {
      isMultiTenantAdmin,
      freshTenantId_from_localStorage: freshTenantId,
      selectedTenantId_from_closure: selectedTenantId,
      currentTenant_from_closure: currentTenant ? { id: currentTenant.id } : null,
    });
    
    const targetTenantId = freshTenantId || selectedTenantId || currentTenant?.id;
    
    // ... rest of function
  }
};
```

**Lines Changed:** 152-172

### Solution 3: Module Load Timestamp (DEBUGGING AID)

Added module load timestamp to help debug browser caching issues during development.

**File:** `/workspaces/hacCare/src/contexts/PatientContext.tsx`

**Change:**
```typescript
// 🔥 MODULE LOAD TIMESTAMP - If you don't see this, the browser is using cached code
console.log('🔥🔥🔥 PatientContext.tsx LOADED AT:', new Date().toISOString(), '🔥🔥🔥');
```

**Lines Added:** After imports at line 19

## Testing & Verification

### Before Fix
```sql
-- Patient created with WRONG tenant_id
SELECT id, patient_id, first_name, last_name, tenant_id 
FROM patients 
WHERE id = 'e1791727-4622-43e6-b501-5583e149c000';

-- Result: tenant_id = '4590329e-6619-4b74-9024-421c4931316d' (WRONG)
```

### After Fix
```sql
-- Patient created with CORRECT tenant_id
SELECT id, patient_id, first_name, last_name, tenant_id 
FROM patients 
WHERE id = '8328c698-b304-4e34-8f26-92bd4a780ae7';

-- Result: tenant_id = '6ced4f99-0a51-4e68-b373-53f55ebedc41' (CORRECT)
```

### Console Logs (After Fix)
```
PatientContext.tsx LOADED AT: 2025-11-07T03:20:26.224Z
PATIENT SERVICE: Setting tenant_id from localStorage: 6ced4f99-0a51-4e68-b373-53f55ebedc41
PATIENT SERVICE: Creating patient with tenant_id: 6ced4f99-0a51-4e68-b373-53f55ebedc41
```

## Impact

### Before Fix
- BROKEN: All patients created in wrong tenant
- BROKEN: Simulation templates unusable
- BROKEN: Super admin workflow non-functional
- BROKEN: Data isolation compromised

### After Fix
- FIXED: Patients created in correct tenant
- FIXED: Simulation templates work correctly
- FIXED: Super admin can create patients in any tenant
- FIXED: Data isolation maintained

## Related Issues Fixed

1. **RLS Infinite Recursion #1**: Fixed in `simulation_participants` policies (previous issue)
2. **RLS Infinite Recursion #2**: Fixed in `simulation_active` policies (same session)
   - File: `/workspaces/hacCare/database/migrations/simulation_config_v2/HOTFIX_RLS_SIMULATION_ACTIVE.sql`

## Prevention Guidelines

### For Future Development

1. **NEVER rely on context values captured at mount time**
   - Always read from source (localStorage, props, etc.) at call time
   - Use `useEffect` dependencies carefully

2. **Check actual code paths, not assumed paths**
   - Verify which functions are actually called (use debugger/logs)
   - Don't assume UI → Context → Service path is always used

3. **React Query hooks may bypass contexts**
   - Hooks call services directly
   - Services need their own tenant handling logic

4. **Test with browser cache cleared**
   - Vite aggressively caches compiled code
   - Hard refresh (Ctrl+Shift+R) required for module changes
   - Check module load timestamps in console

5. **Provider order matters**
   ```tsx
   // BAD: Dependent provider loads before dependency ready
   <TenantProvider>
     <PatientProvider>  // Uses tenant before loaded
   
   // GOOD: Read values at call time, not mount time
   <TenantProvider>
     <PatientProvider>  // Reads localStorage when needed
   ```

## Files Modified

1. `/workspaces/hacCare/src/services/patient/patientService.ts` (PRIMARY FIX)
   - Lines 356-372: Added localStorage tenant ID logic
   
2. `/workspaces/hacCare/src/contexts/PatientContext.tsx` (SECONDARY FIX)
   - Line 19: Added module load timestamp
   - Lines 152-172: Added localStorage tenant ID logic

3. `/workspaces/hacCare/database/migrations/simulation_config_v2/HOTFIX_RLS_SIMULATION_ACTIVE.sql`
   - Fixed related RLS infinite recursion (separate issue, same session)

## Debugging Tips

If this issue happens again:

1. **Check localStorage in browser console:**
   ```javascript
   localStorage.getItem('superAdminTenantId')  // Should match selected tenant
   ```

2. **Check module load timestamp:**
   ```
   Look for: "PatientContext.tsx LOADED AT:"
   If missing: Browser using cached code
   ```

3. **Check console logs during patient creation:**
   ```
   Look for: "PATIENT SERVICE: Setting tenant_id from localStorage:"
   Should show the CORRECT tenant UUID
   ```

4. **Verify SQL immediately after creation:**
   ```sql
   SELECT id, patient_id, first_name, last_name, tenant_id 
   FROM patients 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```

5. **Check if code path bypasses expected flow:**
   - Add console.log statements in suspected code paths
   - Use browser debugger to trace actual execution
   - Don't assume the path - verify it

## Additional Notes

- **Browser Caching**: This bug was difficult to debug because browser aggressively cached old JavaScript even after code changes
- **Multiple Attempts**: Required multiple cache clears and hard refreshes before new code loaded
- **Time Spent**: ~2+ hours debugging due to cache issues masking the fix
- **Key Insight**: React Query hooks bypass contexts - check actual code paths, not architectural diagrams

## References

- Issue Thread: See conversation log from November 7, 2025, 03:00-03:30 UTC
- Related RLS Fix: `HOTFIX_RLS_SIMULATION_ACTIVE.sql`
- Simulation Config V2: `/workspaces/hacCare/database/migrations/simulation_config_v2/`
