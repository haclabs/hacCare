# RLS Setup Guide for tenant_users

## Problem
The `tenant_users` table needs Row Level Security (RLS) policies to ensure proper tenant isolation when assigning users to tenants.

## Solution
We've created comprehensive RLS policies and helper functions for the `tenant_users` table.

## Steps to Apply

### 1. Check Current RLS Status
Run this in your Supabase SQL Editor:
```sql
-- File: check-tenant-users-rls.sql
```

### 2. Apply RLS Policies
Run this in your Supabase SQL Editor:
```sql
-- File: setup-tenant-users-rls.sql
```

## What This Enables

### For Super Admins:
- ✅ Can see all tenant_users records across all tenants
- ✅ Can assign any user to any tenant
- ✅ Can remove users from any tenant
- ✅ Can create users and assign them to specific tenants

### For Tenant Admins:
- ✅ Can see tenant_users only from their own tenant
- ✅ Can assign users to their own tenant only
- ✅ Can remove users from their own tenant
- ✅ Cannot access other tenants' user assignments

### For Regular Users:
- ✅ Can see tenant_users from their own tenant only
- ❌ Cannot modify tenant_users records

## New Functions Available

### `assign_user_to_tenant(user_id, tenant_id, role, permissions)`
- Assigns a user to a tenant with specified role
- Only callable by super admins
- Handles conflicts (user already in tenant)

### `remove_user_from_tenant(user_id, tenant_id)`
- Removes user from tenant (sets is_active = false)
- Super admins can remove from any tenant
- Tenant admins can remove from their own tenant only

### `get_user_tenant_ids(user_id)`
- Returns all active tenant IDs for a user
- Used internally by RLS policies

### `is_tenant_admin(tenant_id, user_id)`
- Checks if user is admin of specific tenant
- Used for permission checks

## UserForm Enhancements

The UserForm component now includes:
- ✅ Tenant selection dropdown for super admins
- ✅ Automatic tenant assignment on user creation
- ✅ Display of user's current tenant when editing
- ✅ Proper error handling for tenant operations

## Usage in Application

### Creating Users with Tenant Assignment:
1. Super admin creates user
2. Selects tenant from dropdown
3. User is automatically assigned to selected tenant
4. Non-super admins create users in their current tenant

### Editing Users:
1. Super admin can change user's tenant assignment
2. Current tenant is displayed for reference
3. Tenant assignment is updated via RLS-protected function

## Security Features

- **Database-level security**: RLS policies enforce tenant isolation
- **Function-level security**: Helper functions check permissions
- **Application-level security**: UI only shows appropriate options
- **Audit trail**: All changes tracked with timestamps

## Verification

After applying the scripts, verify with:
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'tenant_users';

-- Check policies exist
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'tenant_users';

-- Test assignment (replace UUIDs with real values)
SELECT assign_user_to_tenant('user-uuid', 'tenant-uuid', 'nurse', '{}');
```

## Files Created/Modified

1. `check-tenant-users-rls.sql` - Status checking script
2. `setup-tenant-users-rls.sql` - Complete RLS setup
3. `src/components/Users/UserForm.tsx` - Enhanced with tenant assignment
4. This README file

Run the SQL scripts in order, then test the UserForm component to see the new tenant assignment functionality!
