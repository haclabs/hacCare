/**
 * Multi-Tenant Setup Utility
 * 
 * This utility helps set up the initial multi-tenant configuration
 * Run this script after applying the migration to configure your first tenant
 */

import { supabase } from '../src/lib/supabase';

// Configuration - Update these values for your setup
const SETUP_CONFIG = {
  // Admin user email (must exist in your user_profiles table)
  adminEmail: 'admin@yourhospital.com',
  
  // First tenant configuration
  tenant: {
    name: 'Your Hospital Name',
    subdomain: 'your-hospital',
    subscription_plan: 'premium',
    max_users: 50,
    max_patients: 500,
    settings: {
      timezone: 'America/New_York',
      date_format: 'MM/DD/YYYY',
      currency: 'USD',
      features: {
        advanced_analytics: true,
        medication_management: true,
        wound_care: true,
        barcode_scanning: true,
        mobile_app: true
      },
      security: {
        two_factor_required: false,
        session_timeout: 480,
        password_policy: {
          min_length: 8,
          require_uppercase: true,
          require_lowercase: true,
          require_numbers: true,
          require_symbols: true
        }
      }
    }
  }
};

/**
 * Step 1: Set up super admin user
 */
async function setupSuperAdmin() {
  console.log('🔧 Setting up super admin user...');
  
  const { data: user, error } = await supabase
    .from('user_profiles')
    .update({ role: 'super_admin' })
    .eq('email', SETUP_CONFIG.adminEmail)
    .select()
    .single();

  if (error) {
    console.error('❌ Error setting up super admin:', error);
    return null;
  }

  console.log('✅ Super admin set up successfully:', user.email);
  return user;
}

/**
 * Step 2: Create first tenant
 */
async function createFirstTenant(adminUserId) {
  console.log('🏥 Creating first tenant...');
  
  const tenantData = {
    ...SETUP_CONFIG.tenant,
    admin_user_id: adminUserId
  };

  const { data: tenant, error } = await supabase
    .from('tenants')
    .insert([tenantData])
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating tenant:', error);
    return null;
  }

  console.log('✅ Tenant created successfully:', tenant.name);
  return tenant;
}

/**
 * Step 3: Assign admin user to tenant
 */
async function assignAdminToTenant(tenantId, userId) {
  console.log('👤 Assigning admin user to tenant...');
  
  const tenantUser = {
    tenant_id: tenantId,
    user_id: userId,
    role: 'admin',
    permissions: [
      'patients:read', 'patients:write', 'patients:delete',
      'users:read', 'users:write', 'users:delete',
      'medications:read', 'medications:write', 'medications:delete',
      'alerts:read', 'alerts:write',
      'settings:read', 'settings:write'
    ],
    is_active: true
  };

  const { data, error } = await supabase
    .from('tenant_users')
    .insert([tenantUser])
    .select()
    .single();

  if (error) {
    console.error('❌ Error assigning user to tenant:', error);
    return null;
  }

  console.log('✅ Admin user assigned to tenant successfully');
  return data;
}

/**
 * Step 4: Update existing patients to belong to the new tenant
 */
async function assignPatientsToTenant(tenantId) {
  console.log('📋 Assigning existing patients to tenant...');
  
  // Get patients that are currently assigned to the default tenant
  const { data: patients, error: fetchError } = await supabase
    .from('patients')
    .select('id, first_name, last_name')
    .eq('tenant_id', '00000000-0000-0000-0000-000000000000');

  if (fetchError) {
    console.error('❌ Error fetching patients:', fetchError);
    return;
  }

  if (patients && patients.length > 0) {
    const { error: updateError } = await supabase
      .from('patients')
      .update({ tenant_id: tenantId })
      .eq('tenant_id', '00000000-0000-0000-0000-000000000000');

    if (updateError) {
      console.error('❌ Error updating patients:', updateError);
      return;
    }

    console.log(`✅ Assigned ${patients.length} patients to tenant`);
  } else {
    console.log('ℹ️ No patients to assign');
  }
}

/**
 * Step 5: Verify setup
 */
async function verifySetup() {
  console.log('🔍 Verifying setup...');
  
  // Check tenants
  const { data: tenants, error: tenantsError } = await supabase
    .from('tenants')
    .select('id, name, subdomain, status');

  if (tenantsError) {
    console.error('❌ Error fetching tenants:', tenantsError);
    return;
  }

  console.log('📊 Tenants:', tenants);

  // Check tenant users
  const { data: tenantUsers, error: usersError } = await supabase
    .from('tenant_users')
    .select(`
      id,
      role,
      is_active,
      tenants:tenant_id(name),
      user_profiles:user_id(email)
    `);

  if (usersError) {
    console.error('❌ Error fetching tenant users:', usersError);
    return;
  }

  console.log('👥 Tenant Users:', tenantUsers);

  // Check patient count
  const { count: patientCount, error: countError } = await supabase
    .from('patients')
    .select('id', { count: 'exact' })
    .neq('tenant_id', '00000000-0000-0000-0000-000000000000');

  if (countError) {
    console.error('❌ Error counting patients:', countError);
    return;
  }

  console.log(`📋 Patients assigned to real tenants: ${patientCount}`);
}

/**
 * Main setup function
 */
async function runSetup() {
  console.log('🚀 Starting multi-tenant setup...');
  console.log('📋 Configuration:', SETUP_CONFIG);
  
  try {
    // Step 1: Setup super admin
    const adminUser = await setupSuperAdmin();
    if (!adminUser) return;

    // Step 2: Create first tenant
    const tenant = await createFirstTenant(adminUser.id);
    if (!tenant) return;

    // Step 3: Assign admin to tenant
    const tenantUser = await assignAdminToTenant(tenant.id, adminUser.id);
    if (!tenantUser) return;

    // Step 4: Assign existing patients to tenant
    await assignPatientsToTenant(tenant.id);

    // Step 5: Verify setup
    await verifySetup();

    console.log('🎉 Multi-tenant setup completed successfully!');
    console.log(`🏥 Tenant: ${tenant.name} (${tenant.subdomain})`);
    console.log(`👤 Admin: ${adminUser.email}`);
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  }
}

// Export for use in other scripts or run directly
export { runSetup, SETUP_CONFIG };

// Uncomment to run directly with Node.js
// runSetup();
