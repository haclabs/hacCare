#!/usr/bin/env node

/**
 * Test Foreign Key Relationships
 * This script tests that the foreign key relationships are working properly
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

async function testForeignKeyRelationships() {
  console.log('🧪 Testing foreign key relationships...\n');
  
  try {
    // Test 1: Tenants with admin user profile
    console.log('Test 1: Tenants with admin user profile join');
    const { data: tenantsWithAdmin, error: error1 } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        admin_user_id,
        user_profiles!tenants_admin_user_id_fkey (
          email,
          first_name,
          last_name
        )
      `);
    
    if (error1) {
      console.error('❌ Test 1 failed:', error1);
    } else {
      console.log('✅ Test 1 passed');
      console.log('Sample result:', tenantsWithAdmin?.[0]);
    }
    
    // Test 2: Tenant users with user profiles
    console.log('\nTest 2: Tenant users with user profiles join');
    const { data: tenantUsersWithProfiles, error: error2 } = await supabase
      .from('tenant_users')
      .select(`
        id,
        role,
        user_profiles!tenant_users_user_id_fkey (
          email,
          first_name,
          last_name
        )
      `)
      .limit(1);
    
    if (error2) {
      console.error('❌ Test 2 failed:', error2);
    } else {
      console.log('✅ Test 2 passed');
      console.log('Sample result:', tenantUsersWithProfiles?.[0]);
    }
    
    // Test 3: Tenant users with tenants
    console.log('\nTest 3: Tenant users with tenants join');
    const { data: tenantUsersWithTenants, error: error3 } = await supabase
      .from('tenant_users')
      .select(`
        id,
        role,
        tenants!tenant_users_tenant_id_fkey (
          name,
          subdomain
        )
      `)
      .limit(1);
    
    if (error3) {
      console.error('❌ Test 3 failed:', error3);
    } else {
      console.log('✅ Test 3 passed');
      console.log('Sample result:', tenantUsersWithTenants?.[0]);
    }
    
    // Test 4: Check foreign key constraints exist
    console.log('\nTest 4: Verify foreign key constraints exist');
    const { data: constraints, error: error4 } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          conname as constraint_name,
          conrelid::regclass as table_name,
          confrelid::regclass as referenced_table
        FROM pg_constraint 
        WHERE contype = 'f' 
        AND conname IN (
          'tenant_users_user_id_fkey',
          'tenant_users_tenant_id_fkey', 
          'tenants_admin_user_id_fkey'
        )
      `
    });
    
    if (error4) {
      console.error('❌ Test 4 failed:', error4);
    } else {
      console.log('✅ Test 4 passed');
      console.log('Foreign key constraints found:', constraints);
    }
    
    console.log('\n🎉 Foreign key relationship testing completed!');
    
  } catch (error) {
    console.error('Test suite failed:', error);
  }
}

testForeignKeyRelationships();
