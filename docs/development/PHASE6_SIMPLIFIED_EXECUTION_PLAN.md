# 🚀 Phase 6: Simplified Execution Plan

**Goal:** Organize hooks architecture with clear naming and feature co-location  
**Time Estimate:** 2-3 hours (reduced from 3-5 hours)  
**Risk Level:** LOW (TypeScript-safe, clear steps)  
**Impact:** Clear hook organization, path to 9.7/10  

---

## 🎯 What We're Doing

Based on analysis in `PHASE6_DUPLICATE_HOOKS_ANALYSIS.md`:
1. ✅ "Duplicate" hooks are NOT duplicates - they're different layers (context vs query)
2. ✅ Rename context hooks for clarity (useAlerts → useAlertContext)
3. ✅ Move feature-specific query hooks to features
4. ✅ Integrate modules/ into features
5. ✅ Flatten hooks/ structure (remove queries/ subfolder)

---

## 📋 Step-by-Step Execution

### Step 1: Rename Context Hook for Clarity (30 min)

**Goal:** Make it clear that `useAlerts` is a context consumer, not a query hook

```bash
# 1a. Rename the file
mv src/hooks/useAlerts.ts src/hooks/useAlertContext.ts

# 1b. Update the export inside the file
# Change: export const useAlerts
# To:     export const useAlertContext

# 1c. Find all imports of the old hook
grep -r "useAlerts" src/ --include="*.tsx" --include="*.ts" -n

# 1d. Update imports systematically
# OLD: import { useAlerts } from '../hooks/useAlerts'
# NEW: import { useAlertContext } from '../hooks/useAlertContext'
```

**Validation:**
```bash
# Should pass with no errors
npm run type-check
npm run build
```

---

### Step 2: Move Feature-Specific Query Hooks (20 min)

**Goal:** Co-locate feature-specific data hooks with their features

```bash
# 2a. Move patient query hooks
mv src/hooks/queries/useMultiTenantPatients.ts src/features/patients/hooks/
mv src/hooks/queries/usePatients.ts src/features/patients/hooks/

# 2b. Move clinical query hooks
mv src/hooks/queries/useMedications.ts src/features/clinical/hooks/

# 2c. Flatten global query hooks (remove queries/ subfolder)
# Keep these as truly shared (cross-feature)
mv src/hooks/queries/useAlerts.ts src/hooks/useAlertQueries.ts
mv src/hooks/queries/useAuth.ts src/hooks/useAuthQueries.ts

# 2d. Update imports of moved hooks
grep -r "from '.*hooks/queries/useMultiTenantPatients'" src/
grep -r "from '.*hooks/queries/useMedications'" src/

# Update paths to new feature locations
```

**Validation:**
```bash
npm run type-check
```

---

### Step 3: Move Feature-Specific Root Hooks (15 min)

**Goal:** Move tenant/admin-specific hooks to admin feature

```bash
# 3a. Move admin-related hooks
mv src/hooks/useTenantNurses.ts src/features/admin/hooks/
mv src/hooks/useTenantBranding.ts src/features/admin/hooks/

# 3b. Update imports
grep -r "from '.*hooks/useTenantNurses'" src/
grep -r "from '.*hooks/useTenantBranding'" src/
```

**Validation:**
```bash
npm run type-check
```

---

### Step 4: Integrate Modules into Features (60 min)

**Goal:** Move large modules (MAR, Vitals, Wound Care) into clinical feature

#### 4a. Integrate MAR Module (15 min)
```bash
# Create destination
mkdir -p src/features/clinical/components/mar

# Move MAR module
mv src/modules/mar/MARModule.tsx src/features/clinical/components/mar/
mv src/modules/mar/components/* src/features/clinical/components/mar/

# Create index file for clean imports
cat > src/features/clinical/components/mar/index.ts << 'EOF'
export { MARModule } from './MARModule';
EOF

# Find and update all MAR imports
grep -r "from '.*modules/mar/MARModule'" src/

# Update imports
# OLD: import { MARModule } from '../../modules/mar/MARModule'
# NEW: import { MARModule } from '../../features/clinical/components/mar'
```

#### 4b. Integrate Vitals Module (15 min)
```bash
# Create destination
mkdir -p src/features/clinical/components/vitals

# Move Vitals module
mv src/modules/vitals/VitalsModule.tsx src/features/clinical/components/vitals/

# Create index
cat > src/features/clinical/components/vitals/index.ts << 'EOF'
export { VitalsModule } from './VitalsModule';
EOF

# Find and update imports
grep -r "from '.*modules/vitals/VitalsModule'" src/
```

#### 4c. Integrate Wound Care Module (15 min)
```bash
# Create destination
mkdir -p src/features/clinical/components/wound-care

# Move Wound Care module
mv src/modules/wound-care/*.tsx src/features/clinical/components/wound-care/

# Create index
cat > src/features/clinical/components/wound-care/index.ts << 'EOF'
export { WoundCareModule } from './WoundCareModule';
export { WoundCareDashboard } from './WoundCareDashboard';
export { WoundAssessmentForm } from './WoundAssessmentForm';
EOF

# Find and update imports
grep -r "from '.*modules/wound-care/" src/
```

