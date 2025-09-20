// Debug script to check patient_medications table structure and data
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Load environment variables from .env file
const envFile = readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) {
    env[key.trim()] = value.trim().replace(/['"]/g, '');
  }
});

const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseKey = env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugMedicationsTable() {
  console.log('🔍 Debugging patient_medications table...\n');

  try {
    // 1. Check if table exists and basic structure
    console.log('1️⃣ Checking table structure...');
    const { data: allMeds, error: allError } = await supabase
      .from('patient_medications')
      .select('*')
      .limit(5);

    if (allError) {
      console.error('❌ Error accessing patient_medications table:', allError);
      return;
    }

    console.log('✅ Table exists. Sample records:', allMeds?.length || 0);
    if (allMeds && allMeds.length > 0) {
      console.log('📋 First record structure:', Object.keys(allMeds[0]));
      console.log('📋 Sample record:', allMeds[0]);
    } else {
      console.log('⚠️ No records found in patient_medications table');
    }

    // 2. Check simulation_patient_medications table
    console.log('\n2️⃣ Checking simulation_patient_medications table...');
    const { data: simMeds, error: simError } = await supabase
      .from('simulation_patient_medications')
      .select('*')
      .limit(5);

    if (simError) {
      console.log('❌ simulation_patient_medications table access failed:', simError.message);
    } else {
      console.log('✅ simulation_patient_medications exists. Records:', simMeds?.length || 0);
      if (simMeds && simMeds.length > 0) {
        console.log('📋 Sample simulation medication:', simMeds[0]);
      }
    }

    // 3. Check for any table containing 'medication'
    console.log('\n3️⃣ Checking for other medication tables...');
    
    // Try to list tables (this might not work with RLS)
    const { data: tables, error: tableError } = await supabase
      .rpc('get_tables_containing_medication')
      .single();

    if (tableError) {
      console.log('❌ Cannot list tables (expected with RLS)');
    }

    // 4. Check if patients have any medication-related data
    console.log('\n4️⃣ Checking patients table for any data...');
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, first_name, last_name, tenant_id')
      .limit(3);

    if (patientsError) {
      console.log('❌ Error accessing patients:', patientsError.message);
    } else {
      console.log('✅ Patients table accessible. Records:', patients?.length || 0);
      if (patients && patients.length > 0) {
        console.log('� Sample patient:', patients[0]);
        
        // Try to find medications for this patient using UUID
        const patientId = patients[0].id;
        console.log(`\n5️⃣ Checking medications for patient UUID ${patientId}...`);
        
        const { data: patientMeds, error: patientMedsError } = await supabase
          .from('patient_medications')
          .select('*')
          .eq('patient_id', patientId);

        if (patientMedsError) {
          console.log('❌ Error querying medications by patient UUID:', patientMedsError.message);
        } else {
          console.log('📊 Medications for this patient:', patientMeds?.length || 0);
        }
      }
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

debugMedicationsTable();