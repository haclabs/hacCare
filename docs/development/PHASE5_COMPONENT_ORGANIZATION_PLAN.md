# 🎯 Phase 5: Component Organization Plan

**Goal:** Transform component structure to feature-based architecture (9.0/10 → 9.5/10)  
**Current:** 100 component files across 25 folders  
**Target:** Feature-based folders with co-located hooks, types, and components  
**Risk:** MEDIUM (lots of imports, but clear structure)  
**Time Estimate:** 4-6 hours

---

## 📊 Current State Analysis

### Component Structure (100 files, 25 folders)

```
src/components/ (100 files)
├── Admin/              # Admin features
├── Alerts/             # Alert components
├── Auth/               # Authentication
├── bcma/               # BCMA features
├── Changelog/          # Changelog viewer
├── Dashboard/          # Dashboard
├── Documentation/      # Docs viewer
├── forms/              # Shared form components
├── LandingPage/        # Landing page
├── Layout/             # App layout
├── Management/         # Tenant management
├── Patients/           # Patient features (largest)
│   ├── bowel/
│   ├── forms/
│   ├── handover/
│   ├── records/
│   ├── visuals/
│   └── vitals/
├── Settings/           # Settings
├── Simulation/         # Simulation features
├── StatusMonitor/      # System status
├── UI/                 # Shared UI components
└── Users/              # User management
```

### Issues with Current Structure
❌ **Mixed organizational principles**
- Some folders by feature (Patients, Admin, Simulation)
- Some folders by type (Auth, Layout, UI)
- Inconsistent depth and nesting

❌ **No co-location**
- Components separated from their hooks
- Types scattered across codebase
- Hard to find related files

❌ **Unclear boundaries**
- What goes in components/ vs modules/?
- Where do feature-specific hooks live?
- No clear pattern for new features

---

## 🎯 Target Structure

### Feature-Based Organization

```
src/
├── features/                    # Feature modules (NEW)
│   ├── patients/
│   │   ├── components/
│   │   │   ├── PatientList.tsx
│   │   │   ├── PatientDetail.tsx
│   │   │   ├── PatientForm.tsx
│   │   │   ├── vitals/
│   │   │   ├── records/
│   │   │   └── forms/
│   │   ├── hooks/
│   │   │   ├── usePatient.ts
│   │   │   ├── usePatientVitals.ts
│   │   │   └── usePatientNotes.ts
│   │   └── types.ts           # Feature-specific types
│   │
│   ├── clinical/
│   │   ├── components/
│   │   │   ├── bcma/          # BCMA components
│   │   │   ├── medications/
│   │   │   ├── labs/
│   │   │   └── orders/
│   │   ├── hooks/
│   │   │   ├── useBCMA.ts
│   │   │   ├── useMedications.ts
│   │   │   └── useLabs.ts
│   │   └── types.ts
│   │
│   ├── admin/
│   │   ├── components/
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── UserManagement.tsx
│   │   │   ├── TenantManagement.tsx
│   │   │   └── BackupManagement.tsx
│   │   ├── hooks/
│   │   │   ├── useAdminStats.ts
│   │   │   └── useTenantManagement.ts
│   │   └── types.ts
│   │
│   ├── simulation/
│   │   ├── components/
│   │   │   ├── SimulationPortal.tsx
│   │   │   ├── ActiveSimulations.tsx
│   │   │   ├── SimulationTemplates.tsx
│   │   │   └── LaunchSimulationModal.tsx
│   │   ├── hooks/
│   │   │   └── useSimulation.ts
│   │   └── types.ts
│   │
│   └── settings/
│       ├── components/
│       │   ├── Settings.tsx
│       │   ├── ConnectionDiagnostics.tsx
│       │   └── SecuritySettings.tsx
│       ├── hooks/
│       │   └── useSettings.ts
│       └── types.ts
│
├── components/                  # Shared/Common components only
│   ├── ui/                     # Base UI components (buttons, inputs, cards)
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   └── Modal.tsx
│   ├── layout/                 # Layout components
│   │   ├── AppLayout.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Header.tsx
│   │   └── TenantSwitcher.tsx
│   ├── forms/                  # Shared form components
│   │   ├── DynamicForm.tsx
│   │   ├── FormField.tsx
│   │   └── fields/
│   └── shared/                 # Truly shared components
│       ├── LandingPage.tsx
│       ├── Documentation.tsx
│       ├── Changelog.tsx
│       └── StatusMonitor.tsx
│
├── hooks/                      # Shared hooks only
│   ├── useAuth.ts
│   ├── useAlerts.ts
│   └── useTheme.ts
│
└── modules/                    # Legacy - will phase out
    ├── vitals/
    ├── mar/
    └── wound-care/
```

