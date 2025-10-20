# 🎯 Phase 6: Hooks & State Management Optimization Plan

**Goal:** Organize hooks architecture and optimize state management patterns  
**Time Estimate:** 3-5 hours  
**Risk Level:** MEDIUM (many imports to update, complex state dependencies)  
**Impact:** Better hook organization, clearer state patterns, path to 9.7/10  

---

## 📊 Current State Analysis

### Hook Distribution
```
Total Hooks: 16 files
├── src/hooks/ (13 files) - Shared hooks at root
│   ├── queries/ (5 files) - React Query hooks
│   │   ├── useAlerts.ts
│   │   ├── useAuth.ts
│   │   ├── useMedications.ts
│   │   ├── useMultiTenantPatients.ts
│   │   └── usePatients.ts
│   └── Root hooks (8 files)
│       ├── useAlerts.ts (duplicate name with queries!)
│       ├── useAuth.ts (duplicate name with queries!)
│       ├── useBarcodeScanner.ts
│       ├── useDoctorsOrdersAlert.ts
│       ├── useEnhancedAuth.ts
│       ├── useTenantBranding.ts
│       ├── useTenantNurses.ts
│       └── useTheme.ts
│
└── src/features/*/hooks/ (3 files) - Feature-specific
    ├── features/patients/hooks/
    │   ├── usePatients.ts
    │   └── usePatientTransfer.ts
    └── features/clinical/hooks/
        └── useBCMA.ts
```

### 🔴 Problems Identified

1. **Duplicate Hook Names** ⚠️
   - `useAlerts.ts` exists in BOTH `hooks/` and `hooks/queries/`
   - `useAuth.ts` exists in BOTH `hooks/` and `hooks/queries/`
   - Confusing for developers - which one to import?

2. **Inconsistent Organization**
   - Some React Query hooks in `queries/` subfolder
   - Others at root level with no clear pattern
   - No distinction between data hooks vs UI hooks

3. **Mixed Concerns**
   - Domain hooks (usePatients, useMedications) mixed with infrastructure (useTheme, useBarcodeScanner)
   - Feature-specific hooks (useTenantNurses) at shared level

4. **Modules Folder Structure**
   - Large integrated modules (MAR, Vitals, Wound Care, Forms) outside features/
   - Question: Should these be features or stay as modules?

---

## 🎯 Target Structure

### Option A: Full Feature Integration (Recommended)
```
src/
├── features/
│   ├── patients/
│   │   ├── components/
│   │   ├── hooks/
│   │   │   ├── usePatients.ts
│   │   │   ├── usePatientTransfer.ts
│   │   │   └── useMultiTenantPatients.ts (MOVE)
│   │   └── types.ts
│   │
│   ├── clinical/
│   │   ├── components/
│   │   │   ├── bcma/
│   │   │   ├── medications/
│   │   │   ├── vitals/           (INTEGRATE from modules/)
│   │   │   ├── wound-care/       (INTEGRATE from modules/)
│   │   │   └── mar/              (INTEGRATE from modules/)
│   │   ├── hooks/
│   │   │   ├── useBCMA.ts
│   │   │   ├── useMedications.ts (MOVE)
│   │   │   ├── useVitals.ts (CREATE if needed)
│   │   │   └── useWoundCare.ts (CREATE if needed)
│   │   └── types.ts
│   │
│   ├── admin/
│   │   ├── components/
│   │   ├── hooks/
│   │   │   ├── useTenantNurses.ts (MOVE)
│   │   │   └── useTenantBranding.ts (MOVE)
│   │   └── types.ts
│   │
│   ├── simulation/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types.ts
│   │
│   ├── settings/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── types.ts
│   │
│   └── forms/                    (MOVE from modules/)
│       ├── components/
│       │   └── FormsModule.tsx
│       ├── hooks/
│       └── types.ts
│
├── hooks/                        # Truly shared/infrastructure hooks only
│   ├── useAuth.ts               # Keep - global auth
│   ├── useEnhancedAuth.ts       # Keep - global auth enhancement
│   ├── useAlerts.ts             # Keep - global alerts
│   ├── useTheme.ts              # Keep - global theming
│   ├── useBarcodeScanner.ts     # Keep - shared hardware
│   ├── useDoctorsOrdersAlert.ts # Keep - cross-feature alerts
│   └── queries/                 # REMOVE - consolidate into features
│
├── modules/                      # REMOVE - integrate into features
│
└── ... (contexts, services, lib, etc.)
```

