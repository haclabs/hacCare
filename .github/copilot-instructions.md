# hacCare AI Development Guide

**Current Version:** 1.0 (Milestone Release Candidate)  
**Status:** Production-ready multi-tenant healthcare simulation platform  
**Last Updated:** March 23, 2026

## System Overview
hacCare is a **multi-tenant healthcare simulation platform** for clinical education. React 19 + TypeScript + Supabase (PostgreSQL 15) with strict Row-Level Security (RLS) for HIPAA compliance.

### Architecture Highlights
- **Multi-tenant isolation**: Every table has `tenant_id UUID NOT NULL` with RLS policies enforcing tenant isolation
- **Hierarchical tenant structure**: Institutions → Programs (workspaces for instructors without patient data)
- **Simulation system**: Template-based scenarios with snapshot/restore, running in dedicated tenant environments (uses same codebase as production)
- **BCMA (Barcode Medication Administration)**: Five Rights verification with patient/medication barcode dual-scan workflow
- **Role hierarchy**: `super_admin` (cross-tenant access) → `coordinator` (tenant-wide) → `admin` → `instructor` (program-based) → `nurse` (simulation-only)
- **Program-based permissions**: Instructors are assigned to programs (NESA, PN, SIM Hub, BNAD) and only see templates/simulations tagged with their programs
- **Program tenants**: Empty workspaces where instructors land on login (no patients, just simulation/template management)

### 🧹 CRITICAL: Cleanup Priority
**Tech debt reduction is a TOP PRIORITY**. When working on features:
- **Remove unused code aggressively** - if it's not actively used, delete it
- **Consolidate duplicates** - `src/features/clinical/` → `src/features/patients/` migration is ~80% complete
- **Look for abandoned patterns** - old simulation code, unused services, deprecated components
- **Document what you remove** - add entries to CHANGELOG.md for significant cleanup

**✅ Recent Consolidation Progress:**
- ✅ Multi-tenant patient hooks centralized in `useMultiTenantPatients.ts`
- ✅ Program workspace system fully implemented
- ✅ Template editing workflow complete with banner/tenant switching
- ✅ Simulation portal card-based UI improvements
- 🔄 In Progress: Migrate remaining `clinical/` features to `patients/`

