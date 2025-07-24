// Apply RLS policies manually using direct SQL
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cwhqffubvqolhnkecyck.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aHFmZnVidnFvbGhua2VjeWNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTE0MTg5OSwiZXhwIjoyMDY2NzE3ODk5fQ.Gudx-86iQahXVymtw46Er4KPgPeNIL_UGOPFEDbYKY4'
);

async function testTenantCreationAsUser() {
  console.log('🧪 Testing tenant creation with authenticated user...\n');
  
  try {
    // Sign in as admin user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@haccare.com',
      password: 'admin123'
    });
    
    if (authError) {
      console.error('❌ Authentication failed:', authError);
      return;
    }
    
    console.log('✅ Authenticated as:', authData.user.email);
    console.log('User ID:', authData.user.id);
    
    // Check if this user is a super admin
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Could not get user profile:', profileError);
    } else {
      console.log('User role:', userProfile.role);
    }
    
    // Try to create a tenant
    const testTenant = {
      name: 'Test Tenant From App',
      subdomain: 'test-from-app',
      admin_user_id: authData.user.id,  // Use the authenticated user's ID
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
    
    console.log('\\n📝 Attempting to create tenant...');
    const { data: tenantResult, error: tenantError } = await supabase
      .from('tenants')
      .insert([testTenant])
      .select();
    
    if (tenantError) {
      console.error('❌ Tenant creation failed:', tenantError);
      
      // Let's also check what policies exist on the tenants table
      console.log('\\n🔍 Checking existing policies...');
      const { data: policies, error: policyError } = await supabase
        .from('pg_policies')
        .select('policyname, cmd, permissive, qual, with_check')
        .eq('tablename', 'tenants');
      
      if (policyError) {
        console.error('Could not check policies:', policyError);
      } else {
        console.log('Existing tenant policies:', policies);
      }
    } else {
      console.log('✅ Tenant created successfully!');
      console.log('Tenant ID:', tenantResult[0].id);
      console.log('Tenant Name:', tenantResult[0].name);
      
      // Clean up test tenant
      const { error: deleteError } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantResult[0].id);
      
      if (deleteError) {
        console.error('Warning: Could not delete test tenant:', deleteError);
      } else {
        console.log('🧹 Test tenant cleaned up');
      }
    }
    
    // Sign out
    await supabase.auth.signOut();
    console.log('👋 Signed out');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testTenantCreationAsUser();
