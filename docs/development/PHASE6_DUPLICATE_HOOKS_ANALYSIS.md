# 🔍 Phase 6: Duplicate Hook Analysis

**Date:** 2025-01-18  
**Context:** Investigating apparent duplicate hooks before Phase 6 execution  

---

## 🎯 Summary

**TL;DR:** The "duplicate" hooks are **NOT duplicates** - they serve different architectural layers:
- `hooks/useAlerts.ts` - **Context consumer** (UI layer)
- `hooks/queries/useAlerts.ts` - **React Query hooks** (data layer)

This is actually a **good architectural pattern** (separation of concerns), but the naming is confusing and organization needs improvement.

---

## 📊 Analysis: useAlerts Hooks

### File 1: `src/hooks/useAlerts.ts` (Context Consumer)
```typescript
import { useContext } from 'react';
import { AlertContext } from '../contexts/AlertContext';

/**
 * Custom hook to access alert context
 * Throws an error if used outside of AlertProvider
 */
export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};
```

**Purpose:** Access React Context for alerts  
**Layer:** UI/Component state  
**Returns:** Context value (showAlert, dismissAlert, etc.)  
**Use Case:** Components that need to show/dismiss alerts  

---

### File 2: `src/hooks/queries/useAlerts.ts` (React Query Hooks)
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchActiveAlerts, acknowledgeAlert as acknowledgeAlertService } from '../../lib/alertService';

/**
 * Fetch all active alerts with smart caching
 * Replaces manual alert fetching from AlertContext
 */
export function useActiveAlerts() {
  return useQuery({
    queryKey: queryKeys.alerts.active,
    queryFn: async (): Promise<Alert[]> => {
      // Fetch from database via alertService
    }
  });
}

export function useAcknowledgeAlert() {
  // Mutation to acknowledge alerts
}
```

**Purpose:** Fetch/mutate alert data from database  
**Layer:** Data/API layer  
**Returns:** React Query result (data, isLoading, error, refetch)  
**Use Case:** Components that need to fetch alert data from Supabase  

---

## 📊 Analysis: useAuth Hooks

### File 1: `src/hooks/useAuth.ts` (Re-export)
```typescript
// Re-export the useAuth hook from SimulationAwareAuthProvider for backwards compatibility
export { useAuth } from '../contexts/auth/SimulationAwareAuthProvider';
```

**Purpose:** Re-export for backwards compatibility  
**Layer:** Convenience/compatibility layer  
**Returns:** Auth context value  
**Use Case:** Components using legacy import path  

---

### File 2: `src/hooks/queries/useAuth.ts` (React Query Hooks)
```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Get current user session and profile data
 * Replaces manual session management from AuthContext
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.user,
    queryFn: async () => {
      // Fetch user session and profile from Supabase
    }
  });
}
```

**Purpose:** Fetch/mutate auth data from database  
**Layer:** Data/API layer  
**Returns:** React Query result  
**Use Case:** Components that need user profile data  

---

## ✅ Conclusion: These Are NOT Duplicates

### Different Responsibilities
- **Context hooks** (`hooks/useAlerts.ts`, `hooks/useAuth.ts`)
  - Consume React Context
  - Provide UI-level state and actions
  - No database calls

- **Query hooks** (`hooks/queries/*`)
  - Use React Query for data fetching
  - Make API/database calls
  - Provide caching, refetching, optimistic updates

### Architecture Pattern
This follows the **Layered Architecture** pattern:
```
┌─────────────────────────────────┐
│   Components                    │
├─────────────────────────────────┤
│   Context Hooks (useAlerts)     │  ← UI State Layer
├─────────────────────────────────┤
│   Query Hooks (useActiveAlerts) │  ← Data Fetching Layer
├─────────────────────────────────┤
│   Services (alertService)       │  ← Business Logic Layer
├─────────────────────────────────┤
│   Supabase Client               │  ← API Client Layer
└─────────────────────────────────┘
```

---

## 🎯 Phase 6 Recommendation: Rename for Clarity

### Problem
Having both `useAlerts` and `useActiveAlerts` is confusing:
- Developers don't know which to import
- Similar names hide different purposes

### Solution: Rename Context Hooks
```typescript
// BEFORE (Confusing)
import { useAlerts } from '@/hooks/useAlerts';           // Context
import { useActiveAlerts } from '@/hooks/queries/useAlerts';  // Query

// AFTER (Clear)
import { useAlertContext } from '@/hooks/useAlertContext';    // Context
import { useActiveAlerts } from '@/features/alerts/hooks/useActiveAlerts';  // Query
```

### Proposed Renames
- `hooks/useAlerts.ts` → `hooks/useAlertContext.ts`
- `hooks/useAuth.ts` → Keep (it's a re-export for compatibility)
- `hooks/queries/useAlerts.ts` → Move to `features/*/hooks/` based on domain

---

## 📋 Phase 6 Revised Plan

### Step 1: Rename Context Hooks (10 min)
```bash
# Rename for clarity
mv src/hooks/useAlerts.ts src/hooks/useAlertContext.ts

