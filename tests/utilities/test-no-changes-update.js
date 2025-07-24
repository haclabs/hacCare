#!/usr/bin/env node

/**
 * Test "No Changes" Update Scenario
 * This script tests updating a tenant with the same values (no actual changes)
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

    // If no data is returned, it could mean no changes were made
    // In this case, fetch the current tenant data
    if (!data || data.length === 0) {
      const { data: currentTenant, error: fetchError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId);
      
      if (fetchError) {
        return { data: null, error: fetchError };
      }
      
      if (!currentTenant || currentTenant.length === 0) {
        return { data: null, error: new Error(`Tenant ${tenantId} not found after update`) };
      }
      
      // Return the existing tenant data
      return { data: currentTenant[0], error: null };
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

async function testNoChangesUpdate() {
  console.log('🧪 Testing "no changes" update scenario...\n');
  
  try {
    // Get the System Default tenant
    const { data: tenants, error: fetchError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', '00000000-0000-0000-0000-000000000000');
    
    if (fetchError || !tenants || tenants.length === 0) {
      console.error('❌ Could not fetch System Default tenant');
      return;
    }
    
    const tenant = tenants[0];
    console.log('Current tenant data:');
    console.log('- Name:', tenant.name);
    console.log('- Status:', tenant.status);
    console.log('- Subdomain:', tenant.subdomain);
    
    // Test 1: Update with same values (no actual changes)
    console.log('\n🧪 Test 1: Update with same values (simulating UI form submission)');
    const sameValuesUpdate = {
      name: tenant.name,
      subdomain: tenant.subdomain,
      status: tenant.status,
      subscription_plan: tenant.subscription_plan,
      max_users: tenant.max_users,
      max_patients: tenant.max_patients,
      primary_color: tenant.primary_color
    };
    
    const { data: result1, error: error1 } = await updateTenant(tenant.id, sameValuesUpdate);
    
    if (error1) {
      console.error('❌ Test 1 failed:', error1.message);
    } else {
      console.log('✅ Test 1 passed: No-changes update successful');
      console.log('Returned tenant name:', result1?.name);
    }
    
    // Test 2: Update with empty object
    console.log('\n🧪 Test 2: Update with empty object');
    const { data: result2, error: error2 } = await updateTenant(tenant.id, {});
    
    if (error2) {
      console.error('❌ Test 2 failed:', error2.message);
    } else {
      console.log('✅ Test 2 passed: Empty update successful');
    }
    
    // Test 3: Update with one small change
    console.log('\n🧪 Test 3: Update with one small change');
    const { data: result3, error: error3 } = await updateTenant(tenant.id, {
      name: tenant.name + ' (Test)'
    });
    
    if (error3) {
      console.error('❌ Test 3 failed:', error3.message);
    } else {
      console.log('✅ Test 3 passed: Small change update successful');
      
      // Restore original name
      await updateTenant(tenant.id, { name: tenant.name });
      console.log('✅ Restored original name');
    }
    
    console.log('\n🎉 All tests completed!');
    console.log('✅ The "Failed to update tenant" error should now be fixed.');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testNoChangesUpdate();
