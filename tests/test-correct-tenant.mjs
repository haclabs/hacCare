// Test tenant creation with correct column names
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cwhqffubvqolhnkecyck.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aHFmZnVidnFvbGhua2VjeWNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTE0MTg5OSwiZXhwIjoyMDY2NzE3ODk5fQ.Gudx-86iQahXVymtw46Er4KPgPeNIL_UGOPFEDbYKY4';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testCorrectTenantCreation() {
  console.log('🔍 Testing tenant creation with correct column names...\n');
  
  const testTenant = {
    name: 'Test Tenant - Correct',
    subdomain: 'test-correct',  // Using subdomain instead of domain
    admin_user_id: '70896089-4882-4dc3-8e93-43e360f4c21e',
    subscription_plan: 'basic',
    status: 'active',
    settings: {
      timezone: 'UTC',
      date_format: 'MM/DD/YYYY',
      currency: 'USD',
      features: {
        advanced_analytics: false,
        medication_management: true,
        wound_care: false,
        barcode_scanning: false,
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
  
  try {
    console.log('Creating tenant with service role...');
    const { data: result, error } = await supabase
      .from('tenants')
      .insert([testTenant])
      .select();
    
    if (error) {
      console.error('❌ Error creating tenant:', error);
    } else {
      console.log('✅ Tenant created successfully:', result[0]);
      
      // Clean up
      const { error: deleteError } = await supabase
        .from('tenants')
        .delete()
        .eq('id', result[0].id);
      
      if (deleteError) {
        console.error('Warning: Could not delete test tenant:', deleteError);
      } else {
        console.log('🧹 Test tenant cleaned up');
      }
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
  
  // Now test what happens with authenticated user context
  console.log('\n🔒 Testing with authenticated user context...');
  
  // First, let's see what happens when we authenticate as a user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@haccare.com',
    password: 'admin123'
  });
  
  if (authError) {
    console.error('❌ Could not authenticate:', authError);
    return;
  }
  
  console.log('✅ Authenticated as:', authData.user.email);
  
  // Now try to create a tenant with user context
  const userTenant = {
    ...testTenant,
    name: 'User Created Tenant',
    subdomain: 'user-created'
  };
  
  try {
    const { data: userResult, error: userError } = await supabase
      .from('tenants')
      .insert([userTenant])
      .select();
    
    if (userError) {
      console.error('❌ User tenant creation failed:', userError);
    } else {
      console.log('✅ User tenant created:', userResult[0]);
      
      // Clean up
      await supabase
        .from('tenants')
        .delete()
        .eq('id', userResult[0].id);
      console.log('🧹 User tenant cleaned up');
    }
  } catch (error) {
    console.error('❌ Unexpected error with user context:', error);
  }
  
  // Sign out
  await supabase.auth.signOut();
  console.log('👋 Signed out');
}

testCorrectTenantCreation();
