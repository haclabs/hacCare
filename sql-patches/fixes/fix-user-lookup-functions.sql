-- Create function to find user by email (works with auth.users directly)
-- Run this in your Supabase SQL Editor

CREATE OR REPLACE FUNCTION find_user_by_email(email_param TEXT)
RETURNS TABLE(user_id UUID, email TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    au.id as user_id,
    au.email::TEXT as email,
    au.created_at
  FROM auth.users au
  WHERE au.email = email_param
  AND au.deleted_at IS NULL
  LIMIT 1;
$$;

-- Create function to get available admin users from auth.users
CREATE OR REPLACE FUNCTION get_available_admin_users()
RETURNS TABLE(user_id UUID, email TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    au.id as user_id,
    au.email::TEXT as email,
    au.created_at
  FROM auth.users au
  WHERE au.deleted_at IS NULL
  AND au.email_confirmed_at IS NOT NULL
  ORDER BY au.created_at DESC;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION find_user_by_email TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_admin_users TO authenticated;
