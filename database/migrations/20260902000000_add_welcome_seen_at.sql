-- Adds a per-user flag so the first-login welcome tour only shows until dismissed.
-- Existing rows are deliberately left NULL so current instructors also see it once.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS welcome_seen_at TIMESTAMPTZ;

COMMENT ON COLUMN user_profiles.welcome_seen_at IS
  'Set when the user dismisses the welcome tour with "don''t show again". NULL = show it.';

-- Written via an RPC rather than a direct UPDATE so the client can never touch
-- role/is_active/tenant fields on its own profile row.
CREATE OR REPLACE FUNCTION mark_welcome_seen()
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seen_at TIMESTAMPTZ := NOW();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE user_profiles
  SET welcome_seen_at = v_seen_at,
      updated_at = v_seen_at
  WHERE id = auth.uid();

  RETURN v_seen_at;
END;
$$;

REVOKE EXECUTE ON FUNCTION mark_welcome_seen() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION mark_welcome_seen() TO authenticated;
