# 🔧 Super Admin Multi-Tenant Quick Reference

## Quick Setup Commands

### 1. Apply Database Policies
```sql
-- Bulletproof version (recommended):
\i sql/super_admin_rls_core.sql

-- Alternative versions:
\i sql/super_admin_rls_minimal.sql
\i sql/super_admin_rls_simple.sql
```

### 2. Create Super Admin User
```sql
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "super_admin"}'::jsonb
WHERE email = 'admin@yourcompany.com';
```

### 3. Test Super Admin Access
```sql
-- Verify super admin detection
SELECT auth.is_super_admin();

-- Check tenant access
SELECT auth.get_user_tenant_ids();
```

## Key Files Modified

### Services
- `src/lib/superAdminTenantService.ts` - Core tenant management
- `src/lib/routerIntegratedTenantService.ts` - Navigation integration
- `src/contexts/TenantContext.tsx` - Enhanced context with super admin support

### Components  
- `src/components/Layout/EnhancedTenantSwitcher.tsx` - Visual tenant switcher
- `src/components/bcma/BCMAAdministration.tsx` - Enhanced with MED validation

### Database
- `src/sql/super_admin_rls_policies.sql` - RLS bypass policies

## Usage

### For Super Admins
1. **Login** with super admin account
2. **Switch Tenants** using dropdown in header
3. **Access Data** across all tenants without restrictions
4. **Navigate Seamlessly** - routes preserved during switches

### For Developers
```typescript
// Initialize router integration in components
const { switchTenantWithRouting } = useRouterIntegratedTenantService();

// Switch tenant with navigation
await switchTenantWithRouting('tenant-123');

// Check current access
const access = superAdminTenantService.getCurrentAccess();
console.log('Current tenant:', access.tenantId);
```

## Security Features

✅ **RLS Bypass** - Super admins can access any tenant's data  
✅ **Audit Logging** - All tenant switches logged  
✅ **Role Isolation** - Regular users still restricted by RLS  
✅ **Secure Context** - Database-level security functions  

## Troubleshooting

**Issue**: Super admin can't switch tenants  
**Fix**: Check user role in `auth.users.raw_user_meta_data`

**Issue**: Navigation breaks  
**Fix**: Verify `useRouterIntegratedTenantService` is initialized  

**Issue**: "permission denied for schema auth"  
**Fix**: Use `sql/super_admin_rls_minimal.sql` (most compatible)

**Issue**: "Could not find the function...in the schema cache" (404 RPC error)  
**Fix**: The SQL files now include the required RPC functions - re-run the setup

**Issue**: "relation does not exist" (table not found)  
**Fix**: Use `sql/super_admin_rls_core.sql` which only applies policies to existing tables

**Issue**: "function is not unique" or function conflicts  
**Fix**: Use `sql/super_admin_rls_minimal.sql` which avoids function name conflicts

**Issue**: RLS still blocks access  
**Fix**: Restart Supabase functions after policy deployment

**Testing**: Run `sql/test_super_admin_setup.sql` to verify everything works