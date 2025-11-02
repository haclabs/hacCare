-- Core Simulation Functions
-- Clean, maintainable functions for simulation state management

-- ===============================================
-- Function: Create Simulation Snapshot
-- ===============================================
CREATE OR REPLACE FUNCTION create_simulation_snapshot(
    p_template_id UUID,
    p_name VARCHAR(255),
    p_user_id UUID,
    p_description TEXT DEFAULT NULL
) 
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_snapshot_id UUID;
    v_tenant_id UUID;
    v_snapshot_data JSONB;
BEGIN
    -- Get tenant_id from template
    SELECT tenant_id INTO v_tenant_id 
    FROM simulation_templates 
    WHERE id = p_template_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Template not found: %', p_template_id;
    END IF;
    
    -- Build snapshot data from current template state
    -- This will gather all patients, vitals, medications, etc.
    SELECT jsonb_build_object(
        'patients', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', p.id,
                    'first_name', p.first_name,
                    'last_name', p.last_name,
                    'date_of_birth', p.date_of_birth,
                    'medical_record_number', p.medical_record_number,
                    'room_number', p.room_number,
                    'bed_number', p.bed_number
                )
            )
            FROM patients p 
            WHERE p.tenant_id = v_tenant_id 
            AND p.is_template_patient = true
        ), '[]'::jsonb),
        
        'vitals', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', v.id,
                    'patient_id', v.patient_id,
                    'systolic_bp', v.systolic_bp,
                    'diastolic_bp', v.diastolic_bp,
                    'heart_rate', v.heart_rate,
                    'temperature', v.temperature,
                    'oxygen_saturation', v.oxygen_saturation,
                    'respiratory_rate', v.respiratory_rate,
                    'recorded_at', v.recorded_at,
                    'recorded_by', v.recorded_by
                )
            )
            FROM vitals v
            JOIN patients p ON p.id = v.patient_id
            WHERE p.tenant_id = v_tenant_id 
            AND p.is_template_patient = true
        ), '[]'::jsonb),
        
        'medications', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', m.id,
                    'patient_id', m.patient_id,
                    'medication_name', m.medication_name,
                    'dosage', m.dosage,
                    'route', m.route,
                    'frequency', m.frequency,
                    'prescribed_by', m.prescribed_by,
                    'prescribed_at', m.prescribed_at,
                    'status', m.status
                )
            )
            FROM medications m
            JOIN patients p ON p.id = m.patient_id
            WHERE p.tenant_id = v_tenant_id 
            AND p.is_template_patient = true
        ), '[]'::jsonb),
        
        'alerts', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', a.id,
                    'patient_id', a.patient_id,
                    'type', a.type,
                    'message', a.message,
                    'severity', a.severity,
                    'acknowledged', false, -- Always start unacknowledged
                    'created_at', a.created_at
                )
            )
            FROM alerts a
            JOIN patients p ON p.id = a.patient_id
            WHERE p.tenant_id = v_tenant_id 
            AND p.is_template_patient = true
        ), '[]'::jsonb),
        
        'notes', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', n.id,
                    'patient_id', n.patient_id,
                    'type', n.type,
                    'content', n.content,
                    'created_by', n.created_by,
                    'created_at', n.created_at
                )
            )
            FROM notes n
            JOIN patients p ON p.id = n.patient_id
            WHERE p.tenant_id = v_tenant_id 
            AND p.is_template_patient = true
        ), '[]'::jsonb),
        
        'lab_orders', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', lo.id,
                    'patient_id', lo.patient_id,
                    'order_date', lo.order_date,
                    'order_time', lo.order_time,
                    'procedure_category', lo.procedure_category,
                    'procedure_type', lo.procedure_type,
                    'source_category', lo.source_category,
                    'source_type', lo.source_type,
                    'initials', lo.initials,
                    'verified_by', lo.verified_by,
                    'status', lo.status,
                    'notes', lo.notes,
                    'label_printed', lo.label_printed,
                    'created_at', lo.created_at
                )
            )
            FROM lab_orders lo
            JOIN patients p ON p.id = lo.patient_id
            WHERE p.tenant_id = v_tenant_id 
            AND p.is_template_patient = true
        ), '[]'::jsonb),
        
        'hacmap_markers', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', hm.id,
                    'patient_id', hm.patient_id,
                    'marker_type', hm.marker_type,
                    'x', hm.x,
                    'y', hm.y,
                    'body_side', hm.body_side,
                    'label', hm.label,
                    'device_type', hm.device_type,
                    'device_subtype', hm.device_subtype,
                    'insertion_date', hm.insertion_date,
                    'insertion_site', hm.insertion_site,
                    'size_gauge', hm.size_gauge,
                    'length_depth', hm.length_depth,
                    'site_condition', hm.site_condition,
                    'securing_method', hm.securing_method,
                    'wound_type', hm.wound_type,
                    'wound_stage', hm.wound_stage,
                    'wound_size', hm.wound_size,
                    'wound_depth', hm.wound_depth,
                    'exudate_amount', hm.exudate_amount,
                    'exudate_type', hm.exudate_type,
                    'wound_bed', hm.wound_bed,
                    'surrounding_skin', hm.surrounding_skin,
                    'pain_level', hm.pain_level,
                    'odor', hm.odor,
                    'notes', hm.notes,
                    'created_at', hm.created_at
                )
            )
            FROM hacmap_markers hm
            JOIN patients p ON p.id = hm.patient_id
            WHERE p.tenant_id = v_tenant_id 
            AND p.is_template_patient = true
        ), '[]'::jsonb)
    ) INTO v_snapshot_data;
    
    -- Create the snapshot
    INSERT INTO simulation_snapshots (
        template_id,
        name,
        description,
        snapshot_data,
        created_by,
        tenant_id
    ) VALUES (
        p_template_id,
        p_name,
        p_description,
        v_snapshot_data,
        p_user_id,
        v_tenant_id
    ) RETURNING id INTO v_snapshot_id;
    
    RETURN v_snapshot_id;
