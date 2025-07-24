// Apply tenant creation RLS fix
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://cwhqffubvqolhnkecyck.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aHFmZnVidnFvbGhua2VjeWNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTE0MTg5OSwiZXhwIjoyMDY2NzE3ODk5fQ.Gudx-86iQahXVymtw46Er4KPgPeNIL_UGOPFEDbYKY4'
);

async function applyRLSFix() {
  console.log('🚀 Applying tenant creation RLS policies...\n');
  
  try {
    // First, add the INSERT policy for super admins
    console.log('Creating policy: Super admins can create tenants...');
    const { error: policy1Error } = await supabase.rpc('exec', {
      sql: `
        CREATE POLICY "Super admins can create tenants" ON tenants
          FOR INSERT WITH CHECK (
            EXISTS (
              SELECT 1 FROM user_profiles 
              WHERE id = auth.uid() AND role = 'super_admin'
            )
          );
      `
    });
    
    if (policy1Error) {
      console.error('❌ Error creating super admin policy:', policy1Error);
    } else {
      console.log('✅ Super admin INSERT policy created');
    }
    
    // Add policy for users to create tenants they will admin
    console.log('Creating policy: Users can create tenants they will admin...');
    const { error: policy2Error } = await supabase.rpc('exec', {
      sql: `
        CREATE POLICY "Users can create tenants they will admin" ON tenants
          FOR INSERT WITH CHECK (
            admin_user_id = auth.uid()
          );
      `
    });
    
    if (policy2Error) {
      console.error('❌ Error creating user admin policy:', policy2Error);
    } else {
      console.log('✅ User admin INSERT policy created');
    }
    
    // Now test tenant creation with authenticated user
    console.log('\n🧪 Testing tenant creation with authenticated user...');
    
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
    
    // Try to create a tenant
    const testTenant = {
      name: 'RLS Test Tenant',
      subdomain: 'rls-test',
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
    
    const { data: tenantResult, error: tenantError } = await supabase
      .from('tenants')
      .insert([testTenant])
      .select();
    
    if (tenantError) {
      console.error('❌ Tenant creation failed:', tenantError);
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

applyRLSFix();
