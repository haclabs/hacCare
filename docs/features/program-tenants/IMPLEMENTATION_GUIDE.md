# Program Tenants Implementation Guide

## Overview

This implementation adds **program tenant workspaces** for instructors in hacCare. Each program (NESA, PN, SIM Hub, BNAD) now has its own dedicated tenant where instructors can manage program-specific content, announcements, templates, and simulation history.

## What Was Implemented

### 1. Database Layer
- **Migration**: `database/migrations/20260127000000_implement_program_tenants.sql`
  - Added `'program'` to `tenant_type` enum
  - Added `program_id` column to `tenants` table
  - Created `create_program_tenant()` function
  - Created trigger to auto-create program tenants on program creation
  - Created `get_user_program_tenants()` helper function
  - Added RLS policies for program tenant access
  - Added `default_tenant_id` to `user_profiles` for instructor preferences
  - Migrated existing programs to have program tenants

### 2. Services Layer
- **Updated**: `src/services/admin/programService.ts`
  - Added `createProgramTenant()` function
  - Added `getUserProgramTenants()` function
  - Updated `bulkAssignUserToPrograms()` to grant `tenant_users` access to program tenants
  - Added TypeScript interfaces for program tenant data

### 3. Context Layer
- **Updated**: `src/contexts/TenantContext.tsx`
  - Added `programTenants` state
  - Added `loadProgramTenants()` function
  - Updated `loadCurrentTenant()` to:
    - Auto-login instructors with single program to their program tenant
    - Show ProgramSelectorModal for instructors with multiple programs
    - Save program tenant preference to `localStorage.current_program_tenant`

### 4. UI Components

#### ProgramSelectorModal (`src/components/Program/ProgramSelectorModal.tsx`)
- Shown to instructors with multiple program assignments on login
- Allows selecting which program workspace to enter
- Saves preference to localStorage

#### ProgramWorkspace (`src/components/Program/ProgramWorkspace.tsx`)
- Main workspace UI for program tenants
- Tabs for: Announcements, Templates, History
- Program-specific dashboard with stats
- No patient data (program-focused content only)

#### ProgramContextBanner (`src/components/Program/ProgramContextBanner.tsx`)
- Shows at top of app when in program tenant
- Displays current program name and code
- Dropdown to switch between programs (if instructor has multiple)

### 5. Integration
- **Updated**: `src/App.tsx`
  - Added lazy-loaded program components
  - Added `ProgramContextBanner` to layout
  - Added `ProgramSelectorModal` before AlertPanel
  - Added routing for program workspace (renders when `currentTenant.tenant_type === 'program'`)

- **Updated**: `src/components/Layout/Sidebar.tsx`
  - Added program badge showing current program when in program tenant
  - Imports `useTenant` hook to access program context

## How It Works

### Instructor Login Flow

#### Single Program Instructor
1. Instructor logs in with email/password
2. `TenantContext.loadProgramTenants()` fetches their program tenants
3. Detects only 1 program tenant assigned
4. Auto-switches to program tenant via `setCurrentTenant()`
5. Saves to `localStorage.current_program_tenant`
6. Instructor lands in **ProgramWorkspace**

#### Multi-Program Instructor
1. Instructor logs in
2. `TenantContext` detects 2+ program tenants
3. Sets `currentTenant = null` (no auto-selection)
4. **ProgramSelectorModal** appears showing all assigned programs
5. Instructor selects program
6. Preference saved to localStorage
7. Page reloads → TenantContext restores selected program tenant
8. Instructor lands in **ProgramWorkspace**

### Program Tenant Switching
- Instructors with multiple programs can switch via:
  - **ProgramContextBanner** dropdown (top of screen)
  - Saves new preference to localStorage
  - Page reload triggers context switch

### Program Tenant Persistence
- Selected program tenant saved to `localStorage.current_program_tenant`
- Survives page refresh (like simulation tenants)
- Restored automatically on login

## Database Schema Changes

### Tenants Table
```sql
ALTER TABLE tenants 
ADD COLUMN program_id UUID REFERENCES programs(id) ON DELETE CASCADE;

CREATE INDEX idx_tenants_program_id ON tenants(program_id);
```

### User Profiles Table
```sql
ALTER TABLE user_profiles
ADD COLUMN default_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
```

### New tenant_type Value
```sql
-- tenant_type enum now includes:
'production' | 'institution' | 'hospital' | 'clinic' | 
'simulation_template' | 'simulation_active' | 'program'
```

## Running the Migration

### Option 1: Supabase Dashboard (Recommended)
1. Open your Supabase project dashboard
2. Go to SQL Editor
3. Copy contents of `database/migrations/20260127000000_implement_program_tenants.sql`
4. Paste and run
5. Verify output shows:
   - ✅ Added program to tenant_type enum
   - ✅ Created program tenant: NESA Program
   - ✅ Created program tenant: PN Program
   - ✅ Created program tenant: SIM Hub Program
   - ✅ Created program tenant: BNAD Program

### Option 2: Command Line
```bash
# Using psql
psql $DATABASE_URL -f database/migrations/20260127000000_implement_program_tenants.sql

# Or using Supabase CLI
supabase db push
```

### Verification Queries
```sql
-- Check program tenants created
SELECT 
  p.code as program_code,
  p.name as program_name,
  t.name as tenant_name,
  t.subdomain,
  t.status,
  (SELECT COUNT(*) FROM tenant_users tu WHERE tu.tenant_id = t.id) as user_count
FROM programs p
LEFT JOIN tenants t ON t.program_id = p.id
WHERE p.is_active = true
ORDER BY p.code;

-- Check instructors granted access
SELECT 
  up.email,
  up.first_name,
  up.last_name,
  p.code as program_code,
  t.name as tenant_name,
  tu.role
FROM user_programs upr
JOIN user_profiles up ON up.id = upr.user_id
JOIN programs p ON p.id = upr.program_id
JOIN tenants t ON t.program_id = p.id
LEFT JOIN tenant_users tu ON tu.user_id = up.id AND tu.tenant_id = t.id
WHERE up.role = 'instructor'
ORDER BY up.last_name, p.code;
```

