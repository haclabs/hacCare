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

// Load environment variables
const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkData() {
  try {
    console.log('=== Checking Tenants Table ===');
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, admin_user_id');
    
    if (tenantsError) {
      console.error('Error fetching tenants:', tenantsError);
    } else {
      console.log('Tenants found:', tenants?.length || 0);
      tenants?.forEach(tenant => {
        console.log(`- ${tenant.name} (${tenant.id}) - Admin: ${tenant.admin_user_id}`);
      });
    }
    
    console.log('\n=== Checking User Profiles Table ===');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(5);
    
    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      
      // Try to get table schema info
      console.log('\nTrying to check if table exists...');
      const { data: schemaCheck, error: schemaError } = await supabase
        .from('user_profiles')
        .select('id')
        .limit(1);
      
      if (schemaError) {
        console.error('Schema error:', schemaError);
      } else {
        console.log('Table exists but columns might be different');
      }
    } else {
      console.log('User profiles found:', profiles?.length || 0);
      if (profiles && profiles.length > 0) {
        console.log('Sample profile columns:', Object.keys(profiles[0]));
        profiles.forEach(profile => {
          console.log(`- ${profile.email || profile.id} (${profile.id})`);
        });
      }
    }

    console.log('\n=== Checking Auth Users ===');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('Error fetching auth users:', authError);
    } else {
      console.log('Auth users found:', authUsers?.users?.length || 0);
      authUsers?.users?.forEach(user => {
        console.log(`- ${user.email} (${user.id})`);
      });
    }

    // Check for invalid admin_user_id values
    if (tenants && tenants.length > 0) {
      console.log('\n=== Checking for Invalid Admin User IDs ===');
      const invalidTenants = tenants.filter(tenant => 
        !profiles?.find(profile => profile.id === tenant.admin_user_id)
      );
      
      if (invalidTenants.length > 0) {
        console.log('❌ Found tenants with invalid admin_user_id:');
        invalidTenants.forEach(tenant => {
          console.log(`- ${tenant.name}: ${tenant.admin_user_id}`);
        });
      } else {
        console.log('✅ All tenants have valid admin_user_id values');
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkData();