**📊 Code Health Metrics:**
- Component size limit: **350 lines** (extract to sub-components above this)
- Feature folder depth: **3 levels max** (features/domain/components/SubComponent.tsx)
- Database fixes: **Consolidate into migrations quarterly** (don't let fixes/ folder exceed 20 files)

## Critical Developer Patterns

### Multi-Tenant Database Access
**ALWAYS include `tenant_id` in queries** - RLS policies expect `app.current_tenant_id` but most components use explicit tenant filtering:

```typescript
// ✅ Correct - explicit tenant filtering
const { data } = await supabase
  .from('patient_medications')
  .select('*')
  .eq('tenant_id', currentTenant.id)
  .eq('patient_id', patientId);

// ❌ Wrong - missing tenant_id causes RLS policy violations
const { data } = await supabase
  .from('patient_medications')
  .select('*')
  .eq('patient_id', patientId);
```

See [src/features/patients/hooks/useMultiTenantPatients.ts](../src/features/patients/hooks/useMultiTenantPatients.ts) for the canonical pattern.

### State Management Architecture
- **React Query (TanStack)**: All server state via `useQuery`/`useMutation` with centralized keys in [src/lib/api/queryClient.ts](../src/lib/api/queryClient.ts)
- **Context providers**: `AuthContext` → `TenantContext` → `AlertContext` (hierarchical dependency order)
- **NO localStorage/sessionStorage for data** - only Supabase manages persistence

```typescript
// Standard query pattern
export function usePatientMedications(patientId: string) {
  const { currentTenant } = useTenant();
  return useQuery({
    queryKey: ['medications', patientId, currentTenant?.id],
    queryFn: () => fetchMedications(patientId, currentTenant!.id),
    enabled: !!currentTenant && !!patientId,
  });
}
```

### Database Functions (SECURITY DEFINER)
Use `SECURITY DEFINER` functions for cross-table operations that need to bypass RLS:
- `launch_simulation(p_template_id, p_user_id)` - creates tenant, copies template data
- `complete_simulation(p_simulation_id)` - marks complete, generates debrief
- `reset_simulation_for_next_session(p_simulation_id)` - preserves barcodes, resets clinical data

Located in [database/functions/](../database/functions/). Call via `supabase.rpc('function_name', params)`.

### Alert System Deduplication
Alerts use **smart deduplication** to prevent spam:
```typescript
// Medication alerts: dedupe by (patient_id, medication_id, alert_type)
// Vital signs alerts: dedupe by (patient_id, alert_type, message hash)
// Check src/services/operations/alertService.ts for the logic
```

## Development Commands

```bash
# Development
npm run dev                    # Vite dev server on http://localhost:5173
npm run build                  # Production build with Terser minification
npm run preview                # Preview production build

# Code Quality
npm run lint                   # ESLint (no auto-fix)
npm run lint:fix               # ESLint with --fix
npm run type-check             # TypeScript compilation check (no emit)

# Testing
npm run test                   # Vitest unit tests
npm run test:coverage          # Coverage report

# Database
npm run supabase:types         # Regenerate TypeScript types from Supabase schema
```

**Database migrations**: Place migration files in `database/migrations/` (PREFERRED LOCATION). Never run `supabase migration` commands directly.

### Feature Folder Structure
```
src/features/
├── patients/         # Patient management & clinical workflows
│   ├── components/   # UI components
│   ├── hooks/        # React Query hooks (usePatients, useMultiTenantPatients)
│   └── services/     # API calls (rare - most logic in hooks)
├── simulation/       # Simulation manager, templates, debrief reports
├── admin/            # User management, tenant settings, backup/restore
└── clinical/         # ⚠️ DEPRECATED - Migrate features to patients/ and remove
```

**🧹 Cleanup Note**: `clinical/` is being phased out. When working on BCMA, wound assessments, or labs:
1. Check if functionality already exists in `patients/`
2. Migrate or consolidate into `patients/` feature folder
3. Delete the old `clinical/` version
4. Update imports across the codebase

### Simulation vs Production
**No special handling needed** - simulations use the same system as production, just in dedicated tenant environments. The only difference:
- Simulations may run on `simulation.` subdomain (auto-redirects to `/simulation-portal`)
- Same components, same workflows, same database structure
- See [src/App.tsx](../src/App.tsx) lines 69-81 for subdomain detection

```typescript
// Lazy-loaded simulation route example
const SimulationManager = React.lazy(() => import('./features/simulation/components/SimulationManager'));
```

See [src/App.tsx](../src/App.tsx) lines 17-29 for all lazy-loaded routes.

## Key Gotchas

### Program Tenant System (Instructor Workspaces)
**Program tenants are isolated workspaces for instructors to manage simulations and templates WITHOUT patient data:**

**Architecture:**
- `tenant_type` enum includes: `'production'`, `'institution'`, `'hospital'`, `'clinic'`, `'simulation_template'`, `'simulation_active'`, `'program'`
- Program tenants have `parent_tenant_id` pointing to their institution (e.g., LethPoly)
- Programs table stores metadata (code, name, description) - tenants table stores actual tenant
- Automatic trigger creates program tenant when program is created: `trigger_create_program_tenant`

**Database Schema:**
```sql
-- tenants table
ALTER TABLE tenants ADD COLUMN program_id UUID REFERENCES programs(id);
ALTER TABLE tenants ADD COLUMN parent_tenant_id UUID REFERENCES tenants(id);

-- programs table
CREATE TABLE programs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  code TEXT UNIQUE,  -- e.g., 'NESA', 'PN', 'SIM Hub', 'BNAD'
  name TEXT,
  ...
);

-- Trigger auto-creates program tenant
CREATE TRIGGER trigger_create_program_tenant
  AFTER INSERT ON programs
  FOR EACH ROW
  EXECUTE FUNCTION create_program_tenant_trigger();
```

**Instructor Login Flow:**
1. Instructor logs in
2. `TenantContext.loadCurrentTenant()` runs
3. Checks if instructor has program tenants via `getUserProgramTenants(user_id)`
4. **Single program**: Auto-switches to that program tenant (stored in `localStorage.current_program_tenant`)
5. **Multiple programs**: Shows `ProgramSelectorModal` to choose
6. Tenant context switches to program tenant (appears in `currentTenant`)
7. `ProgramWorkspace` component renders (empty workspace - no patients)
8. `ProgramContextBanner` displays at top showing current program

**Key Functions:**
- `create_program_tenant(p_program_id, p_parent_tenant_id)` - RPC function (SECURITY DEFINER)
- `get_user_program_tenants(p_user_id)` - Returns array of program tenants user has access to
- Result format: `[{tenant_id, tenant_name, program_id, program_code, program_name, subdomain}]`

**RLS Policies:**
```sql
-- Instructors can see program tenants they're assigned to
CREATE POLICY tenants_instructors_see_program_tenants
  ON tenants FOR SELECT TO authenticated
  USING (
    tenant_type = 'program' AND
    program_id IN (
      SELECT program_id FROM user_programs WHERE user_id = auth.uid()
    )
  );
```

**UI Components:**
- [src/components/Program/ProgramWorkspace.tsx](../src/components/Program/ProgramWorkspace.tsx) - Main program workspace UI
- [src/components/Program/ProgramSelectorModal.tsx](../src/components/Program/ProgramSelectorModal.tsx) - Modal for multi-program instructors
- [src/components/Program/ProgramContextBanner.tsx](../src/components/Program/ProgramContextBanner.tsx) - Shows current program context
- [src/components/Layout/TenantSwitcher.tsx](../src/components/Layout/TenantSwitcher.tsx) - Hierarchical display with parent institutions and nested programs

**TenantSwitcher Hierarchy Display:**
```tsx
// Shows tree structure:
// 🏢 Organizations
//   LethPoly (parent institution - bold blue)
//     └─ 📚 BNAD (program - indented purple)
//     └─ 📚 NESA
//     └─ 📚 Practical Nursing
//     └─ 📚 Simulation Hub
// 🎮 Active Simulations (green)
// 📝 Simulation Templates (amber)
```

**Critical Files:**
- [database/migrations/20260127000000_implement_program_tenants.sql](../database/migrations/20260127000000_implement_program_tenants.sql) - Full migration
- [src/contexts/TenantContext.tsx](../src/contexts/TenantContext.tsx) - Program tenant switching logic
- [src/services/admin/programService.ts](../src/services/admin/programService.ts) - `getUserProgramTenants()`, `createProgramTenant()`
- [src/hooks/useUserProgramAccess.ts](../src/hooks/useUserProgramAccess.ts) - Program filtering logic

**Common Issues:**
- ❌ Program tenant showing patients → Program tenants should be empty, check tenant_type
- ❌ Instructor can't see program → Check `user_programs` junction table assignment
- ❌ RLS policy infinite recursion → Use simple policies, avoid recursive lookups on tenants table
- ❌ CHECK constraint violation → Ensure tenant_type enum includes 'program' value
- ✅ Always test with fresh browser (localStorage persists program tenant selection)

### ⚠️ CRITICAL: Patient/Medication UUID Mapping Across Tenants
**UUIDs and barcodes DO NOT persist across template → simulation boundaries:**

**The Problem:**
- Template has patient with UUID `abc-123` and barcode `P91543`
- Simulation launch creates NEW patient with UUID `def-456` and barcode `P58763`
- Same patient, different UUIDs, different barcodes
- **NEVER match by UUID or barcode** when syncing template → simulation

**Correct Pattern (Match by Demographics):**
```typescript
// ❌ WRONG - Barcode matching fails
const simPatient = await supabase
  .from('patients')
  .select('id')
  .eq('tenant_id', simulationTenantId)
  .eq('patient_id', templatePatientBarcode)  // P91543 ≠ P58763 = NO MATCH!
  .single();

// ✅ CORRECT - Demographics matching works
const simPatient = await supabase
  .from('patients')
  .select('id')
  .eq('tenant_id', simulationTenantId)
  .eq('first_name', templatePatient.first_name)
  .eq('last_name', templatePatient.last_name)
  .eq('date_of_birth', templatePatient.date_of_birth)
  .single();
```

**Why This Matters:**
- Simulation launch creates fresh UUIDs for ALL entities (patients, medications, orders, etc.)
- Patient barcodes are randomly generated on creation (P + 5 random digits)
- Template snapshot contains OLD UUIDs that don't exist in simulation tenant
- Syncing template updates requires mapping by immutable properties (name, DOB)

**Real Bug Example (Feb 5, 2026):**
- `reset_simulation_with_template_updates()` was matching patients by barcode
- Template patient barcode: `P91543`
- Simulation patient barcode: `P58763`
- Result: `patient_id` lookup returned NULL, skipped all medications
- FIX: Changed to demographics matching (lines 142-157 of function)

**Immutable Properties for Matching:**
- **Patients**: `first_name`, `last_name`, `date_of_birth`
- **Medications**: `name`, `dosage`, `route` (+ patient match)
- **Orders**: `order_text`, `category` (+ patient match)
- **Labs**: `test_name`, `panel_name` (+ patient match)

**Critical Files:**
- [database/functions/reset_simulation_with_template_updates.sql](../database/functions/reset_simulation_with_template_updates.sql) - Medication sync example
- [database/functions/compare_simulation_template_patients.sql](../database/functions/compare_simulation_template_patients.sql) - Patient comparison pattern

### Optional/Nullable Vital Signs (March 2026)
**Vital signs fields are now OPTIONAL to support clinical reality where not all measurements can be obtained:**

**Clinical Use Cases:**
- Newborns without blood pressure readings (equipment limitations, clinical protocols)
- Emergency situations where only critical vitals are captured
- Equipment failures or patient refusal
- Partial assessments during rapid response scenarios

**Implementation (3-Layer Fix):**
```typescript
// ❌ OLD - All vitals required as nested object
const newVitals: VitalSigns = {
  temperature: data.vitalSigns.temperature,     // Required
  bloodPressure: {                              // Required
    systolic: data.vitalSigns.bloodPressure.systolic,
    diastolic: data.vitalSigns.bloodPressure.diastolic
  },
  heartRate: data.vitalSigns.heartRate,         // Required
  // ... all fields required
};

// ✅ NEW - Optional vitals with conditional creation
const newVitals: VitalSigns = {
  temperature: data.vitalSigns.temperature,
  bloodPressure: data.vitalSigns.bloodPressure ? {
    systolic: data.vitalSigns.bloodPressure.systolic,
    diastolic: data.vitalSigns.bloodPressure.diastolic
  } : undefined,  // Only create if data present
  heartRate: data.vitalSigns.heartRate,
  // ... all fields can be undefined
};
```

**Database Layer (Migration 20260323000000):**
```sql
-- All vital columns now nullable
ALTER TABLE patient_vitals 
  ALTER COLUMN temperature DROP NOT NULL,
  ALTER COLUMN heart_rate DROP NOT NULL,
  ALTER COLUMN blood_pressure_systolic DROP NOT NULL,
  ALTER COLUMN blood_pressure_diastolic DROP NOT NULL,
  ALTER COLUMN respiratory_rate DROP NOT NULL,
  ALTER COLUMN oxygen_saturation DROP NOT NULL;

-- Validation: At least ONE vital must be present
ADD CONSTRAINT patient_vitals_at_least_one_vital CHECK (
  temperature IS NOT NULL OR heart_rate IS NOT NULL OR ...
);

-- Validation: Blood pressure must be recorded as pair
ADD CONSTRAINT patient_vitals_bp_pair CHECK (
  (blood_pressure_systolic IS NULL AND blood_pressure_diastolic IS NULL) OR
  (blood_pressure_systolic IS NOT NULL AND blood_pressure_diastolic IS NOT NULL)
);
```

**Service Layer (Dynamic Field Building):**
```typescript
// patientService.ts & multiTenantPatientService.ts
// Only insert fields that have values - prevents explicit NULL insertion
const vitalData: Record<string, any> = { patient_id, tenant_id };

if (vitals.temperature !== undefined) vitalData.temperature = vitals.temperature;
if (vitals.heartRate !== undefined) vitalData.heart_rate = vitals.heartRate;
// ... build object dynamically

// Validation before insert
if (Object.keys(vitalData).length <= 2) {
  throw new Error('At least one vital sign must be provided');
}
```

**Schema Layer (Form Validation):**
- `vitalsSchemas.ts`: `vitalSigns` field marked `required: false`, `allowPartial: true`
- `formsSchemas.ts`: Same changes for admission assessment
- UI displays notice: "Enter available vitals only - not all measurements are required"

**Input Validation Updates:**
- Respiratory rate range expanded: **5-80** (was 8-40) to accommodate newborn critical highs (70 bpm)
- Age-based ranges still enforced, but fields are optional
- Blood pressure pairing enforced at all layers (both values or neither)

**Affected Components:**
- [src/components/forms/fields/VitalSignsField.tsx](../src/components/forms/fields/VitalSignsField.tsx) - Input limits + conditional BP object creation
- [src/features/clinical/components/vitals/VitalsModule.tsx](../src/features/clinical/components/vitals/VitalsModule.tsx) - Conditional BP object creation
- [src/services/patient/patientService.ts](../src/services/patient/patientService.ts) - Dynamic field building (~30 lines)
- [src/services/patient/multiTenantPatientService.ts](../src/services/patient/multiTenantPatientService.ts) - Identical logic for simulations

**System-Wide Compatibility:**
- ✅ Production patients
- ✅ Simulation templates (template tenant editing)
- ✅ Active simulations (multi-tenant service)
- ✅ Student debrief reports (reads from patient_vitals table)

**Common Issues:**
- ❌ "Cannot read properties of undefined (reading 'systolic')" → Check for `bloodPressure` existence before accessing `.systolic`
- ❌ Database CHECK constraint violation → Ensure at least one vital field has a value before insert
- ❌ Blood pressure validation error → Both systolic and diastolic must be provided together or both omitted
- ✅ Always use conditional object creation: `bloodPressure: data.bloodPressure ? {...} : undefined`
- ✅ Service layer validates and rejects empty vital submissions (at least one required)

**Migration Status:**
- Database migration created: `database/migrations/20260323000000_make_patient_vitals_nullable.sql`
- TypeScript types need regeneration after migration runs: `npm run supabase:types`
- Test with newborn patient (0-28 days) entering only respiratory rate (e.g., 70)

### Empty Array Handling in restore_snapshot_to_tenant (March 2026)
**Empty arrays in JSONB snapshots cause INSERT failures due to column/value count mismatch:**

**The Problem (March 23, 2026):**
When a patient has `"allergies": []` in the snapshot, the restore function would skip adding a value to the VALUES array, but still add the column name to the columns array. Result:
```
ERROR: INSERT has more target columns than expressions
```

**Root Cause:**
```sql
-- OLD CODE (BUGGY)
IF jsonb_typeof(v_col.value) = 'array' THEN
  SELECT string_agg(quote_literal(elem), ',')
  INTO v_array_elements
  FROM jsonb_array_elements_text(v_col.value) elem;
  
  -- If array is empty, v_array_elements is NULL
  -- Code then checks v_array_elements and skips appending to v_values
  -- But column was already added to v_columns! = MISMATCH
END IF;
```

**Fix Applied (Migration 20260323000005):**
```sql
-- NEW CODE (FIXED)
IF jsonb_typeof(v_col.value) = 'array' THEN
  SELECT string_agg(quote_literal(elem), ',')
  INTO v_array_elements
  FROM jsonb_array_elements_text(v_col.value) elem;
  
  IF v_array_elements IS NULL OR v_array_elements = '' THEN
    -- Empty array - ALWAYS add value
    IF v_column_type = 'ARRAY' AND v_udt_name LIKE '\_%' THEN
      v_values := array_append(v_values, 'ARRAY[]::' || substring(v_udt_name from 2) || '[]');
    ELSE
      v_values := array_append(v_values, 'ARRAY[]::text[]');
    END IF;
  ELSE
    -- Non-empty array - add elements with proper cast
    v_values := array_append(v_values, 'ARRAY[' || v_array_elements || ']');
  END IF;
END IF;
```

**Where Applied:**
1. **Patient table restoration** (lines 140-157 in migration) - handles empty allergies/arrays in patient records
2. **All other tables restoration** (lines 300-340 in migration) - handles empty arrays in devices, wounds, etc.

**Testing:**
- Create simulation template with patient having `allergies: []`
- Launch simulation from template
- Function should successfully restore patient with empty array as `ARRAY[]::text[]`
- No "INSERT has more target columns than expressions" error

**Related Fixes (Same Session):**
- `20260323000001_add_stat_category_to_medications.sql` - Added STAT medication category
- `20260323000002_fix_medication_category_default.sql` - Fixed category default handling
- `20260323000003_fix_restore_snapshot_category_handling.sql` - Improved category field restoration
- `20260323000004_revert_restore_snapshot_fix.sql` - Revert migration for safety

**Critical Files:**
- [database/migrations/20260323000005_fix_empty_array_handling.sql](../database/migrations/20260323000005_fix_empty_array_handling.sql) - Main fix
- [database/functions/restore_snapshot_to_tenant.sql](../database/functions/restore_snapshot_to_tenant.sql) - Function being fixed

**Common Issues:**
- ❌ "INSERT has more target columns than expressions" → Check for empty arrays in JSONB being skipped
- ❌ Array type mismatch error → Use proper type casting (`ARRAY[]::text[]` vs `ARRAY[]::device_type[]`)
- ✅ Always check `v_array_elements IS NULL OR v_array_elements = ''` for empty arrays
- ✅ Match array type to database column type (use `information_schema.columns.udt_name`)

**Security Updates (March 23, 2026):**
Fixed 2 critical/high npm vulnerabilities:
- **jspdf** (CRITICAL): HTML Injection (GHSA-wfv2-pwc8-crg5, CVSS 9.6) + PDF Object Injection (GHSA-7x6v-j9x4-qf24, CVSS 8.1)
- **flatted** (HIGH): DoS vulnerability (GHSA-25h7-pfq9-p65f, CVSS 7.5) + Prototype Pollution (GHSA-rf6f-7fwh-wjgh)
- Fixed via: `npm audit fix` (package-lock.json updated)

### Template Editing Workflow (Critical Understanding)
**Templates ARE real tenant environments with live data**, not just frozen snapshots:

**Architecture:**
- Each template has its own `tenant_id` and exists as a full tenant in the database
- Templates contain live patient data, medications, orders, labs, wounds, etc.
- The `snapshot_data` JSONB column is a frozen copy used for launching simulations
- Editing a template means temporarily switching to that template's tenant

**Template Editing Flow:**
1. User clicks "Edit" on template card
2. `handleEditTemplate()` stores template info in `sessionStorage.editing_template`
3. Dispatches `CustomEvent('template-edit-start')` with template details
4. Dispatches `CustomEvent('change-tab', {tab: 'patients'})` to navigate
5. `TemplateEditingBanner` listens for event, calls `enterTemplateTenant()`
6. `enterTemplateTenant()` switches `currentTenant` + upserts user into `tenant_users` with admin role
7. Purple banner displays showing template editing mode
8. User edits patients, medications, orders, etc. (all standard components work)
9. User clicks "Save & Exit Editing" to capture snapshot and return to home tenant
10. `exitTemplateTenant()` calls `save_template_snapshot()` RPC and switches back

**Critical Files:**
- [src/features/simulation/components/SimulationTemplates.tsx](../src/features/simulation/components/SimulationTemplates.tsx) - Edit button + event dispatching
- [src/features/simulation/components/TemplateEditingBanner.tsx](../src/features/simulation/components/TemplateEditingBanner.tsx) - Purple banner + tenant switching orchestration
- [src/contexts/TenantContext.tsx](../src/contexts/TenantContext.tsx) - `enterTemplateTenant()` / `exitTemplateTenant()` functions
- [src/App.tsx](../src/App.tsx) - `change-tab` event listener for navigation

**RLS Access Requirement:**
Instructors must be added to `tenant_users` table for the template's tenant to bypass RLS. The `enterTemplateTenant()` function handles this via upsert:
```sql
INSERT INTO tenant_users (tenant_id, user_id, role)
VALUES (template_tenant_id, current_user_id, 'admin')
ON CONFLICT (tenant_id, user_id) DO UPDATE SET role = 'admin';
```

**Common Issues:**
- ❌ Medications not showing → Missing `tenant_id` filter in query (RLS blocks)
- ❌ "Not authorized" errors → User not in template's `tenant_users` table
- ❌ Wrong data showing → Didn't actually switch tenant, still on home tenant
- ❌ Tab not switching → `change-tab` event listener missing in App.tsx
- ✅ Always include `tenant_id` in ALL queries when in template editing mode

### Program-Based Permissions System
**Instructors see only simulations/templates tagged with their assigned programs:**

**Database Schema:**
```sql
-- programs table (per tenant)
CREATE TABLE programs (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  code VARCHAR(10) UNIQUE,  -- e.g., 'NESA', 'PN', 'SIM Hub', 'BNAD'
  name TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true
);

-- user_programs junction table
CREATE TABLE user_programs (
  user_id UUID REFERENCES auth.users,
  program_id UUID REFERENCES programs,
  assigned_at TIMESTAMP DEFAULT NOW(),
  assigned_by UUID,
  PRIMARY KEY (user_id, program_id)
);

-- Templates and simulations have primary_categories array
ALTER TABLE simulation_templates ADD COLUMN primary_categories TEXT[];
ALTER TABLE simulations ADD COLUMN primary_categories TEXT[];
```

**Role Permissions:**
- `super_admin` → See everything across all tenants
- `coordinator` → See all simulations/templates within their primary tenant (no super admin powers)
- `admin` → See all simulations/templates within their tenant
- `instructor` → See only simulations/templates tagged with their assigned program(s)
- `nurse` → Simulation participants only

**Filtering Logic:**
Located in [src/hooks/useUserProgramAccess.ts](../src/hooks/useUserProgramAccess.ts):
```typescript
export function useUserProgramAccess() {
  const { profile } = useAuth();
  
  const isInstructor = profile?.role === 'instructor';
  const canSeeAllPrograms = ['super_admin', 'admin', 'coordinator'].includes(profile?.role || '');
  
  const filterByPrograms = useCallback((items: Array<{primary_categories?: string[]}>) => {
    if (canSeeAllPrograms) return items; // Admins see everything
    if (!isInstructor) return items;
    
    const userPrograms = await getUserProgramCodes(profile.id);
    return items.filter(item => 
      item.primary_categories?.some(cat => userPrograms.includes(cat))
    );
  }, [profile, canSeeAllPrograms, isInstructor]);
  
  return { filterByPrograms, canSeeAllPrograms, isInstructor };
}
```

**Usage in Components:**
```typescript
// In SimulationTemplates.tsx, ActiveSimulations.tsx, etc.
const { filterByPrograms } = useUserProgramAccess();
const filteredTemplates = filterByPrograms(templates);
```

**Program Management UI:**
- Located in [src/features/admin/components/management/ProgramManagement.tsx](../src/features/admin/components/management/ProgramManagement.tsx)
- Only accessible to `super_admin` and `coordinator` roles
- Allows creating/editing programs and assigning users to programs

**Critical Files:**
- [database/migrations/20260126000000_add_programs_and_roles.sql](../database/migrations/20260126000000_add_programs_and_roles.sql) - Initial schema
- [src/services/admin/programService.ts](../src/services/admin/programService.ts) - CRUD operations
- [src/features/admin/components/users/UserForm.tsx](../src/features/admin/components/users/UserForm.tsx) - Program assignment checkboxes
- [database/functions/update_user_profile_admin.sql](../database/functions/update_user_profile_admin.sql) - SECURITY DEFINER function for role updates

**Important Notes:**
- User role changes require logout/login to take effect (Auth context refresh)
- Program filtering applies to Active, Templates, and History tabs
- Programs are tenant-specific (LethPoly has NESA/PN/SIM Hub/BNAD)
- `get_user_program_codes(user_id)` RPC function returns array of program codes for filtering

### Simulation Tenant Detection
Simulations run on `simulation.` subdomain in production. Check for simulation context:
```typescript
const hostname = window.location.hostname;
const isSimulationSubdomain = hostname.startsWith('simulation.');
// Auto-redirect to /simulation-portal if on simulation subdomain
```
See [src/App.tsx](../src/App.tsx) lines 69-81.

### RLS Infinite Recursion
**Problem**: RLS policies that query the same table cause infinite recursion.
**Solution**: Use `SECURITY DEFINER` functions or explicit `security_invoker = false` on policies.
Example: [database/migrations/20251117022000_emergency_fix_device_assessments_rls.sql](../database/migrations/20251117022000_emergency_fix_device_assessments_rls.sql)

### Patient Creation Race Conditions
Patient creation across tenants can cause duplicate barcodes. Always use:
```typescript
// Generate barcode on server-side or with tenant prefix
const barcode = `P${Math.floor(10000 + Math.random() * 90000)}`;
// Then check for uniqueness within tenant
```

### Barcode Label Reusability
Patient/medication barcodes persist across simulation resets for semester-long label reuse:
- Patient barcodes: `P12345` (5 digits)
- Medication barcodes: `MZ30512` (prefix + 5 digits)
- Preserved via `reset_simulation_for_next_session()` function

See [docs/features/simulation/REUSABLE_SIMULATION_LABELS_GUIDE.md](../docs/features/simulation/REUSABLE_SIMULATION_LABELS_GUIDE.md).

## File Conventions

- **TSX for React components**, TS for utilities/types/services
- **Barrel exports**: Use `index.ts` for public API of feature folders
- **Type imports**: Use `import type { Foo }` for type-only imports to help tree-shaking
- **Supabase types**: Auto-generated in `src/types/supabase.ts` - never edit manually

## Documentation Locations

- **Architecture**: [docs/architecture/](../docs/architecture/) (security RLS policies, audit analysis)
- **Features**: [docs/features/](../docs/features/) (bcma/, simulation/, patients/, labs/)
- **Operations**: [docs/operations/](../docs/operations/) (deployment, troubleshooting, bundle optimization)
- **Development**: [docs/development/](../docs/development/) (database/, sql/, scripts/)

## When Adding New Features
### Development Priorities (in order)
1. **🧹 Cleanup first**: If you see unused code while working, remove it
2. **🔍 Check for duplicates**: Before implementing, search for existing solutions
3. **🔐 Tenant isolation**: Most bugs come from missing `tenant_id` in queries
4. **⚛️ React Query pattern**: Prefer hooks over direct Supabase calls
5. **📚 Documentation**: Consult `docs/features/` and `docs/architecture/`

### Code Removal Checklist
Before deleting code, verify it's truly unused:
```bash
# Search for imports/usage across codebase
grep -r "ComponentName" src/
grep -r "functionName" src/

# Check for route references
grep -r "/old-route" src/

# Look for commented-out references
grep -r "TODO.*old" src/
```

### When You Find Duplicate Code
1. Identify which version is actively used (check git history, imports)
2. Consolidate into `src/features/patients/` if clinical-related
3. Update all imports to point to the consolidated version
4. Delete the duplicate file/folder
5. Add cleanup note to CHANGELOG.md
5. **Lazy load if heavy**: Use `React.lazy()` for routes with large dependencies (PDF, barcode libs)
6. **Test tenant isolation**: Verify queries include `tenant_id` filter

## AI-Specific Guidance

- **Always check tenant context**: Most bugs come from missing `tenant_id` in queries
- **Prefer React Query over direct Supabase calls**: Centralized cache invalidation and error handling
- **Look for existing patterns**: Search `src/features/` for similar features before creating new approaches
- **Security first**: Every new table requires RLS policies and tenant isolation
- **Consult docs/**: Most design decisions documented in `docs/features/` or `docs/architecture/`

## UI/UX Consistency Guidelines

### Component Design Patterns
**Card-Based Layouts** - Preferred for feature discovery and actions:
```tsx
// ✅ Good - Card with icon, title, description
<button className="bg-white rounded-lg shadow-md hover:shadow-lg p-6 text-left group border-2">
  <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-600">
    <Icon className="h-6 w-6" />
  </div>
  <h3 className="text-lg font-semibold">Action Title</h3>
  <p className="text-sm text-gray-600">Clear description of what this does</p>
</button>

// ❌ Avoid - Unclear buttons without context
<button className="bg-blue-600">Do Thing</button>
```

**Header Elements** - Use white/light backgrounds for visibility:
```tsx
// ✅ TenantSwitcher pattern - white box on dark header
<button className="bg-white text-gray-900 rounded-md border shadow-sm">

// ❌ Dark text on dark background
<button className="text-gray-600 hover:text-gray-900">
```

**Color Semantics** - Consistent color meanings:
- **Blue** (primary): Main actions, navigation, info
- **Green**: Success, active simulations, safe actions
- **Amber/Orange**: Templates, warnings, editing mode
- **Purple**: Program-related, instructor features
- **Red**: Dangerous actions, alerts, errors
- **Indigo**: System admin communications

### Announcement Categories
System supports 7 announcement types for program workspaces:
1. **General** (gray) - Routine updates
2. **Templates** (blue) - Simulation template news
3. **Training** (purple) - Educational content
4. **Students** (green) - Student-related announcements
5. **Important** (red) - Critical notifications
6. **Reminder** (amber) - Upcoming events
7. **System Admin** (indigo) - Official system-wide messages

See template at [docs/templates/program_workspace_announcement.md](../docs/templates/program_workspace_announcement.md)

## Component Size & Extraction Rules

### When to Extract Components

**Automatic extraction triggers:**
1. **> 350 lines** - Component too large, split into logical sub-components
2. **> 3 useState calls** - Consider using reducer or extracting form logic
3. **Repeated JSX patterns** - Extract to reusable component
4. **Complex conditional rendering** - Extract to separate components

**Example extraction:**
```tsx
// Before (450 lines in SimulationPortal.tsx)
<div>
  {/* 100 lines of instructor quick actions */}
  {/* 200 lines of simulation list */}
  {/* 150 lines of no-simulations message */}
