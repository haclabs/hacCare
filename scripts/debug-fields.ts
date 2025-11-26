import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugFields() {
  const { data, error } = await supabase
    .from('patients')
    .select('*')
    .limit(1)
    .single();

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('🔍 Patient object keys returned by Supabase:');
  console.log(Object.keys(data));
  console.log('\n📋 Full patient object:');
  console.log(JSON.stringify(data, null, 2));
}

debugFields();
