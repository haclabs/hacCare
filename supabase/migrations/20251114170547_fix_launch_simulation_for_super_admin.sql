-- ============================================================================
-- FIX LAUNCH SIMULATION FOR SUPER ADMINS
-- ============================================================================
-- Allow super admins to launch simulations without having a tenant_id assigned
-- Super admins manage globally, so they can use any available tenant
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS launch_simulation(UUID, TEXT, INTEGER, UUID[], TEXT[]);

CREATE OR REPLACE FUNCTION launch_simulation(
  p_template_id UUID,
  p_name TEXT,
  p_duration_minutes INTEGER,
  p_participant_user_ids UUID[],
  p_participant_roles TEXT[] DEFAULT NULL
)
RETURNS TABLE(
  simulation_id UUID,
  tenant_id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_simulation_tenant_id UUID;
  v_home_tenant_id UUID;
  v_user_role TEXT;
  v_simulation_id UUID;
  v_snapshot JSONB;
  v_snapshot_version INTEGER;
  v_participant_id UUID;
  v_role TEXT;
  i INTEGER;
BEGIN
  -- Check if user profile exists and get role
  SELECT role INTO v_user_role
  FROM user_profiles
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found. Please ensure your account is properly set up.'
      USING HINT = 'Contact administrator to create user profile';
  END IF;

  -- For simulation launch, we just need ANY parent tenant as a reference
  -- The simulation creates its own isolated tenant anyway
  SELECT id INTO v_home_tenant_id
  FROM tenants
  WHERE is_simulation = false
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF v_home_tenant_id IS NULL THEN
    RAISE EXCEPTION 'No tenant found in system. Please create a tenant first.';
  END IF;
  
  RAISE NOTICE '% launching simulation - using parent tenant: %', v_user_role, v_home_tenant_id;

  -- Fetch the template snapshot and version
  SELECT snapshot_data, snapshot_version INTO v_snapshot, v_snapshot_version
  FROM simulation_templates
  WHERE id = p_template_id;

  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;

  -- Generate new simulation ID
  v_simulation_id := gen_random_uuid();

  -- Create new simulation tenant (temporary tenant for this simulation session)
  INSERT INTO tenants (
    name,
    subdomain,
    tenant_type,
    is_simulation,
    parent_tenant_id,
    simulation_config,
    status
  )
  VALUES (
    'sim_active_' || p_name || '_' || extract(epoch from now())::text,
    'sim-act-' || lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8),
    'simulation_active',
    true,
    v_home_tenant_id,
    jsonb_build_object(
      'template_id', p_template_id,
      'launched_at', now()
    ),
    'active'
  )
  RETURNING id INTO v_simulation_tenant_id;

  -- Restore snapshot to the NEW simulation tenant (creates patients and all baseline data)
  PERFORM restore_snapshot_to_tenant(
    p_tenant_id := v_simulation_tenant_id,
    p_snapshot := v_snapshot,
    p_preserve_barcodes := false  -- New simulation = new patients
  );

  -- Create simulation_active record with proper timer calculation
  INSERT INTO simulation_active (
    id,
    tenant_id,
    template_id,
    name,
    duration_minutes,
    starts_at,
    ends_at,
    created_by,
    status,
    template_snapshot_version
  )
  VALUES (
    v_simulation_id,
    v_simulation_tenant_id,
    p_template_id,
    p_name,
    p_duration_minutes,
    NOW(),
    NOW() + (p_duration_minutes || ' minutes')::INTERVAL,
    auth.uid(),
    'running',
    COALESCE(v_snapshot_version, 0)
  );

  -- Add participants to simulation_participants table AND tenant_users for RLS access
  IF p_participant_user_ids IS NOT NULL AND array_length(p_participant_user_ids, 1) > 0 THEN
    FOR i IN 1..array_length(p_participant_user_ids, 1) LOOP
      v_participant_id := p_participant_user_ids[i];
      v_role := COALESCE(p_participant_roles[i], 'student');
      
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
        auth.uid()
      );
      
      -- Add to tenant_users for RLS access to simulation tenant data
      BEGIN
        INSERT INTO tenant_users (user_id, tenant_id, is_active)
        VALUES (v_participant_id, v_simulation_tenant_id, true);
      EXCEPTION
        WHEN unique_violation THEN
          -- User already in tenant_users, update to active
          UPDATE tenant_users SET is_active = true
          WHERE tenant_users.user_id = v_participant_id AND tenant_users.tenant_id = v_simulation_tenant_id;
      END;
    END LOOP;
  END IF;

  RAISE NOTICE 'Simulation launched: % (%) for simulation tenant: % with duration: % minutes',
    v_simulation_id, p_name, v_simulation_tenant_id, p_duration_minutes;

  RETURN QUERY SELECT 
    v_simulation_id AS simulation_id,
    v_simulation_tenant_id AS tenant_id,
    'Simulation launched successfully'::TEXT AS message;
END;
$$;

COMMENT ON FUNCTION launch_simulation IS 
  'Launch a new simulation from template. Super admins can launch without tenant_id by using first available tenant.';