END;
$$;

-- ===============================================
-- Function: Launch Simulation Instance
-- ===============================================
CREATE OR REPLACE FUNCTION launch_simulation_instance(
    p_template_id UUID,
    p_snapshot_id UUID,
    p_name VARCHAR(255),
    p_user_id UUID
) 
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_instance_id UUID;
    v_tenant_id UUID;
    v_snapshot_data JSONB;
    v_persistent_ids JSONB;
BEGIN
    -- Get snapshot data
    SELECT s.snapshot_data, s.tenant_id
    INTO v_snapshot_data, v_tenant_id
    FROM simulation_snapshots s
    WHERE s.id = p_snapshot_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Snapshot not found: %', p_snapshot_id;
    END IF;
    
    -- Generate persistent identifiers (barcodes, etc.)
    -- Check if we can reuse existing ones from previous instances
    SELECT persistent_identifiers INTO v_persistent_ids
    FROM simulation_instances
    WHERE template_id = p_template_id
    AND tenant_id = v_tenant_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- If no existing identifiers, generate new ones
    IF v_persistent_ids IS NULL THEN
        v_persistent_ids := jsonb_build_object(
            'patient_barcodes', (
                SELECT jsonb_object_agg(
                    (patient->>'id')::text,
                    'PAT' || LPAD((FLOOR(RANDOM() * 999999))::text, 6, '0')
                )
                FROM jsonb_array_elements(v_snapshot_data->'patients') AS patient
            ),
            'medication_barcodes', (
                SELECT jsonb_object_agg(
                    (medication->>'id')::text,
                    'MED' || LPAD((FLOOR(RANDOM() * 999999))::text, 6, '0')
                )
                FROM jsonb_array_elements(v_snapshot_data->'medications') AS medication
            )
        );
    END IF;
    
    -- Create simulation instance
    INSERT INTO simulation_instances (
        template_id,
        snapshot_id,
        name,
        persistent_identifiers,
        current_state,
        created_by,
        tenant_id
    ) VALUES (
        p_template_id,
        p_snapshot_id,
        p_name,
        v_persistent_ids,
        v_snapshot_data, -- Start with snapshot as current state
        p_user_id,
        v_tenant_id
    ) RETURNING id INTO v_instance_id;
    
    RETURN v_instance_id;
END;
$$;

-- ===============================================
-- Function: Reset Simulation to Snapshot State
-- ===============================================
CREATE OR REPLACE FUNCTION reset_simulation_instance(
    p_instance_id UUID,
    p_user_id UUID
) 
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_snapshot_data JSONB;
    v_tenant_id UUID;
BEGIN
    -- Get the snapshot data for this instance
    SELECT s.snapshot_data, si.tenant_id
    INTO v_snapshot_data, v_tenant_id
    FROM simulation_instances si
    JOIN simulation_snapshots s ON s.id = si.snapshot_id
    WHERE si.id = p_instance_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Simulation instance not found: %', p_instance_id;
    END IF;
    
    -- Reset current state to snapshot state (preserving persistent identifiers)
    UPDATE simulation_instances 
    SET 
        current_state = v_snapshot_data,
        updated_at = NOW()
    WHERE id = p_instance_id;
    
    -- Log the reset activity
    INSERT INTO simulation_activities (
        simulation_id,
        student_id,
        action_type,
        action_data,
        tenant_id
    ) VALUES (
        p_instance_id,
        p_user_id,
        'simulation_reset',
        jsonb_build_object(
            'reset_at', NOW(),
            'reset_by', p_user_id
        ),
        v_tenant_id
    );
    
    RETURN true;
END;
$$;

-- ===============================================
-- Function: Record Student Activity
-- ===============================================
CREATE OR REPLACE FUNCTION record_simulation_activity(
    p_simulation_id UUID,
    p_student_id UUID,
    p_action_type VARCHAR(50),
    p_action_data JSONB
) 
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_activity_id UUID;
    v_tenant_id UUID;
BEGIN
    -- Get tenant_id from simulation instance
    SELECT tenant_id INTO v_tenant_id
    FROM simulation_instances
    WHERE id = p_simulation_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Simulation instance not found: %', p_simulation_id;
    END IF;
    
    -- Record the activity
    INSERT INTO simulation_activities (
        simulation_id,
        student_id,
        action_type,
        action_data,
        tenant_id
    ) VALUES (
        p_simulation_id,
        p_student_id,
        p_action_type,
        p_action_data,
        v_tenant_id
    ) RETURNING id INTO v_activity_id;
    
    RETURN v_activity_id;
END;
$$;