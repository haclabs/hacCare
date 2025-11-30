# Code Quality Improvement Plan
**Date:** November 30, 2025  
**Priority:** High (Before Production Release)

---

## Priority 1: Fix Critical ESLint Errors 🚨

### Status: **BLOCKING PRODUCTION**

These are actual bugs that will cause runtime errors:

#### 1. Conditional React Hooks (2 files)
**Files:**
- `src/components/Layout/TenantSwitcher.tsx` line 92
- `src/features/admin/components/BackupManagement.tsx` line 109

**Issue:** React Hooks called conditionally (breaks React's rules)
**Impact:** Unpredictable component behavior, crashes
**Fix:** Move hooks before any conditional returns

#### 2. Undefined Variables (3 issues)
**Files:**
- `src/components/enhanced-create-tenant-modal.tsx` - `createTenant` not defined
- `src/contexts/AuthContext.tsx` - `NodeJS` not defined
- `src/contexts/auth/AuthContext.tsx` - `NodeJS` not defined

**Fix:** 
- Import missing functions
- Add `/// <reference types="node" />` or proper NodeJS types

#### 3. Variable Access Before Declaration (2 files)
**Files:**
- `src/features/clinical/components/BarcodeGenerator.tsx` lines 46-49
- `src/features/clinical/components/BarcodeScanner.tsx` line 33

**Issue:** useEffect references function before it's declared
**Fix:** Move function declaration before useEffect, or use useCallback

---

## Priority 2: Remove Debug Console Statements 🔍

### Status: **PRODUCTION HYGIENE**

### High Priority: medicationService.ts (21 statements)
```typescript
// Line 40-51: Excessive debugging
console.log('🔍 DEBUGGING: Fetching medications for patient:', patientId);
console.log('🔍 DEBUGGING: Current timestamp:', new Date().toISOString());
console.log('🔍 DEBUGGING: Supabase query response:', { data, error });
console.log('🔍 DEBUGGING: Number of medications returned:', data?.length || 0);
// ... 17 more similar lines
```

**Options:**
1. **Remove entirely** (clean, production-ready)
2. **Replace with proper logging** (using secureLogger)
3. **Add DEBUG flag** (conditional logging)

**Recommended:** Remove all 🔍 debug logs, keep only error logs

### Medium Priority: useBCMA.ts (10 statements)
```typescript
// Lines 56-94: Debug logs with 🔵 markers
console.log('🔵 useBCMA: Barcode received:', barcode);
console.log('🔵 useBCMA: Current state:', state);
// ... 8 more similar lines
```

**Recommended:** Remove all 🔵 debug logs

### Low Priority: Success/Error Logs (Keep These)
```typescript
// These are useful for production monitoring:
console.error('❌ Failed to create medication:', error);
console.log(`✅ Medication "${data.name}" created successfully`);
```

**Recommended:** Keep these, or migrate to secureLogger

---

## Priority 3: Refactor Large Files 📏

### Status: **TECHNICAL DEBT**

### Files Over 1,500 Lines:

| File | Lines | Complexity | Priority |
|------|-------|------------|----------|
| `ModularPatientDashboard.tsx` | 2,056 | High | 🔴 High |
| `MARModule.tsx` | 1,739 | High | 🔴 High |
| `backupService.ts` | 1,684 | Medium | 🟡 Medium |
| `SimulationLabelPrintModal.tsx` | 1,428 | Medium | 🟡 Medium |
| `alertService.ts` | 1,347 | Medium | 🟡 Medium |

### Refactoring Strategy:

#### ModularPatientDashboard.tsx (2,056 lines)
**Suggested Breakdown:**
```
src/features/patients/components/dashboard/
├── ModularPatientDashboard.tsx       (200 lines - main orchestration)
├── PatientHeader.tsx                  (150 lines)
├── TabNavigation.tsx                  (100 lines)
├── tabs/
│   ├── VitalsTab.tsx                 (300 lines)
│   ├── MedicationsTab.tsx            (300 lines)
│   ├── AssessmentsTab.tsx            (300 lines)
│   ├── LabsTab.tsx                   (300 lines)
│   └── NotesTab.tsx                  (200 lines)
└── hooks/
    └── usePatientDashboard.ts        (200 lines)
```

#### MARModule.tsx (1,739 lines)
**Suggested Breakdown:**
```
src/features/clinical/components/mar/
├── MARModule.tsx                      (200 lines - main)
├── MARHeader.tsx                      (100 lines)
├── MARFilters.tsx                     (150 lines)
├── MARTable.tsx                       (300 lines)
├── MARRowActions.tsx                  (200 lines)
├── forms/
│   ├── MedicationEntryForm.tsx       (400 lines)
│   └── BCMAVerificationForm.tsx      (300 lines)
└── hooks/
    └── useMAROperations.ts           (200 lines)
```

---

## Priority 4: Reduce `any` Type Usage 🔤

### Status: **TYPE SAFETY**

Found **100+ uses of `any`** - reduces TypeScript benefits

### Acceptable Uses (Keep):
```typescript
// 1. Catch blocks (standard practice)
catch (err: any) {
  console.error('Error:', err);
}

// 2. Logger functions (generic by design)
debug: (...args: any[]) => void;

// 3. Security sanitization (handles any input)
sanitizeLogData: (data: any): any => {...}
```

### Should Fix (High Priority):
```typescript
// medicationService.ts
.filter((med: any) => med.patient_id === patientId)  // Should be: Medication
.map((med: any) => ({...}))                          // Should be: Medication

// MARModule.tsx
const handleUpdateMedication = async (data: any, ...) // Should be: MedicationUpdate

// Multiple files
const dbUpdates: any = {};                            // Should be: Partial<T>
```

### Strategy:
1. **Phase 1:** Fix high-traffic services (medicationService, patientService)
2. **Phase 2:** Fix component props (MARModule, forms)
3. **Phase 3:** Fix type definitions in simulation types

---

## Quick Win Checklist ✅

Already completed (great work!):
- ✅ No backup files (`.bak`, `.old`, `.backup`)
- ✅ No TODO/FIXME comments
- ✅ No massive import statements
- ✅ No unused dependencies (removed 57 packages)
- ✅ Bundle optimized (17 chunks)

---

## Recommended Order of Execution

### This Session (1-2 hours):
1. ✅ Fix 5 ESLint errors (CRITICAL - 30 min)
2. ✅ Remove debug console.log statements (45 min)
3. ✅ Document refactoring plan for large files

### Next Session (3-4 hours):
4. Refactor ModularPatientDashboard.tsx (2 hours)
5. Refactor MARModule.tsx (2 hours)

### Future Sprint:
6. Reduce `any` usage in services (ongoing)
7. Add more comprehensive types

---

## Automated Checks to Add

Consider adding these to CI/CD:

```json
// package.json scripts
{
  "lint:strict": "eslint . --max-warnings 0",
  "type-check:strict": "tsc --noEmit --strict",
  "check:console": "grep -r 'console.log' src/ --exclude-dir=node_modules",
  "check:any": "grep -r ': any' src/ --exclude-dir=node_modules | wc -l"
}
```

---

## Success Metrics

**Before:**
- ESLint errors: 7+
- Console.log statements: 40+
- Files >1500 lines: 5
- `any` usage: 100+

**Target:**
- ESLint errors: 0
- Console.log statements: <10 (errors only)
- Files >1500 lines: 0
- `any` usage: <50 (only acceptable cases)

---

## Notes

This is standard cleanup before production release. All findings are normal for
a project in active development. The important thing is to fix critical bugs
(ESLint errors) and remove debug code before going live.
