-- Reference copy of mark_welcome_seen (deployed via
-- database/migrations/20260902000000_add_welcome_seen_at.sql).
-- Records that the caller dismissed the welcome tour for good.

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
