# Quick Fix Guide - Login Timeout

## Problem
Login takes forever and times out, showing "Profile fetch timeout" and "Tenant still loading"

## Solution - Run These 2 SQL Scripts

### 1️⃣ First: Add Performance Indexes
**File:** `docs/development/sql/add_performance_indexes.sql`

Open Supabase SQL Editor and run this file. It will:
- Add indexes to speed up profile and tenant lookups
- Refresh the materialized view cache
- Update database statistics

**Expected time:** ~30 seconds to run

---

### 2️⃣ Second: Optimize RPC Function (Optional)
**File:** `docs/development/sql/optimize_tenant_rpc.sql`

This provides two options for the tenant lookup function:
- **Option A**: Uses materialized view (faster) 
- **Option B**: Direct query (no materialized view dependency)

**Recommended:** Start with Option A since we've already granted access to the materialized view

---

## Code Changes Already Applied

✅ Increased timeouts from 8s to 15s  
✅ Added performance timing logs  
✅ Fixed table names (tenant_users not user_tenants)

## Test After Running SQL

1. Clear browser cache and localStorage
2. Login with your account
3. Check console for:
   - `⏱️ Profile fetch took XXXms` (should be <100ms)
   - `🏢 Tenant fetch took XXXms` (should be <200ms)
4. Should NOT see:
   - ❌ Profile fetch timeout
   - 🛡️ User exists but no profile found

## Expected Results

**Before:** Login timeout, need to refresh  
**After:** Instant login (<500ms total)

## Files Changed
- `src/contexts/auth/AuthContext.tsx` - Timeout + logging
- `src/contexts/TenantContext.tsx` - Timeout + logging
- `docs/development/sql/add_performance_indexes.sql` - NEW
- `docs/development/sql/optimize_tenant_rpc.sql` - NEW
- `docs/development/LOGIN_TIMEOUT_PERFORMANCE_FIX.md` - Full docs

## Need Help?
See `LOGIN_TIMEOUT_PERFORMANCE_FIX.md` for complete details.
