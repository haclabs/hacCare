-- Quick fix: Add vitals to template tenant, then retake snapshot
-- This will populate the template with vitals data

-- First, find the template tenant ID
SELECT 'TEMPLATE TENANT ID:' as info;
SELECT st.tenant_id as template_tenant_id, st.name as template_name
FROM simulation_templates st
WHERE st.id = (
    SELECT sa.template_id 
    FROM simulation_active sa 
    WHERE sa.tenant_id = '2aeef624-0e09-4cf6-afa3-90947373fb5f' 
    LIMIT 1
);

-- Add some sample vitals to template patients
-- (Replace the tenant_id below with the actual template tenant ID from above)
INSERT INTO patient_vitals (patient_id, tenant_id, temperature, heart_rate, respiratory_rate, blood_pressure_systolic, blood_pressure_diastolic, oxygen_saturation, recorded_at)
SELECT 
    p.id,
    p.tenant_id,
    36.5 + (RANDOM() * 2), -- Temperature 36.5-38.5
    60 + (RANDOM() * 40)::integer, -- Heart rate 60-100
    12 + (RANDOM() * 8)::integer, -- Respiratory rate 12-20
    110 + (RANDOM() * 30)::integer, -- Systolic 110-140
    70 + (RANDOM() * 20)::integer, -- Diastolic 70-90
    95 + (RANDOM() * 5)::integer, -- O2 Sat 95-100
    NOW() - interval '1 hour'
FROM patients p
WHERE p.tenant_id = 'REPLACE_WITH_TEMPLATE_TENANT_ID' -- Replace this!
LIMIT 3; -- Just add vitals for first 3 patients

-- After running this, go to the template and click "Take Snapshot"
-- Then the reset function should work!