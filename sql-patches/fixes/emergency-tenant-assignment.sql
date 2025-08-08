-- EMERGENCY FIX: Assign heather@haclabs.io to a tenant if missing
-- This will ensure you have a proper tenant assignment

-- First, find your user ID and available tenants
SELECT 'YOUR USER INFO:' as step;
SELECT id, email, role FROM user_profiles WHERE email = 'heather@haclabs.io';

SELECT 'AVAILABLE TENANTS:' as step;
SELECT id, name, subdomain, status FROM tenants WHERE status = 'active';

-- If you need to create a tenant assignment (replace the UUIDs with actual values from above)
-- Uncomment and modify the line below:

-- INSERT INTO tenant_users (user_id, tenant_id, role, is_active, created_at)
-- VALUES (
--   (SELECT id FROM user_profiles WHERE email = 'heather@haclabs.io'),
--   'YOUR_TENANT_ID_HERE',  -- Replace with actual tenant ID from the query above
--   'super_admin',          -- or 'admin', 'nurse', etc.
--   true,
--   NOW()
-- );