---

## 📋 Execution Plan

### Step 1: Create Feature Folders (5 min)
```bash
mkdir -p src/features/{patients,clinical,admin,simulation,settings}/{components,hooks}
mkdir -p src/components/{ui,layout,forms,shared}
```

### Step 2: Move Patient Components (20 min)
**From:** `src/components/Patients/`  
**To:** `src/features/patients/components/`

Files to move:
- PatientManagement.tsx
- PatientDetail.tsx
- CreateLabResultModal.tsx
- All Patients/* subdirectories (bowel, forms, handover, records, visuals, vitals)

### Step 3: Move Clinical Components (15 min)
**From:** `src/components/bcma/`  
**To:** `src/features/clinical/components/bcma/`

Files to move:
- BCMAAdministration.tsx
- All BCMA-related components
- Lab components from Patients/
- Medication components

### Step 4: Move Admin Components (15 min)
**From:** `src/components/Admin/`, `src/components/Users/`, `src/components/Management/`  
**To:** `src/features/admin/components/`

Files to move:
- AdminDashboard.tsx
- UserManagement.tsx
- TenantCRUD.tsx
- BackupManagement.tsx
- BulkLabelPrint.tsx

### Step 5: Move Simulation Components (10 min)
**From:** `src/components/Simulation/`  
**To:** `src/features/simulation/components/`

Files to move:
- SimulationPortal.tsx
- ActiveSimulations.tsx
- SimulationTemplates.tsx
- LaunchSimulationModal.tsx
- SimulationIndicator.tsx

### Step 6: Move Settings Components (10 min)
**From:** `src/components/Settings/`  
**To:** `src/features/settings/components/`

Files to move:
- Settings.tsx
- ConnectionDiagnostics.tsx
- SecuritySettings.tsx
- NetlifySecurityDiagnostics.tsx

### Step 7: Organize Shared Components (15 min)
**From:** `src/components/*`  
**To:** `src/components/{ui,layout,forms,shared}/`

- UI/ → ui/ (rename, already organized)
- Layout/ → layout/ (rename, already organized)
- forms/ → forms/ (keep as is)
- Auth/ → Keep separate (auth is special)
- LandingPage/ → shared/
- Documentation/ → shared/
- Changelog/ → shared/
- Dashboard/ → shared/
- StatusMonitor/ → shared/
- Alerts/ → shared/

### Step 8: Move Feature-Specific Hooks (30 min)
**From:** `src/hooks/`  
**To:** `src/features/*/hooks/`

Examples:
- usePatient.ts → features/patients/hooks/
- usePatientVitals.ts → features/patients/hooks/
- useBCMA.ts → features/clinical/hooks/
- useSimulation.ts → features/simulation/hooks/

Keep in src/hooks/:
- useAuth.ts (shared)
- useAlerts.ts (shared)
- useTheme.ts (shared)
- useTenantBranding.ts (shared)

### Step 9: Update All Imports (60-90 min) ⚠️ CRITICAL
This will be the most time-consuming part.

**Strategy:**
1. Use bulk sed/find-replace for common patterns
2. Test build after each feature migration
3. Fix errors iteratively

Example changes:
```typescript
// OLD
import { PatientList } from '../../components/Patients/PatientList';
import { useBCMA } from '../../hooks/useBCMA';

