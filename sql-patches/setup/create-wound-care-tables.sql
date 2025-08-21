-- Wound Care Tables Migration Script
-- Creates tables for wound assessments and treatments with RLS policies

-- Create wound_assessments table
CREATE TABLE IF NOT EXISTS wound_assessments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    assessment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    wound_location TEXT NOT NULL,
    wound_type TEXT NOT NULL CHECK (wound_type IN ('surgical', 'pressure', 'venous', 'arterial', 'diabetic', 'traumatic', 'other')),
    stage TEXT,
    length_cm NUMERIC(5,2) NOT NULL DEFAULT 0,
    width_cm NUMERIC(5,2) NOT NULL DEFAULT 0,
    depth_cm NUMERIC(5,2) NOT NULL DEFAULT 0,
    wound_bed TEXT NOT NULL CHECK (wound_bed IN ('red', 'yellow', 'black', 'mixed')),
    exudate_amount TEXT NOT NULL CHECK (exudate_amount IN ('none', 'minimal', 'moderate', 'heavy')),
    exudate_type TEXT NOT NULL CHECK (exudate_type IN ('serous', 'sanguineous', 'serosanguineous', 'purulent', 'other')),
    periwound_condition TEXT NOT NULL,
    pain_level INTEGER NOT NULL CHECK (pain_level >= 0 AND pain_level <= 10),
    odor BOOLEAN NOT NULL DEFAULT FALSE,
    signs_of_infection BOOLEAN NOT NULL DEFAULT FALSE,
    assessment_notes TEXT NOT NULL,
    photos TEXT[], -- Array of photo URLs
    assessor_id UUID NOT NULL REFERENCES auth.users(id),
    assessor_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create wound_treatments table
CREATE TABLE IF NOT EXISTS wound_treatments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    wound_assessment_id UUID REFERENCES wound_assessments(id) ON DELETE SET NULL,
    treatment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    treatment_type TEXT NOT NULL,
    products_used TEXT NOT NULL,
    procedure_notes TEXT NOT NULL,
    administered_by TEXT NOT NULL,
    administered_by_id UUID NOT NULL REFERENCES auth.users(id),
    administered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    next_treatment_due TIMESTAMP WITH TIME ZONE,
    photos_after TEXT[], -- Array of photo URLs after treatment
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wound_assessments_patient_id ON wound_assessments(patient_id);
CREATE INDEX IF NOT EXISTS idx_wound_assessments_tenant_id ON wound_assessments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wound_assessments_assessment_date ON wound_assessments(assessment_date);
CREATE INDEX IF NOT EXISTS idx_wound_assessments_assessor_id ON wound_assessments(assessor_id);

CREATE INDEX IF NOT EXISTS idx_wound_treatments_patient_id ON wound_treatments(patient_id);
CREATE INDEX IF NOT EXISTS idx_wound_treatments_tenant_id ON wound_treatments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wound_treatments_assessment_id ON wound_treatments(wound_assessment_id);
CREATE INDEX IF NOT EXISTS idx_wound_treatments_treatment_date ON wound_treatments(treatment_date);
CREATE INDEX IF NOT EXISTS idx_wound_treatments_administered_by_id ON wound_treatments(administered_by_id);

-- Enable Row Level Security
ALTER TABLE wound_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wound_treatments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for wound_assessments
CREATE POLICY "Tenant isolation for wound assessments" ON wound_assessments
    FOR ALL USING (
        tenant_id = (
            SELECT tenant_id 
            FROM tenant_users 
            WHERE user_id = (SELECT auth.uid()) 
            AND is_active = true
        )
    );

-- Create RLS policies for wound_treatments
CREATE POLICY "Tenant isolation for wound treatments" ON wound_treatments
    FOR ALL USING (
        tenant_id = (
            SELECT tenant_id 
            FROM tenant_users 
            WHERE user_id = (SELECT auth.uid()) 
            AND is_active = true
        )
    );

-- Create trigger to automatically set tenant_id from patient
CREATE OR REPLACE FUNCTION set_wound_assessment_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.tenant_id = (SELECT tenant_id FROM patients WHERE id = NEW.patient_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_wound_treatment_tenant_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.tenant_id = (SELECT tenant_id FROM patients WHERE id = NEW.patient_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_wound_assessment_tenant_id
    BEFORE INSERT ON wound_assessments
    FOR EACH ROW
    EXECUTE FUNCTION set_wound_assessment_tenant_id();

CREATE TRIGGER trigger_set_wound_treatment_tenant_id
    BEFORE INSERT ON wound_treatments
    FOR EACH ROW
    EXECUTE FUNCTION set_wound_treatment_tenant_id();

-- Create trigger for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_wound_assessments_updated_at
    BEFORE UPDATE ON wound_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_wound_treatments_updated_at
    BEFORE UPDATE ON wound_treatments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create wound-photos storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('wound-photos', 'wound-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for wound photos
CREATE POLICY "Authenticated users can upload wound photos" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'wound-photos');

CREATE POLICY "Authenticated users can view wound photos" ON storage.objects
    FOR SELECT TO authenticated
    USING (bucket_id = 'wound-photos');

CREATE POLICY "Users can update their uploaded photos" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'wound-photos' AND owner = auth.uid());

CREATE POLICY "Users can delete their uploaded photos" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'wound-photos' AND owner = auth.uid());

-- Grant necessary permissions
GRANT ALL ON wound_assessments TO authenticated;
GRANT ALL ON wound_treatments TO authenticated;

-- Add wound_care feature to default tenant settings
UPDATE tenants 
SET settings = jsonb_set(
    settings, 
    '{features,wound_care}', 
    'true'::jsonb
)
WHERE settings->'features'->>'wound_care' IS NULL;

COMMENT ON TABLE wound_assessments IS 'Stores comprehensive wound assessment data including measurements, photos, and clinical observations';
COMMENT ON TABLE wound_treatments IS 'Tracks wound treatment history, procedures, and outcomes';
COMMENT ON COLUMN wound_assessments.photos IS 'Array of Supabase Storage URLs for wound documentation photos';
COMMENT ON COLUMN wound_treatments.photos_after IS 'Array of Supabase Storage URLs for post-treatment photos';
