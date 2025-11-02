# hacMap RLS Fix - Updated Policies

## Issue
Original RLS policies used JWT claims for tenant_id, which don't exist in standard Supabase auth. This caused 403 errors when creating avatar locations.

## Solution
Updated RLS policies to match the pattern used by other features (vitals, medications, etc.):
- Use `tenant_users` table to verify tenant membership
- Support super_admin role for cross-tenant access
- Added `auto_set_tenant_id` triggers so frontend doesn't need to pass tenant_id

## What Changed
1. **RLS Policies**: Changed from JWT claims to tenant_users lookup
2. **Triggers**: Added auto_set_tenant_id triggers to all 3 tables
3. **Pattern**: Now matches patient_vitals, medications, etc.

## Deployment
Run the updated `hacmap_tables.sql` migration file. It will:
- Drop old policies
- Create new unified policies
- Add auto_set_tenant_id triggers

**Important**: Make sure `auto_set_tenant_id()` function exists (it's in schema.sql)

## Testing
After deployment, users should be able to:
1. Click body diagram to create markers
2. No more 403/RLS violations
3. tenant_id automatically set from user's profile
