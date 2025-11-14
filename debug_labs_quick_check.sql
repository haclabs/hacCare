-- =====================================================
-- QUICK DIAGNOSTIC: Check if Labs are in Snapshot and Simulation
-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================

-- Get your most recent simulation
WITH recent_sim AS (
  SELECT 
    sa.id as sim_id,
    sa.name as sim_name,
    sa.tenant_id,
    sa.template_id,
    st.name as template_name
  FROM simulation_active sa
  JOIN simulation_templates st ON st.id = sa.template_id
  ORDER BY sa.created_at DESC
  LIMIT 1
)

SELECT
  rs.sim_name,
  rs.template_name,
  '--- SNAPSHOT DATA ---' as section,
  COALESCE(jsonb_array_length(st.snapshot_data->'lab_panels'), 0) as lab_panels_in_snapshot,
  COALESCE(jsonb_array_length(st.snapshot_data->'lab_results'), 0) as lab_results_in_snapshot,
  '--- ACTUAL DATA IN SIMULATION ---' as section2,
  (SELECT COUNT(*) 
   FROM lab_panels lp 
   JOIN patients p ON p.id = lp.patient_id 
   WHERE p.tenant_id = rs.tenant_id) as lab_panels_in_simulation,
  (SELECT COUNT(*) 
   FROM lab_results lr
   JOIN lab_panels lp ON lp.id = lr.panel_id
   JOIN patients p ON p.id = lp.patient_id
   WHERE p.tenant_id = rs.tenant_id) as lab_results_in_simulation
FROM recent_sim rs
JOIN simulation_templates st ON st.id = rs.template_id;
