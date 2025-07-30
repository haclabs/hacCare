/**
 * Quick diagnostic script to check diabetic_records table status
 */
import { supabase } from './src/lib/supabase.js';

async function checkDiabeticRecordsTable() {
  try {
    console.log('🔍 Checking diabetic_records table...');
    
    // Try to query the table structure
    const { data, error } = await supabase
      .from('diabetic_records')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error accessing diabetic_records table:', error);
      
      // Check if table exists
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'diabetic_records');
        
      if (tablesError) {
        console.error('❌ Error checking table existence:', tablesError);
      } else if (!tables || tables.length === 0) {
        console.log('📋 Table diabetic_records does not exist. Need to run migration.');
      } else {
        console.log('✅ Table exists but has access issues');
      }
    } else {
      console.log('✅ Table diabetic_records is accessible');
      console.log('📊 Sample record count check passed, current data:', data);
    }
    
    // Check patients table for reference
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('id, tenant_id')
      .limit(1);
      
    if (patientsError) {
      console.error('❌ Error accessing patients table:', patientsError);
    } else {
      console.log('✅ Patients table is accessible');
      console.log('👤 Sample patient for testing:', patients?.[0]);
    }
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

checkDiabeticRecordsTable();