### Option B: Keep Modules Separate (Conservative)
```
src/
├── features/                     # Feature components
│   ├── patients/
│   │   └── hooks/
│   │       ├── usePatients.ts
│   │       ├── usePatientTransfer.ts
│   │       └── useMultiTenantPatients.ts (MOVE)
│   ├── clinical/
│   │   └── hooks/
│   │       ├── useBCMA.ts
│   │       └── useMedications.ts (MOVE)
│   └── admin/
│       └── hooks/
│           ├── useTenantNurses.ts (MOVE)
│           └── useTenantBranding.ts (MOVE)
│
├── modules/                      # Large integrated modules (KEEP)
│   ├── forms/
│   ├── mar/
│   ├── vitals/
│   └── wound-care/
│
└── hooks/                        # Shared infrastructure hooks
    ├── useAuth.ts
    ├── useEnhancedAuth.ts
    ├── useAlerts.ts
    ├── useTheme.ts
    ├── useBarcodeScanner.ts
    └── useDoctorsOrdersAlert.ts
    # Remove queries/ subfolder - merge into root
```

---

## 📋 Execution Plan (Option A - Recommended)

### Step 1: Resolve Hook Duplicates (15 min) ⚠️ CRITICAL
```bash
# Investigate duplicate hooks first
cat src/hooks/useAlerts.ts | head -20
cat src/hooks/queries/useAlerts.ts | head -20
cat src/hooks/useAuth.ts | head -20
cat src/hooks/queries/useAuth.ts | head -20

# Determine which is canonical, which is outdated
# Decision: Keep React Query versions in queries/, deprecate root versions
# OR: Keep root versions, remove queries/ duplicates
# MUST VERIFY BEFORE DELETING
```

### Step 2: Move Feature-Specific Hooks (30 min)
```bash
# Patients domain
mv src/hooks/queries/useMultiTenantPatients.ts src/features/patients/hooks/

# Clinical domain  
mv src/hooks/queries/useMedications.ts src/features/clinical/hooks/

# Admin domain
mv src/hooks/useTenantNurses.ts src/features/admin/hooks/
mv src/hooks/useTenantBranding.ts src/features/admin/hooks/
```

### Step 3: Integrate Modules into Clinical Feature (60 min)
```bash
# Move MAR module
mkdir -p src/features/clinical/components/mar
mv src/modules/mar/MARModule.tsx src/features/clinical/components/mar/
mv src/modules/mar/components/* src/features/clinical/components/mar/

# Move Vitals module
mkdir -p src/features/clinical/components/vitals
mv src/modules/vitals/VitalsModule.tsx src/features/clinical/components/vitals/

# Move Wound Care module
mkdir -p src/features/clinical/components/wound-care
mv src/modules/wound-care/*.tsx src/features/clinical/components/wound-care/

# Create feature-level index files for each module
```

### Step 4: Move Forms to Feature (20 min)
```bash
# Forms is complex enough to be its own feature
mkdir -p src/features/forms/components
mv src/modules/forms/FormsModule.tsx src/features/forms/components/
mkdir src/features/forms/hooks
```

### Step 5: Clean Up Shared Hooks (15 min)
```bash
# Resolve duplicates (after verification in Step 1)
# Keep only truly shared hooks:
# - useAuth.ts, useEnhancedAuth.ts (global auth)
# - useAlerts.ts (global alerts)
# - useTheme.ts (global UI)
# - useBarcodeScanner.ts (shared hardware)
# - useDoctorsOrdersAlert.ts (cross-feature)

# Remove queries/ subfolder if all moved to features
rmdir src/hooks/queries  # Only if empty
```

### Step 6: Remove Empty Modules Folder (5 min)
```bash
# Verify all modules moved
ls src/modules/  # Should be empty

# Remove if empty
rmdir src/modules/forms
rmdir src/modules/mar
rmdir src/modules/vitals
rmdir src/modules/wound-care
rmdir src/modules
```

