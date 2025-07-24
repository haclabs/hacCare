#!/usr/bin/env node

/**
 * Show Available Users for Tenant Admin
 * This script shows all users who can be selected as tenant administrators
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

async function showAvailableAdmins() {
  console.log('👥 Available Users for Tenant Admin Selection\n');
  
  try {
    // Get all users who can be tenant admins
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name, role')
      .eq('is_active', true)
      .order('email');
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('No users found');
      return;
    }
    
    console.log('Available users (copy the UUID for admin_user_id field):');
    console.log('═'.repeat(80));
    
    users.forEach((user, index) => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No name';
      const roleIndicator = user.role === 'admin' || user.role === 'super_admin' ? '🔑' : '👤';
      
      console.log(`${index + 1}. ${roleIndicator} ${user.email}`);
      console.log(`   Name: ${fullName}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   UUID: ${user.id}`);
      console.log('   ' + '─'.repeat(60));
    });
    
    console.log('\n📋 Instructions:');
    console.log('1. Choose a user with "admin" or "super_admin" role (🔑)');
    console.log('2. Copy their UUID (the long string with dashes)');
    console.log('3. Paste it into the "Admin User ID" field when creating a tenant');
    
    // Show recommended users
    const adminUsers = users.filter(u => u.role === 'admin' || u.role === 'super_admin');
    if (adminUsers.length > 0) {
      console.log('\n🎯 Recommended for tenant admin:');
      adminUsers.forEach(user => {
        const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'No name';
        console.log(`   • ${user.email} (${fullName}) - UUID: ${user.id}`);
      });
    }
    
  } catch (error) {
    console.error('Script failed:', error);
  }
}

showAvailableAdmins();
