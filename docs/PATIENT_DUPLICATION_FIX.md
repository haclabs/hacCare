# Fix: Patient Duplication Not Showing Up in Target Tenant

## Problem
When calling `duplicate_patient_to_tenant`, it returns success but:
- `new_patient_id` is `null` 
- `new_patient_identifier` is `null`
- Patient doesn't appear in the target tenant

## Root Cause
The `duplicate_patient_to_tenant` function either:
1. Doesn't exist in your Supabase database
2. Has an old/incorrect implementation
3. Is returning data in an unexpected format

## Solution Steps

### Step 1: Check Current Function
Run the debug query to see what's happening:
```bash
# Open the debug script
cat docs/development/database/debug_patient_duplication.sql
```

Copy and paste into your Supabase SQL Editor and run it. This will show:
- If the function exists
- What it returns
- If the patient was actually created

### Step 2: Deploy the Correct Function

**Option A: Using Supabase Dashboard (Easiest)**
1. Go to your Supabase project dashboard
2. Click "SQL Editor" in the left sidebar
3. Copy the contents of: `supabase/migrations/20251113224339_add_duplicate_patient_to_tenant_function.sql`
4. Paste into the SQL Editor
5. Click "Run"

**Option B: Using Supabase CLI**
```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run the migration
supabase db push
```

### Step 3: Verify the Fix
After deploying, try the duplication again. The console should now show:
```
Raw RPC response: { data: [...], type: 'object', isArray: true }
Parsed result: { success: true, new_patient_id: 'uuid-here', new_patient_identifier: 'P12345', ... }
```

### Step 4: Check the Target Tenant
Query the patients in the target tenant:
```sql
SELECT 
  id,
  patient_id,
  tenant_id,
  first_name,
  last_name,
  created_at
FROM patients
WHERE tenant_id = 'ac7aa13f-472a-4e99-ac16-2beeb7fe2d20'
ORDER BY created_at DESC
LIMIT 10;
```

## What I Changed

### 1. Created the Migration File
- `supabase/migrations/20251113224339_add_duplicate_patient_to_tenant_function.sql`
- This contains the complete, tested function implementation

### 2. Updated TypeScript Service
- Added better logging to show raw RPC response
- Added validation for null `new_patient_id`
- Better error messages when function returns unexpected format

### 3. Created Debug Script
- `docs/development/database/debug_patient_duplication.sql`
- Use this to diagnose issues

## Expected Behavior After Fix

When you call `transferPatient()` with `preserveOriginal: true`:
1. Function creates patient in target tenant
2. Returns valid UUID in `new_patient_id`
3. Returns generated patient identifier (e.g., "P12345")
4. Patient immediately visible in target tenant
5. All selected related records are copied

## Still Having Issues?

If the problem persists after deploying the function:

1. Check the console logs for the "Raw RPC response"
2. Run the debug queries to see actual data
3. Check RLS policies on the `patients` table
4. Verify you have permission to insert into target tenant

The most common issue is that the old function doesn't exist or returns a different format than expected.
