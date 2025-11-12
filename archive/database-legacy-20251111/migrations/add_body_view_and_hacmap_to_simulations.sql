-- Migration: Add body_view field and fix hacMap simulation support
-- 1. Add body_view to avatar_locations for front/back view tracking
-- 2. Add entered_by to wounds table for nurse documentation
-- 3. Update simulation functions to use real hacMap tables (avatar_locations, devices, wounds)

-- ============================================================================
-- PART 1: Add new columns
-- ============================================================================

-- Add body_view field to avatar_locations to track front/back view
-- This fixes the issue where markers placed on front/back legs show on both views
ALTER TABLE avatar_locations
ADD COLUMN IF NOT EXISTS body_view TEXT;

COMMENT ON COLUMN avatar_locations.body_view IS 'View where marker was placed: front or back. NULL for regions visible on both views (head, arms, etc.)';

-- Add entered_by field to wounds table to track who documented the wound
-- Matches the inserted_by field in devices table
ALTER TABLE wounds 
ADD COLUMN IF NOT EXISTS entered_by TEXT;

COMMENT ON COLUMN wounds.entered_by IS 'Name of the nurse/clinician who entered/documented this wound';

-- ============================================================================
-- PART 2: Update simulation_core_functions.sql - create_simulation_snapshot
-- ============================================================================

-- Replace hacmap_markers with proper avatar_locations + devices + wounds structure
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
                    'acknowledged', false,
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
        
        -- NEW: hacMap data structure with avatar_locations, devices, and wounds
        'hacmap', COALESCE((
            SELECT jsonb_build_object(
                'locations', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', al.id,
                            'patient_id', al.patient_id,
                            'region_key', al.region_key,
                            'x_percent', al.x_percent,
                            'y_percent', al.y_percent,
                            'body_view', al.body_view,
                            'free_text', al.free_text,
                            'created_by', al.created_by,
                            'created_at', al.created_at
                        )
                    )
                    FROM avatar_locations al
                    JOIN patients p ON p.id = al.patient_id
                    WHERE p.tenant_id = v_tenant_id 
                    AND p.is_template_patient = true
                ), '[]'::jsonb),
                'devices', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', d.id,
                            'patient_id', d.patient_id,
                            'location_id', d.location_id,
                            'type', d.type,
                            'placement_date', d.placement_date,
                            'placement_time', d.placement_time,
                            'placed_pre_arrival', d.placed_pre_arrival,
                            'inserted_by', d.inserted_by,
                            'tube_number', d.tube_number,
                            'orientation', d.orientation,
                            'tube_size_fr', d.tube_size_fr,
                            'number_of_sutures_placed', d.number_of_sutures_placed,
                            'reservoir_type', d.reservoir_type,
                            'reservoir_size_ml', d.reservoir_size_ml,
                            'securement_method', d.securement_method,
                            'patient_tolerance', d.patient_tolerance,
                            'notes', d.notes,
                            'created_by', d.created_by,
                            'created_at', d.created_at
                        )
                    )
                    FROM devices d
                    JOIN patients p ON p.id = d.patient_id
                    WHERE p.tenant_id = v_tenant_id 
                    AND p.is_template_patient = true
                ), '[]'::jsonb),
                'wounds', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', w.id,
                            'patient_id', w.patient_id,
                            'location_id', w.location_id,
                            'wound_type', w.wound_type,
                            'peri_wound_temperature', w.peri_wound_temperature,
                            'wound_length_cm', w.wound_length_cm,
                            'wound_width_cm', w.wound_width_cm,
                            'wound_depth_cm', w.wound_depth_cm,
                            'wound_description', w.wound_description,
                            'drainage_description', w.drainage_description,
                            'drainage_consistency', w.drainage_consistency,
                            'wound_odor', w.wound_odor,
                            'drainage_amount', w.drainage_amount,
                            'wound_edges', w.wound_edges,
                            'closure', w.closure,
                            'suture_staple_line', w.suture_staple_line,
                            'sutures_intact', w.sutures_intact,
                            'entered_by', w.entered_by,
                            'notes', w.notes,
                            'created_by', w.created_by,
                            'created_at', w.created_at
                        )
                    )
                    FROM wounds w
                    JOIN patients p ON p.id = w.patient_id
                    WHERE p.tenant_id = v_tenant_id 
                    AND p.is_template_patient = true
                ), '[]'::jsonb)
            )
        ), '{}'::jsonb)
    ) INTO v_snapshot_data;
    
    -- Create the snapshot
    INSERT INTO simulation_snapshots (
        template_id,
        name,
        snapshot_data,
        created_by,
        tenant_id,
        description
    ) VALUES (
        p_template_id,
        p_name,
        v_snapshot_data,
        p_user_id,
        v_tenant_id,
        p_description
    ) RETURNING id INTO v_snapshot_id;
    
    RETURN v_snapshot_id;
