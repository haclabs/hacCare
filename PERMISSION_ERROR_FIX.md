# 🛠️ Supabase Permission Error Fix

## The Problem
When executing the super admin RLS policies, you may encounter:
```
ERROR: 42501: permission denied for schema auth
```

## Why This Happens
- Supabase restricts direct function creation in the `auth` schema for security
- The `auth` schema contains sensitive user authentication data
- Regular database users don't have CREATE permissions on this schema

## ✅ Solution: Use Public Schema Functions

### Quick Fix
1. **Use the minimal version (recommended):**
   ```sql
   -- Execute this file instead:
   \i sql/super_admin_rls_minimal.sql
   ```

2. **If that doesn't work, try the simple version:**
   ```sql
   -- Execute this file instead:
   \i sql/super_admin_rls_simple.sql
   ```

3. **What's different:**
   - Functions are created in `public` schema instead of `auth`
   - Unique function names to avoid conflicts
   - Same functionality, different approach
   - No permission or conflict issues

### Manual Steps (if needed)
If you prefer to execute step-by-step:

```sql
-- 1. Create super admin check function
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'super_admin' AND is_active = true
  );
$$;

-- 2. Create tenant access function  
CREATE OR REPLACE FUNCTION public.get_accessible_tenants()
RETURNS setof uuid LANGUAGE sql SECURITY DEFINER AS $$
  SELECT id FROM tenants WHERE public.is_super_admin()
  UNION ALL
  SELECT tenant_id FROM tenant_users 
  WHERE user_id = auth.uid() AND is_active = true AND NOT public.is_super_admin();
$$;

-- 3. Update patients table policy
DROP POLICY IF EXISTS "tenant_isolation" ON patients;
CREATE POLICY "tenant_isolation" ON patients
  FOR ALL USING (tenant_id IN (SELECT public.get_accessible_tenants()));

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_tenants() TO authenticated;
```

## ✅ Verification

Test that everything works:

```sql
-- Check if functions are created
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('is_super_admin', 'get_accessible_tenants');

-- Test super admin check (should return true for super admin)
SELECT public.is_super_admin();

-- Test tenant access (should show accessible tenant IDs)
SELECT * FROM public.get_accessible_tenants();
```

## Alternative: Supabase RPC Functions

If you still have issues, you can create these as RPC functions via the Supabase Dashboard:

1. Go to **Database > Functions** in Supabase Dashboard
2. Create new function with the code above
3. Set **Return type** appropriately
4. Enable **Show in API docs** if needed

## Results

After applying either solution:
- ✅ Super admins can access all tenant data
- ✅ Regular users still see only their tenant's data  
- ✅ Tenant switching works without RLS blocks
- ✅ All security isolation is maintained

The functions work identically whether in `auth` or `public` schema - they just avoid the permission error.