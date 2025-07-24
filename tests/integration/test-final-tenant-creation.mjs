// Comprehensive tenant creation test
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cwhqffubvqolhnkecyck.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aHFmZnVidnFvbGhua2VjeWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNDE4OTksImV4cCI6MjA2NjcxNzg5OX0.TFuM0bKq2AH-SV5l71QEIKU3bWGvEtt8jkGZUNANaj8';

const supabase = createClient(supabaseUrl, anonKey);

async function testTenantCreationScenarios() {
  console.log('🧪 Testing Tenant Creation in Different Scenarios\n');
  
  // Test 1: Super Admin Creating Tenant
  console.log('📋 Test 1: Super Admin Creating Tenant');
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@haccare.com',
      password: 'admin123'
    });
    
    if (authError) {
      console.error('❌ Auth failed:', authError.message);
      return;
    }
    
    console.log('✅ Authenticated as super admin:', authData.user.email);
    
    const superAdminTenant = {
      name: 'Super Admin Created Tenant',
      subdomain: 'super-admin-test',
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
    
    const { data: tenantResult, error: tenantError } = await supabase
      .from('tenants')
      .insert([superAdminTenant])
      .select();
    
    if (tenantError) {
      console.error('❌ Super admin tenant creation failed:', tenantError.message);
    } else {
      console.log('✅ Super admin tenant created successfully');
      console.log('   Tenant ID:', tenantResult[0].id);
      console.log('   Tenant Name:', tenantResult[0].name);
      
      // Clean up
      await supabase.from('tenants').delete().eq('id', tenantResult[0].id);
      console.log('🧹 Cleaned up super admin test tenant');
    }
    
    await supabase.auth.signOut();
    
  } catch (error) {
    console.error('❌ Unexpected error in super admin test:', error);
  }
  
  console.log('\\n' + '='.repeat(50) + '\\n');
  
  // Test 2: Regular User Creating Tenant (Should Work with Self as Admin)
  console.log('📋 Test 2: Regular User Creating Tenant (Self as Admin)');
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'nurse@haccare.com',
      password: 'nurse123'
    });
    
    if (authError) {
      console.error('❌ Nurse auth failed:', authError.message);
    } else {
      console.log('✅ Authenticated as nurse:', authData.user.email);
      
      const nurseTenant = {
        name: 'Nurse Created Tenant',
        subdomain: 'nurse-test',
        admin_user_id: authData.user.id, // Self as admin
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
      
      const { data: tenantResult, error: tenantError } = await supabase
        .from('tenants')
        .insert([nurseTenant])
        .select();
      
      if (tenantError) {
        console.error('❌ Nurse tenant creation failed:', tenantError.message);
        console.log('   This might be expected if the user does not have permission');
      } else {
        console.log('✅ Nurse tenant created successfully');
        console.log('   Tenant ID:', tenantResult[0].id);
        
        // Clean up
        await supabase.from('tenants').delete().eq('id', tenantResult[0].id);
        console.log('🧹 Cleaned up nurse test tenant');
      }
      
      await supabase.auth.signOut();
    }
    
  } catch (error) {
    console.error('❌ Unexpected error in nurse test:', error);
  }
  
  console.log('\\n' + '='.repeat(50) + '\\n');
  
  // Test 3: Try to Create Tenant with Different Admin (Should Fail)
  console.log('📋 Test 3: Try Creating Tenant with Different Admin (Should Fail)');
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'nurse@haccare.com',
      password: 'nurse123'
    });
    
    if (authError) {
      console.error('❌ Auth failed:', authError.message);
    } else {
      console.log('✅ Authenticated as nurse:', authData.user.email);
      
      const invalidTenant = {
        name: 'Invalid Admin Tenant',
        subdomain: 'invalid-admin',
        admin_user_id: '70896089-4882-4dc3-8e93-43e360f4c21e', // Different user as admin
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
      
      const { data: tenantResult, error: tenantError } = await supabase
        .from('tenants')
        .insert([invalidTenant])
        .select();
      
      if (tenantError) {
        console.log('✅ Correctly blocked invalid tenant creation:', tenantError.message);
      } else {
        console.error('❌ Should not have allowed this tenant creation!');
        console.log('   Tenant ID:', tenantResult[0].id);
        
        // Clean up unexpected success
        await supabase.from('tenants').delete().eq('id', tenantResult[0].id);
        console.log('🧹 Cleaned up unexpected tenant');
      }
      
      await supabase.auth.signOut();
    }
    
  } catch (error) {
    console.error('❌ Unexpected error in invalid admin test:', error);
  }
  
  console.log('\\n🎉 Tenant Creation Tests Complete!');
}

testTenantCreationScenarios();
