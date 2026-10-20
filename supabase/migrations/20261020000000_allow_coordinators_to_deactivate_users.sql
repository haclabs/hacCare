-- Let coordinators deactivate and reactivate users, like admins.
--
-- Coordinators rank above admins and already create and edit users (invite-user,
-- admin-update-user-email and update_user_profile_admin all allow them), but these two functions
-- only allowed super_admin and admin, so the User & Roles Deactivate/Reactivate buttons failed for
-- coordinators.
--
-- Also applies the same role-tier caps as update_user_profile_admin: admins may not
-- (de)activate coordinators or super admins, and coordinators may not (de)activate admins or
-- super admins. Permanent deletion (delete_user_permanently) stays super_admin only.
--
-- CREATE OR REPLACE keeps the existing grants (authenticated, service_role).

CREATE OR REPLACE FUNCTION public.deactivate_user(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_role text;
  target_role text;
BEGIN
  SELECT role INTO current_user_role FROM user_profiles WHERE id = auth.uid();

  IF current_user_role IS NULL OR current_user_role NOT IN ('super_admin', 'coordinator', 'admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to deactivate users';
  END IF;

  SELECT role INTO target_role FROM user_profiles WHERE id = target_user_id;

  IF current_user_role = 'admin' AND target_role IN ('super_admin', 'coordinator') THEN
    RAISE EXCEPTION 'Admins may not deactivate coordinators or super admins';
  END IF;

  IF current_user_role = 'coordinator' AND target_role IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Coordinators may not deactivate admins or super admins';
  END IF;

  UPDATE user_profiles
  SET is_active = false, updated_at = NOW()
  WHERE id = target_user_id;

  RETURN 'User deactivated successfully';
END;
$$;

CREATE OR REPLACE FUNCTION public.reactivate_user(target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_role text;
  target_role text;
BEGIN
  SELECT role INTO current_user_role FROM user_profiles WHERE id = auth.uid();

  IF current_user_role IS NULL OR current_user_role NOT IN ('super_admin', 'coordinator', 'admin') THEN
    RAISE EXCEPTION 'Insufficient permissions to reactivate users';
  END IF;

  SELECT role INTO target_role FROM user_profiles WHERE id = target_user_id;

  IF current_user_role = 'admin' AND target_role IN ('super_admin', 'coordinator') THEN
    RAISE EXCEPTION 'Admins may not reactivate coordinators or super admins';
  END IF;

  IF current_user_role = 'coordinator' AND target_role IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Coordinators may not reactivate admins or super admins';
  END IF;

  UPDATE user_profiles
  SET is_active = true, updated_at = NOW()
  WHERE id = target_user_id;

  RETURN 'User reactivated successfully';
END;
$$;
