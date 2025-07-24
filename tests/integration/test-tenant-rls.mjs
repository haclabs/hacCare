// Simple tenant RLS test without external dependencies
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cwhqffubvqolhnkecyck.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aHFmZnVidnFvbGhua2VjeWNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTE0MTg5OSwiZXhwIjoyMDY2NzE3ODk5fQ.Gudx-86iQahXVymtw46Er4KPgPeNIL_UGOPFEDbYKY4';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aHFmZnVidnFvbGhua2VjeWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNDE4OTksImV4cCI6MjA2NjcxNzg5OX0.TFuM0bKq2AH-SV5l71QEIKU3bWGvEtt8jkGZUNANaj8';

// Test with service role (bypasses RLS)
const supabaseService = createClient(supabaseUrl, serviceRoleKey);

// Test with anon key (subject to RLS)
const supabaseAnon = createClient(supabaseUrl, anonKey);

async function testTenantCreation() {
  console.log('🔍 Testing tenant creation with different auth levels...\n');
  
  const testTenant = {
    name: 'Test RLS Tenant',
    domain: 'test-rls.example.com',
    admin_user_id: '70896089-4882-4dc3-8e93-43e360f4c21e',
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
  
  // Test 1: With service role key (should work)
  console.log('🔧 Test 1: Creating tenant with service role key...');
  try {
    const { data: serviceResult, error: serviceError } = await supabaseService
      .from('tenants')
      .insert([testTenant])
      .select();
    
    if (serviceError) {
      console.error('❌ Service role creation failed:', serviceError);
    } else {
      console.log('✅ Service role creation succeeded:', serviceResult[0].id);
      
      // Clean up
      await supabaseService
        .from('tenants')
        .delete()
        .eq('id', serviceResult[0].id);
      console.log('🧹 Test tenant cleaned up');
    }
  } catch (error) {
    console.error('❌ Unexpected error with service role:', error);
  }
  
  // Test 2: With anon key (will fail due to RLS)
  console.log('\n🔒 Test 2: Creating tenant with anon key (should fail due to RLS)...');
  try {
    const { data: anonResult, error: anonError } = await supabaseAnon
      .from('tenants')
      .insert([testTenant])
      .select();
    
    if (anonError) {
      console.error('❌ Anon creation failed (expected):', anonError.message);
    } else {
      console.log('✅ Anon creation succeeded (unexpected):', anonResult);
    }
  } catch (error) {
    console.error('❌ Unexpected error with anon key:', error);
  }
  
  // Test 3: Check current RLS policies
  console.log('\n📋 Test 3: Checking RLS policies...');
  try {
    const { data: policies, error: policyError } = await supabaseService
      .rpc('get_policies_for_table', { table_name: 'tenants' });
    
    if (policyError) {
      console.log('Could not fetch policies via RPC, checking table structure...');
      
      // Check if the table exists and what columns it has
      const { data: columns, error: columnError } = await supabaseService
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'tenants')
        .eq('table_schema', 'public');
      
      if (columnError) {
        console.error('Error checking table structure:', columnError);
      } else {
        console.log('Tenants table columns:', columns);
      }
    } else {
      console.log('RLS Policies:', policies);
    }
  } catch (error) {
    console.error('Error checking policies:', error);
  }
}

testTenantCreation();