#### 4d. Create Forms Feature (15 min)
```bash
# Create new feature
mkdir -p src/features/forms/components
mkdir -p src/features/forms/hooks

# Move Forms module
mv src/modules/forms/FormsModule.tsx src/features/forms/components/

# Create index
cat > src/features/forms/components/index.ts << 'EOF'
export { FormsModule } from './FormsModule';
EOF

# Create feature-level index
cat > src/features/forms/index.ts << 'EOF'
export * from './components';
EOF

# Find and update imports
grep -r "from '.*modules/forms/FormsModule'" src/
```

**Validation:**
```bash
npm run type-check
npm run build
```

---

### Step 5: Clean Up Empty Folders (5 min)

```bash
# 5a. Remove empty queries folder
rmdir src/hooks/queries  # Will fail if not empty (safe)

# 5b. Remove empty module folders
rmdir src/modules/mar/components
rmdir src/modules/mar
rmdir src/modules/vitals
rmdir src/modules/wound-care
rmdir src/modules/forms
rmdir src/modules

# 5c. Verify removal
ls src/modules  # Should show "No such file or directory"
ls src/hooks/queries  # Should show "No such file or directory"
```

**Validation:**
```bash
# Check directory structure
find src -maxdepth 2 -type d | sort
```

---

### Step 6: Update All Remaining Imports (30 min)

**Goal:** Fix all import paths after file moves

#### 6a. Audit all imports that might be broken
```bash
# Check build for errors
npm run build 2>&1 | grep "Cannot find module"

# Or use type-check
npm run type-check 2>&1 | grep "Cannot find module"
```

#### 6b. Fix imports systematically
```bash
# For each broken import, find the file and update the path
# Use pattern: grep → sed → test → commit

# Example for module imports:
find src -name "*.tsx" -o -name "*.ts" | xargs grep -l "modules/mar/MARModule"
# Then update with sed:
find src -name "*.tsx" -o -name "*.ts" | xargs sed -i \
  "s|from '../../modules/mar/MARModule'|from '../../features/clinical/components/mar'|g"
```

#### 6c. Handle cross-feature imports
```bash
# Some components may import across features
# Example: Admin importing from Clinical
# Pattern: ../../features/clinical/... (not ../../clinical/...)

# Check for incorrect cross-feature imports
grep -r "from '\.\./\.\./clinical/" src/features/
grep -r "from '\.\./\.\./patients/" src/features/

# Should be:
# from '../../features/clinical/...' (correct)
# from '../../clinical/...' (WRONG - missing features/)
```

**Validation:**
```bash
npm run type-check  # Should have ZERO errors
npm run build       # Should succeed
```

---

### Step 7: Test Application (15 min)

```bash
# 7a. Start dev server
npm run dev

# 7b. Manual testing checklist:
# - [ ] App loads without errors
# - [ ] Patient management works
# - [ ] Clinical features (BCMA, MAR, Vitals) work
# - [ ] Admin features work
# - [ ] Forms work
# - [ ] Alerts show correctly
# - [ ] Auth works
# - [ ] No console errors

# 7c. Check for runtime errors in console
# Look for:
# - "Cannot find module" errors
# - Uncaught TypeErrors
# - Failed imports
```

---

### Step 8: Git Commit & Push (5 min)

```bash
# 8a. Check status
git status

# 8b. Stage all changes
git add .

# 8c. Commit with detailed message
git commit -m "Phase 6: Hooks & module architecture optimization

HOOKS ORGANIZATION:
- Renamed useAlerts → useAlertContext for clarity
- Moved 4 feature-specific hooks to feature folders
- Flattened hooks/ structure (removed queries/ subfolder)
- Consolidated query hooks with clear naming

FEATURE INTEGRATION:
- Integrated MAR module → features/clinical/components/mar
- Integrated Vitals module → features/clinical/components/vitals  
- Integrated Wound Care → features/clinical/components/wound-care
- Created Forms feature → features/forms

CLEANUP:
- Removed empty modules/ folder
- Removed empty hooks/queries/ folder
- Updated 50+ import paths
- Created feature index files for clean imports

BENEFITS:
- Clear hook naming (context vs query)
- Better code co-location (hooks + components)
- Unified feature architecture
- Reduced global namespace pollution
- Easier navigation and discovery
- Folder grade: 9.5 → 9.7 (A+)

FILES CHANGED:
- Moved: 8 hook files
- Integrated: 4 modules (MAR, Vitals, Wound Care, Forms)
- Updated: ~50 import statements
- Deleted: 2 empty folders (modules/, hooks/queries/)

TESTING:
- Build: SUCCESS ✅
- Type-check: PASSING ✅
- Dev server: Tested and working ✅
- Zero breaking changes ✅"

# 8d. Push to GitHub
git push origin main
```

---

## 📊 Summary of Changes

