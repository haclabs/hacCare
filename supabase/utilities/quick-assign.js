#!/usr/bin/env node
/**
 * Quick tenant assignment using environment variables
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uxuhymdplezxwuvcpbqe.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4dWh5bWRwbGV6eHd1dmNwYnFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzNTc1MDUsImV4cCI6MjA0ODkzMzUwNX0.9wDuA-8xb0WjzO1LcOr3gGDdNjLB5Fgk7F5Qh0hAj4E';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function quickAssign() {
  try {
    console.log('🔄 Quick tenant assignment...');
    
    // First authenticate as the user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@haccare.com',
      password: 'admin123'
    });
    
    if (authError) {
      console.error('❌ Auth failed:', authError);
      return;
    }
    
    console.log('✅ Authenticated as:', authData.user.email);
    
    // Get or create tenant
    let { data: tenants } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('status', 'active')
      .limit(1);
    
    if (!tenants || tenants.length === 0) {
      console.log('Creating default tenant...');
      const { data: newTenant, error: createError } = await supabase
        .from('tenants')
        .insert({
          name: 'Default Healthcare Organization',
          subdomain: 'default-org',
          admin_user_id: authData.user.id,
          subscription_plan: 'basic',
          max_users: 100,
          max_patients: 1000,
          status: 'active',
          settings: {
            timezone: 'UTC',
            date_format: 'MM/DD/YYYY',
            currency: 'USD'
          }
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating tenant:', createError);
        return;
      }
      
      tenants = [newTenant];
    }
    
    const targetTenant = tenants[0];
    console.log('🏥 Using tenant:', targetTenant.name);
    
    // Check if already assigned
    const { data: existing } = await supabase
      .from('tenant_users')
      .select('*')
      .eq('user_id', authData.user.id)
      .eq('tenant_id', targetTenant.id)
      .single();
    
    if (existing) {
      console.log('✅ Already assigned - activating...');
      await supabase
        .from('tenant_users')
        .update({ is_active: true })
        .eq('user_id', authData.user.id)
        .eq('tenant_id', targetTenant.id);
    } else {
      console.log('➕ Creating new assignment...');
      const { error: assignError } = await supabase
        .from('tenant_users')
        .insert({
          user_id: authData.user.id,
          tenant_id: targetTenant.id,
          role: 'admin',
          permissions: [
            'patients:read',
            'patients:write',
            'alerts:read',
            'alerts:write',
            'medications:read'
          ],
          is_active: true
        });
      
      if (assignError) {
        console.error('❌ Assignment error:', assignError);
        return;
      }
    }
    
    console.log('✅ Success! Refresh your browser to see alerts.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

quickAssign();
