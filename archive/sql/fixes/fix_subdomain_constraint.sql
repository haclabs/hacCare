-- ===========================================================================
-- FIX: Add subdomain to simulation tenant creation
-- ===========================================================================
-- Purpose: Fix NOT NULL constraint violation on tenants.subdomain
-- Issue: create_simulation_template and launch_simulation functions were
--        not providing subdomain values when creating simulation tenants
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Fix: Create simulation template with subdomain
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_simulation_template(
  p_name text,
  p_description text DEFAULT NULL,
  p_default_duration_minutes integer DEFAULT 120
)
RETURNS json AS $$
DECLARE
  v_template_id uuid;
  v_tenant_id uuid;
  v_user_id uuid;
  v_result json;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Verify user is admin or super_admin
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = v_user_id
    AND role IN ('admin', 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Only admins and super admins can create simulation templates';
  END IF;
  
  -- Create simulation tenant with unique subdomain
  INSERT INTO tenants (
    name, 
    subdomain, 
    tenant_type, 
    is_simulation, 
    simulation_config,
    status,
    settings
  )
  VALUES (
    'sim_template_' || p_name,
    'sim-tpl-' || lower(regexp_replace(p_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 8),
    'simulation_template',
    true,
    jsonb_build_object('template_mode', true),
    'active',
    '{}'::jsonb
  )
  RETURNING id INTO v_tenant_id;
  
  -- Create template record
  INSERT INTO simulation_templates (
    name,
    description,
    tenant_id,
    default_duration_minutes,
    created_by,
    status
  )
  VALUES (
    p_name,
    p_description,
    v_tenant_id,
    p_default_duration_minutes,
    v_user_id,
    'draft'
  )
  RETURNING id INTO v_template_id;
  
  -- Return result
  v_result := json_build_object(
    'success', true,
    'template_id', v_template_id,
    'tenant_id', v_tenant_id,
    'message', 'Template created successfully. Switch to tenant to build simulation.'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------------------------
-- Fix: Launch simulation with subdomain
-- ---------------------------------------------------------------------------
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
    (SELECT tenant_id FROM user_profiles WHERE id = v_user_id),
    jsonb_build_object(
      'template_id', p_template_id,
      'launched_at', now()
    ),
    'active',
    '{}'::jsonb
  )
  RETURNING id INTO v_new_tenant_id;
  
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
  
  -- Add participants
  IF array_length(p_participant_user_ids, 1) > 0 THEN
    FOR i IN 1..array_length(p_participant_user_ids, 1) LOOP
      v_participant_id := p_participant_user_ids[i];
      
      -- Determine role (default to student if not specified)
      IF p_participant_roles IS NOT NULL AND i <= array_length(p_participant_roles, 1) THEN
        v_role := p_participant_roles[i];
      ELSE
        v_role := 'student';
      END IF;
      
      INSERT INTO simulation_participants (
        simulation_id,
        user_id,
        role
      )
      VALUES (
        v_simulation_id,
        v_participant_id,
        v_role::simulation_role
      );
    END LOOP;
  END IF;
  
  -- Restore snapshot data to new tenant
  PERFORM restore_snapshot_to_tenant(v_new_tenant_id, v_snapshot);
  
  -- Log activity
  INSERT INTO simulation_activity_log (
    simulation_id,
    user_id,
    activity_type,
    description,
    metadata
  )
  VALUES (
    v_simulation_id,
    v_user_id,
    'simulation_launched',
    'Simulation launched from template: ' || (SELECT name FROM simulation_templates WHERE id = p_template_id),
    jsonb_build_object(
      'template_id', p_template_id,
      'tenant_id', v_new_tenant_id,
      'participant_count', array_length(p_participant_user_ids, 1)
    )
  );
  
  v_result := json_build_object(
    'success', true,
    'simulation_id', v_simulation_id,
    'tenant_id', v_new_tenant_id,
    'message', 'Simulation launched successfully'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
