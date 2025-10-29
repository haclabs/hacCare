-- ===============================================
-- BULLETPROOF RESET FUNCTION
-- ===============================================
-- This function resets a simulation run by deleting ONLY event data
-- while preserving printed IDs and stable entities

CREATE OR REPLACE FUNCTION reset_run(p_run_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_counts JSONB;
    v_vitals_count INTEGER;
    v_med_admin_count INTEGER; 
    v_alert_ack_count INTEGER;
    v_notes_count INTEGER;
    v_tenant_check UUID;
BEGIN
    -- Verify run exists and user has access (RLS will enforce this but let's be explicit)
    SELECT st.tenant_id INTO v_tenant_check
    FROM sim_runs sr
    JOIN sim_snapshots ss ON ss.id = sr.snapshot_id
    JOIN sim_templates st ON st.id = ss.template_id
    WHERE sr.id = p_run_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Run not found or access denied: %', p_run_id;
    END IF;
    
    -- Prevent concurrent writes during reset with advisory lock
    -- Use a unique lock ID based on the run_id
    PERFORM pg_advisory_xact_lock(
        ('x' || substr(md5('sim_run:' || p_run_id::text), 1, 16))::bit(64)::bigint
    );
    
    -- Delete ONLY event data (student-entered changes)
    -- DO NOT touch sim_run_patients or sim_run_barcode_pool (preserves printed IDs)
    
    DELETE FROM sim_run_vitals_events WHERE run_id = p_run_id;
    GET DIAGNOSTICS v_vitals_count = ROW_COUNT;
    
    DELETE FROM sim_run_med_admin_events WHERE run_id = p_run_id;
    GET DIAGNOSTICS v_med_admin_count = ROW_COUNT;
    
    DELETE FROM sim_run_alert_acks WHERE run_id = p_run_id;
    GET DIAGNOSTICS v_alert_ack_count = ROW_COUNT;
    
    DELETE FROM sim_run_notes WHERE run_id = p_run_id;
    GET DIAGNOSTICS v_notes_count = ROW_COUNT;
    
    -- Update run status and timestamp
    UPDATE sim_runs 
    SET updated_at = NOW()
    WHERE id = p_run_id;
    
    -- Prepare result summary
    v_deleted_counts := jsonb_build_object(
        'vitals_events', v_vitals_count,
        'med_admin_events', v_med_admin_count,
        'alert_acknowledgments', v_alert_ack_count,
        'notes', v_notes_count,
        'total_deleted', v_vitals_count + v_med_admin_count + v_alert_ack_count + v_notes_count,
        'reset_at', NOW(),
        'run_id', p_run_id
    );
    
    -- Send notification for real-time updates
    PERFORM pg_notify('sim_run_reset', p_run_id::text);
    
    -- Log the reset action (optional - could be in a separate audit table)
    INSERT INTO sim_run_notes (
        run_id,
        run_patient_id,
        note_type,
        author_id,
        author_role,
        title,
        content
    ) VALUES (
        p_run_id,
        NULL, -- System note, not patient-specific
        'system',
        auth.uid(),
        'system',
        'Simulation Reset',
        format('Reset completed. Deleted: %s vitals, %s med admins, %s alert acks, %s notes',
               v_vitals_count, v_med_admin_count, v_alert_ack_count, v_notes_count)
    );
    
    RETURN v_deleted_counts;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and re-raise
        RAISE EXCEPTION 'Reset failed for run %: %', p_run_id, SQLERRM;
END;
$$;

-- ===============================================
-- HELPER FUNCTIONS FOR SIMULATION MANAGEMENT
-- ===============================================

-- Create a snapshot from a template
CREATE OR REPLACE FUNCTION create_snapshot(
    p_template_id UUID,
    p_name TEXT,
    p_description TEXT DEFAULT NULL
) 
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_snapshot_id UUID;
    v_version INTEGER;
    v_snapshot_data JSONB;
BEGIN
    -- Get next version number for this template
    SELECT COALESCE(MAX(version), 0) + 1 INTO v_version
    FROM sim_snapshots
    WHERE template_id = p_template_id;
    
    -- Build complete snapshot data
    SELECT jsonb_build_object(
        'patients', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', tp.id,
                    'public_patient_id', tp.public_patient_id,
                    'demographics', tp.demographics,
                    'medical_history', tp.medical_history,
                    'baseline_vitals', tp.baseline_vitals,
                    'baseline_alerts', tp.baseline_alerts,
                    'room', tp.room,
                    'bed', tp.bed
                )
            )
            FROM sim_template_patients tp
            WHERE tp.template_id = p_template_id
        ), '[]'::jsonb),
        
        'medications', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', tm.id,
                    'template_patient_id', tm.template_patient_id,
                    'medication_name', tm.medication_name,
                    'dosage', tm.dosage,
                    'route', tm.route,
                    'frequency', tm.frequency,
                    'prescribed_by', tm.prescribed_by,
                    'prescribed_at', tm.prescribed_at,
                    'status', tm.status
                )
            )
            FROM sim_template_meds tm
            WHERE tm.template_id = p_template_id
        ), '[]'::jsonb),
        
        'barcodes', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', tb.id,
                    'template_med_id', tb.template_med_id,
                    'public_barcode_id', tb.public_barcode_id
                )
            )
            FROM sim_template_barcodes tb
            WHERE tb.template_id = p_template_id
        ), '[]'::jsonb),
        
        'template_metadata', (
            SELECT jsonb_build_object(
                'name', name,
                'description', description,
                'specialty', specialty,
                'difficulty_level', difficulty_level,
                'estimated_duration', estimated_duration,
                'learning_objectives', learning_objectives
            )
            FROM sim_templates
            WHERE id = p_template_id
        )
    ) INTO v_snapshot_data;
    
    -- Create the snapshot
    INSERT INTO sim_snapshots (
        template_id,
        version,
        name,
        description,
        snapshot_data,
        created_by
    ) VALUES (
        p_template_id,
        v_version,
        p_name,
        p_description,
        v_snapshot_data,
        auth.uid()
    ) RETURNING id INTO v_snapshot_id;
    
    RETURN v_snapshot_id;
