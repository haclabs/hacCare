-- Quick test to check simulation users and tenants
SELECT 'Simulation Users' as table_name, count(*) as count FROM simulation_users
UNION ALL
SELECT 'Simulation Tenants', count(*) FROM tenants WHERE tenant_type = 'simulation';

-- Show actual simulation users
SELECT 
  su.username,
  su.email,
  su.role,
  su.password,
  t.name as tenant_name,
  t.id as tenant_id
FROM simulation_users su 
JOIN tenants t ON su.simulation_tenant_id = t.id
WHERE t.tenant_type = 'simulation'
ORDER BY su.created_at DESC;