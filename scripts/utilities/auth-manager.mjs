#!/usr/bin/env node

/**
 * Supabase Auth Management Tool
 * Use this when Supabase Dashboard auth operations are failing
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try to load environment variables from .env file
let env = {};
try {
  const envFile = readFileSync('../../.env', 'utf8');
  const lines = envFile.split('\n');
  for (const line of lines) {
    const [key, value] = line.split('=');
    if (key && value) {
      env[key.trim()] = value.trim().replace(/['"]/g, '');
    }
  }
} catch (error) {
  console.log('⚠️  Could not load .env file, using environment variables');
}

const supabaseUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Supabase Auth Management Tool\n');

if (!supabaseUrl) {
    console.error('❌ VITE_SUPABASE_URL is required');
    console.log('   Set it in .env file or environment variables');
    process.exit(1);
}

if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is required');
    console.log('   Set it in .env file or environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function listUsers() {
    console.log('👥 Listing all auth users...\n');
    
    try {
        const { data: { users }, error } = await supabase.auth.admin.listUsers();
        
        if (error) {
            console.error('❌ Error listing users:', error.message);
            return;
        }
        
        if (users.length === 0) {
            console.log('No users found');
            return;
        }
        
        console.log(`Found ${users.length} users:\n`);
        users.forEach((user, index) => {
            console.log(`${index + 1}. Email: ${user.email}`);
            console.log(`   ID: ${user.id}`);
            console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);
            console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
            console.log(`   Last Sign In: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}`);
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

async function createUser(email, password = 'admin123') {
    console.log(`👤 Creating user: ${email}...\n`);
    
    try {
        const { data, error } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true
        });
        
        if (error) {
            console.error('❌ Error creating user:', error.message);
            
            // Try alternative approach
            console.log('🔄 Trying alternative creation method...');
            const { data: rpcData, error: rpcError } = await supabase.rpc('safe_create_super_admin', {
                user_email: email,
                user_password: password
            });
            
            if (rpcError) {
                console.error('❌ Alternative method also failed:', rpcError.message);
                return;
            }
            
            console.log('✅ User created via alternative method:', rpcData);
            return;
        }
        
        console.log('✅ User created successfully!');
        console.log(`📧 Email: ${data.user.email}`);
        console.log(`🆔 ID: ${data.user.id}`);
        console.log(`🔑 Password: ${password}`);
        
        // Try to create profile
        console.log('📝 Creating user profile...');
        const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .insert({
                id: data.user.id,
                email: email,
                role: 'super_admin',
                is_active: true
            })
            .select()
            .single();
            
        if (profileError) {
            console.error('⚠️  Profile creation failed:', profileError.message);
            console.log('   The auth user was created but profile creation failed');
        } else {
            console.log('✅ Profile created successfully');
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

async function deleteUser(email) {
    console.log(`🗑️  Deleting user: ${email}...\n`);
    
    try {
        // First get the user
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        
        if (listError) {
            console.error('❌ Error finding user:', listError.message);
            return;
        }
        
        const user = users.find(u => u.email === email);
        if (!user) {
            console.error(`❌ User not found: ${email}`);
            return;
        }
        
        // Try to delete via admin API
        const { error } = await supabase.auth.admin.deleteUser(user.id);
        
        if (error) {
            console.error('❌ Error deleting user via API:', error.message);
            
            // Try alternative approach
            console.log('🔄 Trying alternative deletion method...');
            const { data: rpcData, error: rpcError } = await supabase.rpc('safe_delete_user', {
                user_email: email
            });
            
            if (rpcError) {
                console.error('❌ Alternative method also failed:', rpcError.message);
                return;
            }
            
            console.log('✅ User deleted via alternative method:', rpcData);
            return;
        }
        
        console.log('✅ User deleted successfully!');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

// Command line interface
const command = process.argv[2];
const email = process.argv[3];
const password = process.argv[4];

switch (command) {
    case 'list':
        await listUsers();
        break;
    case 'create':
        if (!email) {
            console.error('❌ Email is required for create command');
            console.log('Usage: node auth-manager.mjs create email@example.com [password]');
            process.exit(1);
        }
        await createUser(email, password);
        break;
    case 'delete':
        if (!email) {
            console.error('❌ Email is required for delete command');
            console.log('Usage: node auth-manager.mjs delete email@example.com');
            process.exit(1);
        }
        await deleteUser(email);
        break;
    default:
        console.log('🔧 Supabase Auth Management Tool');
        console.log('');
        console.log('Usage:');
        console.log('  node auth-manager.mjs list                    - List all users');
        console.log('  node auth-manager.mjs create email [password] - Create new user');
        console.log('  node auth-manager.mjs delete email           - Delete user');
        console.log('');
        console.log('Examples:');
        console.log('  node auth-manager.mjs list');
        console.log('  node auth-manager.mjs create admin@haclabs.io admin123');
        console.log('  node auth-manager.mjs delete test@example.com');
        break;
}
