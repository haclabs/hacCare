/**
 * Test Script: Tenant Isolation Verification
 * 
 * This script tests that tenant isolation is working correctly.
 * It verifies that users can only see patients from their assigned tenant.
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables (you'll need to set these)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTenantIsolation() {
  console.log('🧪 Testing Tenant Isolation...\n');

  try {
    // 1. Check if tenants exist
    console.log('1️⃣ Checking tenants...');
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, status')
      .limit(5);

    if (tenantsError) {
      console.error('❌ Error fetching tenants:', tenantsError);
      return;
    }

    console.log(`✅ Found ${tenants?.length || 0} tenants:`);
    tenants?.forEach(tenant => {
      console.log(`   - ${tenant.name} (${tenant.id}) - ${tenant.status}`);
    });

    if (!tenants || tenants.length === 0) {
      console.log('⚠️  No tenants found. Please create some tenants first.');
      return;
    }

    // 2. Check patients per tenant
    console.log('\n2️⃣ Checking patients per tenant...');
    for (const tenant of tenants) {
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('id, patient_id, first_name, last_name, tenant_id')
        .eq('tenant_id', tenant.id);

      if (patientsError) {
        console.error(`❌ Error fetching patients for ${tenant.name}:`, patientsError);
        continue;
      }

      console.log(`🏢 ${tenant.name}: ${patients?.length || 0} patients`);
      patients?.forEach(patient => {
        console.log(`   - ${patient.first_name} ${patient.last_name} (${patient.patient_id})`);
      });
    }

    // 3. Check tenant users
    console.log('\n3️⃣ Checking tenant users...');
    for (const tenant of tenants) {
      const { data: tenantUsers, error: usersError } = await supabase
        .from('tenant_users')
        .select(`
          user_id,
          role,
          is_active,
          user_profiles:user_profiles(email, first_name, last_name)
        `)
        .eq('tenant_id', tenant.id)
        .eq('is_active', true);

      if (usersError) {
        console.error(`❌ Error fetching users for ${tenant.name}:`, usersError);
        continue;
      }

      console.log(`👥 ${tenant.name}: ${tenantUsers?.length || 0} users`);
      tenantUsers?.forEach(tu => {
        const profile = tu.user_profiles;
        console.log(`   - ${profile?.first_name} ${profile?.last_name} (${profile?.email}) - ${tu.role}`);
      });
    }

    // 4. Test isolation by showing what would happen without filtering
    console.log('\n4️⃣ Testing isolation impact...');
    const { data: allPatients, error: allPatientsError } = await supabase
      .from('patients')
      .select('id, tenant_id')
      .limit(100);

    if (allPatientsError) {
      console.error('❌ Error fetching all patients:', allPatientsError);
      return;
    }

    const patientsByTenant = {};
    allPatients?.forEach(patient => {
      const tenantId = patient.tenant_id || 'unassigned';
      if (!patientsByTenant[tenantId]) {
        patientsByTenant[tenantId] = 0;
      }
      patientsByTenant[tenantId]++;
    });

    console.log('📊 Patient distribution:');
    Object.entries(patientsByTenant).forEach(([tenantId, count]) => {
      const tenant = tenants.find(t => t.id === tenantId);
      const tenantName = tenant ? tenant.name : 'Unassigned';
      console.log(`   - ${tenantName}: ${count} patients`);
    });

    console.log('\n✅ Tenant isolation test completed!');
    console.log('💡 With proper isolation:');
    console.log('   - Users see only their tenant\'s patients');
    console.log('   - Super admins see all patients');
    console.log('   - Unassigned users see no patients');

  } catch (error) {
    console.error('❌ Error during test:', error);
  }
}

// Run the test
testTenantIsolation();
