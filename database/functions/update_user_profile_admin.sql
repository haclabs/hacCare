-- Function to update user profile (bypasses RLS for admins)
-- This allows admins to set first_name, last_name, and other fields when creating users

-- Drop old version if exists (without simulation_only parameter)
DROP FUNCTION IF EXISTS public.update_user_profile_admin(uuid, text, text, text, text, text, text, boolean);

CREATE OR REPLACE FUNCTION public.update_user_profile_admin(
  p_user_id uuid,
  p_first_name text,
  p_last_name text,
  p_role text,
  p_department text DEFAULT NULL,
  p_license_number text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_is_active boolean DEFAULT true,
  p_simulation_only boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- Update the user profile
  UPDATE user_profiles
  SET 
    first_name = p_first_name,
    last_name = p_last_name,
    role = p_role::user_role,
    department = p_department,
    license_number = p_license_number,
    phone = p_phone,
    is_active = p_is_active,
    simulation_only = p_simulation_only,
    updated_at = now()
  WHERE id = p_user_id;

  -- Return the updated profile
  SELECT json_build_object(
    'success', true,
    'user_id', p_user_id,
    'first_name', p_first_name,
    'last_name', p_last_name,
    'simulation_only', p_simulation_only
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_user_profile_admin TO authenticated;

COMMENT ON FUNCTION public.update_user_profile_admin IS 
'Allows admins to update user profiles, bypassing RLS restrictions. Includes simulation_only flag for auto-routing users to simulation lobby.';
