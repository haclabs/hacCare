# Supabase SQL Migration Guide

## Overview
This guide will help you run the complete simulation migration in Supabase Dashboard step by step.

## Prerequisites
1. Access to your Supabase project dashboard
2. Navigate to: **Dashboard → SQL Editor**

## Migration Steps

### Step 1: Run Database Functions (Part 1)
**File:** `sql/01_create_functions_part1.sql`
**Purpose:** Creates the `create_simulation_subtenant` function

1. Copy the contents of `01_create_functions_part1.sql`
2. Paste into Supabase SQL Editor
3. Click **Run** button
4. ✅ Should see: "Success. No rows returned"

### Step 2: Run Database Functions (Part 2)
**File:** `sql/02_create_functions_part2.sql`
**Purpose:** Creates the `add_simulation_user` function

1. Copy the contents of `02_create_functions_part2.sql`
2. Paste into Supabase SQL Editor
3. Click **Run** button
4. ✅ Should see: "Success. No rows returned"

### Step 3: Run Database Functions (Part 3)
**File:** `sql/03_create_functions_part3.sql`
**Purpose:** Creates the `join_simulation_lobby` function

1. Copy the contents of `03_create_functions_part3.sql`
2. Paste into Supabase SQL Editor
3. Click **Run** button
4. ✅ Should see: "Success. No rows returned"

### Step 4: Run Database Functions (Part 4)
**File:** `sql/04_create_functions_part4.sql`
**Purpose:** Creates `start_simulation` and `cleanup_expired_simulations` functions

1. Copy the contents of `04_create_functions_part4.sql`
2. Paste into Supabase SQL Editor
3. Click **Run** button
4. ✅ Should see: "Success. No rows returned"

### Step 5: Apply RLS Policies
**File:** `sql/05_create_rls_policies.sql`
**Purpose:** Enables Row Level Security and creates security policies

1. Copy the contents of `05_create_rls_policies.sql`
2. Paste into Supabase SQL Editor
3. Click **Run** button
4. ✅ Should see: "Success. No rows returned"

### Step 6: Create Database Views
**File:** `sql/06_create_views.sql`
**Purpose:** Creates `simulation_overview` and `simulation_lobby_status` views

1. Copy the contents of `06_create_views.sql`
2. Paste into Supabase SQL Editor
3. Click **Run** button
4. ✅ Should see: "Success. No rows returned"

### Step 7: Verify Migration Success
**File:** `sql/07_verification.sql`
**Purpose:** Runs verification queries to confirm everything was created

1. Copy the contents of `07_verification.sql`
2. Paste into Supabase SQL Editor
3. Click **Run** button
4. ✅ Should see results showing:
   - 5 functions created
   - 2 views created
   - RLS enabled on tables
   - Success message

## Expected Results

After running all steps, you should have:

### ✅ Functions Created:
- `create_simulation_subtenant`
- `add_simulation_user`
- `join_simulation_lobby`
- `start_simulation`
- `cleanup_expired_simulations`

### ✅ Views Created:
- `simulation_overview`
- `simulation_lobby_status`

### ✅ Security:
- RLS enabled on all simulation tables
- Proper access policies implemented

## Troubleshooting

### Common Issues:

1. **"relation does not exist"** - Run the table creation scripts first
2. **"permission denied"** - Make sure you're using a service role key
3. **"function already exists"** - This is OK, it will replace the existing function

### Verify Tables Exist:
If you get relation errors, run this query first:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%simulation%';
```

### Check Function Creation:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name LIKE '%simulation%';
```

## Next Steps

Once migration is complete:
1. Test the `SimulationSubTenantService` in your application
2. Create a test simulation to verify functionality
3. Check that users can join simulation lobby
4. Verify instructors can start simulations

## Support

If you encounter issues:
1. Check the Supabase logs in Dashboard → Logs
2. Verify your database has all required tables
3. Ensure you have proper permissions (service role)

---
**Migration Date:** September 18, 2025
**Status:** Ready to Run