import { 
  createTenant, 
  getAllTenants, 
  getManagementDashboardStats,
  addUserToTenant,
  getTenantUsers 
} from '../src/lib/tenantService.js';

/**
 * Test Multi-Tenant Functionality
 * 
 * This script tests the core multi-tenant features to ensure everything is working
 */

async function testMultiTenantFunctionality() {
  console.log('🧪 Testing Multi-Tenant Functionality...\n');

  try {
    // Test 1: Get all tenants
    console.log('📋 Test 1: Getting all tenants...');
    const { data: tenants, error: tenantsError } = await getAllTenants();
    
    if (tenantsError) {
      console.error('❌ Error getting tenants:', tenantsError);
      return;
    }
    
    console.log(`✅ Found ${tenants?.length || 0} tenants`);
    tenants?.forEach(tenant => {
      console.log(`   - ${tenant.name} (${tenant.subdomain}) - ${tenant.status}`);
    });
    console.log('');

    // Test 2: Get dashboard stats
    console.log('📊 Test 2: Getting dashboard statistics...');
    const { data: stats, error: statsError } = await getManagementDashboardStats();
    
    if (statsError) {
      console.error('❌ Error getting stats:', statsError);
      return;
    }
    
    console.log('✅ Dashboard Statistics:');
    console.log(`   - Total Tenants: ${stats?.total_tenants}`);
    console.log(`   - Active Tenants: ${stats?.active_tenants}`);
    console.log(`   - Total Users: ${stats?.total_users}`);
    console.log(`   - Total Patients: ${stats?.total_patients}`);
    console.log(`   - System Health: ${stats?.system_health}`);
    console.log('');

    // Test 3: Test tenant creation (if we have a real tenant)
    if (tenants && tenants.length > 1) {
      const realTenant = tenants.find(t => t.id !== '00000000-0000-0000-0000-000000000000');
      
      if (realTenant) {
        console.log('👥 Test 3: Getting tenant users...');
        const { data: users, error: usersError } = await getTenantUsers(realTenant.id);
        
        if (usersError) {
          console.error('❌ Error getting tenant users:', usersError);
        } else {
          console.log(`✅ Found ${users?.length || 0} users for tenant ${realTenant.name}`);
          users?.forEach(user => {
            console.log(`   - ${user.profiles?.email || 'Unknown'} (${user.role})`);
          });
        }
        console.log('');
      }
    }

    // Test 4: Create a test tenant (optional)
    console.log('🏥 Test 4: Creating test tenant...');
    const testTenantData = {
      name: 'Test Hospital',
      subdomain: 'test-hospital-' + Date.now(),
      admin_user_id: '00000000-0000-0000-0000-000000000000', // Placeholder
      subscription_plan: 'basic',
      max_users: 5,
      max_patients: 50,
      status: 'active',
      settings: {
        timezone: 'UTC',
        date_format: 'MM/DD/YYYY',
        currency: 'USD',
        features: {
          advanced_analytics: false,
          medication_management: true,
          wound_care: false,
          barcode_scanning: false,
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
            require_symbols: false
          }
        }
      }
    };

    const { data: newTenant, error: createError } = await createTenant(testTenantData);
    
    if (createError) {
      console.log('⚠️ Could not create test tenant (expected if not super admin):', createError.message);
    } else {
      console.log(`✅ Created test tenant: ${newTenant?.name}`);
    }
    console.log('');

    console.log('🎉 Multi-tenant functionality test completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Export for use or run directly
export { testMultiTenantFunctionality };

// Uncomment to run directly
// testMultiTenantFunctionality();
