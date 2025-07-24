-- Fix existing tenants table constraint issue
-- Run this FIRST if you get the null constraint error

-- 1. Remove NOT NULL constraint from admin_user_id if it exists
ALTER TABLE tenants ALTER COLUMN admin_user_id DROP NOT NULL;

-- 2. Insert the System Default tenant
INSERT INTO tenants (
  id,
  name,
  subdomain,
  admin_user_id,
  subscription_plan,
  max_users,
  max_patients,
  status,
  settings
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  'System Default',
  'system',
  NULL,  -- This is OK now
  'enterprise',
  1000,
  10000,
  'active',
  '{
    "timezone": "UTC",
    "date_format": "MM/DD/YYYY",
    "currency": "USD",
    "features": {
      "advanced_analytics": true,
      "medication_management": true,
      "wound_care": true,
      "barcode_scanning": true,
      "mobile_app": true
    }
  }'::jsonb
) ON CONFLICT (id) DO NOTHING;
