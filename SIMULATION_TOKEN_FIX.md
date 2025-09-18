# 🔧 Fix Missing Columns - Simulation Token Issue Resolved

## Issue Identified
The `active_simulations` table was missing the `sim_access_key` column (renamed from `simulation_token` to avoid Supabase conflicts), along with potentially missing `simulation_status` and `lobby_message` columns.

## ✅ Solution Applied

### 1. **Fixed Service Code**
- Updated `simulationSubTenantService.ts` to use `sim_access_key` instead of `simulation_token`
- Service now uses the correct column name that exists in the database

### 2. **Created Missing Columns Migration**
- **File:** `sql/09_add_missing_columns.sql`
- Adds any missing columns to `active_simulations` table
- Ensures all required columns exist with proper defaults

## 🚀 Next Steps

### Run the Missing Columns Migration:
1. Go to **Supabase Dashboard → SQL Editor**
2. Copy and run the contents of `sql/09_add_missing_columns.sql`
3. This will add any missing columns and verify the table structure

### Expected Columns in active_simulations:
- ✅ `scenario_template_id` - References scenario templates
- ✅ `instructor_id` - User who created the simulation  
- ✅ `sim_access_key` - Unique simulation identifier (renamed from simulation_token)
- ✅ `simulation_status` - Current status (lobby, running, paused, completed)
- ✅ `lobby_message` - Message shown to users in lobby
- ✅ `tenant_id` - Links to parent tenant
- ✅ `session_name` - Human-readable simulation name

## 🎯 Test the Fix

After running the column migration, try creating a simulation again. The error should be resolved and you should be able to:

1. Create simulation environments
2. Add users to simulations  
3. Use the lobby system
4. Start simulations as instructor

## 📝 What Was Changed

### Service Code Changes:
```typescript
// OLD (causing error):
simulation_token: `sim_${Date.now()}...`

// NEW (working):
sim_access_key: `sim_${Date.now()}...`
```

### Database Schema:
- Ensured `sim_access_key` column exists
- Added `simulation_status` and `lobby_message` if missing
- Proper defaults and constraints applied

---

**Run `sql/09_add_missing_columns.sql` now and the simulation creation should work perfectly!**