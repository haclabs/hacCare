# Labs Foreign Key Fix

## Problem

The Labs feature was failing with these errors:

### Error 1: Missing Foreign Key Relationship
```
Could not find a relationship between 'lab_panels' and 'user_profiles' in the schema cache
```

### Error 2: Permission Denied During Migration
```
permission denied for materialized view user_tenant_cache
```

The first error occurred when trying to load lab panels because the query was attempting to join `lab_panels` with `user_profiles` to get the entered_by user's name:

```typescript
entered_by_name:user_profiles!lab_panels_entered_by_fkey(first_name, last_name)
```

The second error happened when trying to run the migration because the RLS policies were being evaluated and trying to access `user_tenant_cache`.

## Root Cause

The original `006_labs_schema.sql` created foreign keys pointing to `auth.users(id)`:

```sql
entered_by UUID REFERENCES auth.users(id)
```

However, Supabase needs the relationship to point to `user_profiles` table (not `auth.users`) to properly resolve the join in queries.

## Solution

Created migration `007_add_labs_user_profile_fkeys.sql` that:

1. **Temporarily disables RLS** to avoid permission errors during migration
2. **Drops old foreign keys** pointing to `auth.users`
3. **Adds new foreign keys** pointing to `user_profiles` 
4. **Creates indexes** for better join performance
5. **Re-enables RLS** to restore security policies

### Foreign Keys Updated:
- `lab_panels.entered_by` → `user_profiles.id`
- `lab_results.entered_by` → `user_profiles.id`
- `lab_results.ack_by` → `user_profiles.id`
- `lab_ack_events.ack_by` → `user_profiles.id`

### Indexes Added:
- `idx_lab_panels_entered_by`
- `idx_lab_results_entered_by`
- `idx_lab_results_ack_by`
- `idx_lab_ack_events_ack_by`

## How to Apply

Run this SQL in your Supabase SQL Editor:

```sql
-- Copy the contents of:
/workspaces/hacCare/docs/development/database/migrations/007_add_labs_user_profile_fkeys.sql
```

## Why user_profiles Instead of auth.users?

In your application architecture:
- `auth.users` - Managed by Supabase Auth (system table)
- `user_profiles` - Your custom table with extended user data (first_name, last_name, etc.)

When doing joins in Supabase queries, you need to reference your custom tables (user_profiles), not the auth system tables.

## After Applying

The Labs feature will be able to:
- ✅ Load lab panels with entered_by user names
- ✅ Load lab results with entered_by user names
- ✅ Show who acknowledged labs (ack_by names)
- ✅ Display proper attribution in all lab views

## Files Modified

- **Created:** `/workspaces/hacCare/docs/development/database/migrations/007_add_labs_user_profile_fkeys.sql`

## Testing

After running the migration:

1. Refresh your app
2. Navigate to a patient
3. Click the "Labs" action card
4. Should load without the 400 error
5. Lab panels should display who entered them

The error `PGRST200` should be resolved! ✅
