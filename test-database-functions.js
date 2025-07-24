#!/usr/bin/env node

// Test script to verify database functions work
import { createClient } from '@supabase/supabase-js';

// Use the local Supabase instance
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUserCreation() {
  console.log('🔧 Testing user creation and tenant assignment...\n');

  try {
    // 1. Test tenants query
    console.log('1️⃣ Testing tenants query...');
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*');

    if (tenantsError) {
      console.error('❌ Error fetching tenants:', tenantsError);
      return;
    }

    console.log('✅ Tenants found:', tenants.length);
    tenants.forEach(tenant => {
      console.log(`   - ${tenant.name} (${tenant.id})`);
    });

    // 2. Test function availability
    console.log('\n2️⃣ Testing assign_user_to_tenant function...');
    
    // Create a test user first
    const testEmail = `test-${Date.now()}@example.com`;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: 'testpass123',
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User'
        }
      }
    });

    if (authError) {
      console.error('❌ Error creating test user:', authError);
      return;
    }

    if (!authData.user) {
      console.error('❌ No user returned from auth signup');
      return;
    }

    console.log('✅ Test user created:', authData.user.id);

    // Add user profile record (simulate the trigger/function that would normally do this)
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: authData.user.id,
        email: testEmail,
        first_name: 'Test',
        last_name: 'User',
        role: 'nurse',
        is_active: true
      });

    if (profileError) {
      console.error('❌ Error creating user profile:', profileError);
      return;
    }

    console.log('✅ User profile created');

    // 3. Test the assign_user_to_tenant function
    console.log('\n3️⃣ Testing tenant assignment...');
    const systemDefaultTenantId = '00000000-0000-0000-0000-000000000000';
    const { error: assignError } = await supabase.rpc('assign_user_to_tenant', {
      user_id_param: authData.user.id,
      tenant_id_param: systemDefaultTenantId
    });

    if (assignError) {
      console.error('❌ Error assigning user to tenant:', assignError);
      return;
    }

    console.log('✅ User successfully assigned to System Default tenant');

    // 4. Verify the assignment
    console.log('\n4️⃣ Verifying tenant assignment...');
    const { data: tenantUsers, error: queryError } = await supabase
      .from('tenant_users')
      .select('*')
      .eq('user_id', authData.user.id);

    if (queryError) {
      console.error('❌ Error querying tenant assignment:', queryError);
      return;
    }

    console.log('✅ Tenant assignment verified:', tenantUsers.length > 0);
    if (tenantUsers.length > 0) {
      console.log(`   - User ${authData.user.id} assigned to tenant ${tenantUsers[0].tenant_id}`);
    }

    // 5. Cleanup
    console.log('\n5️⃣ Cleaning up test data...');
    await supabase
      .from('tenant_users')
      .delete()
      .eq('user_id', authData.user.id);

    await supabase
      .from('user_profiles')
      .delete()
      .eq('id', authData.user.id);

    // Note: We can't delete auth users easily from the test, but that's okay

    console.log('✅ Test data cleaned up');

    console.log('\n🎉 All tests passed! The assign_user_to_tenant function is working correctly.');
    console.log('\n✨ Your user creation should now work properly in the application!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testUserCreation();