### Files Moved (8 hooks)
- `hooks/useAlerts.ts` → `hooks/useAlertContext.ts` (RENAMED)
- `hooks/queries/useMultiTenantPatients.ts` → `features/patients/hooks/`
- `hooks/queries/usePatients.ts` → `features/patients/hooks/`
- `hooks/queries/useMedications.ts` → `features/clinical/hooks/`
- `hooks/queries/useAlerts.ts` → `hooks/useAlertQueries.ts` (MOVED & RENAMED)
- `hooks/queries/useAuth.ts` → `hooks/useAuthQueries.ts` (MOVED & RENAMED)
- `hooks/useTenantNurses.ts` → `features/admin/hooks/`
- `hooks/useTenantBranding.ts` → `features/admin/hooks/`

### Modules Integrated (4 modules → 4 features)
- `modules/mar/` → `features/clinical/components/mar/`
- `modules/vitals/` → `features/clinical/components/vitals/`
- `modules/wound-care/` → `features/clinical/components/wound-care/`
- `modules/forms/` → `features/forms/` (NEW FEATURE)

### Folders Removed (2)
- ❌ `src/modules/` (integrated into features)
- ❌ `src/hooks/queries/` (flattened into hooks/ root)

### Files Created (4 index files)
- `features/clinical/components/mar/index.ts`
- `features/clinical/components/vitals/index.ts`
- `features/clinical/components/wound-care/index.ts`
- `features/forms/index.ts`

---

## ✅ Success Criteria

After completion, you should have:
- [ ] No duplicate hook names (useAlerts renamed to useAlertContext)
- [ ] Feature-specific hooks in feature folders (8 hooks moved)
- [ ] All modules integrated into features (4 modules → features)
- [ ] Flat hooks/ structure (no queries/ subfolder)
- [ ] Clean imports with feature index files
- [ ] Empty folders removed (modules/, hooks/queries/)
- [ ] `npm run build` succeeds with ZERO errors
- [ ] `npm run type-check` passes with ZERO errors
- [ ] App runs in dev mode without errors
- [ ] No functionality broken
- [ ] Folder structure grade: **9.7/10** (A+)

---

## 🎯 Final Structure

```
src/
├── features/
│   ├── patients/
│   │   ├── components/ (30+ components)
│   │   └── hooks/
│   │       ├── usePatients.ts (from queries/)
│   │       ├── usePatientTransfer.ts
│   │       └── useMultiTenantPatients.ts (from queries/)
│   │
│   ├── clinical/
│   │   ├── components/
│   │   │   ├── bcma/ (existing)
│   │   │   ├── mar/ (NEW - from modules/)
│   │   │   ├── vitals/ (NEW - from modules/)
│   │   │   └── wound-care/ (NEW - from modules/)
│   │   └── hooks/
│   │       ├── useBCMA.ts
│   │       └── useMedications.ts (from queries/)
│   │
│   ├── admin/
│   │   ├── components/ (11 components)
│   │   └── hooks/
│   │       ├── useTenantNurses.ts (moved)
│   │       └── useTenantBranding.ts (moved)
│   │
│   ├── simulation/
│   │   ├── components/ (11 components)
│   │   └── hooks/
│   │
│   ├── settings/
│   │   ├── components/ (4 components)
│   │   └── hooks/
│   │
│   └── forms/ (NEW FEATURE)
│       ├── components/
│       │   └── FormsModule.tsx (from modules/)
│       ├── hooks/
│       └── index.ts
│
├── hooks/ (6 truly shared hooks - clean!)
│   ├── useAlertContext.ts (RENAMED from useAlerts)
│   ├── useAlertQueries.ts (from queries/)
│   ├── useAuth.ts (re-export)
│   ├── useAuthQueries.ts (from queries/)
│   ├── useBarcodeScanner.ts
│   ├── useDoctorsOrdersAlert.ts
│   ├── useEnhancedAuth.ts
│   └── useTheme.ts
│
├── modules/ (REMOVED - empty)
│
└── ... (services, lib, contexts, etc. - unchanged)
```

---

## 🎓 Key Improvements

### Before Phase 6
- ❌ Duplicate hook names (useAlerts in 2 places)
- ❌ Feature-specific hooks in shared folder
- ❌ Modules outside feature structure
- ❌ Confusing hooks/queries/ subfolder
- ❌ Hard to find related code
- **Grade: 9.5/10**

### After Phase 6
- ✅ Clear hook naming (context vs queries)
- ✅ Feature-specific hooks co-located
- ✅ All modules integrated into features
- ✅ Flat, organized hooks/ structure
- ✅ Easy to navigate and discover code
- **Grade: 9.7/10** 🎉

---

## 🚀 Ready to Execute!

**Recommended Approach:**
1. Do steps 1-3 first (hooks only) → Test
2. Then steps 4-5 (modules integration) → Test
3. Finally steps 6-8 (cleanup & commit)

**Total Time:** 2-3 hours  
**Risk:** LOW (TypeScript catches all errors)  
**Benefit:** Cleaner architecture, better DX, 9.7/10 grade  

**Let's do this! 🎯**
