-- ============================================================================
-- UPDATE CREATE_SIMULATION_TEMPLATE FUNCTION TO ACCEPT PROGRAM CATEGORIES
-- ============================================================================
-- Migration: Add primary_categories parameter to template creation
-- Author: GitHub Copilot
-- Date: 2026-02-01
-- ============================================================================
-- Purpose: Allow instructors to assign program categories when creating
--          templates instead of requiring manual assignment afterward.
-- ============================================================================

-- Drop and recreate the function with new parameter
DROP FUNCTION IF EXISTS public.create_simulation_template(
  p_name text, 
  p_description text, 
  p_default_duration_minutes integer
);

CREATE OR REPLACE FUNCTION public.create_simulation_template(
  p_name text,
  p_description text,
  p_default_duration_minutes integer,
  p_primary_categories text[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_template_id UUID;
  v_subdomain TEXT;
  v_current_user_id UUID;
  v_result json;
BEGIN
  -- Get current user
  v_current_user_id := auth.uid();
  
  IF v_current_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not authenticated'
    );
  END IF;

  -- Generate unique subdomain from template name
  v_subdomain := lower(regexp_replace(p_name, '[^a-zA-Z0-9]', '', 'g'));
  v_subdomain := substring(v_subdomain, 1, 20) || '-' || substring(gen_random_uuid()::text, 1, 8);

  -- Create the simulation template tenant
  INSERT INTO tenants (
    name,
    subdomain,
    tenant_type,
    is_simulation,
    status
  )
  VALUES (
    p_name || ' (Template)',
    v_subdomain,
    'simulation_template',
    true,
    'active'
  )
  RETURNING id INTO v_tenant_id;

  -- Create the template record with program categories
  INSERT INTO simulation_templates (
    tenant_id,
    name,
    description,
    default_duration_minutes,
    primary_categories,
    status,
    created_by
  )
  VALUES (
    v_tenant_id,
    p_name,
    p_description,
    p_default_duration_minutes,
    p_primary_categories,
    'draft',
    v_current_user_id
  )
  RETURNING id INTO v_template_id;

  -- Grant the creator admin access to the template tenant
  INSERT INTO tenant_users (
    tenant_id,
    user_id,
    role,
    is_active
  )
  VALUES (
    v_tenant_id,
    v_current_user_id,
    'admin',
    true
  );

  -- Return success
  SELECT json_build_object(
    'success', true,
    'template_id', v_template_id,
    'tenant_id', v_tenant_id,
    'message', 'Template created successfully'
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_simulation_template TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.create_simulation_template IS 
'Creates a new simulation template with optional program categories. Categories determine which instructors can see and use the template.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show the updated function signature
SELECT 
  routine_name,
  routine_type,
  data_type,
  pg_get_function_arguments(p.oid) as arguments
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
WHERE routine_schema = 'public'
  AND routine_name = 'create_simulation_template';

-- Migration complete
SELECT 
  '✅ Migration Complete' as status,
  'create_simulation_template now accepts p_primary_categories parameter' as description;
