# Login Timeout Performance Fix

**Date**: October 14, 2025  
**Issue**: Login hanging with profile fetch timeout and tenant loading delays  
**Status**: In Progress

## Problem Summary

Users experience login hangs with the following symptoms:
1. **Profile fetch timeout** after 8 seconds (now increased to 15 seconds)
2. **Tenant loading never completes** - stuck in "Tenant still loading" state
3. **User sees create profile screen** despite profile existing
4. **Refresh works instantly** - indicates profile exists but initial load times out

### Console Log Pattern
```
🔐 Attempting sign in...
Auth state changed: SIGNED_IN
📥 Starting profile fetch...
⏳ Tenant still loading, skipping alert refresh
❌ Profile fetch error: Profile fetch timeout
✅ Profile fetch completed
🛡️ User exists but no profile found
```

## Root Cause Analysis

### 1. **Slow Database Queries**
Both critical queries are timing out:
- `user_profiles` lookup by ID: Taking >8 seconds
- `get_user_current_tenant` RPC: Taking >8 seconds (never completing)

### 2. **Missing Database Indexes**
Key indexes likely missing:
- `user_profiles.id` - Primary lookup for profile
- `tenant_users.user_id` - Tenant assignment lookup
- `tenant_users.user_id + is_active` - Composite for active tenant queries

### 3. **Inefficient RPC Function**
The `get_user_current_tenant` RPC may be:
- Doing complex joins without indexes
- Not using the `user_tenant_cache` materialized view
- Missing query optimization hints

### 4. **Cascading Failures**
- Profile fetch times out → sets profile to null
- Tenant loading times out → stays in loading state forever
- ProtectedRoute sees no profile → shows create profile screen
- Alert system can't initialize → repeated "Tenant still loading" warnings

## Solution Implementation

### Step 1: Increase Timeouts (COMPLETED)
Extended timeouts from 8 to 15 seconds to prevent premature failures:

**Files Modified:**
- `src/contexts/auth/AuthContext.tsx` - Profile fetch timeout: 8s → 15s
- `src/contexts/TenantContext.tsx` - Added 15s timeout to tenant fetch

**Added Performance Logging:**
```typescript
const startTime = Date.now();
// ... fetch logic ...
const elapsed = Date.now() - startTime;
console.log(`⏱️ Profile fetch took ${elapsed}ms`);
```

### Step 2: Add Database Indexes (ACTION REQUIRED)

**File Created:** `docs/development/sql/add_performance_indexes.sql`

**Run this SQL in Supabase SQL Editor:**
```sql
-- Critical indexes for authentication performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON public.user_profiles(id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON public.tenant_users(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_active 
  ON public.tenant_users(user_id, is_active) WHERE is_active = true;

-- Refresh materialized view
REFRESH MATERIALIZED VIEW CONCURRENTLY public.user_tenant_cache;

-- Update statistics
ANALYZE public.user_profiles;
ANALYZE public.tenant_users;
ANALYZE public.tenants;
```

**Expected Impact:**
- Profile lookup: <100ms (from >8000ms)
- Tenant lookup: <200ms (from >8000ms)
- Total login time: <500ms (from timeout)

### Step 3: Optimize RPC Function (ACTION REQUIRED)

**File Created:** `docs/development/sql/optimize_tenant_rpc.sql`

**Two options provided:**

**Option A: Use Materialized View** (Faster, requires view access)
```sql
CREATE OR REPLACE FUNCTION public.get_user_current_tenant(target_user_id uuid)
RETURNS TABLE (tenant_id uuid, tenant_name text, user_role text, is_active boolean)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT tenant_id, tenant_name, user_role, is_active
  FROM user_tenant_cache
  WHERE user_id = target_user_id AND is_active = true
  LIMIT 1;
$$;
```

