-- =====================================================
-- FIX: Allow super admins to launch simulations without parent_tenant_id
-- =====================================================
-- ISSUE: Super admins have no assigned tenant (tenant_id)
-- When launching simulation, function tries to get parent_tenant_id from user_profiles.tenant_id
-- But user_profiles doesn't have tenant_id column (uses tenant_users table instead)
--
-- SOLUTION: Set parent_tenant_id to NULL for super admins
-- Simulation active tenants don't need a parent_tenant_id
-- =====================================================

CREATE OR REPLACE FUNCTION launch_simulation(
  p_template_id uuid,
  p_name text,
  p_duration_minutes integer,
  p_participant_user_ids uuid[],
  p_participant_roles text[] DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_simulation_id uuid;
  v_new_tenant_id uuid;
  v_template_tenant_id uuid;
  v_snapshot jsonb;
  v_snapshot_version integer;
  v_user_id uuid;
  v_result json;
  v_participant_id uuid;
  v_role text;
  i integer;
BEGIN
  v_user_id := auth.uid();
  
  -- Verify template exists and is ready
  SELECT tenant_id, snapshot_data, snapshot_version
  INTO v_template_tenant_id, v_snapshot, v_snapshot_version
  FROM simulation_templates
  WHERE id = p_template_id
  AND status = 'ready';
  
  IF v_template_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Template not found or not ready';
  END IF;
  
  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Template has no snapshot data';
  END IF;
  
  -- Create new simulation tenant with unique subdomain
  -- ✅ FIX: parent_tenant_id is NULL for simulations (no longer trying to get from user_profiles)
  INSERT INTO tenants (
    name,
    subdomain,
    tenant_type,
    is_simulation,
    parent_tenant_id,
    simulation_config,
    status,
    settings
  )
  VALUES (
    'sim_active_' || p_name || '_' || extract(epoch from now())::text,
    'sim-act-' || lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8),
    'simulation_active',
    true,
    NULL,  -- ✅ Changed from subquery - simulations don't need parent tenant
    jsonb_build_object(
      'template_id', p_template_id,
      'launched_at', now()
    ),
    'active',
    '{}'::jsonb
  )
  RETURNING id INTO v_new_tenant_id;
  
  -- ✅ Add creator to tenant_users for active simulation tenant
  INSERT INTO tenant_users (user_id, tenant_id, is_active)
  VALUES (v_user_id, v_new_tenant_id, true)
  ON CONFLICT (user_id, tenant_id) DO NOTHING;
  
  RAISE NOTICE '✅ Added creator % to active simulation tenant %', v_user_id, v_new_tenant_id;
  
  -- Create active simulation record
  INSERT INTO simulation_active (
    template_id,
    name,
    tenant_id,
    duration_minutes,
    template_snapshot_version,
    status,
    created_by
  )
  VALUES (
    p_template_id,
    p_name,
    v_new_tenant_id,
    p_duration_minutes,
    v_snapshot_version,
    'running',
    v_user_id
  )
  RETURNING id INTO v_simulation_id;
  
  -- Add participants (both to simulation_participants AND tenant_users)
  IF array_length(p_participant_user_ids, 1) > 0 THEN
    FOR i IN 1..array_length(p_participant_user_ids, 1) LOOP
      v_participant_id := p_participant_user_ids[i];
      
      -- Determine role (default to student if not specified)
      IF p_participant_roles IS NOT NULL AND i <= array_length(p_participant_roles, 1) THEN
        v_role := p_participant_roles[i];
      ELSE
        v_role := 'student';
      END IF;
      
      -- Add to simulation_participants
      INSERT INTO simulation_participants (
        simulation_id,
        user_id,
        role,
        granted_by
      )
      VALUES (
        v_simulation_id,
        v_participant_id,
        v_role::simulation_role,
        v_user_id
      );
      
      -- ✅ Also add to tenant_users for RLS access
      INSERT INTO tenant_users (user_id, tenant_id, is_active)
      VALUES (v_participant_id, v_new_tenant_id, true)
      ON CONFLICT (user_id, tenant_id) DO NOTHING;
      
      RAISE NOTICE '✅ Added participant % to active simulation tenant %', v_participant_id, v_new_tenant_id;
    END LOOP;
  END IF;
  
  -- Restore snapshot data to new tenant
  PERFORM restore_snapshot_to_tenant(v_new_tenant_id, v_snapshot);
  
  v_result := json_build_object(
    'success', true,
    'simulation_id', v_simulation_id,
    'tenant_id', v_new_tenant_id,
    'message', 'Simulation launched successfully. All participants have been assigned to the simulation tenant.'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION launch_simulation(uuid, text, integer, uuid[], text[]) TO authenticated;

COMMENT ON FUNCTION launch_simulation IS 
'Launch active simulation from template.
Fixed to work for super admins without assigned tenant.
Automatically assigns creator and participants to the simulation tenant.';
