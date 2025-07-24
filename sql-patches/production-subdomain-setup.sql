-- Production Subdomain Setup Migration
-- Run this in your Supabase SQL editor before deploying to production

-- 1. Add subdomain column to tenants table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'tenants' AND column_name = 'subdomain'
    ) THEN
        ALTER TABLE tenants ADD COLUMN subdomain VARCHAR(50);
    END IF;
END $$;

-- 2. Create unique constraint on subdomain
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_subdomain' AND table_name = 'tenants'
    ) THEN
        ALTER TABLE tenants ADD CONSTRAINT unique_subdomain UNIQUE (subdomain);
    END IF;
END $$;

-- 3. Create index for faster subdomain lookups
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain);

-- 4. Update existing tenants with subdomains (customize as needed)
-- This generates subdomains from tenant names - modify the logic as needed
UPDATE tenants 
SET subdomain = LOWER(
    REGEXP_REPLACE(
        REGEXP_REPLACE(name, '[^a-zA-Z0-9\s]', '', 'g'), -- Remove special chars
        '\s+', '', 'g' -- Remove spaces
    )
)
WHERE subdomain IS NULL OR subdomain = '';

-- 5. Ensure all tenants have non-null subdomains
UPDATE tenants 
SET subdomain = 'tenant' || id::text
WHERE subdomain IS NULL OR subdomain = '';

-- 6. Add NOT NULL constraint after ensuring all records have values
ALTER TABLE tenants ALTER COLUMN subdomain SET NOT NULL;

-- 7. Create function to validate subdomain format
CREATE OR REPLACE FUNCTION validate_subdomain(subdomain_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if subdomain is valid (alphanumeric, hyphens, 3-50 chars)
    RETURN subdomain_text ~ '^[a-z0-9]([a-z0-9\-]*[a-z0-9])?$' 
           AND LENGTH(subdomain_text) BETWEEN 3 AND 50
           AND subdomain_text NOT IN ('www', 'admin', 'api', 'mail', 'ftp', 'cdn', 'assets');
END;
$$ LANGUAGE plpgsql;

-- 8. Add constraint to validate subdomain format
ALTER TABLE tenants 
ADD CONSTRAINT check_subdomain_format 
CHECK (validate_subdomain(subdomain));

-- 9. Create function to automatically generate subdomain from name
CREATE OR REPLACE FUNCTION generate_subdomain_from_name(tenant_name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_subdomain TEXT;
    final_subdomain TEXT;
    counter INTEGER := 1;
BEGIN
    -- Generate base subdomain from name
    base_subdomain := LOWER(
        REGEXP_REPLACE(
            REGEXP_REPLACE(tenant_name, '[^a-zA-Z0-9\s]', '', 'g'),
            '\s+', '', 'g'
        )
    );
    
    -- Ensure minimum length
    IF LENGTH(base_subdomain) < 3 THEN
        base_subdomain := 'tenant' || base_subdomain;
    END IF;
    
    -- Ensure maximum length
    IF LENGTH(base_subdomain) > 50 THEN
        base_subdomain := LEFT(base_subdomain, 50);
    END IF;
    
    final_subdomain := base_subdomain;
    
    -- Check for uniqueness and append number if needed
    WHILE EXISTS (SELECT 1 FROM tenants WHERE subdomain = final_subdomain) LOOP
        final_subdomain := base_subdomain || counter::text;
        counter := counter + 1;
        
        -- Ensure we don't exceed length limit
        IF LENGTH(final_subdomain) > 50 THEN
            final_subdomain := LEFT(base_subdomain, 47) || counter::text;
        END IF;
    END LOOP;
    
    RETURN final_subdomain;
END;
$$ LANGUAGE plpgsql;

-- 10. Create trigger to auto-generate subdomain on insert
CREATE OR REPLACE FUNCTION set_tenant_subdomain()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set subdomain if it's not provided
    IF NEW.subdomain IS NULL OR NEW.subdomain = '' THEN
        NEW.subdomain := generate_subdomain_from_name(NEW.name);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_set_tenant_subdomain ON tenants;
CREATE TRIGGER trigger_set_tenant_subdomain
    BEFORE INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION set_tenant_subdomain();

-- 11. Add helpful comments
COMMENT ON COLUMN tenants.subdomain IS 'Unique subdomain for tenant (e.g., "hospital1" for hospital1.domain.com)';
COMMENT ON CONSTRAINT unique_subdomain ON tenants IS 'Ensures each tenant has a unique subdomain';
COMMENT ON INDEX idx_tenants_subdomain IS 'Index for fast subdomain-based tenant lookups';

-- 12. Grant permissions (adjust as needed for your setup)
-- GRANT SELECT ON tenants TO anon;
-- GRANT SELECT ON tenants TO authenticated;

-- 13. Create view for public tenant information (optional)
CREATE OR REPLACE VIEW public_tenant_info AS
SELECT 
    id,
    name,
    subdomain,
    logo_url,
    primary_color,
    status
FROM tenants
WHERE status = 'active';

-- 14. Example data - Remove or modify for your actual tenants
-- INSERT INTO tenants (name, subdomain, status, admin_user_id, subscription_plan, max_users, max_patients, settings)
-- VALUES 
--   ('General Hospital', 'general-hospital', 'active', 'uuid-here', 'premium', 100, 1000, '{}'),
--   ('City Clinic', 'city-clinic', 'active', 'uuid-here', 'basic', 50, 500, '{}')
-- ON CONFLICT (subdomain) DO NOTHING;

-- 15. Verification queries
-- Check subdomain setup
SELECT 
    name,
    subdomain,
    status,
    validate_subdomain(subdomain) as is_valid_subdomain
FROM tenants
ORDER BY name;

-- Check for any invalid subdomains
SELECT 
    name,
    subdomain,
    'Invalid subdomain format' as issue
FROM tenants
WHERE NOT validate_subdomain(subdomain);

-- Check for duplicate subdomains
SELECT 
    subdomain,
    COUNT(*) as count
FROM tenants
GROUP BY subdomain
HAVING COUNT(*) > 1;

COMMIT;
