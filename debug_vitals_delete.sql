-- Debug: Check patient_vitals DELETE logic
-- Run this to see what's happening with vitals

-- 1. Check current vitals count
SELECT 
  'Current vitals count' as check_type,
  COUNT(*) as count,
  array_agg(DISTINCT pv.patient_id) as patient_ids
FROM patient_vitals pv
JOIN patients p ON p.id = pv.patient_id
WHERE p.tenant_id IN (SELECT tenant_id FROM simulation_active LIMIT 1);

-- 2. Check if vitals have tenant_id set
SELECT 
  'Vitals with tenant_id' as check_type,
  COUNT(*) as count
FROM patient_vitals pv
JOIN patients p ON p.id = pv.patient_id
WHERE p.tenant_id IN (SELECT tenant_id FROM simulation_active LIMIT 1)
  AND pv.tenant_id IS NOT NULL;

-- 3. Check if vitals have NULL tenant_id
SELECT 
  'Vitals with NULL tenant_id' as check_type,
  COUNT(*) as count
FROM patient_vitals pv
JOIN patients p ON p.id = pv.patient_id
WHERE p.tenant_id IN (SELECT tenant_id FROM simulation_active LIMIT 1)
  AND pv.tenant_id IS NULL;

-- 4. Show actual vital data
SELECT 
  pv.id as vital_id,
  pv.patient_id,
  pv.tenant_id as vital_tenant_id,
  p.tenant_id as patient_tenant_id,
  p.first_name,
  p.last_name,
  pv.heart_rate,
  pv.recorded_at
FROM patient_vitals pv
JOIN patients p ON p.id = pv.patient_id
WHERE p.tenant_id IN (SELECT tenant_id FROM simulation_active LIMIT 1)
ORDER BY pv.recorded_at;

-- 5. Test the DELETE query that should be running
DO $$
DECLARE
  v_sim_tenant_id uuid;
  v_deleted_count integer;
  v_rec RECORD;
BEGIN
  -- Get simulation tenant
  SELECT tenant_id INTO v_sim_tenant_id FROM simulation_active LIMIT 1;
  
  RAISE NOTICE 'Simulation tenant_id: %', v_sim_tenant_id;
  
  -- Show what WOULD be deleted
  RAISE NOTICE 'Vitals that WOULD be deleted:';
  FOR v_rec IN 
    SELECT pv.id, pv.patient_id, pv.tenant_id, pv.heart_rate
    FROM patient_vitals pv
    WHERE pv.patient_id IN (SELECT id FROM patients WHERE tenant_id = v_sim_tenant_id)
  LOOP
    RAISE NOTICE '  - Vital ID: %, Patient: %, Tenant: %, HR: %', 
      v_rec.id, v_rec.patient_id, v_rec.tenant_id, v_rec.heart_rate;
  END LOOP;
  
  -- Count what would be deleted
  SELECT COUNT(*) INTO v_deleted_count
  FROM patient_vitals
  WHERE patient_id IN (SELECT id FROM patients WHERE tenant_id = v_sim_tenant_id);
  
  RAISE NOTICE 'Total vitals that WOULD be deleted: %', v_deleted_count;
END $$;
