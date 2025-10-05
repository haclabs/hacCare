# Subdomain Constraint Fix

## Problem

When trying to create a simulation template, you encountered this error:

```
null value in column "subdomain" of relation "tenants" violates not-null constraint
```

## Root Cause

The `tenants` table has a `NOT NULL` constraint on the `subdomain` column. The simulation functions `create_simulation_template()` and `launch_simulation()` were creating simulation tenants but weren't providing a subdomain value.

## Solution

Updated both functions to generate unique subdomains for simulation tenants:

### Template Subdomain Format
```
sim-tpl-{sanitized-name}-{random-8-chars}
```
Example: `sim-tpl-cardiac-emergency-a1b2c3d4`

### Active Simulation Subdomain Format
```
sim-act-{sanitized-name}-{random-8-chars}
```
Example: `sim-act-cardiac-emergency-e5f6g7h8`

## Changes Made

### 1. `create_simulation_template()` function
- Added `subdomain` to the INSERT statement
- Generates unique subdomain using template name + random UUID suffix
- Sanitizes name (removes special chars, converts to lowercase)
- Also added `status` and `settings` fields for completeness

### 2. `launch_simulation()` function  
- Added `subdomain` to the INSERT statement
- Generates unique subdomain using simulation name + random UUID suffix
- Sanitizes name (removes special chars, converts to lowercase)
- Also added `status` and `settings` fields for completeness

## Files Updated

1. ✅ `004_create_simulation_functions.sql` - Full file updated with fix
2. ✅ `fix_subdomain_constraint.sql` - Quick patch with just the 2 fixed functions

## How to Apply Fix

### Quick Fix (Recommended)
Run `fix_subdomain_constraint.sql` in Supabase SQL Editor. This will update just the 2 functions that needed fixing.

### Full Migration
If you haven't run `004_create_simulation_functions.sql` yet, just run the updated version. It now includes the subdomain fix.

## Testing

After applying the fix, test creating a simulation template:

1. Go to Simulations → Templates tab
2. Click "Create Template"
3. Fill in name and description
4. Submit

Expected result: Template created successfully with a unique subdomain generated automatically.

## Technical Details

### Subdomain Generation Logic
```sql
'sim-tpl-' || lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8)
```

This creates a subdomain by:
1. Adding prefix `sim-tpl-` or `sim-act-`
2. Converting name to lowercase
3. Replacing non-alphanumeric characters with hyphens
4. Appending first 8 characters of a random UUID for uniqueness

### Example Transformations
| Input Name | Generated Subdomain |
|-----------|---------------------|
| "Cardiac Emergency" | `sim-tpl-cardiac-emergency-a1b2c3d4` |
| "ICU Patient Care" | `sim-tpl-icu-patient-care-e5f6g7h8` |
| "Wound Care & Dressing" | `sim-tpl-wound-care-dressing-i9j0k1l2` |

## Related Files
- `/docs/development/simulation-v2/004_create_simulation_functions.sql`
- `/docs/development/simulation-v2/fix_subdomain_constraint.sql`
- `/docs/development/simulation-v2/README_MIGRATION_STATUS.md`
