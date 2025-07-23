#!/usr/bin/env node

/**
 * Analyze Supabase Update Behavior
 * This script analyzes exactly what happens during different update scenarios
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

async function analyzeUpdateBehavior() {
  console.log('🔍 Analyzing Supabase update behavior...\n');
  
  try {
    const tenantId = '00000000-0000-0000-0000-000000000000';
    
    // Get current tenant data
    const { data: currentTenant } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenantId)
      .single();
    
    console.log('Current updated_at:', currentTenant?.updated_at);
    
    // Test 1: Update with exact same values (no updated_at)
    console.log('\n🧪 Test 1: Update with exact same values (no updated_at modification)');
    const { data: result1, error: error1 } = await supabase
      .from('tenants')
      .update({
        name: currentTenant.name,
        status: currentTenant.status
      })
      .eq('id', tenantId)
      .select();
    
    console.log('Result 1 - data length:', result1?.length, 'error:', error1?.message);
    if (result1 && result1.length > 0) {
      console.log('New updated_at:', result1[0].updated_at);
    }
    
    // Wait a second
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Test 2: Update with same values + new updated_at
    console.log('\n🧪 Test 2: Update with same values + new updated_at');
    const { data: result2, error: error2 } = await supabase
      .from('tenants')
      .update({
        name: currentTenant.name,
        status: currentTenant.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId)
      .select();
    
    console.log('Result 2 - data length:', result2?.length, 'error:', error2?.message);
    if (result2 && result2.length > 0) {
      console.log('New updated_at:', result2[0].updated_at);
    }
    
    // Test 3: Update with only updated_at
    console.log('\n🧪 Test 3: Update with only updated_at');
    const { data: result3, error: error3 } = await supabase
      .from('tenants')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId)
      .select();
    
    console.log('Result 3 - data length:', result3?.length, 'error:', error3?.message);
    
    // Test 4: Update with actual field change
    console.log('\n🧪 Test 4: Update with actual field change');
    const { data: result4, error: error4 } = await supabase
      .from('tenants')
      .update({
        name: currentTenant.name + ' (TEMP)',
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId)
      .select();
    
    console.log('Result 4 - data length:', result4?.length, 'error:', error4?.message);
    
    // Restore original name
    if (result4 && result4.length > 0) {
      await supabase
        .from('tenants')
        .update({ name: currentTenant.name })
        .eq('id', tenantId);
      console.log('✅ Restored original name');
    }
    
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}

analyzeUpdateBehavior();
