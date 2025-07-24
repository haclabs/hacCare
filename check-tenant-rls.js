const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Use service role key to bypass RLS for investigation
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

async function checkTenantRLS() {
  console.log('🔍 Checking RLS policies for tenants table...\n');
  
  try {
    // Check if RLS is enabled on tenants table
    const { data: rlsStatus, error: rlsError } = await supabase
      .from('pg_class')
      .select('relname, relrowsecurity')
      .eq('relname', 'tenants');
    
    if (rlsError) {
      console.error('Error checking RLS status:', rlsError);
      return;
    }
    
    console.log('RLS Status:', rlsStatus);
    
    // Try to get policies using a direct query
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_table_policies', { table_name: 'tenants' });
    
    if (policiesError) {
      console.log('Could not fetch policies via RPC, trying alternative method...');
      
      // Alternative: try direct select from information_schema
      const { data: tableInfo, error: tableError } = await supabase
        .from('information_schema.tables')
        .select('*')
        .eq('table_name', 'tenants')
        .eq('table_schema', 'public');
      
      console.log('Table info:', tableInfo);
      
      if (tableError) {
        console.error('Error getting table info:', tableError);
      }
    } else {
      console.log('Policies:', policies);
    }
    
    // Test tenant creation with service role
    console.log('\n🧪 Testing tenant creation with service role...');
    
    const testTenant = {
      name: 'Test RLS Tenant',
      domain: 'test-rls.example.com',
      admin_user_id: '70896089-4882-4dc3-8e93-43e360f4c21e', // Use the super admin ID we found earlier
      subscription_plan: 'basic',
      status: 'active',
      settings: {
        features: {
          patient_management: true,
          medication_tracking: true,
          alert_system: true
        }
      }
    };
    
    const { data: createResult, error: createError } = await supabase
      .from('tenants')
      .insert([testTenant])
      .select();
    
    if (createError) {
      console.error('❌ Error creating test tenant:', createError);
    } else {
      console.log('✅ Test tenant created successfully:', createResult);
      
      // Clean up test tenant
      const { error: deleteError } = await supabase
        .from('tenants')
        .delete()
        .eq('id', createResult[0].id);
        
      if (deleteError) {
        console.error('Warning: Could not delete test tenant:', deleteError);
      } else {
        console.log('🧹 Test tenant cleaned up');
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkTenantRLS();
