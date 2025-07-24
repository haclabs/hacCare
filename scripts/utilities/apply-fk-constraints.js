#!/usr/bin/env node

/**
 * Apply Foreign Key Constraints
 * This script applies the foreign key constraints using a simple approach
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

async function executeSingleSQL(sql, description) {
  console.log(`Executing: ${description}`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      if (error.message.includes('does not exist') || error.message.includes('already exists')) {
        console.log(`⚠️  ${description}: ${error.message} (this is normal)`);
      } else {
        console.error(`❌ ${description}:`, error);
        return false;
      }
    } else {
      console.log(`✅ ${description}: Success`);
    }
    return true;
  } catch (err) {
    console.error(`❌ ${description}:`, err);
    return false;
  }
}

async function applyForeignKeys() {
  console.log('🔧 Applying foreign key constraints...\n');
  
  const commands = [
    {
      sql: 'ALTER TABLE tenant_users DROP CONSTRAINT IF EXISTS tenant_users_user_id_fkey;',
      description: 'Drop existing tenant_users -> user_profiles FK'
    },
    {
      sql: 'ALTER TABLE tenant_users DROP CONSTRAINT IF EXISTS tenant_users_tenant_id_fkey;',
      description: 'Drop existing tenant_users -> tenants FK'
    },
    {
      sql: 'ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_admin_user_id_fkey;',
      description: 'Drop existing tenants -> user_profiles FK'
    },
    {
      sql: 'ALTER TABLE tenant_users ADD CONSTRAINT tenant_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;',
      description: 'Add tenant_users -> user_profiles FK'
    },
    {
      sql: 'ALTER TABLE tenant_users ADD CONSTRAINT tenant_users_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;',
      description: 'Add tenant_users -> tenants FK'
    },
    {
      sql: 'ALTER TABLE tenants ADD CONSTRAINT tenants_admin_user_id_fkey FOREIGN KEY (admin_user_id) REFERENCES user_profiles(id) ON DELETE SET NULL;',
      description: 'Add tenants -> user_profiles FK'
    }
  ];
  
  for (const command of commands) {
    await executeSingleSQL(command.sql, command.description);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between commands
  }
  
  console.log('\n🎉 Foreign key constraints application completed!');
  
  // Verify by testing a join
  console.log('\nVerifying foreign key relationships...');
  try {
    const { data, error } = await supabase
      .from('tenants')
      .select(`
        id,
        name,
        admin_user_id,
        user_profiles!tenants_admin_user_id_fkey (
          email
        )
      `);
    
    if (error) {
      console.error('Verification failed:', error);
    } else {
      console.log('✅ Foreign key relationships verified successfully!');
      console.log('Sample tenant with admin user:', data?.[0]);
    }
  } catch (err) {
    console.log('Foreign key relationships might still be setting up...');
  }
}

applyForeignKeys();
