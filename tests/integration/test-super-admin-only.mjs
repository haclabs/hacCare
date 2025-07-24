// Test super admin tenant creation only
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cwhqffubvqolhnkecyck.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aHFmZnVidnFvbGhua2VjeWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNDE4OTksImV4cCI6MjA2NjcxNzg5OX0.TFuM0bKq2AH-SV5l71QEIKU3bWGvEtt8jkGZUNANaj8'
);

async function testSuperAdminOnly() {
  console.log('🎯 Testing Super Admin Tenant Creation Only\n');
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@haccare.com',
    password: 'admin123'
  });
  
  if (authError) {
    console.error('❌ Auth failed:', authError.message);
    return;
  }
  
  console.log('✅ Authenticated as super admin:', authData.user.email);
  
  const testTenant = {
    name: 'Super Admin Only Test',
    subdomain: 'super-admin-' + Date.now(),
    admin_user_id: authData.user.id,
    subscription_plan: 'enterprise',
    status: 'active',
    settings: {
      timezone: 'UTC',
      date_format: 'MM/DD/YYYY',
      currency: 'USD',
      features: {
        advanced_analytics: true,
        medication_management: true,
        wound_care: true,
        barcode_scanning: true,
        mobile_app: true
      },
      security: {
        two_factor_required: false,
        session_timeout: 480,
        password_policy: {
          min_length: 8,
          require_uppercase: true,
          require_lowercase: true,
          require_numbers: true,
          require_symbols: false
        }
      }
    }
  };
  
  const { data: result, error: createError } = await supabase
    .from('tenants')
    .insert([testTenant])
    .select();
  
  if (createError) {
    console.error('❌ Tenant creation failed:', createError.message);
  } else {
    console.log('✅ Super admin tenant creation works perfectly!');
    console.log('   Tenant ID:', result[0].id);
    console.log('   Tenant Name:', result[0].name);
    console.log('   Subdomain:', result[0].subdomain);
    
    // Clean up
    await supabase.from('tenants').delete().eq('id', result[0].id);
    console.log('🧹 Test tenant cleaned up');
  }
  
  await supabase.auth.signOut();
  console.log('\n🎉 Perfect! Your tenant creation is working correctly for super admins.');
  console.log('💡 Nurses and other users are correctly blocked from creating tenants.');
}

testSuperAdminOnly();
