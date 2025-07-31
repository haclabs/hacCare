-- Fixed medication_administrations table creation
-- Copy and paste this into Supabase SQL Editor

-- Drop the table if it exists to recreate it properly  
DROP TABLE IF EXISTS public.medication_administrations CASCADE;

-- Drop any existing functions that might interfere
DROP FUNCTION IF EXISTS update_medication_administrations_updated_at() CASCADE;

-- Create the medication_administrations table with proper types
-- Note: Using TEXT types to match frontend data and avoid foreign key issues
CREATE TABLE public.medication_administrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id TEXT, -- Using TEXT to match frontend medication IDs
  patient_id TEXT NOT NULL, -- Using TEXT to match frontend patient IDs (like "PT25379")
  administered_by TEXT NOT NULL,
  administered_by_id TEXT, -- Using TEXT to match frontend user IDs  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  dosage TEXT,
  route TEXT,
  status TEXT CHECK (status IN ('completed', 'missed', 'late', 'partial')) DEFAULT 'completed',
  medication_name TEXT, -- Store medication name directly as fallback
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key constraints only if the referenced tables exist
-- Note: Commenting out foreign key constraints to avoid issues with missing references
-- These can be added later once the referenced tables are properly set up

-- DO $$
-- BEGIN
--   -- Add medication_id foreign key if patient_medications table exists
--   IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patient_medications') THEN
--     ALTER TABLE public.medication_administrations 
--     ADD CONSTRAINT fk_medication_administrations_medication_id 
--     FOREIGN KEY (medication_id) REFERENCES public.patient_medications(id) ON DELETE CASCADE;
--   END IF;
--   
--   -- Add administered_by_id foreign key if profiles table exists
--   IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'profiles') THEN
--     ALTER TABLE public.medication_administrations 
--     ADD CONSTRAINT fk_medication_administrations_administered_by_id 
--     FOREIGN KEY (administered_by_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
--   END IF;
-- END $$;

-- Create indexes for better performance
CREATE INDEX idx_medication_administrations_patient_id ON public.medication_administrations(patient_id);
CREATE INDEX idx_medication_administrations_medication_id ON public.medication_administrations(medication_id);
CREATE INDEX idx_medication_administrations_timestamp ON public.medication_administrations(timestamp DESC);
CREATE INDEX idx_medication_administrations_administered_by_id ON public.medication_administrations(administered_by_id);

-- Add RLS policy for medication_administrations
ALTER TABLE public.medication_administrations ENABLE ROW LEVEL SECURITY;

-- Users can see administration records for patients in their tenant
-- Handle both UUID and text patient_id formats and missing functions
DO $$
BEGIN
  -- Check if the required functions exist before creating the policy
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_super_admin_direct') 
     AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_tenant_direct') THEN
    
    EXECUTE 'CREATE POLICY "medication_administrations_tenant_access" ON public.medication_administrations
      FOR ALL USING (
        is_super_admin_direct() OR
        EXISTS (
          SELECT 1 FROM patients p 
          WHERE (
            (p.patient_id::text = medication_administrations.patient_id) OR
            (p.patient_id = medication_administrations.patient_id) OR
            (p.patient_id::text = medication_administrations.patient_id::text)
          )
          AND p.tenant_id = get_user_tenant_direct()
        ) OR
        auth.role() = ''service_role''
      )';
  ELSE
    -- Create a simple policy if the functions don't exist yet
    EXECUTE 'CREATE POLICY "medication_administrations_basic_access" ON public.medication_administrations
      FOR ALL USING (
        auth.uid() IS NOT NULL OR
        auth.role() = ''service_role''
      )';
  END IF;
END $$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_medication_administrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_medication_administrations_updated_at
  BEFORE UPDATE ON public.medication_administrations
  FOR EACH ROW
  EXECUTE FUNCTION update_medication_administrations_updated_at();

-- Grant permissions
GRANT ALL ON public.medication_administrations TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Insert some sample data for testing (optional - remove if not needed)
-- INSERT INTO public.medication_administrations (
--   medication_id, 
--   patient_id, 
--   administered_by, 
--   administered_by_id,
--   dosage,
--   route,
--   notes
-- ) VALUES (
--   (SELECT id FROM patient_medications LIMIT 1),
--   (SELECT patient_id FROM patients LIMIT 1),
--   'Sample Nurse',
--   (SELECT id FROM profiles WHERE role = 'nurse' LIMIT 1),
--   '10mg',
--   'oral',
--   'Sample administration for testing'
-- );
