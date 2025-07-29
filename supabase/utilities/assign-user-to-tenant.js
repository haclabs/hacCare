#!/usr/bin/env node

/**
 * Quick script to assign the current user to a tenant for testing
 * This resolves the "User has no tenant" issue with alerts
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Need: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function assignUserToTenant() {
  try {
    console.log('🔍 Finding current user...');
    
    // Find the user with email admin@haccare.com
    const { data: users, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('Error fetching users:', userError);
      return;
    }
    
    const targetUser = users.users.find(user => user.email === 'admin@haccare.com');
    if (!targetUser) {
      console.error('❌ User admin@haccare.com not found');
      return;
    }
    
    console.log('✅ Found user:', targetUser.id);
    
    // Check if a tenant exists, if not create one
    const { data: tenants, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .limit(1);
    
    if (tenantError) {
      console.error('Error fetching tenants:', tenantError);
      return;
    }
    
    let tenantId;
    if (tenants && tenants.length > 0) {
      tenantId = tenants[0].id;
      console.log('✅ Using existing tenant:', tenants[0].name);
    } else {
      // Create a default tenant
      const { data: newTenant, error: createError } = await supabase
        .from('tenants')
        .insert({
          name: 'Default Hospital',
          domain: 'localhost',
          settings: {}
        })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating tenant:', createError);
        return;
      }
      
      tenantId = newTenant.id;
      console.log('✅ Created new tenant:', newTenant.name);
    }
    
    // Check if user profile exists
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', targetUser.id)
      .single();
    
    if (existingProfile) {
      // Update existing profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ tenant_id: tenantId })
        .eq('user_id', targetUser.id);
        
      if (updateError) {
        console.error('Error updating user profile:', updateError);
        return;
      }
      
      console.log('✅ Updated user profile with tenant assignment');
    } else {
      // Create new profile
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: targetUser.id,
          email: targetUser.email,
          role: 'super_admin',
          tenant_id: tenantId,
          first_name: 'Admin',
          last_name: 'User'
        });
        
      if (insertError) {
        console.error('Error creating user profile:', insertError);
        return;
      }
      
      console.log('✅ Created user profile with tenant assignment');
    }
    
    console.log('🎉 User successfully assigned to tenant!');
    console.log('   Refresh the application to see alerts');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

assignUserToTenant();
