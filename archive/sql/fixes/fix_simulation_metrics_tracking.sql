-- ===========================================================================
-- FIX: Simulation Metrics Tracking - Match UI expectations
-- ===========================================================================
-- This fixes the calculate_simulation_metrics function to track all fields
-- that the debrief report UI expects to display.
-- ===========================================================================

DROP FUNCTION IF EXISTS calculate_simulation_metrics(uuid) CASCADE;

CREATE OR REPLACE FUNCTION calculate_simulation_metrics(p_simulation_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_metrics jsonb;
  v_tenant_id uuid;
  v_unique_participants integer;
  v_total_actions integer;
BEGIN
  -- Get simulation tenant
  SELECT tenant_id INTO v_tenant_id
  FROM simulation_active
  WHERE id = p_simulation_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Simulation not found or has no tenant';
  END IF;
  
  -- Count unique participants from simulation_activity_log
  SELECT COUNT(DISTINCT user_id) INTO v_unique_participants
  FROM simulation_activity_log
  WHERE simulation_id = p_simulation_id;
  
  -- Count total actions from activity log
  SELECT COUNT(*) INTO v_total_actions
  FROM simulation_activity_log
  WHERE simulation_id = p_simulation_id;
  
  -- Calculate comprehensive metrics matching UI expectations
  v_metrics := jsonb_build_object(
    -- Core actions (matching SimulationMetrics interface)
    'medications_administered', (
      SELECT COUNT(*)
      FROM patient_medications pm
      WHERE pm.tenant_id = v_tenant_id
      AND pm.last_administered IS NOT NULL
    ),
    'vitals_recorded', (
      SELECT COUNT(*)
      FROM patient_vitals pv
      WHERE pv.tenant_id = v_tenant_id
    ),
    'notes_created', (
      SELECT COUNT(*)
      FROM patient_notes pn
      WHERE pn.tenant_id = v_tenant_id
    ),
    'alerts_generated', (
      SELECT COUNT(*)
      FROM patient_alerts pa
      WHERE pa.tenant_id = v_tenant_id
    ),
    'alerts_acknowledged', (
      SELECT COUNT(*)
      FROM patient_alerts pa
      WHERE pa.tenant_id = v_tenant_id
      AND pa.acknowledged = true
    ),
    'total_actions', v_total_actions,
    'unique_participants', v_unique_participants,
    
    -- Additional useful metrics (not currently displayed but good to have)
    'assessments_completed', (
      SELECT COUNT(*)
      FROM wound_assessments wa
      WHERE wa.tenant_id = v_tenant_id
    ),
    'total_patients', (
      SELECT COUNT(*)
      FROM patients p
      WHERE p.tenant_id = v_tenant_id
    ),
    'diabetic_records', (
      SELECT COUNT(*)
      FROM diabetic_records dr
      WHERE dr.tenant_id = v_tenant_id
    ),
    'bowel_records', (
      SELECT COUNT(*)
      FROM bowel_records br
      WHERE br.patient_id IN (
        SELECT id FROM patients WHERE tenant_id = v_tenant_id
      )
    ),
    'doctors_orders', (
      SELECT COUNT(*)
      FROM doctors_orders dord
      WHERE dord.tenant_id = v_tenant_id
    ),
    'handover_notes', (
      SELECT COUNT(*)
      FROM handover_notes hn
      WHERE hn.patient_id IN (
        SELECT id FROM patients WHERE tenant_id = v_tenant_id
      )
    ),
    
    -- Calculated percentages (for future use)
    'alert_acknowledgement_rate', (
      CASE 
        WHEN (SELECT COUNT(*) FROM patient_alerts WHERE tenant_id = v_tenant_id) > 0
        THEN ROUND(
          (SELECT COUNT(*) FROM patient_alerts WHERE tenant_id = v_tenant_id AND acknowledged = true)::numeric /
          (SELECT COUNT(*) FROM patient_alerts WHERE tenant_id = v_tenant_id)::numeric * 100,
          2
        )
        ELSE 0
      END
    )
  );
  
  RETURN v_metrics;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_simulation_metrics(uuid) TO authenticated;

COMMENT ON FUNCTION calculate_simulation_metrics IS 'Calculate comprehensive simulation metrics matching UI expectations';

SELECT '✅ Simulation metrics tracking fixed - all fields now match UI!' as status;
