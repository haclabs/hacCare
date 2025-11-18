-- ============================================================================
-- FIX TEMPLATE: CLS Testing (tenant_id: 46b2a9a6-6cff-4343-bbc1-9e025becd415)
-- Remove lab readings from snapshot so they can be re-entered
-- ============================================================================

-- Verify the template details
SELECT 
    id,
    name,
    tenant_id,
    snapshot_version,
    created_at
FROM simulation_templates
WHERE tenant_id = '46b2a9a6-6cff-4343-bbc1-9e025becd415';

-- Check current lab results in this template's tenant
SELECT 
    lr.id,
    lr.patient_id,
    lr.panel_id,
    lr.test_name,
    lr.value,
    lr.created_at,
    p.first_name || ' ' || p.last_name as patient_name
FROM lab_results lr
JOIN patients p ON p.id = lr.patient_id
WHERE lr.tenant_id = '46b2a9a6-6cff-4343-bbc1-9e025becd415'
ORDER BY lr.created_at DESC;

-- Also check lab panels
SELECT 
    lp.id,
    lp.patient_id,
    lp.panel_time,
    lp.status,
    lp.created_at,
    p.first_name || ' ' || p.last_name as patient_name
FROM lab_panels lp
JOIN patients p ON p.id = lp.patient_id
WHERE lp.tenant_id = '46b2a9a6-6cff-4343-bbc1-9e025becd415'
ORDER BY lp.created_at DESC;

-- ============================================================================
-- DELETION QUERIES - Remove 3 specific lab panels for Chris Smith
-- ============================================================================

-- Step 1: Delete lab results associated with these 3 panels
DELETE FROM lab_results
WHERE panel_id IN (
    '21d03fbb-06da-437e-a72b-f4bc4f0ace2d',
    '78e79322-cdaa-4d6e-817a-4946d99e557f',
    'ecb6ce0d-9a21-4ca9-ad38-ee167caf1dec'
);

-- Step 2: Delete the 3 lab panels
DELETE FROM lab_panels
WHERE id IN (
    '21d03fbb-06da-437e-a72b-f4bc4f0ace2d',
    '78e79322-cdaa-4d6e-817a-4946d99e557f',
    'ecb6ce0d-9a21-4ca9-ad38-ee167caf1dec'
);

-- Step 3: Verify deletion - should show 0 for these specific panels
SELECT COUNT(*) as deleted_lab_results
FROM lab_results
WHERE panel_id IN (
    '21d03fbb-06da-437e-a72b-f4bc4f0ace2d',
    '78e79322-cdaa-4d6e-817a-4946d99e557f',
    'ecb6ce0d-9a21-4ca9-ad38-ee167caf1dec'
);

SELECT COUNT(*) as deleted_lab_panels
FROM lab_panels
WHERE id IN (
    '21d03fbb-06da-437e-a72b-f4bc4f0ace2d',
    '78e79322-cdaa-4d6e-817a-4946d99e557f',
    'ecb6ce0d-9a21-4ca9-ad38-ee167caf1dec'
);

-- ============================================================================
-- NEXT STEPS AFTER DELETION:
-- ============================================================================
-- 1. Re-enter the correct lab data in the template editor
-- 2. Save a new snapshot to capture the updated data
-- 3. Future simulations will use the corrected lab readings
-- ============================================================================
