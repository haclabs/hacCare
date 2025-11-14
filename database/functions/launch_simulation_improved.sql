-- ============================================================================
-- IMPROVED LAUNCH SIMULATION FUNCTION
-- ============================================================================
-- Better error handling and support for super admins without tenant_id
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
  v_patient_count INTEGER;
BEGIN
  -- Get user's home tenant_id and role
  SELECT tenant_id, role INTO v_home_tenant_id, v_user_role
  FROM user_profiles
  WHERE id = auth.uid();

  -- Check if user exists in user_profiles
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found. Please ensure your account is properly set up.'
      USING HINT = 'Contact administrator to create user profile';
  END IF;

  -- For super admins, allow launching without tenant_id
  -- For other users, require tenant_id
  IF v_home_tenant_id IS NULL AND v_user_role != 'super_admin' THEN
    RAISE EXCEPTION 'User has no tenant assigned. Please contact your administrator to assign you to a tenant.'
      USING HINT = 'User ID: ' || auth.uid()::TEXT;
  END IF;

  -- If super admin has no tenant, find first non-simulation tenant
  IF v_home_tenant_id IS NULL AND v_user_role = 'super_admin' THEN
    SELECT id INTO v_home_tenant_id
    FROM tenants
    WHERE is_simulation = false
    ORDER BY created_at ASC
    LIMIT 1;
    
    IF v_home_tenant_id IS NULL THEN
      RAISE EXCEPTION 'No tenant found in system. Please create a tenant first.';
    END IF;
    
    RAISE NOTICE 'Super admin launching simulation - using tenant: %', v_home_tenant_id;
  END IF;

  -- Fetch the template snapshot
  SELECT snapshot INTO v_snapshot
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

  -- Count patients created
  SELECT COUNT(*) INTO v_patient_count
  FROM patients
  WHERE tenant_id = v_simulation_tenant_id;

  -- Create simulation_active record with proper timer calculation
  INSERT INTO simulation_active (
    id,
    tenant_id,
    template_id,
    name,
    duration_minutes,
    starts_at,
    ends_at,
    launched_by,
    status,
    patient_count,
    participant_user_ids,
    participant_roles
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
    'active',
    v_patient_count,
    p_participant_user_ids,
    p_participant_roles
  );

  RAISE NOTICE 'Simulation launched: % (%) for simulation tenant: % with duration: % minutes',
    v_simulation_id, p_name, v_simulation_tenant_id, p_duration_minutes;

  RETURN QUERY SELECT 
    v_simulation_id,
    v_simulation_tenant_id,
    'Simulation launched successfully'::TEXT;
END;
$$;

COMMENT ON FUNCTION launch_simulation IS 
  'Launch a new simulation from template. Super admins can launch without tenant_id, others must have tenant assigned.';
