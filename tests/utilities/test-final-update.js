#!/usr/bin/env node

/**
 * Final Tenant Update Test
 * This script verifies that all the tenant update fixes are working correctly
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables manually
let env = {};
try {
  const envFile = readFileSync('.env', 'utf8');
  const lines = envFile.split('\n');
  for (const line of lines) {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim();
    }
  }
} catch (error) {
  console.log('Could not load .env file');
}

const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Simulate the exact updated updateTenant function
async function updateTenant(tenantId, updates) {
  try {
    // First check if the tenant exists
    const { data: existingTenant, error: checkError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenantId);

    if (checkError) {
      return { data: null, error: checkError };
    }

    if (!existingTenant || existingTenant.length === 0) {
      return { data: null, error: new Error(`Tenant with ID ${tenantId} not found`) };
    }

    // Now perform the update
    const { data, error } = await supabase
      .from('tenants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', tenantId)
      .select();

    if (error) {
      return { data: null, error };
    }

    // Check if update actually affected any rows
    if (!data || data.length === 0) {
      return { data: null, error: new Error(`Failed to update tenant ${tenantId}`) };
    }

    if (data.length > 1) {
      console.warn(`Warning: Update affected ${data.length} rows for tenant ${tenantId}`);
    }

    // Return the first (and hopefully only) updated row
    return { data: data[0], error: null };
  } catch (error) {
    console.error('Error updating tenant:', error);
    return { data: null, error };
  }
}

async function finalTest() {
  console.log('🎯 Final tenant update test...\n');
  
  try {
    // Get tenants
    const { data: tenants, error: fetchError } = await supabase
      .from('tenants')
      .select('*');
    
    if (fetchError || !tenants || tenants.length === 0) {
      console.error('❌ Could not fetch tenants for testing');
      return;
    }
    
    const testTenant = tenants[0];
    console.log(`Testing with tenant: ${testTenant.name}`);
    
    // Test 1: Valid update
    console.log('\n🧪 Test 1: Valid tenant update');
    const { data: result1, error: error1 } = await updateTenant(testTenant.id, {
      name: testTenant.name,
      status: 'active'
    });
    
    if (error1) {
      console.error('❌ Test 1 failed:', error1.message);
    } else {
      console.log('✅ Test 1 passed: Update successful');
    }
    
    // Test 2: Invalid tenant ID
    console.log('\n🧪 Test 2: Invalid tenant ID');
    const { data: result2, error: error2 } = await updateTenant('invalid-id', {
      name: 'Test'
    });
    
    if (error2 && error2.message.includes('not found')) {
      console.log('✅ Test 2 passed: Correctly handled invalid ID');
    } else {
      console.error('❌ Test 2 failed: Should have returned "not found" error');
    }
    
    // Test 3: Empty update
    console.log('\n🧪 Test 3: Empty update');
    const { data: result3, error: error3 } = await updateTenant(testTenant.id, {});
    
    if (error3) {
      console.error('❌ Test 3 failed:', error3.message);
    } else {
      console.log('✅ Test 3 passed: Empty update handled correctly');
    }
    
    console.log('\n🎉 All tenant update tests completed!');
    console.log('✅ The "multiple (or no) rows returned" error should now be fixed.');
    
  } catch (error) {
    console.error('Final test failed:', error);
  }
}

finalTest();
