-- ============================================================================
-- SECURITY FIX: update_user_profile_admin had no caller permission check
-- ============================================================================
-- Found via Supabase security advisor while testing the auto-generate-student
-- feature. This SECURITY DEFINER function updated ANY user_profiles row
-- (including `role`) for ANY caller — a brand-new, freshly signed-up account
-- (role defaults to 'nurse') could call this RPC directly from the browser
-- console and set its own role to 'super_admin'. UI buttons that call this
-- were role-gated, but the RPC itself enforced nothing.
--
-- Fix: require the caller to already hold a role that legitimately manages
-- other users, and cap which target roles each caller tier may assign —
-- mirroring the exact hierarchy already enforced client-side in UserForm.tsx:
--   super_admin -> can assign any role
--   coordinator -> coordinator, instructor, nurse, student (not admin/super_admin)
--   admin       -> admin, instructor, nurse, student (not coordinator/super_admin)
--   instructor  -> student, nurse only (its only legitimate use: creating
--                  students via AddStudentModal / autoStudentService)
--   anyone else -> rejected outright
-- ============================================================================

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
  v_caller_role text;
BEGIN
  SELECT role INTO v_caller_role FROM user_profiles WHERE id = auth.uid();

  IF v_caller_role IS NULL OR v_caller_role NOT IN ('super_admin', 'coordinator', 'admin', 'instructor') THEN
    RAISE EXCEPTION 'Insufficient permissions to update user profiles';
  END IF;

  IF v_caller_role = 'instructor' AND p_role NOT IN ('student', 'nurse') THEN
    RAISE EXCEPTION 'Instructors may only create or update student/nurse accounts';
  END IF;

  IF v_caller_role = 'admin' AND p_role IN ('super_admin', 'coordinator') THEN
    RAISE EXCEPTION 'Admins may not assign the coordinator or super_admin role';
  END IF;

  IF v_caller_role = 'coordinator' AND p_role IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Coordinators may not assign the admin or super_admin role';
  END IF;

  -- UPSERT: create profile if it doesn't exist (e.g. trigger missed), otherwise update.
  INSERT INTO user_profiles (
    id, email, first_name, last_name, role, primary_program,
    license_number, phone, is_active, simulation_only, created_at, updated_at
  )
  SELECT
    p_user_id, COALESCE(au.email, ''), p_first_name, p_last_name, p_role::user_role,
    p_department, p_license_number, p_phone, p_is_active, p_simulation_only, NOW(), NOW()
  FROM auth.users au
  WHERE au.id = p_user_id
  ON CONFLICT (id) DO UPDATE SET
    first_name      = EXCLUDED.first_name,
    last_name       = EXCLUDED.last_name,
    role            = EXCLUDED.role,
    primary_program = EXCLUDED.primary_program,
    license_number  = EXCLUDED.license_number,
    phone           = EXCLUDED.phone,
    is_active       = EXCLUDED.is_active,
    simulation_only = EXCLUDED.simulation_only,
    updated_at      = NOW();

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
'Allows super_admin/coordinator/admin/instructor callers to update user profiles, bypassing RLS.
SECURITY: caller must already hold one of those roles; instructors are further capped to only
assign student/nurse roles, and admins/coordinators cannot assign roles above their own tier
(mirrors the role-assignment matrix already enforced client-side in UserForm.tsx).
Uses UPSERT so it creates the profile row if the on_auth_user_created trigger missed it.';
