# Super Admin Program Tenant Access - Bug Fixes

## Issue Summary
When super admins switched to program tenants, they encountered:
1. ✅ **FIXED**: Couldn't access simulation management features
2. ✅ **FIXED**: Didn't see program workspace menus
3. ✅ **FIXED**: Got "No program context found" error on Students/Templates pages
4. ✅ **FIXED**: Infinite loading spinner on Students/Templates pages

## Root Causes

### Issue 1: Simulation Access
**Problem**: `isInstructor` check in SimulationPortal excluded super_admin/coordinator roles  
**Fix**: Updated check to include all management roles

### Issue 2: Program Menu Visibility  
**Problem**: Sidebar checked `programTenants` array instead of `tenant_type`  
**Fix**: Changed to check `currentTenant.tenant_type === 'program'`

### Issue 3 & 4: Program Data Loading
**Problem**: Components queried `getPrograms(currentTenant.id)` which searches by `tenant_id`  
**Root Cause**: 
- When `currentTenant` is a program tenant (e.g., "NESA Program"), its `id` is the program tenant's ID
- The `programs` table stores `tenant_id` as the PARENT organization (e.g., LethPoly)
- Program tenants have `program_id` field that directly references the program record
- Query returned empty array → infinite loading spinner

**Solution**: Query program directly using `currentTenant.program_id` instead of filtering by tenant_id

## Files Modified

### 1. SimulationPortal.tsx
```typescript
// Before:
const isInstructor = profile?.role === 'admin' || profile?.role === 'instructor';

// After:
const isInstructor = profile?.role === 'admin' || 
                     profile?.role === 'instructor' || 
                     profile?.role === 'coordinator' || 
                     profile?.role === 'super_admin';
```

### 2. Sidebar.tsx
```typescript
// Before:
const programItems = programTenants.length > 0 ? [...] : [];

// After:
const programItems = (currentTenant?.tenant_type === 'program') ? [...] : [];
```

### 3. ProgramStudents.tsx
```typescript
// Before:
const { data: programs } = useQuery({
  queryKey: ['programs', currentTenant?.id],
  queryFn: async () => {
    if (!currentTenant?.id) return [];
    const { data } = await getPrograms(currentTenant.id); // Returns empty!
    return data || [];
  }
});

// After:
const { data: currentProgram } = useQuery({
  queryKey: ['program', currentTenant?.program_id],
  queryFn: async () => {
    if (!currentTenant?.program_id) return null;
    const { data, error } = await supabase
      .from('programs')
      .select('*')
      .eq('id', currentTenant.program_id) // Direct lookup!
      .single();
    
    if (error) {
      console.error('Error fetching program:', error);
      return null;
    }
    return data;
  },
  enabled: !!currentTenant?.program_id
});
```

### 4. ProgramTemplates.tsx
Same fix as ProgramStudents.tsx

### 5. ProgramWorkspace.tsx
Same fix pattern - query by `currentTenant.program_id`

### 6. CalendarEventModal.tsx
Same fix pattern - query by `currentTenant.program_id`

### 7. CreateTemplateModal.tsx
Special case - handles both program tenants and parent tenants:
```typescript
// If in a program tenant, get just that program
if (currentTenant.program_id) {
  const result = await supabase
    .from('programs')
    .select('*')
    .eq('id', currentTenant.program_id)
    .single();
  data = result.data ? [result.data] : null;
} else {
  // Otherwise, get all programs for the parent tenant
  const result = await getPrograms(currentTenant.id);
  data = result.data;
}
```

## Database Architecture

### Tenant → Program → Program Tenant Relationships

```
┌─────────────────┐
│ Parent Tenant   │ (e.g., LethPoly)
│ id: abc-123     │
│ type: institution
└────────┬────────┘
         │
         │ tenant_id
         ▼
┌─────────────────┐
│ Programs Table  │ (e.g., NESA, PN, SIM Hub)
│ id: def-456     │
│ tenant_id: abc-123 ← points to parent
│ code: "NESA"    │
└────────┬────────┘
         │
         │ program_id
         ▼
┌─────────────────┐
│ Program Tenant  │ (e.g., "NESA Program")
│ id: ghi-789     │
│ type: program   │
│ program_id: def-456 ← points to program
│ parent_tenant_id: abc-123 ← points to parent
└─────────────────┘
```

### The Problem

When querying `getPrograms(currentTenant.id)`:
- If `currentTenant` = Program Tenant (id: `ghi-789`)
- Query searches `programs WHERE tenant_id = 'ghi-789'`
- But programs table has `tenant_id = 'abc-123'` (parent)
- Result: **Empty array** ❌

### The Solution

Query by `currentTenant.program_id`:
- If `currentTenant` = Program Tenant
- Use `currentTenant.program_id` = `def-456`
- Query `programs WHERE id = 'def-456'`
- Result: **Direct match** ✅

## Testing Checklist

To verify the fixes work:

1. ✅ **Login as super admin**
2. ✅ **Switch to a program tenant** (e.g., NESA Program)
3. ✅ **Check Sidebar** - Should see:
   - Simulations button (visible)
   - Program Home menu item
   - Students menu item  
   - Templates menu item
4. ✅ **Click Simulations** - Should see Launch/Manage buttons
5. ✅ **Click Students** - Should load roster without infinite spinner
6. ✅ **Click Templates** - Should load templates without infinite spinner
7. ✅ **Click Program Home** - Should show stats and calendar

## Impact

- **Super admins** can now fully manage program tenants
- **Coordinators** also benefit from same fixes
- **Instructors** already worked (they use programTenants array)
- No breaking changes to existing functionality

## Future Considerations

The fix highlighted an architectural pattern:
- `programTenants` array is populated only for instructors at login
- Super admins switching tenants don't populate this array
- All components should query database directly, not rely on context arrays
- Consider deprecating `programTenants` array in favor of direct queries

## Related Files

- Database migration: `database/migrations/20260127000000_implement_program_tenants.sql`
- Tenant Context: `src/contexts/TenantContext.tsx`
- Program Service: `src/services/admin/programService.ts`
- Documentation: `.github/copilot-instructions.md` (Program Tenant System section)

---

**Status**: ✅ All issues resolved  
**Date**: 2025-01-28  
**Tested**: Ready for user testing
