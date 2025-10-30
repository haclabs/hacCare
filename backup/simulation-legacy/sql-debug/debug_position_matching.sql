-- DEBUG: Test position-based patient matching logic
-- This tests the exact logic used in reset_simulation_for_next_session_v2

-- Current simulation ID and tenant
DO $$ 
DECLARE
    sim_id uuid := '19cee8db-d076-4d57-b765-b43f306b2d02';
    sim_tenant uuid := 'd0ac6b21-5a66-401f-a718-7646ee4174f6';
    template_tenant uuid;
BEGIN
    -- Get template tenant
    SELECT st.tenant_id INTO template_tenant
    FROM simulation_active sa
    JOIN simulation_templates st ON st.id = sa.template_id
    WHERE sa.id = sim_id;
    
    RAISE NOTICE 'Simulation ID: %', sim_id;
    RAISE NOTICE 'Simulation Tenant: %', sim_tenant;
    RAISE NOTICE 'Template Tenant: %', template_tenant;
    RAISE NOTICE '';
    
    -- Test 1: Show template patients with positions
    RAISE NOTICE '=== TEMPLATE PATIENTS (ordered by created_at, id) ===';
    FOR rec IN 
        SELECT 
            ROW_NUMBER() OVER (ORDER BY p.created_at, p.id) as position,
            p.id,
            CONCAT(p.first_name, ' ', p.last_name) as name,
            p.created_at
        FROM patients p
        WHERE p.tenant_id = template_tenant
        ORDER BY p.created_at, p.id
    LOOP
        RAISE NOTICE 'Position %: % (%) - Created: %', rec.position, rec.name, rec.id, rec.created_at;
    END LOOP;
    
    RAISE NOTICE '';
    
    -- Test 2: Show simulation patients with positions  
    RAISE NOTICE '=== SIMULATION PATIENTS (ordered by created_at, id) ===';
    FOR rec IN 
        SELECT 
            ROW_NUMBER() OVER (ORDER BY p.created_at, p.id) as position,
            p.id,
            CONCAT(p.first_name, ' ', p.last_name) as name,
            p.created_at
        FROM patients p
        WHERE p.tenant_id = sim_tenant
        ORDER BY p.created_at, p.id
    LOOP
        RAISE NOTICE 'Position %: % (%) - Created: %', rec.position, rec.name, rec.id, rec.created_at;
    END LOOP;
    
    RAISE NOTICE '';
    
    -- Test 3: Show position-based mapping (like the reset function does)
    RAISE NOTICE '=== POSITION-BASED MAPPING TEST ===';
    FOR rec IN 
        SELECT 
            tp.position as template_position,
            tp.id as template_patient_id,
            tp.name as template_name,
            sp.id as simulation_patient_id,
            sp.name as simulation_name
        FROM (
            SELECT 
                ROW_NUMBER() OVER (ORDER BY p.created_at, p.id) as position,
                p.id,
                CONCAT(p.first_name, ' ', p.last_name) as name
            FROM patients p
            WHERE p.tenant_id = template_tenant
        ) tp
        JOIN (
            SELECT 
                ROW_NUMBER() OVER (ORDER BY p.created_at, p.id) as position,
                p.id,
                CONCAT(p.first_name, ' ', p.last_name) as name
            FROM patients p
            WHERE p.tenant_id = sim_tenant
        ) sp ON tp.position = sp.position
        ORDER BY tp.position
    LOOP
        RAISE NOTICE 'Position %: Template "%s" (%s) → Simulation "%s" (%s)', 
                     rec.template_position, rec.template_name, rec.template_patient_id, 
                     rec.simulation_name, rec.simulation_patient_id;
    END LOOP;
    
    RAISE NOTICE '';
    
    -- Test 4: Check vitals counts
    RAISE NOTICE '=== VITALS ANALYSIS ===';
    FOR rec IN
        SELECT 
            'Template' as source,
            COUNT(*) as vitals_count
        FROM patient_vitals pv
        WHERE pv.tenant_id = template_tenant
        
        UNION ALL
        
        SELECT 
            'Simulation' as source,
            COUNT(*) as vitals_count
        FROM patient_vitals pv
        WHERE pv.tenant_id = sim_tenant
    LOOP
        RAISE NOTICE '% vitals: %', rec.source, rec.vitals_count;
    END LOOP;
END $$;