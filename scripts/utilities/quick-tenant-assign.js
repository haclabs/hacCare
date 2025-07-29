/**
 * Simple User-Tenant Assignment Script
 * Run this to assign the current user to a tenant
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function assignCurrentUserToTenant() {
  console.log('🔧 Assigning current user to tenant...\n');
  
  try {
    // Get current session
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      console.log('❌ No authenticated user. Please log in to the app first.');
      return;
    }
    
    const userId = session.session.user.id;
    console.log('👤 Current user:', userId);
    
    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email, role, first_name, last_name')
      .eq('id', userId)
      .single();
    
    console.log('📋 User info:', {
      email: profile?.email,
      role: profile?.role,
      name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
    });
    
    // Get first available tenant
    const { data: tenants } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('status', 'active')
      .limit(1);
    
    if (!tenants || tenants.length === 0) {
      console.log('❌ No active tenants found. Creating a default tenant...');
      
      // Create default tenant
      const { data: newTenant, error: createError } = await supabase
        .from('tenants')
        .insert({
          name: 'Default Healthcare Organization',
          subdomain: 'default-org',
          admin_user_id: userId,
          subscription_plan: 'basic',
          max_users: 100,
          max_patients: 1000,
          status: 'active',
          settings: {
            timezone: 'UTC',
            date_format: 'MM/DD/YYYY',
            currency: 'USD',
            features: {
              advanced_analytics: true,
              medication_management: true,
              wound_care: true,
              barcode_scanning: true,
              mobile_app: true
            }
          }
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating tenant:', createError);
        return;
      }
      
      console.log('✅ Created tenant:', newTenant.name);
      tenants[0] = newTenant;
    }
    
    const targetTenant = tenants[0];
    console.log('🎯 Target tenant:', targetTenant.name);
    
    // Check if already assigned
    const { data: existing } = await supabase
      .from('tenant_users')
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', targetTenant.id)
      .single();
    
    if (existing) {
      console.log('✅ User already assigned to this tenant');
      
      // Make sure it's active
      await supabase
        .from('tenant_users')
        .update({ is_active: true })
        .eq('user_id', userId)
        .eq('tenant_id', targetTenant.id);
      
      console.log('✅ Assignment activated');
      return;
    }
    
    // Assign user to tenant
    const userRole = profile?.role === 'super_admin' ? 'admin' : 'nurse';
    const { error: assignError } = await supabase
      .from('tenant_users')
      .insert({
        user_id: userId,
        tenant_id: targetTenant.id,
        role: userRole,
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
    
    console.log('✅ Successfully assigned user to tenant!');
    console.log('🔄 Please refresh your browser to see the changes.');
    console.log('📱 Alerts should now be visible.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

assignCurrentUserToTenant();
