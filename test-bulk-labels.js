// Test script for bulk label service
import { createClient } from '@supabase/supabase-js';

// Import config (adjust path as needed)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'your_supabase_url_here';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your_anon_key_here';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testBulkLabelService() {
  console.log('🔍 Testing Bulk Label Service...\n');
  
  try {
    // Test 1: Check Supabase connection
    console.log('1️⃣ Testing Supabase connection...');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('patients')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.error('❌ Connection failed:', connectionError.message);
      return;
    }
    console.log('✅ Supabase connection successful\n');
    
    // Test 2: Check patients table structure
    console.log('2️⃣ Checking patients table structure...');
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, first_name, last_name, date_of_birth, patient_id, room_number, medical_record_number, tenant_id')
      .limit(1);
    
    if (patientsError) {
      console.error('❌ Patients table error:', patientsError.message);
      console.error('Full error:', patientsError);
    } else {
      console.log('✅ Patients table accessible');
      console.log('Sample structure:', patients?.[0] || 'No data found');
    }
    
    // Test 3: Check tenant_users table
    console.log('\n3️⃣ Checking tenant_users table...');
    const { data: tenantUsers, error: tenantError } = await supabase
      .from('tenant_users')
      .select('user_id, tenant_id')
      .limit(1);
    
    if (tenantError) {
      console.error('❌ Tenant users table error:', tenantError.message);
      console.error('Full error:', tenantError);
    } else {
      console.log('✅ Tenant users table accessible');
      console.log('Sample structure:', tenantUsers?.[0] || 'No data found');
    }
    
    // Test 4: Check patient_medications table
    console.log('\n4️⃣ Checking patient_medications table...');
    const { data: medications, error: medicationsError } = await supabase
      .from('patient_medications')
      .select('id, patient_id, medication_name, dosage, frequency, route, prescriber, date_prescribed, status, tenant_id')
      .limit(1);
    
    if (medicationsError) {
      console.error('❌ Patient medications table error:', medicationsError.message);
      console.error('Full error:', medicationsError);
    } else {
      console.log('✅ Patient medications table accessible');
      console.log('Sample structure:', medications?.[0] || 'No data found');
    }
    
    // Test 5: Check RLS policies
    console.log('\n5️⃣ Testing RLS policies...');
    
    // Try to access data without authentication
    const { data: rlsTest, error: rlsError } = await supabase
      .from('patients')
      .select('id')
      .limit(1);
    
    if (rlsError) {
      console.log('✅ RLS is active (good!):', rlsError.message);
    } else {
      console.log('⚠️ RLS might not be active - got data without auth:', rlsTest?.length || 0, 'records');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testBulkLabelService();