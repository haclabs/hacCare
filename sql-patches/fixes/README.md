# Fix SQL Scripts

Scripts for bug fixes, patches, and database maintenance.

## Files

### Foreign Key Fixes
- **`fix-foreign-key-constraint.sql`** - Fixes foreign key constraint issues
- **`quick-fix-function.sql`** - Quick function fixes

### RLS and Recursion Fixes  
- **`fix-rls-recursion.sql`** - Fixes Row Level Security recursion issues
- **`fix-recursion-final.sql`** - Final recursion fixes
- **`fix-tenant-users-rls-recursion.sql`** - Tenant users RLS recursion fixes

### User Management Fixes
- **`fix-user-deletion-and-roles.sql`** - User deletion and role fixes
- **`fix-user-deletion-and-roles-updated.sql`** - Updated user deletion fixes
- **`fix-user-lookup-functions.sql`** - User lookup function fixes
- **`fix-userform-tenant-query.sql`** - User form tenant query fixes

### Tenant and Constraint Fixes
- **`fix-tenant-constraint.sql`** - Tenant constraint fixes
- **`fix-missing-function.sql`** - Fixes for missing functions

### Maintenance Scripts
- **`cleanup-tenant-users-policies.sql`** - Cleans up tenant user policies
- **`migrate-patients-to-tenant.sql`** - Migrates patient data to tenant structure
- **`add-super-admin-tenant-delete-policy.sql`** - Adds super admin delete policy
- **`clear-patient-data.sql`** - Clears patient data (use with caution!)

## Usage Guidelines

1. **Read the script first** - Understand what changes will be made
2. **Backup your database** - Always create a backup before applying fixes
3. **Test on development** - Apply to dev environment first
4. **Check dependencies** - Some fixes may depend on others
5. **Monitor after application** - Verify the fix resolved the issue

⚠️ **Destructive Operations**: Scripts like `clear-patient-data.sql` will delete data permanently!
