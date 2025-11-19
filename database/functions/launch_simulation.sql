-- ============================================================================
-- LAUNCH SIMULATION FUNCTION
-- ============================================================================
-- Launches a new simulation from a template and sets up timer correctly
-- 
-- CRITICAL FIX: Sets ends_at = NOW() + duration to fix "Expired" display
-- ============================================================================

-- Drop ALL existing launch_simulation function signatures
DROP FUNCTION IF EXISTS launch_simulation(UUID, UUID, INTEGER, UUID);
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
  -- Get user's role from user_profiles
  SELECT user_profiles.role INTO v_user_role
  FROM user_profiles
  WHERE user_profiles.id = auth.uid();
  
  -- Get user's home tenant_id from user_tenant_access
  SELECT user_tenant_access.tenant_id INTO v_home_tenant_id
  FROM user_tenant_access
  WHERE user_tenant_access.user_id = auth.uid()
    AND user_tenant_access.is_active = true
  LIMIT 1;
  
  -- Super admins without tenant: use first non-simulation tenant
  IF v_home_tenant_id IS NULL AND v_user_role = 'super_admin' THEN
    SELECT tenants.id INTO v_home_tenant_id
    FROM tenants
    WHERE tenants.is_simulation = false
    ORDER BY tenants.created_at ASC
    LIMIT 1;
  END IF;

  -- Fetch the template snapshot
  SELECT simulation_templates.snapshot_data INTO v_snapshot
  FROM simulation_templates
  WHERE simulation_templates.id = p_template_id;

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
    v_home_tenant_id,  -- NULL for super admins is OK
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
  WHERE patients.tenant_id = v_simulation_tenant_id;

  -- Create simulation_active record with proper timer calculation
  INSERT INTO simulation_active (
    id,
    tenant_id,
    template_id,
    name,
    duration_minutes,
    starts_at,
    ends_at,  -- CRITICAL: Set ends_at = NOW() + duration
    created_by,
    status,
    template_snapshot_version
  )
  VALUES (
    v_simulation_id,
    v_simulation_tenant_id,  -- Use the NEW simulation tenant
    p_template_id,
    p_name,
    p_duration_minutes,
    NOW(),
    NOW() + (p_duration_minutes || ' minutes')::INTERVAL,  -- Fix timer display
    auth.uid(),
    'running',
    1  -- Default snapshot version
  );

  RAISE NOTICE 'Simulation launched: % (%) for simulation tenant: % with duration: % minutes (ends_at: %)',
    v_simulation_id, p_name, v_simulation_tenant_id, p_duration_minutes, 
    NOW() + (p_duration_minutes || ' minutes')::INTERVAL;

  -- Add participants if provided
  IF p_participant_user_ids IS NOT NULL AND array_length(p_participant_user_ids, 1) > 0 THEN
    FOR i IN 1..array_length(p_participant_user_ids, 1)
    LOOP
      INSERT INTO simulation_participants (
        simulation_id,
        user_id,
        role,
        granted_by
      )
      VALUES (
        v_simulation_id,
        p_participant_user_ids[i],
        COALESCE(p_participant_roles[i], 'student')::simulation_role,
        auth.uid()
      );
    END LOOP;
    
    RAISE NOTICE '✅ Added % participants to simulation', array_length(p_participant_user_ids, 1);
  END IF;

  RETURN QUERY SELECT 
    v_simulation_id,
    v_simulation_tenant_id,  -- Return the simulation tenant ID
    'Simulation launched successfully'::TEXT;
END;
$$;

COMMENT ON FUNCTION launch_simulation IS 'Launch a new simulation from template with proper timer calculation';