### Step 7: Update All Imports (90-120 min) ⚠️ CRITICAL

#### 7a. Update Hook Imports
```bash
# Find all imports of moved hooks
grep -r "from '.*hooks/queries/useMultiTenantPatients'" src/
grep -r "from '.*hooks/queries/useMedications'" src/
grep -r "from '.*hooks/useTenantNurses'" src/
grep -r "from '.*hooks/useTenantBranding'" src/

# Update systematically using sed or manual editing
# Example:
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i \
  "s|from '../../hooks/queries/useMultiTenantPatients'|from '../hooks/useMultiTenantPatients'|g"
```

#### 7b. Update Module Imports
```bash
# Find all imports of modules
grep -r "from '.*modules/mar/MARModule'" src/
grep -r "from '.*modules/vitals/VitalsModule'" src/
grep -r "from '.*modules/wound-care/WoundCareModule'" src/
grep -r "from '.*modules/forms/FormsModule'" src/

# Update to new feature paths
# OLD: import { MARModule } from '../../modules/mar/MARModule'
# NEW: import { MARModule } from '../../features/clinical/components/mar/MARModule'
```

### Step 8: Create Feature Index Files (30 min)
```bash
# Create barrel exports for each feature
touch src/features/clinical/components/mar/index.ts
touch src/features/clinical/components/vitals/index.ts
touch src/features/clinical/components/wound-care/index.ts
touch src/features/forms/components/index.ts

# Write exports in each index.ts
# Example: src/features/clinical/components/mar/index.ts
# export { MARModule } from './MARModule';
```

### Step 9: Test & Validate (30 min)
```bash
# Type check
npm run type-check

# Build
npm run build

# Dev server
npm run dev

# Check for import errors
grep -r "Cannot find module" build_output.txt
```

### Step 10: Git Commit (5 min)
```bash
git add .
git commit -m "Phase 6: Hooks & state optimization

- Moved 4 feature-specific hooks to feature folders
- Integrated 4 modules (MAR, Vitals, Wound Care, Forms) into features
- Resolved duplicate hook names (useAlerts, useAuth)
- Consolidated hooks/queries/ into feature hooks
- Updated all import paths (120+ files)
- Created feature index files for clean imports
- Removed empty modules/ folder

Benefits:
- Clear hook ownership by feature
- Better code co-location
- Reduced global hook pollution
- Easier to find related code
- Path to 9.7/10 folder grade"

git push
```

---

## ⚠️ Risk Assessment

### HIGH RISK
- **Duplicate Hook Resolution** - Must verify which hooks are canonical
- **Import Path Updates** - 120+ files may import moved hooks/modules
- **Module Integration** - MAR/Vitals/Wound Care are large, complex modules

### MEDIUM RISK
- **Cross-Feature Dependencies** - Modules may have complex import chains
- **Type Imports** - Moving modules may break type imports
- **State Management** - Hooks may have shared state dependencies

### LOW RISK
- **Build Failures** - TypeScript will catch import errors immediately
- **Runtime Errors** - Type-safe imports prevent most runtime issues

---

## 🎯 Expected Outcomes

### Before
```
src/
├── hooks/ (13 files + 5 in queries/, duplicates)
├── modules/ (4 large modules outside features)
└── features/ (components only, hooks partially moved)
```

### After
```
src/
├── hooks/ (6 truly shared hooks, no duplicates)
├── modules/ (REMOVED - integrated into features)
└── features/
    ├── patients/ (components + 3 hooks)
    ├── clinical/ (components + 4 hooks + MAR + Vitals + Wound Care)
    ├── admin/ (components + 2 hooks)
    ├── simulation/ (components)
    ├── settings/ (components)
    └── forms/ (NEW - components + hooks)
```

### Benefits
- ✅ No duplicate hook names
- ✅ Clear feature ownership of hooks
- ✅ Better code co-location (hooks near components)
- ✅ Unified architecture (modules integrated into features)
- ✅ Reduced global hook pollution
- ✅ Easier navigation and discovery
- ✅ Clearer dependencies per feature
- ✅ Folder grade: **9.7/10** (A+)

