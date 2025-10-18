-- Optimized RPC Function for User Tenant Lookup
-- Run this in Supabase SQL Editor to replace the existing function

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.get_user_current_tenant(uuid);

-- Create optimized function with better performance
CREATE OR REPLACE FUNCTION public.get_user_current_tenant(target_user_id uuid)
RETURNS TABLE (
  tenant_id uuid,
  tenant_name text,
  user_role text,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Use the materialized view for fast lookups
  SELECT 
    utc.tenant_id,
    utc.tenant_name,
    utc.user_role,
    utc.is_active
  FROM user_tenant_cache utc
  WHERE utc.user_id = target_user_id
    AND utc.is_active = true
  LIMIT 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_current_tenant(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_user_current_tenant(uuid) IS 
'Fast lookup of user tenant using materialized view cache. Returns tenant_id, tenant_name, user_role, and is_active status.';

-- Alternative: If the RPC function doesn't exist yet, here's the full implementation
-- This version queries the tables directly if the materialized view isn't available

CREATE OR REPLACE FUNCTION public.get_user_current_tenant_direct(target_user_id uuid)
RETURNS TABLE (
  tenant_id uuid,
  tenant_name text,
  user_role text,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Direct query with optimized joins
  SELECT 
    tu.tenant_id,
    t.name as tenant_name,
    tu.role as user_role,
    tu.is_active
  FROM tenant_users tu
  INNER JOIN tenants t ON t.id = tu.tenant_id
  WHERE tu.user_id = target_user_id
    AND tu.is_active = true
    AND t.status = 'active'
  ORDER BY tu.created_at DESC
  LIMIT 1;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_current_tenant_direct(uuid) TO authenticated;

COMMENT ON FUNCTION public.get_user_current_tenant_direct(uuid) IS 
'Direct query version for user tenant lookup without materialized view dependency.';
