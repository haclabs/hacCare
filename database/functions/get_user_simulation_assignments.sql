-- Function to get user's simulation assignments (bypasses RLS)
-- Allows simulation_only users to see their assigned simulations without tenant context

CREATE OR REPLACE FUNCTION public.get_user_simulation_assignments(
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result json;
BEGIN
  -- Security check: Users can only query their own assignments
  -- (auth.uid() returns the currently authenticated user's ID)
  -- Temporarily log for debugging
  RAISE NOTICE 'RPC called with p_user_id=%, auth.uid()=%', p_user_id, auth.uid();
  
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required: auth.uid() is NULL';
  END IF;
  
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: You can only query your own simulation assignments';
  END IF;

  -- Get simulation assignments for the user
  SELECT COALESCE(json_agg(row_to_json(t)), '[]'::json)
  INTO v_result
  FROM (
    SELECT 
      sp.id,
      sp.simulation_id,
      sp.role,
      sp.granted_at,
      json_build_object(
        'id', sa.id,
        'name', sa.name,
        'status', sa.status,
        'starts_at', sa.starts_at,
        'tenant_id', sa.tenant_id,
        'template', (
          SELECT json_build_object('name', st.name, 'description', st.description)
          FROM simulation_templates st
          WHERE st.id = sa.template_id
        )
      ) as simulation
    FROM simulation_participants sp
    JOIN simulation_active sa ON sa.id = sp.simulation_id
    WHERE sp.user_id = p_user_id
      AND sa.status = 'running'
      AND sa.ends_at > NOW()  -- Exclude expired simulations (even if in grace period)
    ORDER BY sp.granted_at DESC
  ) t;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_simulation_assignments TO authenticated;

COMMENT ON FUNCTION public.get_user_simulation_assignments IS 
'Gets simulation assignments for a user, bypassing RLS restrictions. Used by simulation portal.';
