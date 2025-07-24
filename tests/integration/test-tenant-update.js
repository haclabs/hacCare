#!/usr/bin/env node

/**
 * Test Tenant Update Functionality
 * This script tests that tenant updates work without the "multiple rows" error
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

async function testTenantUpdate() {
  console.log('🧪 Testing tenant update functionality...\n');
  
  try {
    // First, get all tenants
    console.log('Step 1: Getting existing tenants');
    const { data: tenants, error: fetchError } = await supabase
      .from('tenants')
      .select('id, name, status');
    
    if (fetchError) {
      console.error('❌ Error fetching tenants:', fetchError);
      return;
    }
    
    console.log('✅ Found tenants:', tenants);
    
    if (!tenants || tenants.length === 0) {
      console.log('No tenants found to test update');
      return;
    }
    
    const testTenant = tenants[0];
    console.log(`\nStep 2: Testing update on tenant: ${testTenant.name} (${testTenant.id})`);
    
    // Test the problematic update operation
    const updateData = {
      name: testTenant.name + ' (Updated)',
      updated_at: new Date().toISOString()
    };
    
    const { data: updateResult, error: updateError } = await supabase
      .from('tenants')
      .update(updateData)
      .eq('id', testTenant.id)
      .select();
    
    if (updateError) {
      console.error('❌ Update failed:', updateError);
    } else {
      console.log('✅ Update successful');
      console.log('Updated tenant:', updateResult);
      
      // Restore original name
      const { error: restoreError } = await supabase
        .from('tenants')
        .update({ name: testTenant.name })
        .eq('id', testTenant.id);
      
      if (restoreError) {
        console.warn('⚠️  Could not restore original name:', restoreError);
      } else {
        console.log('✅ Restored original tenant name');
      }
    }
    
    // Test the fixed updateTenant function (simulate it)
    console.log('\nStep 3: Testing the fixed update logic');
    
    // First check if tenant exists
    const { data: existingTenant, error: checkError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', testTenant.id);
    
    if (checkError) {
      console.error('❌ Existence check failed:', checkError);
    } else if (!existingTenant || existingTenant.length === 0) {
      console.error('❌ Tenant not found');
    } else {
      console.log('✅ Tenant exists, proceeding with update');
      
      const { data: finalUpdate, error: finalError } = await supabase
        .from('tenants')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', testTenant.id)
        .select();
      
      if (finalError) {
        console.error('❌ Final update failed:', finalError);
      } else {
        console.log('✅ Final update successful');
        console.log('Rows affected:', finalUpdate?.length);
      }
    }
    
    console.log('\n🎉 Tenant update testing completed!');
    
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

testTenantUpdate();