</div>

// After - Extract to sub-components
<InstructorQuickActions />
<SimulationList assignments={assignments} />
<NoSimulationsMessage />
```

### Feature Folder Structure Rules
```
src/features/
├── patients/         # Patient management & clinical workflows
│   ├── components/   # UI components (max 3 levels deep)
│   ├── hooks/        # React Query hooks
│   └── services/     # API calls (rare - logic in hooks preferred)
├── simulation/       # Simulation manager, templates
├── admin/            # User/tenant management
└── program/          # Program workspace features (NEW)
```

**🚫 DEPRECATED:** `clinical/` folder - migrate remaining to `patients/`

## Database Management Rules

### Migration vs Fix Files

**Use migrations for:**
- Schema changes (new tables, columns, constraints)
- New RLS policies
- New database functions
- Enum additions (requires separate commit)

**Use database/fixes/ for:**
- One-time data corrections
- Emergency hot-fixes in production
- Temporary debugging scripts
- **BUT**: Review and consolidate quarterly

**📏 Fix folder limit:** Keep under 20 files. When exceeded:
1. Create a consolidation migration
2. Archive old fixes to `database/fixes/archive/`
3. Document learnings in migration comments

### RLS Policy Patterns

**Standard tenant isolation:**
```sql
-- ✅ Simple, performant policy
CREATE POLICY table_tenant_isolation ON table_name
  FOR ALL TO authenticated
  USING (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid)
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid);

