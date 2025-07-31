-- Create medication_administrations table if it doesn't exist
-- Copy and paste this into Supabase SQL Editor

-- Create the medication_administrations table
CREATE TABLE IF NOT EXISTS public.medication_administrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medication_id UUID REFERENCES public.medications(id) ON DELETE CASCADE,
  patient_id VARCHAR NOT NULL, -- Using VARCHAR to match patients.patient_id
  administered_by VARCHAR NOT NULL,
  administered_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  dosage VARCHAR,
  route VARCHAR,
  status VARCHAR CHECK (status IN ('completed', 'missed', 'late', 'partial')) DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_medication_administrations_patient_id ON public.medication_administrations(patient_id);
CREATE INDEX IF NOT EXISTS idx_medication_administrations_medication_id ON public.medication_administrations(medication_id);
CREATE INDEX IF NOT EXISTS idx_medication_administrations_timestamp ON public.medication_administrations(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_medication_administrations_administered_by_id ON public.medication_administrations(administered_by_id);

-- Add RLS policy for medication_administrations
ALTER TABLE public.medication_administrations ENABLE ROW LEVEL SECURITY;

-- Users can see administration records for patients in their tenant
CREATE POLICY "medication_administrations_tenant_access" ON public.medication_administrations
  FOR ALL USING (
    is_super_admin_direct() OR
    EXISTS (
      SELECT 1 FROM patients p 
      WHERE p.patient_id::text = medication_administrations.patient_id 
      AND p.tenant_id = get_user_tenant_direct()
    ) OR
    auth.role() = 'service_role'
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_medication_administrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_medication_administrations_updated_at ON public.medication_administrations;
CREATE TRIGGER update_medication_administrations_updated_at
  BEFORE UPDATE ON public.medication_administrations
  FOR EACH ROW
  EXECUTE FUNCTION update_medication_administrations_updated_at();

-- Grant permissions
GRANT ALL ON public.medication_administrations TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
