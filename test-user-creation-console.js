// Test user creation process
// Run this in browser console while on your app to debug

console.log('🔍 Testing user creation process...');

// 1. Test if we can call the assign function
async function testAssignFunction() {
  try {
    console.log('Testing assign_user_to_tenant function...');
    
    // Get current user for testing
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current user:', user?.email);
    
    // Get first tenant for testing
    const { data: tenants } = await supabase
      .from('tenants')
      .select('*')
      .limit(1);
    
    if (tenants && tenants.length > 0) {
      console.log('Test tenant:', tenants[0].name);
      
      // Test the function call
      const { data, error } = await supabase.rpc('assign_user_to_tenant', {
        tenant_id_param: tenants[0].id,
        user_id_param: user.id,
        user_role_param: 'nurse'
      });
      
      console.log('Function result:', { data, error });
    } else {
      console.log('No tenants found for testing');
    }
  } catch (err) {
    console.error('Function test error:', err);
  }
}

// 2. Check current auth status
async function checkAuthStatus() {
  const { data: { user } } = await supabase.auth.getUser();
  console.log('Current auth user:', user);
  
  if (user) {
    // Check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    console.log('User profile:', { profile, profileError });
    
    // Check tenant assignments
    const { data: assignments, error: assignError } = await supabase
      .from('tenant_users')
      .select('*, tenants(name)')
      .eq('user_id', user.id);
    
    console.log('Tenant assignments:', { assignments, assignError });
  }
}

// 3. Check if profiles trigger is working
async function checkRecentProfiles() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.log('Recent profiles:', { data, error });
}

// Run all tests
testAssignFunction();
checkAuthStatus();
checkRecentProfiles();

console.log('✅ Tests queued. Check results above.');
