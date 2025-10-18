# 🔧 Phase 4: Service Layer Refactoring Plan

**Goal:** Reorganize `src/lib/` (45 files) into proper service layer architecture  
**Time Estimate:** 4-6 hours  
**Risk Level:** MEDIUM (lots of imports to update)  
**Impact:** Zero functionality change, major organizational improvement  

---

## 📊 Current State Analysis

### src/lib/ Contents (45 files)

**Business Logic Services (should move to src/services/):**
```
✅ PATIENT DOMAIN (7 files)
- patientService.ts
- multiTenantPatientService.ts
- patientTransferService.ts
- admissionService.ts
- assessmentService.ts
- handoverService.ts
- woundCareService.ts

✅ CLINICAL DOMAIN (5 files)
- bcmaService.ts
- medicationService.ts
- diabeticRecordService.ts
- bowelRecordService.ts
- labService.ts

✅ ADMIN DOMAIN (5 files)
- adminService.ts
- tenantService.ts
- superAdminTenantService.ts
- routerIntegratedTenantService.ts
- tenantServiceDirectQuery.ts

✅ SIMULATION DOMAIN (3 files)
- simulationService.ts (also in src/services/ - duplicate!)
- simulationAlertStore.ts
- bcmaState.ts

✅ AUTH DOMAIN (2 files)
- sessionManager.ts
- authPersistence.ts

✅ OPERATIONS (5 files)
- doctorsOrdersService.ts
- alertService.ts
- auditService.ts
- batchOperations.ts
- fileUploadService.ts
```

**Infrastructure (should stay in src/lib/):**
```
✅ KEEP IN LIB/ (9 files)
- supabase.ts                  # Supabase client
- queryClient.ts               # TanStack Query config
- inputValidator.ts            # Validation utilities
- secureLogger.ts              # Logging infrastructure
- securityHeaders.ts           # Security infrastructure
- passwordGenerator.ts         # Utility class
- barcodeScanner.ts            # Barcode infrastructure
- avery5160Utils.ts            # Label printing utils
- imageService.ts              # Image processing utils
```

**Debug/Fix Files (should DELETE or ARCHIVE):**
```
❌ DELETE (6 files - temporary fixes, no longer needed)
- authDebug.ts
- browserAuthFix.ts
- browserAuthFixClean.ts
- directAuthFix.ts
- directAuthFixClean.ts
- medicationServiceDebug.ts
```

**Utilities (should stay or move to utils/):**
```
🔄 EVALUATE (3 files)
- connectionTest.ts            # Utility - could move to lib/testing/
- subdomainService.ts          # Infrastructure - keep in lib/
- schemaEngine.ts              # Infrastructure - keep in lib/
- bulkLabelService.ts          # Business logic - move to services/
```

---

## 🎯 Target Structure

### New src/services/ Structure

```
src/
├── services/
│   ├── patient/
│   │   ├── PatientService.ts
│   │   ├── MultiTenantPatientService.ts
│   │   ├── PatientTransferService.ts
│   │   ├── AdmissionService.ts
│   │   ├── AssessmentService.ts
│   │   ├── HandoverService.ts
│   │   └── WoundCareService.ts
│   │
│   ├── clinical/
│   │   ├── BCMAService.ts
│   │   ├── MedicationService.ts
│   │   ├── DiabeticRecordService.ts
│   │   ├── BowelRecordService.ts
│   │   ├── LabService.ts
│   │   └── DoctorsOrdersService.ts
│   │
│   ├── admin/
│   │   ├── AdminService.ts
│   │   ├── TenantService.ts
│   │   ├── SuperAdminTenantService.ts
│   │   └── TenantServiceRouter.ts
│   │
│   ├── simulation/
│   │   ├── SimulationService.ts (consolidate duplicate)
│   │   ├── SimulationAlertStore.ts
│   │   └── BCMAState.ts
│   │
│   ├── auth/
│   │   ├── SessionManager.ts
│   │   └── AuthPersistence.ts
│   │
│   └── operations/
│       ├── AlertService.ts
│       ├── AuditService.ts
│       ├── BatchOperations.ts
│       ├── FileUploadService.ts
│       └── BulkLabelService.ts
│
├── lib/                       # Infrastructure only
│   ├── api/
│   │   ├── supabase.ts
│   │   └── queryClient.ts
│   ├── validation/
│   │   └── inputValidator.ts
│   ├── security/
│   │   ├── secureLogger.ts
│   │   ├── securityHeaders.ts
│   │   └── passwordGenerator.ts
│   ├── barcode/
│   │   ├── scanner.ts
│   │   └── avery5160Utils.ts
│   ├── infrastructure/
│   │   ├── schemaEngine.ts
│   │   ├── subdomainService.ts
│   │   └── connectionTest.ts
│   └── media/
│       └── imageService.ts
│
└── utils/                     # Pure functions (already exists)
    ├── dateUtils.ts
    ├── formatters.ts
    └── ...
```

---

## 📋 Execution Steps

### Step 1: Create New Folder Structure (2 min)
```bash
mkdir -p src/services/{patient,clinical,admin,simulation,auth,operations}
mkdir -p src/lib/{api,validation,security,barcode,infrastructure,media}
```

### Step 2: Move Patient Services (10 min)
```bash
# Move 7 patient service files
mv src/lib/patientService.ts src/services/patient/PatientService.ts
mv src/lib/multiTenantPatientService.ts src/services/patient/MultiTenantPatientService.ts
# ... (continue for all 7)
```

