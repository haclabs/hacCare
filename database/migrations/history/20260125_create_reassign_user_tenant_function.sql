-- ============================================================================
-- CREATE REASSIGN USER TENANT FUNCTION
-- ============================================================================
-- Purpose: Allow super_admins to reassign users to different tenants
-- Bypasses RLS to handle tenant_users table modifications
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reassign_user_tenant(
  p_user_id uuid,
  p_new_tenant_id uuid,
  p_role text DEFAULT 'nurse'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_existing_count integer;
  v_deleted_count integer;
BEGIN
  -- Verify the caller is a super_admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = auth.uid() AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Only super admins can reassign user tenants';
  END IF;

  -- Verify the target user exists
  IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Verify the target tenant exists
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_new_tenant_id) THEN
    RAISE EXCEPTION 'Tenant not found: %', p_new_tenant_id;
  END IF;

  -- Count existing tenant assignments
  SELECT COUNT(*) INTO v_existing_count
  FROM tenant_users
  WHERE user_id = p_user_id;

  -- Delete all existing tenant assignments for this user
  DELETE FROM tenant_users
  WHERE user_id = p_user_id;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Insert the new tenant assignment
  INSERT INTO tenant_users (user_id, tenant_id, is_active, role)
  VALUES (p_user_id, p_new_tenant_id, true, p_role)
  ON CONFLICT (user_id, tenant_id) DO UPDATE
  SET is_active = true, role = EXCLUDED.role;

  RAISE NOTICE 'User % reassigned from % tenants to tenant %', 
    p_user_id, v_deleted_count, p_new_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'new_tenant_id', p_new_tenant_id,
    'previous_tenant_count', v_existing_count,
    'deleted_count', v_deleted_count
  );
END;
$function$;

-- Add comment
COMMENT ON FUNCTION public.reassign_user_tenant IS 
'Reassigns a user to a different tenant. Uses SECURITY DEFINER to bypass RLS. 
Only callable by super_admins. Removes all existing tenant assignments and creates a new one.';

-- Grant execute to authenticated users (function checks role internally)
GRANT EXECUTE ON FUNCTION public.reassign_user_tenant TO authenticated;