-- ❌ Avoid recursive queries (infinite recursion risk)
CREATE POLICY complex_policy ON table_name
  USING (tenant_id IN (
    SELECT tenant_id FROM same_table WHERE ...  -- ⚠️ Recursion!
  ));
```

**Super admin bypass:**
```sql
-- Allow super_admins to see all data
CREATE POLICY admin_see_all ON table_name
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR tenant_id = current_setting('app.current_tenant_id', TRUE)::uuid
  );
```

## Version Milestones

### v1.0 Milestone Criteria (Current Target)
- ✅ Multi-tenant architecture stable
- ✅ Program workspace system operational
- ✅ Template editing workflow complete
- ✅ BCMA medication administration functional
- ✅ Simulation launch/management working
- ✅ Role-based permissions enforced
- 🔄 Documentation coverage > 80% (in progress)
- 🔄 `clinical/` → `patients/` migration complete

### Post-1.0 Refactor Candidates
**Don't refactor now - flag for v2.0:**
- `App.tsx` (813 lines) - Extract routing logic
- Large portal components - Split into feature modules
- Consolidate database fixes into clean migrations
- Type safety improvements (reduce `any` usage)

**When to refactor:** When it causes pain, not because it "should" be done.

## Testing Guidelines

### Critical Test Coverage Areas
1. **Tenant isolation** - Verify RLS policies block cross-tenant access
2. **Role permissions** - Ensure instructors see only assigned programs
3. **Barcode scanning** - Patient/medication matching logic
4. **Simulation lifecycle** - Launch, run, complete, reset flows

### Manual Testing Checklist (Pre-Release)
```bash
□ Fresh browser test (clear localStorage)
□ Instructor with single program - auto-login works
□ Instructor with multiple programs - selector shows
□ Template editing - tenant switch + save works
□ Barcode scan - correct patient/med navigation
□ Simulation launch - tenant creation + data copy
□ Program filtering - instructors see only their programs
```

## Emergency Procedures

### Production Hotfix Protocol
1. Create branch: `hotfix/description`
2. Apply minimal fix (avoid refactoring)
3. Add fix script to `database/fixes/` with date prefix
4. Test in staging with production data snapshot
5. Deploy with rollback plan
6. Schedule consolidation in next sprint

### RLS Policy Deadlock
If users report "permission denied" or queries hang:
```sql
-- Check for recursive policies
SELECT schemaname, tablename, policyname, qual, with_check
FROM pg_policies 
WHERE tablename = 'problem_table';

