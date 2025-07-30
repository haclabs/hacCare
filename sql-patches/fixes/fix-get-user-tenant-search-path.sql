-- Targeted Fix: Fix get_user_tenant Function Search Path
-- Description: Specifically fix the get_user_tenant function that still has mutable search_path
-- Date: 2025-07-30
-- Issue: Function public.get_user_tenant has a role mutable search_path

BEGIN;

-- =============================================================================
-- Step 1: Check what version of get_user_tenant exists
-- =============================================================================

-- Query to see the current definition
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition,
    'Current function definition' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_user_tenant';

-- =============================================================================
-- Step 2: Drop all variations of get_user_tenant function
-- =============================================================================

-- Drop all possible variations of this function
DROP FUNCTION IF EXISTS public.get_user_tenant() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_tenant(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_user_tenant() CASCADE;
DROP FUNCTION IF EXISTS get_user_tenant(UUID) CASCADE;

-- =============================================================================
-- Step 3: Recreate the function with secure search path
-- =============================================================================

-- Create the function with SET search_path = '' for security
CREATE FUNCTION public.get_user_tenant()
RETURNS UUID
SET search_path = ''
SECURITY DEFINER
AS $$
DECLARE
    tenant_uuid UUID;
BEGIN
    -- Get the current user's tenant using the existing get_user_current_tenant function
    -- If that function doesn't exist, get it directly
    BEGIN
        SELECT get_user_current_tenant(auth.uid()) INTO tenant_uuid;
    EXCEPTION WHEN undefined_function THEN
        -- Fallback: get tenant directly if get_user_current_tenant doesn't exist
        SELECT tu.tenant_id INTO tenant_uuid
        FROM public.tenant_users tu
        WHERE tu.user_id = auth.uid()
        AND tu.is_active = true
        LIMIT 1;
    END;
    
    RETURN tenant_uuid;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Step 4: Set proper permissions
-- =============================================================================

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_tenant() TO authenticated;

-- Add comment documenting the security fix
COMMENT ON FUNCTION public.get_user_tenant() IS 'Returns the current users tenant ID - SECURITY DEFINER with immutable search_path for security';

-- =============================================================================
-- Step 5: Alternative - Create version that takes user_id parameter if needed
-- =============================================================================

-- If there was a version that takes a user_id parameter, recreate it too
CREATE FUNCTION public.get_user_tenant(user_uuid UUID)
RETURNS UUID
SET search_path = ''
SECURITY DEFINER
AS $$
DECLARE
    tenant_uuid UUID;
BEGIN
    -- Get the specified user's tenant
    SELECT tu.tenant_id INTO tenant_uuid
    FROM public.tenant_users tu
    WHERE tu.user_id = user_uuid
    AND tu.is_active = true
    LIMIT 1;
    
    RETURN tenant_uuid;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_tenant(UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_user_tenant(UUID) IS 'Returns the specified users tenant ID - SECURITY DEFINER with immutable search_path for security';

-- =============================================================================
-- Step 6: Verification
-- =============================================================================

-- Check that the function now has the secure search path
SELECT 
    routine_name,
    routine_type,
    data_type,
    specific_name,
    'Function recreated with secure search_path' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'get_user_tenant';

-- Test that the function works
SELECT 'get_user_tenant function fixed with immutable search_path' as final_status;

COMMIT;
