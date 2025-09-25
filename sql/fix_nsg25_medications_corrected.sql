-- Fix NSG25 Medication Tenant Mismatches - CORRECTED VERSION
-- The tenant subdomain is 'nsg-25', not 'NSG25'

-- 1. First, let's find the correct NSG25 tenant ID
SELECT 'NSG25 Tenant Info' as section, id, name, subdomain 
FROM tenants 
WHERE subdomain = 'nsg-25';

-- 2. Get the tenant ID into a variable for the update
DO $$
DECLARE
    nsg25_tenant_id UUID;
    lethpoly_tenant_id UUID := '2006e67a-7bc2-4e9b-a44f-9b166d6cb6c8';
    mismatch_count INTEGER;
    updated_count INTEGER;
BEGIN
    -- Get the correct NSG25 tenant ID
    SELECT id INTO nsg25_tenant_id 
    FROM tenants 
    WHERE subdomain = 'nsg-25';
    
    IF nsg25_tenant_id IS NULL THEN
        RAISE EXCEPTION 'NSG25 tenant (subdomain: nsg-25) not found!';
    END IF;
    
    RAISE NOTICE 'NSG25 Tenant ID: %', nsg25_tenant_id;
    
    -- Count mismatched medications BEFORE fix
    SELECT COUNT(*) INTO mismatch_count
    FROM patient_medications pm
    JOIN patients p ON pm.patient_id = p.id
    WHERE p.tenant_id = nsg25_tenant_id  -- NSG25 patients
    AND pm.tenant_id != p.tenant_id      -- But medications have wrong tenant
    AND pm.status = 'Active';
    
    RAISE NOTICE 'Found % mismatched medications before fix', mismatch_count;
    
    -- Update all NSG25 patient medications to have correct NSG25 tenant_id
    UPDATE patient_medications 
    SET tenant_id = nsg25_tenant_id
    FROM patients p
    WHERE patient_medications.patient_id = p.id
    AND p.tenant_id = nsg25_tenant_id
    AND patient_medications.tenant_id != p.tenant_id;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % medication records to correct tenant', updated_count;
    
    -- Verify the fix
    SELECT COUNT(*) INTO mismatch_count
    FROM patient_medications pm
    JOIN patients p ON pm.patient_id = p.id
    WHERE p.tenant_id = nsg25_tenant_id
    AND pm.tenant_id != p.tenant_id
    AND pm.status = 'Active';
    
    RAISE NOTICE 'Remaining mismatches after fix: %', mismatch_count;
    
END $$;

-- 3. Show final results
SELECT 
    'Final Verification' as section,
    p.first_name,
    p.last_name,
    COUNT(pm.id) as medication_count
FROM patients p
LEFT JOIN patient_medications pm ON p.id = pm.patient_id AND pm.status = 'Active'
WHERE p.tenant_id = (SELECT id FROM tenants WHERE subdomain = 'nsg-25')
GROUP BY p.id, p.first_name, p.last_name
ORDER BY p.last_name, p.first_name;

-- 4. Show tenant summary
SELECT 
    'Tenant Summary' as section,
    t.name as tenant_name,
    t.subdomain,
    COUNT(pm.id) as total_medications
FROM tenants t
LEFT JOIN patient_medications pm ON t.id = pm.tenant_id AND pm.status = 'Active'
WHERE t.subdomain IN ('lethpoly', 'nsg-25')
GROUP BY t.id, t.name, t.subdomain
ORDER BY t.name;