-- Temporarily disable if needed (EMERGENCY ONLY)
ALTER TABLE problem_table DISABLE ROW LEVEL SECURITY;
-- Fix policy, then re-enable
ALTER TABLE problem_table ENABLE ROW LEVEL SECURITY;
```

## Performance Optimization

### Query Optimization Patterns
```typescript
// ✅ Good - Specific fields, indexed columns
const { data } = await supabase
  .from('patients')
  .select('id, first_name, last_name, patient_id')
  .eq('tenant_id', tenantId)
  .eq('is_active', true)
  .order('last_name');

// ❌ Avoid - SELECT *, unindexed filters
const { data } = await supabase
  .from('patients')
  .select('*')
  .ilike('notes', '%search%');  // Full table scan!
```

### React Query Stale Times
- **Patient data**: 5 minutes (rarely changes mid-session)
- **Medication lists**: 5 minutes (static during simulation)
- **Active simulations**: 30 seconds (changes frequently)
- **User profile**: 10 minutes (only changes on logout)

## Success Metrics

### What "Good" Looks Like
- ✅ No RLS policy violations in logs
- ✅ Page load < 2 seconds (first visit)
- ✅ Component render < 100ms (React DevTools)
- ✅ Database queries < 50ms p95 (Supabase dashboard)
- ✅ Bundle size < 1MB (production build)
- ✅ Zero PropTypes errors (TypeScript strict mode)

### Code Review Checklist
```
□ All queries include tenant_id filter
□ New components < 350 lines
□ No direct Supabase calls (use React Query)
□ TypeScript strict mode passes
□ No console.log in production code
□ RLS policies defined for new tables
□ CHANGELOG.md updated for user-facing changes
```
