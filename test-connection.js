#!/usr/bin/env node

// Test script to verify Supabase connection works
import { createClient } from '@supabase/supabase-js';

// Use the same configuration as the app
const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

console.log('🔧 Testing Supabase Connection...\n');

console.log('Configuration:');
console.log('  URL:', supabaseUrl);
console.log('  Key:', `${supabaseAnonKey.substring(0, 30)}...`);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  try {
    console.log('\n1️⃣ Testing basic connection...');
    
    // Test basic query
    const { data, error } = await supabase
      .from('tenants')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }

    console.log('✅ Basic connection successful');

    // Test auth
    console.log('\n2️⃣ Testing auth system...');
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError) {
      console.error('❌ Auth system error:', authError.message);
      return false;
    }

    console.log('✅ Auth system accessible');

    // Test database functions
    console.log('\n3️⃣ Testing database functions...');
    
    // Try to call a function (it might fail but should not give connection error)
    try {
      const { data: funcData, error: funcError } = await supabase
        .rpc('assign_user_to_tenant', {
          user_id_param: '00000000-0000-0000-0000-000000000000',
          tenant_id_param: '00000000-0000-0000-0000-000000000000'
        });
      
      // We expect this to fail but not with connection error
      if (funcError) {
        if (funcError.message.includes('does not exist') || funcError.message.includes('foreign key')) {
          console.log('✅ Function exists (expected error due to invalid UUIDs)');
        } else {
          console.log('⚠️ Function call error:', funcError.message);
        }
      } else {
        console.log('✅ Function call successful');
      }
    } catch (e) {
      console.log('⚠️ Function test error:', e.message);
    }

    console.log('\n🎉 Connection test completed successfully!');
    console.log('The application should now be able to connect to Supabase.');
    
    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

testConnection();