END;
$$;

-- ============================================================================
-- PART 3: Update reset_and_management_functions.sql - create_snapshot
-- ============================================================================

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
        
        'lab_orders', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'template_patient_id', tp.id,
                    'order_date', lo.order_date,
                    'order_time', lo.order_time,
                    'procedure_category', lo.procedure_category,
                    'procedure_type', lo.procedure_type,
                    'source_category', lo.source_category,
                    'source_type', lo.source_type,
                    'initials', lo.initials,
                    'status', lo.status,
                    'notes', lo.notes
                )
            )
            FROM sim_template_patients tp
            LEFT JOIN patients p ON p.patient_id = tp.public_patient_id
            LEFT JOIN lab_orders lo ON lo.patient_id = p.id
            WHERE tp.template_id = p_template_id
            AND lo.id IS NOT NULL
        ), '[]'::jsonb),
        
        -- NEW: hacMap data structure with avatar_locations, devices, and wounds
        'hacmap', COALESCE((
            SELECT jsonb_build_object(
                'locations', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', al.id,
                            'patient_id', al.patient_id,
                            'region_key', al.region_key,
                            'x_percent', al.x_percent,
                            'y_percent', al.y_percent,
                            'body_view', al.body_view,
                            'free_text', al.free_text,
                            'created_by', al.created_by
                        )
                    )
                    FROM sim_template_patients tp
                    LEFT JOIN patients p ON p.patient_id = tp.public_patient_id
                    LEFT JOIN avatar_locations al ON al.patient_id = p.id
                    WHERE tp.template_id = p_template_id
                    AND al.id IS NOT NULL
                ), '[]'::jsonb),
                'devices', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', d.id,
                            'location_id', d.location_id,
                            'type', d.type,
                            'placement_date', d.placement_date,
                            'placement_time', d.placement_time,
                            'placed_pre_arrival', d.placed_pre_arrival,
                            'inserted_by', d.inserted_by,
                            'tube_number', d.tube_number,
                            'orientation', d.orientation,
                            'tube_size_fr', d.tube_size_fr,
                            'number_of_sutures_placed', d.number_of_sutures_placed,
                            'reservoir_type', d.reservoir_type,
                            'reservoir_size_ml', d.reservoir_size_ml,
                            'securement_method', d.securement_method,
                            'patient_tolerance', d.patient_tolerance,
                            'notes', d.notes
                        )
                    )
                    FROM sim_template_patients tp
                    LEFT JOIN patients p ON p.patient_id = tp.public_patient_id
                    LEFT JOIN devices d ON d.patient_id = p.id
                    WHERE tp.template_id = p_template_id
                    AND d.id IS NOT NULL
                ), '[]'::jsonb),
                'wounds', COALESCE((
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', w.id,
                            'location_id', w.location_id,
                            'wound_type', w.wound_type,
                            'peri_wound_temperature', w.peri_wound_temperature,
                            'wound_length_cm', w.wound_length_cm,
                            'wound_width_cm', w.wound_width_cm,
                            'wound_depth_cm', w.wound_depth_cm,
                            'wound_description', w.wound_description,
                            'drainage_description', w.drainage_description,
                            'drainage_consistency', w.drainage_consistency,
                            'wound_odor', w.wound_odor,
                            'drainage_amount', w.drainage_amount,
                            'wound_edges', w.wound_edges,
                            'closure', w.closure,
                            'suture_staple_line', w.suture_staple_line,
                            'sutures_intact', w.sutures_intact,
                            'entered_by', w.entered_by,
                            'notes', w.notes
                        )
                    )
                    FROM sim_template_patients tp
                    LEFT JOIN patients p ON p.patient_id = tp.public_patient_id
                    LEFT JOIN wounds w ON w.patient_id = p.id
                    WHERE tp.template_id = p_template_id
                    AND w.id IS NOT NULL
                ), '[]'::jsonb)
            )
        ), '{}'::jsonb),
        
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

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION create_simulation_snapshot IS 'Creates snapshot including hacMap locations, devices, and wounds with body_view tracking';
COMMENT ON FUNCTION create_snapshot IS 'Creates snapshot from template including hacMap data with body_view field';
