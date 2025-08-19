#!/usr/bin/env node

/**
 * Create Super Admin User via Supabase Client
 * This bypasses database connection issues and uses the Supabase API
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Try to load environment variables
config();

// Supabase configuration - you'll need to set these
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY';

if (!supabaseUrl || supabaseUrl === 'YOUR_SUPABASE_URL') {
    console.error('❌ VITE_SUPABASE_URL environment variable is required');
    console.log('Set it in .env file or environment variables');
    process.exit(1);
}

if (!supabaseServiceKey || supabaseServiceKey === 'YOUR_SERVICE_ROLE_KEY') {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
    console.log('Set it in .env file or environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function createSuperAdmin() {
    const email = 'admin@haclabs.io';
    const password = 'admin123'; // Change this!
    
    console.log('🔐 Creating super admin user...');
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log('');
    
    try {
        // Step 1: Create auth user
        console.log('1️⃣ Creating auth user...');
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true
        });
        
        if (authError) {
            console.error('❌ Auth user creation failed:', authError.message);
            return;
        }
        
        console.log('✅ Auth user created successfully');
        console.log(`🆔 User ID: ${authData.user.id}`);
        
        // Step 2: Create user profile
        console.log('2️⃣ Creating user profile...');
        const { data: profileData, error: profileError } = await supabase
            .from('user_profiles')
            .insert({
                id: authData.user.id,
                email: email,
                role: 'super_admin',
                is_active: true
            })
            .select()
            .single();
            
        if (profileError) {
            console.error('❌ Profile creation failed:', profileError.message);
            console.log('🔄 Attempting to update existing profile...');
            
            // Try to update existing profile instead
            const { data: updateData, error: updateError } = await supabase
                .from('user_profiles')
                .update({
                    role: 'super_admin',
                    is_active: true
                })
                .eq('id', authData.user.id)
                .select()
                .single();
                
            if (updateError) {
                console.error('❌ Profile update failed:', updateError.message);
                return;
            }
            
            console.log('✅ Profile updated successfully');
            console.log('📝 Profile data:', updateData);
        } else {
            console.log('✅ Profile created successfully');
            console.log('📝 Profile data:', profileData);
        }
        
        console.log('');
        console.log('🎉 Super admin user created successfully!');
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Password: ${password}`);
        console.log('🔗 You can now sign in with these credentials');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

createSuperAdmin();
