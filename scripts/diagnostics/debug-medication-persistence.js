#!/usr/bin/env node

/**
 * 🐛 Medication Persistence Debug
 * 
 * Debug script to investigate why medications disappear after refresh
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

async function debugMedicationPersistence() {
  console.log('🐛 DEBUGGING MEDICATION PERSISTENCE ISSUE');
  console.log('==========================================\n');

  try {
    // 1. Check all patient_medications in database (bypass RLS)
    console.log('1️⃣ Checking all patient_medications in database...');
    const { data: allMeds, error: allMedsError } = await supabase
      .from('patient_medications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (allMedsError) {
      console.error('❌ Error fetching all medications:', allMedsError);
    } else {
      console.log(`✅ Found ${allMeds?.length || 0} total medications in database`);
      if (allMeds && allMeds.length > 0) {
        console.log('📊 Recent medications:');
        allMeds.forEach((med, index) => {
          console.log(`   ${index + 1}. ${med.name} - Patient: ${med.patient_id} - Tenant: ${med.tenant_id} - Created: ${med.created_at}`);
        });
      }
    }

    // 2. Check tenant structure
    console.log('\n2️⃣ Checking tenant structure...');
    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('*');

    if (tenantsError) {
      console.error('❌ Error fetching tenants:', tenantsError);
    } else {
      console.log(`✅ Found ${tenants?.length || 0} tenants`);
      tenants?.forEach(tenant => {
        console.log(`   - ${tenant.name} (${tenant.id}) - Subdomain: ${tenant.subdomain}`);
      });
    }

    // 3. Check patients and their tenant association
    console.log('\n3️⃣ Checking patients and tenant associations...');
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, first_name, last_name, tenant_id')
      .limit(5);

    if (patientsError) {
      console.error('❌ Error fetching patients:', patientsError);
    } else {
      console.log(`✅ Found ${patients?.length || 0} patients`);
      patients?.forEach(patient => {
        console.log(`   - ${patient.first_name} ${patient.last_name} (${patient.id}) - Tenant: ${patient.tenant_id}`);
      });
    }

    // 4. Check user profiles and their roles
    console.log('\n4️⃣ Checking user profiles...');
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, email, role')
      .limit(5);

    if (profilesError) {
      console.error('❌ Error fetching user profiles:', profilesError);
    } else {
      console.log(`✅ Found ${profiles?.length || 0} user profiles`);
      profiles?.forEach(profile => {
        console.log(`   - ${profile.email} (${profile.id}) - Role: ${profile.role}`);
      });
    }

    // 5. Check tenant_users associations
    console.log('\n5️⃣ Checking tenant_users associations...');
    const { data: tenantUsers, error: tenantUsersError } = await supabase
      .from('tenant_users')
      .select(`
        id, 
        user_id, 
        tenant_id, 
        role, 
        is_active,
        user_profiles!tenant_users_user_id_fkey(email),
        tenants!tenant_users_tenant_id_fkey(name)
      `)
      .limit(10);

    if (tenantUsersError) {
      console.error('❌ Error fetching tenant_users:', tenantUsersError);
    } else {
      console.log(`✅ Found ${tenantUsers?.length || 0} tenant-user associations`);
      tenantUsers?.forEach(tu => {
        console.log(`   - ${tu.user_profiles?.email} in ${tu.tenants?.name} - Role: ${tu.role} - Active: ${tu.is_active}`);
      });
    }

    // 6. Test RLS policies for medications
    console.log('\n6️⃣ Testing RLS policies...');
    
    // Get a sample user to test with
    const sampleUser = profiles?.[0];
    if (sampleUser) {
      console.log(`Testing with user: ${sampleUser.email} (${sampleUser.id})`);
      
      // Test with regular user context (not service role)
      const regularSupabase = createClient(supabaseUrl, env.VITE_SUPABASE_ANON_KEY);
      
      // Note: We can't actually authenticate in this script, but we can check the policy logic
      console.log('RLS policy should filter based on:');
      console.log('- User must be in tenant_users with matching tenant_id and is_active = true');
      console.log('- OR user must have role = "super_admin" in user_profiles');
    }

    // 7. Check for any recent medication operations
    console.log('\n7️⃣ Checking recent database activity...');
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const { data: recentMeds, error: recentMedsError } = await supabase
      .from('patient_medications')
      .select('*')
      .gte('created_at', oneHourAgo.toISOString())
      .order('created_at', { ascending: false });

    if (recentMedsError) {
      console.error('❌ Error fetching recent medications:', recentMedsError);
    } else {
      console.log(`✅ Found ${recentMeds?.length || 0} medications created in the last hour`);
      recentMeds?.forEach(med => {
        console.log(`   - ${med.name} for patient ${med.patient_id} in tenant ${med.tenant_id} at ${med.created_at}`);
      });
    }

    console.log('\n🔍 DIAGNOSTIC RECOMMENDATIONS:');
    console.log('================================');
    console.log('1. Check that the user is properly authenticated and has tenant association');
    console.log('2. Verify that medications have the correct tenant_id when created');
    console.log('3. Ensure RLS policies are not filtering out data incorrectly');
    console.log('4. Check browser localStorage/sessionStorage for any cached tenant info');
    console.log('5. Look at browser network tab during refresh to see actual queries');
    console.log('6. Verify that fetchPatientMedications is using the same tenant context as createMedication');

  } catch (error) {
    console.error('🚨 Debug script failed:', error);
  }
}

// Run the debug
debugMedicationPersistence();
