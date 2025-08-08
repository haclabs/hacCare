-- LethPoly Tenant Setup for haccare.app
-- Run this in your Supabase SQL editor

-- 0. Create required functions if they don't exist
CREATE OR REPLACE FUNCTION validate_subdomain(subdomain_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if subdomain is valid (alphanumeric, hyphens, 3-50 chars)
    RETURN subdomain_text ~ '^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$' 
           AND LENGTH(subdomain_text) BETWEEN 3 AND 50
           AND subdomain_text NOT IN ('www', 'admin', 'api', 'mail', 'ftp', 'cdn', 'assets');
END;
$$ LANGUAGE plpgsql;

-- Ensure subdomain column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tenants' AND column_name = 'subdomain'
    ) THEN
        ALTER TABLE tenants ADD COLUMN subdomain VARCHAR(50);
    END IF;
END $$;

-- Create unique constraint on subdomain if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'unique_subdomain' AND table_name = 'tenants'
    ) THEN
        ALTER TABLE tenants ADD CONSTRAINT unique_subdomain UNIQUE (subdomain);
    END IF;
END $$;

-- Create index for faster subdomain lookups
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);

-- 1. First, let's check if LethPoly tenant exists
DO $$
DECLARE
    tenant_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tenant_count 
    FROM tenants 
    WHERE name = 'LethPoly' OR subdomain = 'lethpoly';
    
    RAISE NOTICE 'Found % LethPoly tenant(s)', tenant_count;
END $$;

-- 2. Update LethPoly tenant to ensure correct subdomain
UPDATE tenants 
SET subdomain = 'lethpoly'
WHERE name = 'LethPoly' AND (subdomain IS NULL OR subdomain != 'lethpoly');

-- 3. If LethPoly doesn't exist, create it (update the admin_user_id)
INSERT INTO tenants (
    name, 
    subdomain, 
    status, 
    admin_user_id, 
    subscription_plan, 
    max_users, 
    max_patients, 
    settings
) 
SELECT 
    'LethPoly',
    'lethpoly',
    'active',
    (SELECT id FROM user_profiles WHERE email = 'admin@haccare.com' LIMIT 1), -- Update this email
    'premium',
    100,
    1000,
    jsonb_build_object(
        'timezone', 'UTC',
        'date_format', 'MM/DD/YYYY',
        'currency', 'USD',
        'features', jsonb_build_object(
            'advanced_analytics', true,
            'medication_management', true,
            'wound_care', true,
            'barcode_scanning', true,
            'mobile_app', true
        ),
        'security', jsonb_build_object(
            'two_factor_required', false,
            'session_timeout', 480,
            'password_policy', jsonb_build_object(
                'min_length', 8,
                'require_uppercase', true,
                'require_lowercase', true,
                'require_numbers', true,
                'require_symbols', false
            )
        )
    )
WHERE NOT EXISTS (
    SELECT 1 FROM tenants WHERE name = 'LethPoly' OR subdomain = 'lethpoly'
);

-- 4. Verify the setup
SELECT 
    'LethPoly Tenant Verification' as check_type,
    id,
    name,
    subdomain,
    status,
    subscription_plan,
    admin_user_id
FROM tenants 
WHERE name = 'LethPoly' OR subdomain = 'lethpoly';

-- 5. Check if there are any users assigned to LethPoly
SELECT 
    'LethPoly Users' as check_type,
    tu.user_id,
    up.email,
    up.first_name,
    up.last_name,
    tu.role,
    tu.is_active
FROM tenant_users tu
JOIN user_profiles up ON tu.user_id = up.id
JOIN tenants t ON tu.tenant_id = t.id
WHERE t.subdomain = 'lethpoly';

-- 6. Test subdomain validation
SELECT 
    'Subdomain Validation' as check_type,
    subdomain,
    validate_subdomain(subdomain) as is_valid
FROM tenants 
WHERE subdomain = 'lethpoly';

-- 7. Create sample patients for LethPoly (optional)
-- Using the actual patients table structure
DO $$
DECLARE
    lethpoly_tenant_id UUID;
BEGIN
    -- Get the LethPoly tenant ID
    SELECT id INTO lethpoly_tenant_id 
    FROM tenants 
    WHERE subdomain = 'lethpoly' 
    LIMIT 1;
    
    -- Only proceed if LethPoly tenant exists
    IF lethpoly_tenant_id IS NOT NULL THEN
        -- Insert patient with all required NOT NULL fields
        INSERT INTO patients (
            tenant_id,
            patient_id,
            first_name,
            last_name,
            date_of_birth,
            gender,
            room_number,
            bed_number,
            admission_date,
            condition,
            diagnosis,
            allergies,
            blood_type,
            emergency_contact_name,
            emergency_contact_relationship,
            emergency_contact_phone,
            assigned_nurse
        )
        SELECT 
            lethpoly_tenant_id,
            'LP001',                    -- patient_id (NOT NULL)
            'John',                     -- first_name (NOT NULL)
            'Doe',                      -- last_name (NOT NULL)
            '1980-05-15'::date,         -- date_of_birth (NOT NULL)
            'male',                     -- gender (NOT NULL)
            '101A',                     -- room_number (NOT NULL)
            'A',                        -- bed_number (NOT NULL)
            CURRENT_DATE,               -- admission_date (NOT NULL)
            'Stable',                   -- condition (NOT NULL)
            'Hypertension',             -- diagnosis (NOT NULL)
            ARRAY['Penicillin'],        -- allergies (can be NULL, defaults to '{}')
            'O+',                       -- blood_type (NOT NULL)
            'Jane Doe',                 -- emergency_contact_name (NOT NULL)
            'Spouse',                   -- emergency_contact_relationship (NOT NULL)
            '555-0123',                 -- emergency_contact_phone (NOT NULL)
            'Nurse Smith'               -- assigned_nurse (NOT NULL)
        WHERE NOT EXISTS (
            SELECT 1 FROM patients 
            WHERE patient_id = 'LP001' 
            AND tenant_id = lethpoly_tenant_id
        );
        
        RAISE NOTICE 'Sample patient created for LethPoly tenant';
    ELSE
        RAISE NOTICE 'LethPoly tenant not found, skipping patient creation';
    END IF;
END $$;

-- 8. Final verification query
SELECT 
    'Final Setup Verification' as status,
    COUNT(CASE WHEN name = 'LethPoly' THEN 1 END) as lethpoly_tenants,
    COUNT(CASE WHEN subdomain = 'lethpoly' THEN 1 END) as lethpoly_subdomains,
    (SELECT COUNT(*) FROM patients p JOIN tenants t ON p.tenant_id = t.id WHERE t.subdomain = 'lethpoly') as lethpoly_patients
FROM tenants;

-- 9. Show LethPoly tenant access URL
SELECT 
    'Access Information' as info_type,
    'https://lethpoly.haccare.app' as tenant_url,
    'https://haccare.app' as main_app_url,
    subdomain as configured_subdomain,
    status as tenant_status
FROM tenants 
WHERE subdomain = 'lethpoly';

COMMIT;
