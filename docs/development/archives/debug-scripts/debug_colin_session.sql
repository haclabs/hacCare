-- Check if colin@haclabs.io session exists
-- Debug why current user session isn't showing in admin dashboard

-- Check if there's a session for colin@haclabs.io
SELECT 
  us.id,
  us.user_id,
  up.email,
  up.first_name,
  up.last_name,
  us.ip_address,
  us.status,
  us.login_time,
  us.last_activity,
  us.logout_time,
  t.name as tenant_name
FROM user_sessions us
LEFT JOIN user_profiles up ON us.user_id = up.id
LEFT JOIN tenants t ON us.tenant_id = t.id
WHERE up.email = 'colin@haclabs.io'
ORDER BY us.created_at DESC;

-- Check if colin@haclabs.io user profile exists
SELECT id, email, first_name, last_name, is_active, role 
FROM user_profiles 
WHERE email = 'colin@haclabs.io';

-- Check ALL sessions (including colin's if it exists)
SELECT 
  us.id,
  up.email,
  us.ip_address,
  us.status,
  us.login_time,
  us.created_at,
  CASE 
    WHEN us.status = 'active' AND us.logout_time IS NULL THEN 'Should show in dashboard'
    ELSE 'Will not show in dashboard'
  END as dashboard_visibility
FROM user_sessions us
LEFT JOIN user_profiles up ON us.user_id = up.id
ORDER BY us.created_at DESC;