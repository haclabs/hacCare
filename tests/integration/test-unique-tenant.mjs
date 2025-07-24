// Test tenant creation with unique subdomains and verify policies
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cwhqffubvqolhnkecyck.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aHFmZnVidnFvbGhua2VjeWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNDE4OTksImV4cCI6MjA2NjcxNzg5OX0.TFuM0bKq2AH-SV5l71QEIKU3bWGvEtt8jkGZUNANaj8'
);

// Also create service role client to check policies
const supabaseService = createClient(
  'https://cwhqffubvqolhnkecyck.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aHFmZnVidnFvbGhua2VjeWNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTE0MTg5OSwiZXhwIjoyMDY2NzE3ODk5fQ.Gudx-86iQahXVymtw46Er4KPgPeNIL_UGOPFEDbYKY4'
);

async function testWithUniqueSubdomains() {
  console.log('🔍 First, let me check what policies exist...\n');
  
  try {
    // Use a different approach to check policies
    const { data: policies, error } = await supabaseService.rpc('exec', {
      sql: `
        SELECT policyname, cmd, permissive, qual, with_check 
        FROM pg_policies 
        WHERE tablename = 'tenants' 
        ORDER BY cmd, policyname;
      `
    });
    
    if (error) {
      console.log('Could not check policies via RPC:', error.message);
    } else {
      console.log('Current tenant policies:');
      if (policies && policies.length > 0) {
        policies.forEach(policy => {
          console.log(`  - ${policy.policyname} (${policy.cmd})`);
        });
      } else {
        console.log('  No policies found');
      }
    }
  } catch (error) {
    console.log('Could not check policies:', error.message);
  }
  
  console.log('\\n🧪 Testing tenant creation with unique subdomains...\\n');
  
  // Generate unique subdomain
  const timestamp = Date.now();
  
  // Test 1: Super Admin
  console.log('📋 Test 1: Super Admin Creating Tenant');
  try {
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@haccare.com',
      password: 'admin123'
    });
    
    if (authError) {
      console.error('❌ Auth failed:', authError.message);
    } else {
      console.log('✅ Authenticated as super admin:', authData.user.email);
      
      const superAdminTenant = {
        name: 'Super Admin Test Tenant',
        subdomain: `super-admin-${timestamp}`,
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
        
        // Clean up
        await supabase.from('tenants').delete().eq('id', tenantResult[0].id);
        console.log('🧹 Cleaned up super admin test tenant');
      }
    }
    
    await supabase.auth.signOut();
    
  } catch (error) {
    console.error('❌ Unexpected error in super admin test:', error);
  }
  
  console.log('\\n' + '='.repeat(50) + '\\n');
  
  // Test 2: Regular User (Nurse)
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
      console.log('   User ID:', authData.user.id);
      
      const nurseTenant = {
        name: 'Nurse Created Tenant',
        subdomain: `nurse-${timestamp}`,
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
      
      console.log('   Attempting to create tenant with nurse as admin...');
      const { data: tenantResult, error: tenantError } = await supabase
        .from('tenants')
        .insert([nurseTenant])
        .select();
      
      if (tenantError) {
        console.error('❌ Nurse tenant creation failed:', tenantError.message);
        console.log('   This suggests the "Users can create tenants they will admin" policy is not working');
      } else {
        console.log('✅ Nurse tenant created successfully!');
        console.log('   Tenant ID:', tenantResult[0].id);
        
        // Clean up
        await supabase.from('tenants').delete().eq('id', tenantResult[0].id);
        console.log('🧹 Cleaned up nurse test tenant');
      }
    }
    
    await supabase.auth.signOut();
    
  } catch (error) {
    console.error('❌ Unexpected error in nurse test:', error);
  }
  
  console.log('\\n🎉 Testing Complete!');
}

testWithUniqueSubdomains();
