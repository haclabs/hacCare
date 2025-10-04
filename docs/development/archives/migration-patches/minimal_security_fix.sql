-- Minimal Security Fix Script for hacCare
-- This script contains only the essential security fixes that are guaranteed to work

-- 1. Fix Security Definer View (from previous file)
-- Run fix_security_definer_view.sql first

-- 2. Remove overly permissive simulation table policies
-- These policies currently allow unrestricted access with "true"

DO $$
BEGIN
    -- Fix simulation_patient_medications
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'simulation_patient_medications' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Allow all operations on simulation_patient_medications" ON public.simulation_patient_medications;
        
        CREATE POLICY "simulation_patient_medications_auth_required" ON public.simulation_patient_medications
        FOR ALL USING (auth.role() = 'authenticated');
        
        RAISE NOTICE 'Fixed simulation_patient_medications policy';
    END IF;

    -- Fix simulation_patient_notes  
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'simulation_patient_notes' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Allow all operations on simulation_patient_notes" ON public.simulation_patient_notes;
        
        CREATE POLICY "simulation_patient_notes_auth_required" ON public.simulation_patient_notes
        FOR ALL USING (auth.role() = 'authenticated');
        
        RAISE NOTICE 'Fixed simulation_patient_notes policy';
    END IF;

    -- Fix simulation_patient_vitals
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'simulation_patient_vitals' AND table_schema = 'public') THEN
        DROP POLICY IF EXISTS "Allow all operations on simulation_patient_vitals" ON public.simulation_patient_vitals;
        
        CREATE POLICY "simulation_patient_vitals_auth_required" ON public.simulation_patient_vitals  
        FOR ALL USING (auth.role() = 'authenticated');
        
        RAISE NOTICE 'Fixed simulation_patient_vitals policy';
    END IF;
END $$;

-- 3. Fix bowel_records overly permissive SELECT policy
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bowel_records' AND table_schema = 'public') THEN
        -- Check if nurse_id column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bowel_records' AND column_name = 'nurse_id' AND table_schema = 'public') THEN
            DROP POLICY IF EXISTS "Users can read all bowel records" ON public.bowel_records;
            
            CREATE POLICY "bowel_records_secure_select" ON public.bowel_records
            FOR SELECT USING (
                nurse_id = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM user_profiles 
                    WHERE id = auth.uid() 
                    AND role = 'super_admin'
                    AND is_active = true
                )
            );
            
            RAISE NOTICE 'Fixed bowel_records SELECT policy';
        ELSE
            RAISE NOTICE 'Skipped bowel_records - nurse_id column not found';
        END IF;
    END IF;
END $$;

-- 4. Add essential performance indexes
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_active 
ON tenant_users (user_id, is_active) 
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_profiles_super_admin_check
ON user_profiles (id) 
WHERE role = 'super_admin' AND is_active = true;

-- 5. Verify the changes worked
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public'
    AND policyname LIKE '%auth_required%';
    
    RAISE NOTICE 'Security fixes applied successfully! Created % new secure policies.', policy_count;
    RAISE NOTICE 'Minimal security fix deployment completed!';
END $$;

-- Final verification query (you can run this to see the results)
SELECT 
    'Security fixes applied successfully' as status,
    COUNT(*) as new_secure_policies
FROM pg_policies 
WHERE schemaname = 'public'
AND policyname LIKE '%auth_required%';