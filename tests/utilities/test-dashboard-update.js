#!/usr/bin/env node

/**
 * Test Management Dashboard Tenant Update
 * This script simulates the exact update operation from the management dashboard
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
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Simulate the exact updateTenant function from tenantService.ts
async function updateTenant(tenantId, updates) {
  try {
    // First check if the tenant exists
    const { data: existingTenant, error: checkError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenantId)
      .single();

    if (checkError) {
      if (checkError.code === 'PGRST116') {
        // No rows returned - tenant doesn't exist
        return { data: null, error: new Error(`Tenant with ID ${tenantId} not found`) };
      }
      return { data: null, error: checkError };
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

async function testDashboardUpdate() {
  console.log('🧪 Testing Management Dashboard tenant update...\n');
  
  try {
    // Get the test tenant
    console.log('Fetching tenants...');
    const { data: tenants, error: fetchError } = await supabase
      .from('tenants')
      .select('*');
    
    console.log('Fetch result - data:', tenants, 'error:', fetchError);
    
    if (fetchError) {
      console.error('❌ Error fetching tenants:', fetchError);
      return;
    }
    
    if (!tenants || tenants.length === 0) {
      console.log('❌ No tenants found');
      return;
    }
    
    const testTenant = tenants[0];
    console.log('Found tenant to test:', testTenant.name);
    
    // Simulate a typical dashboard update
    const formData = {
      name: testTenant.name,
      subdomain: testTenant.subdomain,
      status: testTenant.status,
      subscription_plan: testTenant.subscription_plan,
      max_users: testTenant.max_users,
      max_patients: testTenant.max_patients,
      primary_color: testTenant.primary_color
    };
    
    console.log('Testing update with form data...');
    const { data: updateResult, error: updateError } = await updateTenant(testTenant.id, formData);
    
    if (updateError) {
      console.error('❌ Update failed:', updateError);
    } else {
      console.log('✅ Update successful!');
      console.log('Updated tenant name:', updateResult.name);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testDashboardUpdate();
