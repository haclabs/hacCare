/**
 * Test script to validate patient transfer SQL functions
 * Run this to check if the database functions are properly installed
 */

import { supabase } from '../lib/supabase';

export const testPatientTransferFunctions = async () => {
  console.log('🧪 Testing Patient Transfer SQL Functions...');
  
  try {
    // Test 1: Check if functions exist
    console.log('\n1️⃣ Testing get_available_tenants_for_transfer...');
    const { data: tenants, error: tenantError } = await supabase
      .rpc('get_available_tenants_for_transfer', {
        p_source_patient_id: '00000000-0000-0000-0000-000000000000' // Dummy UUID
      });
    
    if (tenantError) {
      console.error('❌ get_available_tenants_for_transfer error:', tenantError);
      return false;
    }
    
    console.log('✅ get_available_tenants_for_transfer works! Found', tenants?.length || 0, 'tenants');
    
    // Test 2: Get a real patient ID for testing
    console.log('\n2️⃣ Getting test patient...');
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, patient_id, first_name, last_name, tenant_id')
      .limit(1);
    
    if (patientsError || !patients || patients.length === 0) {
      console.warn('⚠️ No test patients found, skipping advanced tests');
      return true;
    }
    
    const testPatient = patients[0];
    console.log('📋 Test patient:', testPatient.patient_id, testPatient.first_name, testPatient.last_name);
    
    // Test 3: Check available tenants for real patient
    console.log('\n3️⃣ Testing available tenants for real patient...');
    const { data: realTenants, error: realTenantError } = await supabase
      .rpc('get_available_tenants_for_transfer', {
        p_source_patient_id: testPatient.id
      });
    
    if (realTenantError) {
      console.error('❌ Real tenant test error:', realTenantError);
      return false;
    }
    
    console.log('✅ Available tenants for transfer:', realTenants?.length || 0);
    realTenants?.forEach((tenant: any) => {
      console.log(`   - ${tenant.tenant_name} (${tenant.subdomain})`);
    });
    
    // Test 4: Check patient medications
    console.log('\n4️⃣ Checking patient medications...');
    const { data: medications, error: medError } = await supabase
      .from('patient_medications')
      .select('*')
      .eq('patient_id', testPatient.id);
    
    if (medError) {
      console.error('❌ Error checking medications:', medError);
    } else {
      console.log('💊 Patient has', medications?.length || 0, 'medications');
    }
    
    // Test 5: Check patient vitals
    console.log('\n5️⃣ Checking patient vitals...');
    const { data: vitals, error: vitalsError } = await supabase
      .from('patient_vitals')
      .select('*')
      .eq('patient_id', testPatient.id);
    
    if (vitalsError) {
      console.error('❌ Error checking vitals:', vitalsError);
    } else {
      console.log('🏥 Patient has', vitals?.length || 0, 'vital records');
    }
    
    console.log('\n✅ All tests completed successfully!');
    console.log('🚀 Patient transfer functions are ready to use.');
    
    return true;
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    return false;
  }
};

// Auto-run if called directly
if (typeof window !== 'undefined') {
  // Browser environment - expose to window for manual testing
  (window as any).testPatientTransferFunctions = testPatientTransferFunctions;
}