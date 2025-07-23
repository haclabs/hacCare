#!/usr/bin/env node

/**
 * Direct Foreign Key Migration
 * This script fixes the foreign key constraint issues directly
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

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runDirectMigration() {
  console.log('🔧 Running direct migration to fix foreign key issues...\n');
  
  try {
    // Step 1: Fix invalid admin_user_id in tenants table
    console.log('Step 1: Fixing invalid admin_user_id values...');
    
    const { data: adminUser } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('email', 'admin@haccare.com')
      .single();
    
    if (adminUser) {
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ admin_user_id: adminUser.id })
        .eq('admin_user_id', '00000000-0000-0000-0000-000000000000');
      
      if (updateError) {
        console.error('Error updating admin_user_id:', updateError);
      } else {
        console.log('✅ Updated invalid admin_user_id to:', adminUser.id);
      }
    }
    
    // Step 2: Use Supabase dashboard or direct SQL approach
    console.log('\nStep 2: Instructions for adding foreign key constraints...');
    
    console.log('Please run the following SQL commands in your Supabase SQL Editor:');
    console.log('');
    console.log('-- Drop existing constraints if they exist');
    console.log('ALTER TABLE tenant_users DROP CONSTRAINT IF EXISTS tenant_users_user_id_fkey;');
    console.log('ALTER TABLE tenant_users DROP CONSTRAINT IF EXISTS tenant_users_tenant_id_fkey;'); 
    console.log('ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_admin_user_id_fkey;');
    console.log('');
    console.log('-- Add foreign key constraints');
    console.log('ALTER TABLE tenant_users ADD CONSTRAINT tenant_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;');
    console.log('ALTER TABLE tenant_users ADD CONSTRAINT tenant_users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;');
    console.log('ALTER TABLE tenants ADD CONSTRAINT tenants_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES user_profiles(id) ON DELETE SET NULL;');
    
    // Step 3: Verify the current state
    console.log('\nStep 3: Verifying current state...');
    
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, admin_user_id');
    
    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError);
    } else {
      console.log('Current tenants:', tenants);
    }
    
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, email');
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    } else {
      console.log('Available user profiles:', profiles);
    }
    
    console.log('\n🎉 Data validation completed!');
    console.log('After running the SQL commands above, your foreign key relationships will be fixed.');
    
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

runDirectMigration();
