-- Understanding super admin behavior with tenants
-- This explains how the tenant switching works for super admins

/*
HOW SUPER ADMIN TENANT ACCESS WORKS:

1. SUPER ADMIN ROLE ('super_admin' in user_profiles.role):
   - Can view ALL tenants when no specific tenant is selected
   - Can switch to any specific tenant using the tenant switcher
   - Maintains super admin privileges across all tenants

2. TENANT-SPECIFIC ASSIGNMENT:
   - Super admins can ALSO be assigned to specific tenants in tenant_users table
   - This allows them to have a "default" tenant when accessing via subdomain
   - They can still switch back to "view all tenants" mode

3. SUBDOMAIN ACCESS:
   - When accessing lethpoly.haccare.app:
     * System detects 'lethpoly' subdomain
     * Loads the lethpoly tenant context
     * If super admin is assigned to lethpoly tenant → shows lethpoly data
     * If super admin is NOT assigned → may show access denied or redirect

4. RECOMMENDED SETUP:
   - Keep your main account as super_admin role
   - Assign your super admin account to lethpoly tenant as 'admin' role
   - This gives you both capabilities:
     * Access lethpoly.haccare.app directly
     * Switch to "view all tenants" mode from main domain

5. ALTERNATIVE SETUP:
   - Create separate user account specifically for lethpoly
   - Give that account 'admin' role (not super_admin)
   - Assign it only to lethpoly tenant
   - Use this for day-to-day lethpoly operations
*/

-- Check current super admin setup
SELECT 
    'Super Admin Users' as category,
    up.email,
    up.role,
    COUNT(tu.tenant_id) as assigned_tenants
FROM user_profiles up
LEFT JOIN tenant_users tu ON up.id = tu.user_id
WHERE up.role = 'super_admin'
GROUP BY up.id, up.email, up.role

UNION ALL

SELECT 
    'Lethpoly Tenant Users' as category,
    up.email,
    up.role,
    1 as assigned_tenants
FROM tenant_users tu
JOIN user_profiles up ON tu.user_id = up.id
JOIN tenants t ON tu.tenant_id = t.id
WHERE t.subdomain = 'lethpoly'
ORDER BY category, email;
