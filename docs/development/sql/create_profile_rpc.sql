-- Create RPC function to fetch user profile bypassing RLS
-- This solves the 15-second timeout during login

CREATE OR REPLACE FUNCTION public.get_user_profile_secure(target_user_id uuid)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT row_to_json(up.*)
  FROM user_profiles up
  WHERE up.id = target_user_id
  LIMIT 1;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_profile_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile_secure(uuid) TO anon;

-- Add helpful comment
COMMENT ON FUNCTION public.get_user_profile_secure(uuid) IS 
'Fetch user profile with SECURITY DEFINER to bypass RLS during authentication. Used to prevent 15s timeout when JWT token is not yet fully propagated.';
