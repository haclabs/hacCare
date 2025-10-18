# Login History Not Showing - Troubleshooting Guide

## Symptoms
- Login history appears empty in the Admin Dashboard
- Previously had login history data, but it's now gone

## Possible Causes

### 1. Git Reset Cleared Local Changes
When we reverted to the "Simulation and Backup Changes" commit, any **uncommitted** database changes were not affected. However, the **session tracking code** may have been updated.

### 2. Database Sessions Were Cleared
The `user_sessions` table may have been manually cleared or sessions may have expired.

### 3. View Permissions Issue
The `recent_login_history` view has RLS-style filtering that may be blocking access.

### 4. IP Address NOT NULL Constraint
Before running the IP address fix migration, new sessions couldn't be created due to the NOT NULL constraint on `ip_address`.

## Diagnostic Steps

### Step 1: Run the Diagnostic Script
Execute this in Supabase SQL Editor:
```
docs/development/database/migrations/diagnose_login_history.sql
```

This will check:
- Total sessions in database
- Your current role and tenant
- If the view exists
- How many records the view shows
- Sessions by status
- Recent sessions
- RLS policies
- Manual filter test

### Step 2: Check for Data
Look at the output from the diagnostic script:

**If "Total Sessions" shows 0:**
- Your session data was deleted
- Need to login a few times to repopulate
- Check if there's a backup you can restore

**If "Total Sessions" shows data but "View Query Test" shows 0:**
- Permissions issue
- Role/tenant mismatch
- View filter is too restrictive

**If "View Query Test" shows data but UI shows nothing:**
- Frontend issue
- Check browser console for errors
- Clear cache and reload

## Solutions

### Solution 1: Fix IP Address Constraint (CRITICAL)
If you haven't already, run this migration:
```sql
-- File: docs/development/database/migrations/fix_ip_address_nullable.sql
ALTER TABLE public.user_sessions 
ALTER COLUMN ip_address DROP NOT NULL;
```

This allows new sessions to be created even when IP detection fails.

### Solution 2: Verify Your Role
Make sure you're logged in as a super_admin:
```sql
SELECT 
  auth.uid() as user_id,
  auth.jwt() -> 'user_metadata' ->> 'role' as role;
```

If not 'super_admin', you'll only see sessions from your tenant.

### Solution 3: Check Session Creation
After fixing the IP constraint, login again to create a new session:
1. Logout completely
2. Clear browser cache
3. Login again
4. Check if session was created:
```sql
SELECT * FROM user_sessions 
WHERE user_id = auth.uid()
ORDER BY login_time DESC 
LIMIT 1;
```

### Solution 4: Manual Session Creation (Emergency)
If sessions aren't being created automatically, you can manually create one:
```sql
SELECT create_user_session(
  NULL,  -- ip_address (now nullable)
  'Manual Entry',  -- user_agent
  NULL  -- tenant_id (or your tenant ID)
);
```

### Solution 5: Check View Definition
Verify the view exists and has correct permissions:
```sql
SELECT pg_get_viewdef('public.recent_login_history'::regclass);
```

Should include `WITH (security_invoker = true)`.

### Solution 6: Rebuild the View (Last Resort)
If the view is broken, recreate it:
```sql
-- Drop and recreate
DROP VIEW IF EXISTS public.recent_login_history CASCADE;

-- Then re-run the creation from:
-- docs/development/database/migrations/001_enhance_session_tracking.sql
-- (lines 58-90)
```

## Verification

After applying fixes:

1. **Logout and login again** to create a new session
2. **Check the database:**
   ```sql
   SELECT COUNT(*) FROM user_sessions;
   SELECT COUNT(*) FROM recent_login_history;
   ```
3. **Check the UI:**
   - Go to Admin Dashboard
   - Look for "Recent Login History" section
   - Should show your recent login

## Why This Happened

The git reset reverted code changes but **did not affect the database**. However:
- The IP address constraint was preventing new sessions from being created
- CSP was blocking IP detection services
- This created a perfect storm where new logins couldn't create sessions

## Prevention

To prevent this in the future:
1. ✅ Keep `ip_address` nullable (migration applied)
2. ✅ Update CSP to allow IP services (already done)
3. ✅ Make session creation resilient to failures
4. ✅ Add better error logging for session creation

## Next Steps

1. Run `diagnose_login_history.sql` to identify the exact issue
2. Run `fix_ip_address_nullable.sql` if not already done
3. Logout and login to create a new session
4. Verify login history appears in Admin Dashboard
5. If still not working, share the diagnostic output for further help

## Files Referenced
- `docs/development/database/migrations/diagnose_login_history.sql` - Diagnostic script
- `docs/development/database/migrations/fix_ip_address_nullable.sql` - IP fix
- `docs/development/database/migrations/001_enhance_session_tracking.sql` - Original view creation
- `src/lib/adminService.ts` - Frontend code for fetching history