END;
$$;

-- Launch a run from a snapshot
CREATE OR REPLACE FUNCTION launch_run(
    p_snapshot_id UUID,
    p_run_name TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_run_id UUID;
    v_snapshot_data JSONB;
    v_patient JSONB;
    v_barcode JSONB;
    v_run_patient_id UUID;
BEGIN
    -- Get snapshot data
    SELECT snapshot_data INTO v_snapshot_data
    FROM sim_snapshots
    WHERE id = p_snapshot_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Snapshot not found: %', p_snapshot_id;
    END IF;
    
    -- Create the run
    INSERT INTO sim_runs (
        snapshot_id,
        name,
        created_by
    ) VALUES (
        p_snapshot_id,
        p_run_name,
        auth.uid()
    ) RETURNING id INTO v_run_id;
    
    -- Create stable run patients (preserve public IDs from template)
    FOR v_patient IN 
        SELECT * FROM jsonb_array_elements(v_snapshot_data->'patients')
    LOOP
        INSERT INTO sim_run_patients (
            run_id,
            template_patient_id,
            public_patient_id,
            room,
            bed
        ) VALUES (
            v_run_id,
            (v_patient->>'id')::UUID,
            v_patient->>'public_patient_id',
            v_patient->>'room',
            v_patient->>'bed'
        );
    END LOOP;
    
    -- Create stable barcode pool (preserve public barcode IDs from template)
    FOR v_barcode IN
        SELECT 
            tb.*,
            tm.medication_name
        FROM jsonb_array_elements(v_snapshot_data->'barcodes') tb
        JOIN jsonb_array_elements(v_snapshot_data->'medications') tm
            ON (tb->>'template_med_id')::UUID = (tm->>'id')::UUID
    LOOP
        INSERT INTO sim_run_barcode_pool (
            run_id,
            template_barcode_id,
            public_barcode_id,
            medication_name
        ) VALUES (
            v_run_id,
            (v_barcode->>'id')::UUID,
            v_barcode->>'public_barcode_id',
            v_barcode->>'medication_name'
        );
    END LOOP;
    
    RETURN v_run_id;
END;
$$;

-- ===============================================
-- GRANT PERMISSIONS
-- ===============================================
GRANT EXECUTE ON FUNCTION reset_run(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_snapshot(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION launch_run(UUID, TEXT) TO authenticated;

-- ===============================================
-- COMMENTS
-- ===============================================
COMMENT ON FUNCTION reset_run(UUID) IS 'Resets simulation by deleting only event data, preserving printed IDs';
COMMENT ON FUNCTION create_snapshot(UUID, TEXT, TEXT) IS 'Creates immutable snapshot from template';
COMMENT ON FUNCTION launch_run(UUID, TEXT) IS 'Launches active simulation from snapshot';