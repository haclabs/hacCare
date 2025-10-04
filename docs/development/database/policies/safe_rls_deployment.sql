-- Safe RLS Policy Deployment Script
-- This script validates table structures before applying policy changes

-- 1. First, let's check what tables actually exist and their column structures
DO $$
DECLARE
    table_record RECORD;
    column_record RECORD;
BEGIN
    RAISE NOTICE 'Checking table structures before applying RLS policy changes...';
    
    -- Check bowel_records structure
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bowel_records' AND table_schema = 'public') THEN
        RAISE NOTICE 'bowel_records table exists';
        FOR column_record IN 
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'bowel_records' AND table_schema = 'public'
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  Column: % (%)', column_record.column_name, column_record.data_type;
        END LOOP;
    ELSE
        RAISE NOTICE 'bowel_records table does not exist';
    END IF;
    
    -- Check simulation tables
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'simulation_patient_%'
        ORDER BY table_name
    LOOP
        RAISE NOTICE 'Simulation table: %', table_record.table_name;
        -- Show key columns
        FOR column_record IN 
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = table_record.table_name 
            AND table_schema = 'public'
            AND column_name IN ('id', 'simulation_id', 'patient_id', 'active_simulation_id', 'tenant_id')
            ORDER BY ordinal_position
        LOOP
            RAISE NOTICE '  Key column: %', column_record.column_name;
        END LOOP;
    END LOOP;
END $$;

-- 2. Safe policy updates based on table structures

-- Only apply bowel_records policy if the table exists and has nurse_id column  
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'bowel_records' 
        AND table_schema = 'public' 
        AND column_name = 'nurse_id'
    ) THEN
        -- Apply the nurse-based policy
        DROP POLICY IF EXISTS "Users can read all bowel records" ON public.bowel_records;
        
        CREATE POLICY "bowel_records_secure_access" ON public.bowel_records
        FOR SELECT USING (
            -- Nurse can see their own records
            nurse_id = auth.uid()
            OR
            -- Super admin can see all records
            EXISTS (
                SELECT 1 FROM user_profiles 
                WHERE id = auth.uid() 
                AND role = 'super_admin'
                AND is_active = true
            )
        );
        
        RAISE NOTICE 'Applied secure policy to bowel_records';
    ELSE
        RAISE NOTICE 'Skipping bowel_records - table structure not as expected';
    END IF;
END $$;

-- 3. Safe simulation table policy updates
DO $$
DECLARE
    sim_table TEXT;
    sim_tables TEXT[] := ARRAY['simulation_patient_medications', 'simulation_patient_notes', 'simulation_patient_vitals'];
BEGIN
    FOREACH sim_table IN ARRAY sim_tables
    LOOP
        -- Check if table exists
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = sim_table 
            AND table_schema = 'public'
        ) THEN
            -- Remove the overly permissive "true" policy
            EXECUTE format('DROP POLICY IF EXISTS "Allow all operations on %s" ON public.%s', sim_table, sim_table);
            
            -- Add authenticated-only policy (much safer than "true")
            EXECUTE format('
                CREATE POLICY "%s_authenticated_only" ON public.%s
                FOR ALL USING (auth.role() = ''authenticated'')
            ', sim_table, sim_table);
            
            RAISE NOTICE 'Applied authenticated-only policy to %', sim_table;
        ELSE
            RAISE NOTICE 'Skipping % - table does not exist', sim_table;
        END IF;
    END LOOP;
END $$;

-- 4. Consolidate active_simulations policies safely
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'active_simulations' 
        AND table_schema = 'public'
    ) THEN
        -- Drop the multiple overlapping policies
        DROP POLICY IF EXISTS "Users can access their simulations" ON public.active_simulations;
        DROP POLICY IF EXISTS "Users can manage simulations for their tenant" ON public.active_simulations;  
        DROP POLICY IF EXISTS "Users can view active simulations for their tenant" ON public.active_simulations;
        
        -- Create a simple, safe unified policy
        CREATE POLICY "active_simulations_authenticated_access" ON public.active_simulations
        FOR ALL USING (
            auth.role() = 'authenticated'
        );
        
        RAISE NOTICE 'Consolidated active_simulations policies';
    END IF;
END $$;

-- 5. Add performance indexes safely
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_users_performance 
ON tenant_users (user_id, is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_super_admin 
ON user_profiles (id, role) 
WHERE role = 'super_admin' AND is_active = true;

-- 6. Final validation
SELECT 
    schemaname,
    tablename,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ' ORDER BY policyname) as policies
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('bowel_records', 'active_simulations', 'simulation_patient_medications', 'simulation_patient_notes', 'simulation_patient_vitals')
GROUP BY schemaname, tablename
ORDER BY tablename;

RAISE NOTICE 'Safe RLS policy deployment completed successfully!';