/**
 * Utility Script: Assign User to Tenant
 * 
 * This script helps assign users to tenants for proper multi-tenant functionality.
 * Run this when users are seeing "User has no tenant" messages.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function assignUserToTenant() {
  console.log('🔧 User-Tenant Assignment Utility');
  console.log('===================================\n');
  
  try {
    // 1. Check current session
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      console.log('❌ No authenticated user found. Please log in first.');
      return;
    }
    
    const currentUserId = session.session.user.id;
    console.log('✅ Current user ID:', currentUserId);
    
    // 2. Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', currentUserId)
      .single();
    
    if (profileError) {
      console.error('❌ Error fetching user profile:', profileError);
      return;
    }
    
    console.log('👤 User profile:', {
      email: profile.email,
      name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown',
      role: profile.role
    });
    
    // 3. Check existing tenant assignments
    const { data: currentTenants, error: tenantCheckError } = await supabase
      .from('tenant_users')
      .select('tenant_id, role, is_active, tenants(name)')
      .eq('user_id', currentUserId);
    
    if (tenantCheckError) {
      console.error('❌ Error checking tenant assignments:', tenantCheckError);
    } else if (currentTenants && currentTenants.length > 0) {
      console.log('📋 Current tenant assignments:');
      currentTenants.forEach(assignment => {
        console.log(`   - ${assignment.tenants?.name || 'Unknown'} (${assignment.role}) - ${assignment.is_active ? 'Active' : 'Inactive'}`);
      });
      
      const activeTenants = currentTenants.filter(t => t.is_active);
      if (activeTenants.length > 0) {
        console.log('✅ User already has active tenant assignments.');
        return;
      }
    }
    
    // 4. Get available tenants
    const { data: availableTenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, status')
      .eq('status', 'active')
      .order('name');
    
    if (tenantsError) {
      console.error('❌ Error fetching tenants:', tenantsError);
      return;
    }
    
    if (!availableTenants || availableTenants.length === 0) {
      console.log('❌ No active tenants available. Create a tenant first.');
      return;
    }
    
    console.log('\n🏥 Available tenants:');
    availableTenants.forEach((tenant, index) => {
      console.log(`   ${index + 1}. ${tenant.name} (${tenant.id})`);
    });
    
    // 5. For this script, let's assign to the first available tenant
    const targetTenant = availableTenants[0];
    console.log(`\n🎯 Assigning user to: ${targetTenant.name}`);
    
    // 6. Use the RPC function to assign user to tenant
    const userRole = profile.role === 'super_admin' ? 'admin' : 'nurse';
    const { error: assignError } = await supabase
      .rpc('assign_user_to_tenant', {
        target_user_id: currentUserId,
        target_tenant_id: targetTenant.id,
        user_role: userRole,
        user_permissions: []
      });
    
    if (assignError) {
      console.error('❌ Error assigning user to tenant:', assignError);
      
      // Fallback: Try direct insert
      console.log('🔄 Trying direct tenant assignment...');
      const { error: directError } = await supabase
        .from('tenant_users')
        .insert({
          user_id: currentUserId,
          tenant_id: targetTenant.id,
          role: userRole,
          permissions: ['patients:read', 'patients:write', 'alerts:read'],
          is_active: true
        });
      
      if (directError) {
        console.error('❌ Direct assignment also failed:', directError);
        return;
      }
    }
    
    console.log('✅ Successfully assigned user to tenant!');
    console.log('🔄 Please refresh your application to see the changes.');
    
    // 7. Verify the assignment
    const { data: verification, error: verifyError } = await supabase
      .from('tenant_users')
      .select('role, is_active, tenants(name)')
      .eq('user_id', currentUserId)
      .eq('tenant_id', targetTenant.id)
      .single();
    
    if (verification && !verifyError) {
      console.log('✅ Assignment verified:', {
        tenant: verification.tenants?.name,
        role: verification.role,
        active: verification.is_active
      });
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Export for use in other scripts or run directly
export { assignUserToTenant };

// Run directly with Node.js
if (import.meta.url === `file://${process.argv[1]}`) {
  assignUserToTenant();
}
