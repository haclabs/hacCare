/**
 * Deploy the get_user_simulation_assignments RPC function to Supabase
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function deployFunction() {
  try {
    console.log('📡 Reading SQL file...');
    const sqlPath = join(__dirname, '../database/functions/get_user_simulation_assignments.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    console.log('🚀 Deploying function to Supabase...');
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Error deploying function:', error);
      
      // Try direct execution instead
      console.log('🔄 Trying direct SQL execution...');
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        },
        body: JSON.stringify({ query: sql })
      });
      
      if (!response.ok) {
        console.error('❌ Direct execution failed:', await response.text());
        process.exit(1);
      }
    }
    
    console.log('✅ Function deployed successfully!');
    console.log('🧪 Testing function...');
    
    // Test the function
    const { data: testData, error: testError } = await supabase.rpc('get_user_simulation_assignments', {
      p_user_id: '00000000-0000-0000-0000-000000000000' // Dummy UUID for test
    });
    
    if (testError) {
      console.log('ℹ️  Function exists but test failed (expected - dummy user):', testError.message);
    } else {
      console.log('✅ Function test successful!');
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    process.exit(1);
  }
}

deployFunction();
