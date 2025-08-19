#!/usr/bin/env node

/**
 * Emergency User Deletion Tool
 * Use this when "Database error deleting user" occurs
 * No environment setup required - just update the credentials below
 */

import { createClient } from '@supabase/supabase-js';

// TEMPORARY CREDENTIALS - UPDATE THESE WITH YOUR ACTUAL VALUES
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
const SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY_HERE';

// Instructions to get your credentials:
console.log('🔧 Emergency User Deletion Tool\n');

if (SUPABASE_URL === 'YOUR_SUPABASE_URL_HERE' || SERVICE_ROLE_KEY === 'YOUR_SERVICE_ROLE_KEY_HERE') {
    console.log('❌ Please update the credentials in this script first:\n');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Settings > API');
    console.log('3. Copy your Project URL and Service Role Key');
    console.log('4. Update SUPABASE_URL and SERVICE_ROLE_KEY in this script');
    console.log('\nExample:');
    console.log('const SUPABASE_URL = "https://abcdefgh.supabase.co";');
    console.log('const SERVICE_ROLE_KEY = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...";');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function emergencyDeleteUser(email) {
    console.log(`🗑️  Emergency deletion for: ${email}\n`);
    
    try {
        // Method 1: Try the force delete function (if SQL fix was applied)
        console.log('1️⃣ Trying force delete function...');
        const { data: forceDeleteData, error: forceDeleteError } = await supabase
            .rpc('force_delete_user', { user_email: email });
            
        if (!forceDeleteError && forceDeleteData?.success) {
            console.log('✅ User deleted successfully via force delete function!');
            console.log('📊 Result:', forceDeleteData);
            return;
        }
        
        if (forceDeleteError) {
            console.log('⚠️  Force delete function not available:', forceDeleteError.message);
        } else {
            console.log('⚠️  Force delete failed:', forceDeleteData?.error);
        }
        
        // Method 2: Manual deletion with proper order
        console.log('2️⃣ Trying manual deletion...');
        
        // Get user info first
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        
        if (listError) {
            console.error('❌ Cannot list users:', listError.message);
            return;
        }
        
        const user = users.find(u => u.email === email);
        if (!user) {
            console.error(`❌ User not found: ${email}`);
            return;
        }
        
        console.log(`📝 Found user: ${user.id}`);
        
        // Delete profile first
        console.log('3️⃣ Deleting user profile...');
        const { error: profileError } = await supabase
            .from('user_profiles')
            .delete()
            .eq('id', user.id);
            
        if (profileError) {
            console.log('⚠️  Profile deletion failed:', profileError.message);
        } else {
            console.log('✅ Profile deleted');
        }
        
        // Delete auth user
        console.log('4️⃣ Deleting auth user...');
        const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
        
        if (authError) {
            console.error('❌ Auth user deletion failed:', authError.message);
            console.log('\n🔧 To fix this issue:');
            console.log('1. Run the emergency-delete-user-fix.sql script in Supabase SQL Editor');
            console.log('2. Then try this deletion tool again');
            return;
        }
        
        console.log('✅ User deleted successfully!');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
        console.log('\n🔧 Troubleshooting steps:');
        console.log('1. Verify your Service Role Key has the correct permissions');
        console.log('2. Run the emergency-delete-user-fix.sql script');
        console.log('3. Check for foreign key constraints in your database');
    }
}

async function listUsersForDeletion() {
    console.log('👥 Users available for deletion:\n');
    
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
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.email} (ID: ${user.id.substring(0, 8)}...)`);
        });
        
        console.log('\nTo delete a user, run:');
        console.log('node emergency-delete-user.mjs delete user@example.com');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// Command line interface
const command = process.argv[2];
const email = process.argv[3];

if (command === 'delete' && email) {
    await emergencyDeleteUser(email);
} else if (command === 'list') {
    await listUsersForDeletion();
} else {
    console.log('Usage:');
    console.log('  node emergency-delete-user.mjs list              - List all users');
    console.log('  node emergency-delete-user.mjs delete email     - Delete specific user');
    console.log('\nExample:');
    console.log('  node emergency-delete-user.mjs delete user@example.com');
}
