-- Fix: Missing on_auth_user_created trigger
--
-- Root cause: The trigger that fires ensure_user_profile() when a new auth user
-- is created (via auth.signUp()) was defined in schema.sql but was never included
-- in any migration file. Any Supabase project set up via migrations (not schema.sql)
-- would be missing this trigger, causing new users to have no user_profiles record.
--
-- Effect: user appears in auth.users (visible in Supabase Auth dashboard) but is
-- invisible in the app because UserManagement queries user_profiles only.
-- update_user_profile_admin silently updates 0 rows since no profile exists.

-- Ensure the trigger function exists (idempotent)
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO user_profiles (id, email, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'nurse',
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create the missing trigger on auth.users
-- Uses OR REPLACE (Postgres 14+) / drop-and-recreate for safety
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_user_profile();

-- Also fix update_user_profile_admin to UPSERT instead of UPDATE-only.
-- This ensures the profile is created even if the trigger misfires.
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
  -- UPSERT: create profile if it doesn't exist (e.g. trigger missed), otherwise update.
  INSERT INTO user_profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    primary_program,
    license_number,
    phone,
    is_active,
    simulation_only,
    created_at,
    updated_at
  )
  SELECT
    p_user_id,
    COALESCE(au.email, ''),
    p_first_name,
    p_last_name,
    p_role::user_role,
    p_department,
    p_license_number,
    p_phone,
    p_is_active,
    p_simulation_only,
    NOW(),
    NOW()
  FROM auth.users au
  WHERE au.id = p_user_id
  ON CONFLICT (id) DO UPDATE SET
    first_name     = EXCLUDED.first_name,
    last_name      = EXCLUDED.last_name,
    role           = EXCLUDED.role,
    primary_program = EXCLUDED.primary_program,
    license_number = EXCLUDED.license_number,
    phone          = EXCLUDED.phone,
    is_active      = EXCLUDED.is_active,
    simulation_only = EXCLUDED.simulation_only,
    updated_at     = NOW();

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

GRANT EXECUTE ON FUNCTION public.update_user_profile_admin TO authenticated;

COMMENT ON FUNCTION public.update_user_profile_admin IS
'Allows admins to update user profiles, bypassing RLS restrictions. Now uses UPSERT
so it creates the profile row if the on_auth_user_created trigger missed it.
Note: p_department parameter is deprecated, now using user_programs junction table.';
