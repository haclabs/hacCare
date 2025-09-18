-- Create an RPC function to delete simulation users with proper permissions
-- This bypasses RLS policies for admin operations

-- Drop existing functions first
DROP FUNCTION IF EXISTS delete_simulation_users_for_tenant(UUID);
DROP FUNCTION IF EXISTS delete_simulation_tenant_safe(UUID);

CREATE OR REPLACE FUNCTION delete_simulation_users_for_tenant(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to run with elevated privileges
AS $$
BEGIN
  -- Delete all simulation_users for the given tenant
  DELETE FROM simulation_users 
  WHERE simulation_tenant_id = p_tenant_id;
  
  -- Log the deletion
  RAISE NOTICE 'Deleted simulation users for tenant %', p_tenant_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_simulation_users_for_tenant(UUID) TO authenticated;

-- Also create a function to delete tenants safely
CREATE OR REPLACE FUNCTION delete_simulation_tenant_safe(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_count INTEGER;
  tenant_user_count INTEGER;
BEGIN
  -- Check how many simulation users exist
  SELECT COUNT(*) INTO user_count FROM simulation_users WHERE simulation_tenant_id = p_tenant_id;
  RAISE NOTICE 'Found % simulation users for tenant %', user_count, p_tenant_id;
  
  -- Disable RLS for this session to ensure deletion works
  SET row_security = off;
  
  -- First delete simulation users with explicit DELETE
  DELETE FROM public.simulation_users WHERE simulation_tenant_id = p_tenant_id;
  GET DIAGNOSTICS user_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % simulation users', user_count;
  
  -- Then delete tenant users
  DELETE FROM public.tenant_users WHERE tenant_id = p_tenant_id;
  GET DIAGNOSTICS tenant_user_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % tenant users', tenant_user_count;
  
  -- Finally delete the tenant
  DELETE FROM public.tenants WHERE id = p_tenant_id AND tenant_type = 'simulation';
  
  -- Re-enable RLS
  SET row_security = on;
  
  RAISE NOTICE 'Safely deleted simulation tenant %', p_tenant_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION delete_simulation_tenant_safe(UUID) TO authenticated;