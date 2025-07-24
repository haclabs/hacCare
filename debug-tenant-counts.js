// Test script to verify tenant users and patient counts
// Run this in the browser console to debug the issue

console.log('🔍 Testing tenant user and patient counts...');

// Test the getTenantUsers function
async function testTenantCounts() {
  try {
    // Get list of tenants first
    const tenantsResponse = await fetch('/api/tenants'); // This is just conceptual - adjust for your setup
    
    console.log('Available tenants to test:');
    
    // For each tenant, test the user count
    // Replace these with actual tenant IDs from your system
    const testTenantIds = [
      // Add your actual tenant IDs here
    ];
    
    for (const tenantId of testTenantIds) {
      console.log(`\n📊 Testing tenant: ${tenantId}`);
      
      // Test getTenantUsers RPC function
      console.log('Calling get_tenant_users RPC...');
      
      // This would be the actual Supabase call
      // const { data, error } = await supabase
      //   .rpc('get_tenant_users', { target_tenant_id: tenantId });
      
      // console.log('RPC Result:', { data, error });
      
      // Test patient stats
      console.log('Testing patient stats...');
      
      // const { data: patientData, error: patientError } = await supabase
      //   .from('patients')
      //   .select('id, condition')
      //   .eq('tenant_id', tenantId);
      
      // console.log('Patient Data:', { patientData, patientError });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

console.log('Run testTenantCounts() to execute the test');

// Also provide direct SQL queries to run in Supabase
console.log(`
📋 Manual SQL queries to run in Supabase SQL Editor:

1. Check all tenants:
SELECT id, name, status FROM tenants WHERE status = 'active';

2. Check tenant users (replace TENANT_ID):
SELECT * FROM get_tenant_users('TENANT_ID');

3. Check tenant_users table directly:
SELECT 
  t.name,
  COUNT(tu.user_id) as user_count
FROM tenants t
LEFT JOIN tenant_users tu ON t.id = tu.tenant_id AND tu.is_active = true
GROUP BY t.id, t.name;

4. Check patient counts:
SELECT 
  t.name,
  COUNT(p.id) as patient_count
FROM tenants t
LEFT JOIN patients p ON t.id = p.tenant_id
GROUP BY t.id, t.name;
`);
