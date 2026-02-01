# hacCare AI Development Guide

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
- **Consolidate duplicates** - `src/featuresexplicit tenant filtering is the standard pattern
- **Look for abandoned patterns** - old simulation code, unused services, deprecated components
- **Document what you remove** - add entries to CHANGELOG.md for significant cleanup

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

**Database migrations**: Never run `supabase migration` command (PREFERRED LOCATION)
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
4. Update imports across the codebase patients/         # Patient management & clinical workflows
│   ├── components/   # UI components
│   ├── hooks/        # React Query hooks (usePatients, useMultiTenantPatients)
│   └── services/     # API calls (rare - most logic in hooks)
├── simulation/       # Simulation manager, templates, debrief reports
├── admin/     vs Production
**No special handling needed** - simulations use the same system as production, just in dedicated tenant environments. The only difference:
- Simulations may run on `simulation.` subdomain (auto-redirects to `/simulation-portal`)
- Same components, same workflows, same database structure
- See [src/App.tsx](../src/App.tsx) lines 69-81 for subdomain detection/features/simulation/components/SimulationManager'));
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