# Update the export inside
sed -i 's/export const useAlerts/export const useAlertContext/g' src/hooks/useAlertContext.ts

# Find and update all imports (estimated 20-30 files)
grep -r "from '.*hooks/useAlerts'" src/ --include="*.tsx" --include="*.ts"

# Update imports systematically
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i \
  "s/import { useAlerts } from '.*\/hooks\/useAlerts'/import { useAlertContext } from '@\/hooks\/useAlertContext'/g"
```

### Step 2: Move Query Hooks to Features (20 min)
```bash
# Determine which feature owns each query hook:
# - useActiveAlerts, useAcknowledgeAlert → Global (keep in hooks/)
# - useCurrentUser, useLogin, useLogout → Auth (keep in hooks/ - global)
# - useMultiTenantPatients → patients feature
# - useMedications → clinical feature

# Move feature-specific query hooks
mv src/hooks/queries/useMultiTenantPatients.ts src/features/patients/hooks/
mv src/hooks/queries/useMedications.ts src/features/clinical/hooks/

# Keep global query hooks in hooks/ (flatten structure)
mv src/hooks/queries/useAlerts.ts src/hooks/useAlertQueries.ts
mv src/hooks/queries/useAuth.ts src/hooks/useAuthQueries.ts
```

### Step 3: Remove queries/ Subfolder (5 min)
```bash
# After moving all files, remove empty folder
rmdir src/hooks/queries
```

---

## 📊 Before vs After

### Before (Confusing)
```
src/hooks/
├── useAlerts.ts              ← Context consumer
├── useAuth.ts                ← Re-export
├── queries/
│   ├── useAlerts.ts          ← Query hooks (same name!)
│   ├── useAuth.ts            ← Query hooks (same name!)
│   ├── useMedications.ts     ← Feature-specific
│   └── useMultiTenantPatients.ts ← Feature-specific
└── ... other hooks
```

### After (Clear)
```
src/hooks/
├── useAlertContext.ts        ← Context consumer (RENAMED)
├── useAlertQueries.ts        ← Query hooks (RENAMED, moved from queries/)
├── useAuth.ts                ← Re-export (unchanged)
├── useAuthQueries.ts         ← Query hooks (RENAMED, moved from queries/)
└── ... other shared hooks

src/features/patients/hooks/
└── useMultiTenantPatients.ts ← Moved from queries/

src/features/clinical/hooks/
└── useMedications.ts         ← Moved from queries/
```

---

## ✅ Benefits of This Approach

1. **Clear Naming**
   - `useAlertContext` → Obviously a context hook
   - `useAlertQueries` → Obviously React Query hooks
   - No more confusion

2. **Feature Co-location**
   - Feature-specific queries live with their features
   - Shared queries stay in shared hooks/

3. **Flat Structure**
   - No more queries/ subfolder
   - Easier imports, clearer organization

4. **Backward Compatibility**
   - Keep `useAuth.ts` re-export for compatibility
   - Gradual migration path

---

## 🎯 Updated Success Criteria

- [ ] Rename `useAlerts.ts` → `useAlertContext.ts` (20-30 import updates)
- [ ] Move query hooks from queries/ to appropriate locations
- [ ] Remove queries/ subfolder
- [ ] Update all imports (estimated 40-50 files)
- [ ] Build succeeds with zero errors
- [ ] No duplicate hook names remain
- [ ] Clear distinction between context hooks and query hooks

---

## 🚀 Ready to Execute

This analysis shows we need to:
1. Rename context hooks for clarity
2. Move feature-specific query hooks to features
3. Flatten the hooks/ structure (no queries/ subfolder)
4. Update 40-50 import statements

**Estimated Time:** 1-2 hours (less than original estimate)  
**Risk:** LOW (TypeScript will catch all import errors)  
**Benefit:** Much clearer hook architecture  

**Proceed with Phase 6?**