**Option B: Direct Query** (Slower but no materialized view dependency)
```sql
CREATE OR REPLACE FUNCTION public.get_user_current_tenant_direct(target_user_id uuid)
RETURNS TABLE (tenant_id uuid, tenant_name text, user_role text, is_active boolean)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT tu.tenant_id, t.name, tu.role, tu.is_active
  FROM tenant_users tu
  INNER JOIN tenants t ON t.id = tu.tenant_id
  WHERE tu.user_id = target_user_id
    AND tu.is_active = true AND tu.is_active = true
  ORDER BY tu.created_at DESC
  LIMIT 1;
$$;
```

**Recommendation:** Use Option A for best performance, but only after indexes are added.

## Testing Plan

### 1. Apply Indexes First
```bash
# Open Supabase SQL Editor
# Copy and paste add_performance_indexes.sql
# Execute and verify indexes were created
```

### 2. Test Login Performance
```bash
# Clear browser cache and localStorage
# Login with heather.gordon@lethpolytech.ca
# Check console for timing logs:
#   ⏱️ Profile fetch took XXXms
#   🏢 TENANT CONTEXT: Tenant fetch took XXXms
# Expected: Both under 500ms
```

### 3. Verify No Timeouts
```bash
# Login should complete without:
#   ❌ Profile fetch error: Profile fetch timeout
#   🛡️ User exists but no profile found
# Should see instead:
#   ✅ Profile fetch completed
#   🏢 TENANT CONTEXT: Setting current tenant: [name]
```

### 4. Check Database Performance
```sql
-- Run in Supabase SQL Editor to check query plans
EXPLAIN ANALYZE 
SELECT * FROM user_profiles WHERE id = 'cad2c60c-3466-4215-aebb-102e90ff91e9';

EXPLAIN ANALYZE
SELECT * FROM get_user_current_tenant('cad2c60c-3466-4215-aebb-102e90ff91e9');
```

## Expected Results

### Before Fix
- Profile fetch: >8000ms (timeout)
- Tenant fetch: >8000ms (timeout)
- Login success rate: ~0% (requires refresh)
- User experience: Broken

### After Fix
- Profile fetch: <100ms
- Tenant fetch: <200ms
- Login success rate: 100%
- User experience: Instant login

## Performance Monitoring

### Key Metrics to Track
```typescript
// Add to AuthContext.tsx and TenantContext.tsx
console.log(`⏱️ Profile fetch took ${elapsed}ms`);
console.log(`🏢 Tenant fetch took ${elapsed}ms`);
```

### Alert Thresholds
- ⚠️ Warning: >500ms
- 🚨 Error: >2000ms
- 💥 Critical: >5000ms (timeout risk)

## Rollback Plan

If indexes cause issues:
```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_user_profiles_id;
DROP INDEX IF EXISTS idx_tenant_users_user_id;
DROP INDEX IF EXISTS idx_tenant_users_user_active;

-- Revert timeouts in code
git diff HEAD~1 src/contexts/auth/AuthContext.tsx
git diff HEAD~1 src/contexts/TenantContext.tsx
```

## Related Issues

1. **Materialized View Security** - Previously reverted (see `revert_user_tenant_cache_security.sql`)
2. **Redundant Profile Queries** - Fixed by removing duplicate query
3. **Database Health Check** - Removed from auth flow to prevent blocking

## Next Steps

1. ✅ Increase timeouts (15 seconds)
2. ✅ Add performance logging
3. ⏳ **USER ACTION**: Run `add_performance_indexes.sql` in Supabase
4. ⏳ **USER ACTION**: Run `optimize_tenant_rpc.sql` in Supabase
5. ⏳ Test login performance with timing logs
6. ⏳ Monitor production performance
7. ⏳ Plan materialized view security refactoring (long-term)

## Success Criteria

- [ ] Profile fetch completes in <100ms
- [ ] Tenant fetch completes in <200ms
- [ ] No timeout errors in console
- [ ] Login works on first attempt (no refresh needed)
- [ ] All tenant-dependent features load correctly
- [ ] No security warnings in Supabase dashboard

## Notes

- Timeouts increased from 8s to 15s as temporary mitigation
- Root cause is slow database queries due to missing indexes
- Materialized view is correctly accessible (previous security fix reverted)
- RPC function may need optimization after indexes are added
- Performance logging will help identify remaining bottlenecks
