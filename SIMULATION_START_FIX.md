# 🔧 Simulation Start Issue - Root Cause & Fix

## 🐛 Problem
Instructors in program tenants could not start pending simulations. When clicking the "Play" button, nothing happened and no console errors appeared.

## 🔍 Root Cause Analysis

### What We Found
1. ✅ **Simulation WAS successfully created** - The simulation exists with:
   - `status: "pending"`
   - `primary_categories: ["NESA"]` ✅ Categories correctly set
   - `tenant_id`, `template_id`, etc. all properly configured

2. ❌ **Starting the simulation FAILED silently** - The code tries to UPDATE the simulation:
   ```typescript
   // From ActiveSimulations.tsx line 104-110
   const { error } = await supabase
     .from('simulation_active')
     .update({
       status: 'running',
       starts_at: now.toISOString(),
       ends_at: endsAt.toISOString()
     })
     .eq('id', id);
   ```

3. 🔒 **RLS policies blocked the UPDATE** - The migration we created fixed:
   - ✅ SELECT policies (viewing simulations)
   - ✅ INSERT policies (creating simulations)
   - ❌ **UPDATE policies were MISSING** (starting/pausing/stopping)
   - ❌ **DELETE policies were MISSING** (removing simulations)

### Why No Console Errors?
The Supabase client was silently failing the UPDATE due to RLS restrictions. The `error` object was populated but the code didn't log or alert it properly.

## ✅ Solution Implemented

Updated migration `20260201000002_fix_simulation_rls_for_programs.sql` to add:

### 1. UPDATE Policies (Critical for Start/Stop)
```sql
-- simulation_templates UPDATE policy
CREATE POLICY templates_update_instructor_programs
  ON simulation_templates
  FOR UPDATE
  USING (
    -- Super admins/coordinators: see all
    -- Admins: tenant-scoped
    -- Instructors: program-filtered by primary_categories
  );

-- simulation_active UPDATE policy
CREATE POLICY active_update_policy
  ON simulation_active
  FOR UPDATE
  USING (
    -- Creator can update their own
    -- Super admins/coordinators: update all
    -- Admins: tenant-scoped updates
    -- Instructors: program-filtered updates
  );
```

### 2. DELETE Policies (For Removing Simulations)
```sql
-- simulation_templates DELETE policy
CREATE POLICY templates_delete_instructor_programs
  ON simulation_templates
  FOR DELETE
  USING (
    -- Same logic as UPDATE - program-filtered for instructors
  );

-- simulation_active DELETE policy
CREATE POLICY active_delete_policy
  ON simulation_active
  FOR DELETE
  USING (
    -- Same logic as UPDATE - program-filtered for instructors
  );
```

## 📝 What Each Operation Does

| Operation | Action | Example | Policy Needed |
|-----------|--------|---------|---------------|
| **SELECT** | View simulations list | Load Active/Templates tab | ✅ Fixed in v1 |
| **INSERT** | Create new simulation | Launch from template | ✅ Fixed in v1 |
| **UPDATE** | Start/Stop/Pause sim | Click "Play" button | ✅ **Fixed in v2** |
| **DELETE** | Remove simulation | Click "Delete" button | ✅ **Fixed in v2** |

## 🚀 Migration Order

Run these migrations in Supabase SQL Editor in this exact order:

```bash
1. 20260201000001_add_program_announcements.sql
   → Creates program_announcements table

2. 20260201000002_fix_simulation_rls_for_programs.sql (UPDATED)
   → Fixes RLS policies for SELECT/INSERT/UPDATE/DELETE
   → Now includes UPDATE and DELETE policies!

3. 20260201000003_tag_existing_simulations_with_programs.sql
   → Adds primary_categories columns if missing
   → Tags existing templates/simulations with program codes
```

## ✅ Expected Result After Migration

1. **Instructors can now:**
   - ✅ View simulations for their assigned programs
   - ✅ Create new simulations
   - ✅ **Start pending simulations** (changes status to 'running')
   - ✅ **Pause/Resume simulations**
   - ✅ **Stop simulations**
   - ✅ **Delete simulations** (for their programs)

2. **Program Filtering Works:**
   - Instructor assigned to "NESA" sees only NESA simulations
   - Instructor assigned to "PN" sees only PN simulations
   - Instructors with multiple programs see all their programs
   - Super admins and coordinators see everything

## 🧪 Testing Steps

After applying migrations:

1. **Login as instructor** in program tenant (e.g., NESA)
2. **Navigate to Active Simulations tab**
3. **Find a pending simulation** (status badge should show "Pending")
4. **Click the Play button** (should show spinner)
5. **Verify simulation starts:**
   - Status changes to "Running"
   - Timer appears showing remaining time
   - No RLS policy errors in console

## 🔍 Debug Query

If issues persist, run this to see what user can access:

```sql
-- Replace with actual user UUID
SELECT * FROM get_user_accessible_simulations('user-uuid-here');
```

This shows:
- What templates the user can see
- What simulations the user can access
- The reason for access (program match, admin, creator, etc.)
- Which categories apply

## 📚 Related Files

- **Migration:** `/workspaces/hacCare/database/migrations/20260201000002_fix_simulation_rls_for_programs.sql`
- **UI Component:** `/workspaces/hacCare/src/features/simulation/components/ActiveSimulations.tsx` (line 104-110)
- **Service:** `/workspaces/hacCare/src/services/simulation/simulationService.ts`
- **Program Service:** `/workspaces/hacCare/src/services/admin/programService.ts`

## 🎯 Key Takeaways

1. **RLS policies need all four operations:** SELECT, INSERT, UPDATE, DELETE
2. **Silent failures are hard to debug** - always check error objects
3. **Program-based filtering must be consistent** across all CRUD operations
4. **Test all operations** when implementing RLS - not just reads!

---

**Status:** ✅ Fixed - Ready to apply migrations and test