## Testing the Implementation

### Test Case 1: Single Program Instructor
1. Assign instructor to only NESA program
2. Logout and login as that instructor
3. Should auto-land in NESA program workspace
4. Verify ProgramContextBanner shows "NESA Program"
5. Verify Sidebar shows NESA badge
6. Verify localStorage has `current_program_tenant` set

### Test Case 2: Multi-Program Instructor
1. Assign instructor to NESA + PN programs
2. Logout and login
3. Should see ProgramSelectorModal with both programs
4. Select NESA
5. Should land in NESA workspace
6. Click "Switch Program" in banner
7. Select PN
8. Should reload and switch to PN workspace

### Test Case 3: Program Tenant Persistence
1. Login as multi-program instructor
2. Select NESA program
3. Refresh page
4. Should remain in NESA workspace (no modal shown)

### Test Case 4: Template/Simulation Flow
1. Login to program workspace
2. Navigate to Templates tab (placeholder UI)
3. Verify no patient data visible
4. Verify templates can be filtered by program

## Architecture Notes

### No Architectural Changes
- Uses existing multi-tenant infrastructure
- Follows same patterns as template tenants and simulation tenants
- Reuses `tenant_users` table for access control
- No breaking changes to existing functionality

### Tenant Hierarchy
```
LethPoly (parent_tenant_id = NULL)
  ├── NESA Program Tenant (parent_tenant_id = LethPoly.id, program_id = NESA.id)
  ├── PN Program Tenant (parent_tenant_id = LethPoly.id, program_id = PN.id)
  ├── SIM Hub Program Tenant (parent_tenant_id = LethPoly.id, program_id = SIM_Hub.id)
  └── BNAD Program Tenant (parent_tenant_id = LethPoly.id, program_id = BNAD.id)
```

### Data Isolation
- Program tenants have NO patient data (by design)
- Simulation templates WILL live in program tenants (future enhancement)
- Active simulations still use `simulation_active` tenant type
- Instructor can switch between program tenant and main org tenant as needed

## Future Enhancements

### Phase 2 (Recommended)
1. **Announcements System**
   - Create `program_announcements` table
   - CRUD UI in ProgramWorkspace
   - Role: instructors can post, students can view

2. **Template Migration**
   - Move existing templates from LethPoly to program tenants
   - Filter by `primary_categories` field
   - Update `create_template` flow to use program tenant

3. **Program-Specific Files**
   - Add file storage for program resources
   - Syllabus, handouts, reference materials
   - Visible only to program members

4. **Program Dashboard Analytics**
   - Student performance metrics per program
   - Simulation completion rates
   - Template usage stats

### Phase 3 (Optional)
1. **Cross-Program Collaboration**
   - Shared templates between programs (with permissions)
   - Instructor collaboration features

2. **Program Admin Role**
   - Program coordinators with elevated permissions
   - Can manage program-specific settings

## Rollback Plan

If you need to rollback this implementation:

```sql
-- 1. Remove program tenants (keeps data, just removes tenant type)
UPDATE tenants SET tenant_type = 'institution' WHERE tenant_type = 'program';

-- 2. Remove program tenant access
DELETE FROM tenant_users 
WHERE tenant_id IN (SELECT id FROM tenants WHERE program_id IS NOT NULL);

-- 3. Remove program_id column (optional - breaking change)
-- ALTER TABLE tenants DROP COLUMN program_id;

-- 4. Remove default_tenant_id (optional)
-- ALTER TABLE user_profiles DROP COLUMN default_tenant_id;
```

## Troubleshooting

### Instructor Not Seeing Program Workspace
**Check:**
1. User has `role = 'instructor'` in `user_profiles`
2. User assigned to program in `user_programs` table
3. Program tenant exists (check `tenants` where `program_id IS NOT NULL`)
4. User has access in `tenant_users` table

```sql
-- Debug query
SELECT 
  up.email,
  up.role,
  p.code as assigned_program,
  t.name as program_tenant_name,
  tu.role as tenant_role,
  tu.is_active
FROM user_profiles up
LEFT JOIN user_programs upr ON upr.user_id = up.id
LEFT JOIN programs p ON p.id = upr.program_id
LEFT JOIN tenants t ON t.program_id = p.id
LEFT JOIN tenant_users tu ON tu.user_id = up.id AND tu.tenant_id = t.id
WHERE up.email = 'instructor@example.com';
```

### ProgramSelectorModal Not Appearing
**Check:**
1. `TenantContext.programTenants.length > 1`
2. `currentTenant === null` (not already loaded)
3. Browser console for errors

### Program Switching Not Working
**Check:**
1. localStorage has `current_program_tenant` key
2. Page actually reloaded (not just state change)
3. New tenant ID exists in database

## Summary

This implementation provides instructors with dedicated program workspaces while maintaining full compatibility with the existing multi-tenant architecture. It follows proven patterns from template tenants and simulation tenants, requires no breaking changes, and provides a clear path for future enhancements.

**Key Benefits:**
- ✅ Instructors land in their program workspace on login
- ✅ No patient data clutter in program view
- ✅ Program-specific content management
- ✅ Multi-program support with easy switching
- ✅ Persistent preference across sessions
- ✅ Uses existing infrastructure (no architectural changes)
