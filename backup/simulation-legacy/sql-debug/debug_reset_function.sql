-- DEBUG: Test the reset function with detailed logging
-- Run this in Supabase SQL Editor to see what's happening

-- First, let's see what's in your current simulation
SELECT 
    sa.id as simulation_id,
    sa.name as simulation_name,
    sa.tenant_id,
    sa.template_id,
    st.name as template_name,
    (st.snapshot_data->>'patient_vitals') IS NOT NULL as has_vitals_in_snapshot,
    jsonb_array_length(st.snapshot_data->'patient_vitals') as vitals_count_in_snapshot
FROM simulation_active sa
JOIN simulation_templates st ON st.id = sa.template_id
WHERE sa.id = 'd5ae8b1c-2e02-4e2f-a534-3cd1f00e67f5';

-- Check current vitals in the simulation tenant
SELECT 'CURRENT VITALS IN SIMULATION:' as info;
SELECT 
    pv.id,
    pv.patient_id,
    pv.temperature,
    pv.heart_rate,
    pv.respiratory_rate,
    pv.recorded_at,
    pv.tenant_id
FROM patient_vitals pv
WHERE pv.tenant_id = '3efea920-ac9e-4d04-8d36-b1e44649dcc4'
ORDER BY pv.recorded_at;

-- Check what vitals are in the template snapshot
SELECT 'VITALS IN TEMPLATE SNAPSHOT:' as info;
SELECT 
    st.name as template_name,
    jsonb_pretty(st.snapshot_data->'patient_vitals') as vitals_snapshot
FROM simulation_templates st
WHERE st.id = 'fdd2f3c1-b248-4a1f-8bca-f376b291b134';

-- Let's also manually test the reset function with detailed output
SELECT 'TESTING RESET FUNCTION:' as info;
SELECT reset_simulation_for_next_session_v2('d5ae8b1c-2e02-4e2f-a534-3cd1f00e67f5');