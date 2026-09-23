-- Migration: Let launch_simulation() launch from a named template state
-- Date: 2026-09-12
-- Companion to 20260912000000-000004 (simulation_template_states). Previously the
-- only place a named state could be picked was when RESETTING an already-running
-- simulation (reset_simulation_for_next_session/reset_simulation_with_template_updates,
-- p_state_id). Launching a brand-new simulation always used the template's default
-- snapshot_data — there was no way to launch straight into "Week 2".
--
-- Adds an optional p_state_id param; when provided, restores that state's snapshot
-- instead of the template's default, and records it on simulation_active.current_state_id
-- (same column reset already uses) so the "State: Week 2" badge is correct from launch.
--
-- GOTCHA (documented repeatedly in this repo): adding a new parameter changes the
-- function's argument signature, which CREATE OR REPLACE treats as a distinct
-- overload rather than actually replacing the old one — DROP the old signature
-- first, and re-grant explicitly, or this silently regresses to PUBLIC-default
-- (or leaves a stale duplicate overload PostgREST can't disambiguate).

DROP FUNCTION IF EXISTS public.launch_simulation(uuid, text, integer, uuid[], text[], text[], text[]);

CREATE OR REPLACE FUNCTION public.launch_simulation(
  p_template_id uuid,
  p_name text,
  p_duration_minutes integer,
  p_participant_user_ids uuid[],
  p_participant_roles text[] DEFAULT NULL::text[],
  p_primary_categories text[] DEFAULT '{}'::text[],
  p_sub_categories text[] DEFAULT '{}'::text[],
  p_state_id uuid DEFAULT NULL
) RETURNS TABLE(simulation_id uuid, tenant_id uuid, message text)
    LANGUAGE plpgsql SECURITY DEFINER
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

  -- Confirm the template exists (and grab its version regardless of which
  -- snapshot we end up launching from).
  SELECT st.snapshot_version
  INTO v_template_snapshot_version
  FROM simulation_templates st
  WHERE st.id = p_template_id;

  IF v_template_snapshot_version IS NULL THEN
    RAISE EXCEPTION 'Template not found: %', p_template_id;
  END IF;

  IF p_state_id IS NOT NULL THEN
    SELECT sts.snapshot_data INTO v_snapshot
    FROM simulation_template_states sts
    WHERE sts.id = p_state_id AND sts.template_id = p_template_id;

    IF v_snapshot IS NULL THEN
      RAISE EXCEPTION 'Template state not found or does not belong to this template: %', p_state_id;
    END IF;
  ELSE
    SELECT st.snapshot_data INTO v_snapshot
    FROM simulation_templates st
    WHERE st.id = p_template_id;

    IF v_snapshot IS NULL THEN
      RAISE EXCEPTION 'Template has no snapshot data';
    END IF;
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
    sub_categories,
    current_state_id
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
    p_sub_categories,
    p_state_id
  );

  RAISE NOTICE 'Simulation launched: % (%) with categories: Primary=[%], Sub=[%], state=%',
    v_simulation_id, p_name, 
    array_to_string(p_primary_categories, ', '), 
    array_to_string(p_sub_categories, ', '),
    p_state_id;

  -- Add the launching instructor to tenant_users so they can read all clinical
  -- tables when generating the debrief on completion.
  INSERT INTO tenant_users (user_id, tenant_id, is_active, role)
  VALUES (auth.uid(), v_simulation_tenant_id, true, 'admin')
  ON CONFLICT ON CONSTRAINT tenant_users_tenant_id_user_id_key DO UPDATE
    SET is_active = true, role = 'admin';

  RAISE NOTICE '✅ Launching instructor added to simulation tenant_users for debrief access';

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
      -- Map simulation roles to valid tenant_users roles: instructor→admin, student→nurse
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
      )
      ON CONFLICT ON CONSTRAINT tenant_users_tenant_id_user_id_key DO UPDATE
        SET is_active = true;
    END LOOP;
    
    RAISE NOTICE '✅ Added % participants to simulation with tenant access', array_length(p_participant_user_ids, 1);
  END IF;

  RETURN QUERY SELECT 
    v_simulation_id AS simulation_id,
    v_simulation_tenant_id AS tenant_id,
    'Simulation launched successfully'::TEXT AS message;
END;
$$;

REVOKE ALL ON FUNCTION public.launch_simulation(uuid, text, integer, uuid[], text[], text[], text[], uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.launch_simulation(uuid, text, integer, uuid[], text[], text[], text[], uuid) TO authenticated;

COMMENT ON FUNCTION public.launch_simulation(uuid, text, integer, uuid[], text[], text[], text[], uuid) IS 'Launch simulation with category tags for organization and filtering. Optional p_state_id launches from a named template state (simulation_template_states) instead of the template''s default snapshot, and is recorded on simulation_active.current_state_id. Instructor (launcher) is explicitly added to tenant_users for debrief RLS access.';