// NEW
import { PatientList } from '../../features/patients/components/PatientList';
import { useBCMA } from '../../features/clinical/hooks/useBCMA';
```

### Step 10: Test & Validate (30 min)
- Run `npm run type-check`
- Run `npm run build`
- Run `npm run dev`
- Manual smoke testing
- Fix any remaining errors

### Step 11: Commit & Push (5 min)
```bash
git add -A
git commit -m "Phase 5: Feature-based component organization"
git push origin main
```

---

## 🗺️ Migration Mapping

### Patients Feature
```
components/Patients/* → features/patients/components/
hooks/usePatient*.ts → features/patients/hooks/
```

### Clinical Feature
```
components/bcma/* → features/clinical/components/bcma/
components/Patients/Labs*.tsx → features/clinical/components/labs/
components/DiabeticRecordModule.tsx → features/clinical/components/
hooks/useBCMA.ts → features/clinical/hooks/
hooks/useMedications.ts → features/clinical/hooks/
```

### Admin Feature
```
components/Admin/* → features/admin/components/
components/Users/* → features/admin/components/users/
components/Management/* → features/admin/components/management/
```

### Simulation Feature
```
components/Simulation/* → features/simulation/components/
hooks/useSimulation.ts → features/simulation/hooks/
```

### Settings Feature
```
components/Settings/* → features/settings/components/
```

### Shared Components
```
components/UI/* → components/ui/
components/Layout/* → components/layout/
components/LandingPage/* → components/shared/
components/Documentation/* → components/shared/
components/Changelog/* → components/shared/
components/StatusMonitor/* → components/shared/
components/Dashboard/* → components/shared/
components/Alerts/* → components/shared/
```

---

## ⚠️ Risk Assessment

### High Risk
1. **Import Updates** - 100+ components × average 5 imports = 500+ import statements
2. **Circular Dependencies** - May discover hidden circular dependencies
3. **Type Imports** - Type-only imports may break

### Medium Risk
1. **Lazy Loading** - Dynamic imports in App.tsx need updating
2. **Router Paths** - Some routes reference component paths
3. **Test Files** - If any exist, they'll need updating

### Low Risk
1. **No functionality changes** - Pure file reorganization
2. **Clear structure** - Feature boundaries are well-defined
3. **TypeScript validation** - Compiler will catch all import errors

---

## 🎯 Success Criteria

- [ ] All components moved to appropriate feature folders
- [ ] Feature-specific hooks co-located with components
- [ ] Shared components clearly separated in components/ folder
- [ ] All imports updated and working
- [ ] `npm run build` succeeds
- [ ] `npm run dev` starts without errors
- [ ] No functionality broken
- [ ] Folder structure grade: 9.5/10 (A+)

---

## 📊 Expected Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Top-level folders** | 25 | 5 features + 4 shared | Cleaner |
| **Components/file** | Mixed | Co-located | Better |
| **Feature isolation** | Poor | Excellent | +100% |
| **Discoverability** | Hard | Easy | +80% |
| **Folder grade** | 9.0/10 | 9.5/10 | +0.5 |

---

## 🚀 Let's Execute!

**Recommendation:** Do this feature-by-feature:
1. Create all feature folders
2. Move patients feature (largest, test the pattern)
3. Move clinical feature
4. Move admin feature
5. Move simulation feature
6. Move settings feature
7. Organize shared components
8. Update all imports
9. Test and validate
10. Commit and push

**Estimated Time:** 4-6 hours total

**Want to proceed?** I can:
- A) Execute automatically (faster, requires careful import tracking)
- B) Do it step-by-step with testing (safer, better visibility)
- C) Create a migration script (semi-automated, good for rollback)

**Which approach would you like?**
