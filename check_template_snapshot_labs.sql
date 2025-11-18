-- ============================================================================
-- CHECK TEMPLATE SNAPSHOT FOR LAB PANELS
-- Tenant ID: 46b2a9a6-6cff-4343-bbc1-9e025becd415
-- ============================================================================

-- Get the template details
SELECT 
    id,
    name,
    tenant_id,
    snapshot_version,
    snapshot_taken_at,
    LENGTH(snapshot_data::text) as snapshot_size_bytes
FROM simulation_templates
WHERE tenant_id = '46b2a9a6-6cff-4343-bbc1-9e025becd415';

-- Extract lab_panels from the snapshot_data JSONB
SELECT 
    name as template_name,
    jsonb_array_length(snapshot_data->'lab_panels') as lab_panels_in_snapshot
FROM simulation_templates
WHERE tenant_id = '46b2a9a6-6cff-4343-bbc1-9e025becd415';

-- Show actual lab panels in the snapshot
SELECT 
    name as template_name,
    jsonb_pretty(snapshot_data->'lab_panels') as lab_panels_json
FROM simulation_templates
WHERE tenant_id = '46b2a9a6-6cff-4343-bbc1-9e025becd415';

-- Check what's actually in the template tenant RIGHT NOW (not snapshot)
SELECT 
    lp.id,
    lp.panel_time,
    lp.status,
    lp.created_at,
    p.first_name || ' ' || p.last_name as patient_name
FROM lab_panels lp
JOIN patients p ON p.id = lp.patient_id
WHERE lp.tenant_id = '46b2a9a6-6cff-4343-bbc1-9e025becd415'
ORDER BY lp.created_at;

-- ============================================================================
-- INTERPRETATION:
-- ============================================================================
-- If lab_panels_in_snapshot > 0: Those panels will be restored on every launch
-- If lab_panels in tenant = 0 but snapshot has panels: Need to save new snapshot
-- ============================================================================
