-- ============================================================================
-- LAUNCH SIMULATION FUNCTION WITH CATEGORIES
-- ============================================================================
-- Enhanced version that accepts category tags for better organization
-- ============================================================================

-- Drop existing function
DROP FUNCTION IF EXISTS launch_simulation(UUID, TEXT, INTEGER, UUID[], TEXT[]);
DROP FUNCTION IF EXISTS launch_simulation(UUID, TEXT, INTEGER, UUID[], TEXT[], TEXT[], TEXT[]);

CREATE OR REPLACE FUNCTION launch_simulation(
  p_template_id UUID,
  p_name TEXT,
  p_duration_minutes INTEGER,
  p_participant_user_ids UUID[],
  p_participant_roles TEXT[] DEFAULT NULL,
  p_primary_categories TEXT[] DEFAULT '{}',
  p_sub_categories TEXT[] DEFAULT '{}'
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
  v_template_snapshot_version INTEGER;
BEGIN
  -- Get user's role from user_profiles
  SELECT up.role INTO v_user_role
  FROM user_profiles up
  WHERE up.id = auth.uid();
  
  -- Get user's home tenant_id from user_tenant_access
  SELECT uta.tenant_id INTO v_home_tenant_id
  FROM user_tenant_access uta
  WHERE uta.user_id = auth.uid()
    AND uta.is_active = true
  LIMIT 1;
  
  -- Super admins without tenant: use first non-simulation tenant
  IF v_home_tenant_id IS NULL AND v_user_role = 'super_admin' THEN
    SELECT t.id INTO v_home_tenant_id
    FROM tenants t
    WHERE t.is_simulation = false
    ORDER BY t.created_at ASC
    LIMIT 1;
  END IF;

  -- Fetch the template snapshot AND current version
  SELECT st.snapshot_data, st.snapshot_version
  INTO v_snapshot, v_template_snapshot_version
  FROM simulation_templates st
  WHERE st.id = p_template_id;

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
    p_preserve_barcodes := false
  );

  -- Count patients created
  SELECT COUNT(*) INTO v_patient_count
  FROM patients p
  WHERE p.tenant_id = v_simulation_tenant_id;

  -- Create simulation_active record with categories
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
    template_snapshot_version,
    template_snapshot_version_synced,
    primary_categories,
    sub_categories
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
    v_template_snapshot_version,
    v_template_snapshot_version,  -- Launched at current template version
    p_primary_categories,
    p_sub_categories
  );

  RAISE NOTICE 'Simulation launched: % (%) with categories: Primary=[%], Sub=[%]',
    v_simulation_id, p_name, 
    array_to_string(p_primary_categories, ', '), 
    array_to_string(p_sub_categories, ', ');

  -- Add participants if provided
  IF p_participant_user_ids IS NOT NULL AND array_length(p_participant_user_ids, 1) > 0 THEN
    FOR i IN 1..array_length(p_participant_user_ids, 1)
    LOOP
      -- Add to simulation_participants table
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
      
      -- Add to tenant_users for RLS access to simulation tenant data
      -- This is CRITICAL - without this, participants can't see medications, patients, etc.
      -- Map simulation roles to valid tenant_users roles: instructor→admin, student→nurse
      BEGIN
        INSERT INTO tenant_users (user_id, tenant_id, is_active, role)
        VALUES (
          p_participant_user_ids[i], 
          v_simulation_tenant_id, 
          true,
          CASE COALESCE(p_participant_roles[i], 'student')
            WHEN 'instructor' THEN 'admin'
            WHEN 'student' THEN 'nurse'
            ELSE 'nurse'
          END
        );
      EXCEPTION
        WHEN unique_violation THEN
          -- User already in tenant_users, update to active
          UPDATE tenant_users tu
          SET is_active = true
          WHERE tu.user_id = p_participant_user_ids[i] 
            AND tu.tenant_id = v_simulation_tenant_id;
      END;
    END LOOP;
    
    RAISE NOTICE '✅ Added % participants to simulation with tenant access', array_length(p_participant_user_ids, 1);
  END IF;

  RETURN QUERY SELECT 
    v_simulation_id AS simulation_id,
    v_simulation_tenant_id AS tenant_id,
    'Simulation launched successfully'::TEXT AS message;
END;
$$;

COMMENT ON FUNCTION launch_simulation IS 'Launch simulation with category tags for organization and filtering';