### Step 3: Move Clinical Services (10 min)
```bash
# Move 6 clinical service files
mv src/lib/bcmaService.ts src/services/clinical/BCMAService.ts
mv src/lib/medicationService.ts src/services/clinical/MedicationService.ts
# ... (continue for all 6)
```

### Step 4: Move Admin Services (8 min)
```bash
# Move 4 admin service files
mv src/lib/adminService.ts src/services/admin/AdminService.ts
# ...
```

### Step 5: Move Simulation Services (5 min)
```bash
# Move 3 simulation files + consolidate duplicate
mv src/lib/simulationService.ts src/services/simulation/SimulationService.ts
# Note: Check src/services/simulationService.ts for duplicate
```

### Step 6: Move Auth Services (3 min)
```bash
mv src/lib/sessionManager.ts src/services/auth/SessionManager.ts
mv src/lib/authPersistence.ts src/services/auth/AuthPersistence.ts
```

### Step 7: Move Operations Services (8 min)
```bash
mv src/lib/alertService.ts src/services/operations/AlertService.ts
# ...
```

### Step 8: Reorganize lib/ Infrastructure (10 min)
```bash
# Move to organized subfolders
mv src/lib/supabase.ts src/lib/api/supabase.ts
mv src/lib/queryClient.ts src/lib/api/queryClient.ts
mv src/lib/inputValidator.ts src/lib/validation/inputValidator.ts
mv src/lib/secureLogger.ts src/lib/security/secureLogger.ts
# ...
```

### Step 9: Delete Debug/Fix Files (1 min)
```bash
rm src/lib/authDebug.ts
rm src/lib/browserAuthFix.ts
rm src/lib/browserAuthFixClean.ts
rm src/lib/directAuthFix.ts
rm src/lib/directAuthFixClean.ts
rm src/lib/medicationServiceDebug.ts
```

### Step 10: Update Imports (90-120 min) ⚠️ CRITICAL
**This is the time-consuming part!**

Example import changes:
```typescript
// BEFORE
import { patientService } from '@/lib/patientService';
import { supabase } from '@/lib/supabase';

// AFTER
import { patientService } from '@/services/patient/PatientService';
import { supabase } from '@/lib/api/supabase';
```

**Files that will need updates:**
- All components in `src/components/` (~200+ files)
- All hooks in `src/hooks/` (~15 files)
- All other services (circular dependencies)
- Main app files

**Strategy:**
1. Use VS Code's "Find in Files" (Ctrl+Shift+F)
2. Search for each service import pattern
3. Replace all occurrences
4. Run TypeScript check after each batch
5. Fix errors iteratively

### Step 11: Test Build (10 min)
```bash
npm run type-check
npm run build
npm run dev
```

Fix any remaining import errors.

### Step 12: Commit (2 min)
```bash
git add src/services src/lib
git commit -m "Phase 4: Service layer refactoring"
git push origin main
```

---

## ⚠️ Risk Assessment

### High Risk Areas
1. **Import Updates** - 200+ files will need import changes
2. **Circular Dependencies** - Services importing other services
3. **Build Errors** - TypeScript errors during refactoring

### Mitigation Strategies
1. **Work in batches** - Move one domain at a time
2. **Test after each domain** - Run `npm run type-check`
3. **Use VS Code's refactoring** - "Rename Symbol" where possible
4. **Keep git commits small** - Easy rollback if needed

---

## 🎯 Expected Outcomes

### Before
```
src/lib/ (45 files, mixed purpose)
└── Everything in one folder ❌
```

### After
```
src/
├── services/ (32 files, business logic)
│   └── Organized by domain ✅
└── lib/ (9 files, infrastructure)
    └── Organized by type ✅
```

### Benefits
- ✅ Clear separation: Business logic vs. Infrastructure
- ✅ Easy to find services by domain
- ✅ Follows Google/Netflix patterns
- ✅ Scalable as project grows
- ✅ New developers know where to add code

---

## 📊 File Movement Summary

| Category | Files | From | To |
|----------|-------|------|-----|
| Patient Services | 7 | lib/ | services/patient/ |
| Clinical Services | 6 | lib/ | services/clinical/ |
| Admin Services | 4 | lib/ | services/admin/ |
| Simulation Services | 3 | lib/ | services/simulation/ |
| Auth Services | 2 | lib/ | services/auth/ |
| Operations Services | 5 | lib/ | services/operations/ |
| Infrastructure | 9 | lib/ | lib/{api,security,etc} |
| Debug Files | 6 | lib/ | DELETE |
| **Total Moving** | **32** | | |
| **Total Deleting** | **6** | | |
| **Total Organizing** | **9** | | |

---

## ✅ Success Criteria

- [ ] All services moved to appropriate domains
- [ ] lib/ contains only infrastructure (9 files)
- [ ] No debug/fix files remain
- [ ] All imports updated and working
- [ ] `npm run build` succeeds with zero errors
- [ ] `npm run dev` works correctly
- [ ] No functionality broken
- [ ] Git committed with clear message

---

## 🚀 Let's Execute!

**Recommendation:** Do this step-by-step:
1. Create folders (Step 1)
2. Move one domain at a time (Steps 2-7)
3. Test after each domain
4. Update imports as we go
5. Final cleanup and commit

**Want to proceed?** I can:
- A) Execute automatically (faster, but risky if imports break)
- B) Do it step-by-step with testing (slower, but safer)
- C) Create a script to do it semi-automatically

**Which approach?**
