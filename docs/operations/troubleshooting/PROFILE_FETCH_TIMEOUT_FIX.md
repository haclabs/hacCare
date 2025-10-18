# Profile Fetch Timeout Fix

## Problem (Production)
After successful login on Netlify production, users experienced hanging with the following console logs:
```
👤 User signed in, initializing session tracking for: heather.gordon@lethpolytech.ca
✅ Sign in successful, waiting for auth state change...
🔍 Testing database connection...
❌ Profile fetch error: Profile fetch timeout
```

The profile fetch was timing out at 8 seconds, preventing users from accessing the application.

## Root Cause
The profile fetch query to `user_profiles` table was hanging/slow, hitting the 8-second timeout. This could be due to:
1. Database performance issues (slow queries)
2. Missing indexes on `user_profiles` table
3. RLS policy complexity
4. Network latency in production environment

## Solution Implemented

### 1. Increased Timeout
Changed profile fetch timeout from **8 seconds** to **10 seconds** to accommodate slower production database responses.

### 2. Proper Abort Signal
Added `AbortController` with proper `abortSignal()` to the Supabase query:
```typescript
const controller = new AbortController();
const fetchPromise = supabase
  .from('user_profiles')
  .select('*')
  .eq('id', userId)
  .abortSignal(controller.signal)  // ← Ensures proper cancellation
  .single();
```

### 3. Enhanced Logging
Added comprehensive logging to track query execution:
```typescript
console.log('🔄 Fetching profile for user:', userId);
console.log('⏱️ Profile fetch timeout set to 10000ms');
console.log('📡 Executing profile query...');
// ... query executes ...
console.log('✅ Profile query completed');
```

This helps diagnose where delays occur in production.

### 4. Better Error Messages
Improved error messages to distinguish between:
- Abort errors (query cancelled)
- Timeout errors (database slow)
- Configuration errors (Supabase not set up)
- Other fetch errors

## Changes Made

**File: `src/contexts/auth/AuthContext.tsx`**

```typescript
// Before: Simple timeout with no abort signal
const result = await Promise.race([
  supabase.from('user_profiles').select('*').eq('id', userId).single(),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Profile fetch timeout')), 8000)
  )
]);

// After: Proper abort controller + increased timeout + logging
const controller = new AbortController();
const timeoutMs = 10000; // 10 seconds

const timeoutPromise = new Promise<never>((_, reject) => {
  setTimeout(() => {
    controller.abort();
    reject(new Error('Profile fetch timeout - database may be slow'));
  }, timeoutMs);
});

const fetchPromise = supabase
  .from('user_profiles')
  .select('*')
  .eq('id', userId)
  .abortSignal(controller.signal)
  .single();

console.log('📡 Executing profile query...');
const result = await Promise.race([fetchPromise, timeoutPromise]);
console.log('✅ Profile query completed');
```

## Next Steps (If Issue Persists)

If the timeout still occurs in production, consider:

### 1. Database Optimization
```sql
-- Check if index exists on user_profiles.id
CREATE INDEX IF NOT EXISTS idx_user_profiles_id ON user_profiles(id);

-- Check query performance
EXPLAIN ANALYZE SELECT * FROM user_profiles WHERE id = '<user-id>';
```

### 2. RLS Policy Review
Check if RLS policies are causing performance issues:
```sql
-- Review policies on user_profiles table
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';
```

### 3. Increase Timeout Further
If database is genuinely slow:
```typescript
const timeoutMs = 15000; // 15 seconds
```

### 4. Add Caching Layer
Consider caching profile data in localStorage after first fetch:
```typescript
// After successful fetch
localStorage.setItem(`profile_${userId}`, JSON.stringify(data));

// On subsequent loads, use cached data while fetching fresh data
const cached = localStorage.getItem(`profile_${userId}`);
if (cached) {
  setProfile(JSON.parse(cached));
}
```

## Monitoring

With the new logging, production logs will show:
- `🔄 Fetching profile for user:` - When fetch starts
- `⏱️ Profile fetch timeout set to 10000ms` - Timeout value
- `📡 Executing profile query...` - Query execution starts
- `✅ Profile query completed` - Query succeeded
- `❌ Profile fetch timeout - database may be slow` - Query timed out

## Testing Checklist

- [x] Login with email/password (dev)
- [x] Login with Microsoft OAuth (dev)
- [ ] Login with email/password (production)
- [ ] Login with Microsoft OAuth (production)
- [ ] Monitor console logs for timing information
- [ ] Verify profile loads within 10 seconds

## Date
October 14, 2025
