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
  -- Get simulation assignments for the user
  SELECT json_agg(
    json_build_object(
      'id', sp.id,
      'simulation_id', sp.simulation_id,
      'role', sp.role,
      'granted_at', sp.granted_at,
      'simulation', json_build_object(
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
      )
    )
  )
  INTO v_result
  FROM simulation_participants sp
  JOIN simulation_active sa ON sa.id = sp.simulation_id
  WHERE sp.user_id = p_user_id
    AND sa.status = 'running'
  ORDER BY sp.granted_at DESC;

  RETURN COALESCE(v_result, '[]'::json);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_simulation_assignments TO authenticated;

COMMENT ON FUNCTION public.get_user_simulation_assignments IS 
'Gets simulation assignments for a user, bypassing RLS restrictions. Used by simulation portal.';