---

## 📊 File Movement Summary

### Hooks to Move (4 files)
- `hooks/queries/useMultiTenantPatients.ts` → `features/patients/hooks/`
- `hooks/queries/useMedications.ts` → `features/clinical/hooks/`
- `hooks/useTenantNurses.ts` → `features/admin/hooks/`
- `hooks/useTenantBranding.ts` → `features/admin/hooks/`

### Modules to Integrate (4 modules)
- `modules/mar/` → `features/clinical/components/mar/`
- `modules/vitals/` → `features/clinical/components/vitals/`
- `modules/wound-care/` → `features/clinical/components/wound-care/`
- `modules/forms/` → `features/forms/components/`

### Duplicates to Resolve (2 pairs)
- `hooks/useAlerts.ts` vs `hooks/queries/useAlerts.ts`
- `hooks/useAuth.ts` vs `hooks/queries/useAuth.ts`

### To Keep in Shared Hooks (6 files)
- `useAuth.ts` (global authentication)
- `useEnhancedAuth.ts` (global auth enhancement)
- `useAlerts.ts` (global alerting)
- `useTheme.ts` (global theming)
- `useBarcodeScanner.ts` (shared hardware)
- `useDoctorsOrdersAlert.ts` (cross-feature alerts)

---

## ✅ Success Criteria

- [ ] All duplicate hooks resolved (useAlerts, useAuth)
- [ ] Feature-specific hooks moved to feature folders (4 hooks)
- [ ] All modules integrated into features (MAR, Vitals, Wound Care, Forms)
- [ ] Shared hooks reduced to truly global hooks (6 files)
- [ ] modules/ folder removed (empty)
- [ ] All imports updated and working (120+ files)
- [ ] `npm run build` succeeds with zero errors
- [ ] `npm run type-check` passes
- [ ] `npm run dev` starts without errors
- [ ] No functionality broken
- [ ] Folder structure grade: **9.7/10** (A+)

---

## 🚀 Recommended Approach

**Start with Step 1** (Duplicate Resolution) - This is CRITICAL and must be done first to prevent confusion.

**Then proceed step-by-step:**
1. Resolve duplicates → Test
2. Move patient hooks → Test
3. Move clinical hooks → Test
4. Move admin hooks → Test
5. Integrate one module at a time (MAR → Test, Vitals → Test, etc.)
6. Final cleanup and commit

**Rationale:** This approach minimizes risk by:
- Testing after each domain migration
- Resolving conflicts early
- Keeping features independent
- Easy rollback if issues arise

---

## 🎯 Alternative: Option B (Conservative)

If integrating modules seems too risky, we can do Option B:
- Move feature-specific hooks to features (4 hooks)
- Resolve duplicate hooks
- Consolidate hooks/queries/ into hooks/ root
- Keep modules/ as-is (large integrated components)
- Result: **9.5/10** (safe, but less optimal)

---

## 💡 Future Phases (Phase 7-8 Preview)

### Phase 7: Type System Optimization (2-3 hours)
- Consolidate types into feature-level type files
- Remove duplicate type definitions
- Create shared types module for cross-feature types
- Improve TypeScript strict mode compliance
- Result: **9.8/10**

### Phase 8: Performance & Build Optimization (2-3 hours)
- Implement code-splitting by feature
- Add lazy loading for large features
- Optimize bundle sizes
- Add React.memo where beneficial
- Result: **9.9/10** (near-perfect)

---

## 📊 Summary

**Phase 6 delivers:**
- Organized hook architecture
- Integrated module structure
- Clear feature boundaries
- Better developer experience
- Grade improvement: 9.5 → 9.7

**Ready to execute?** I recommend:
1. Start with duplicate hook analysis (Step 1)
2. Move hooks first (Steps 2-5)
3. Integrate modules one at a time (Step 3)
4. Test thoroughly at each step

**Which option do you prefer?**
- **Option A:** Full integration (MAR/Vitals/Wound Care → clinical feature)
- **Option B:** Conservative (keep modules/, move hooks only)

Let me know and we'll proceed! 🚀
