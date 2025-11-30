import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAvatars() {
  console.log('🔍 Checking patient avatars in database...\n');

  // Check if avatar_id column exists and has values
  const { data: patients, error } = await supabase
    .from('patients')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ Error fetching patients:', error);
    return;
  }

  if (!patients || patients.length === 0) {
    console.log('⚠️  No patients found in database');
    return;
  }

  console.log(`✅ Found ${patients.length} patients:\n`);
  
  patients.forEach(patient => {
    const status = patient.avatar_id ? '✅ Has Avatar' : '❌ No Avatar';
    console.log(`${status} | ${patient.first_name} ${patient.last_name} | avatar_id: ${patient.avatar_id || 'null'}`);
  });

  // Check avatar distribution
  console.log('\n📊 Avatar Distribution:');
  const avatarCounts: Record<string, number> = {};
  patients.forEach(p => {
    const avatarId = p.avatar_id || 'null';
    avatarCounts[avatarId] = (avatarCounts[avatarId] || 0) + 1;
  });

  Object.entries(avatarCounts).forEach(([avatar, count]) => {
    console.log(`  ${avatar}: ${count} patient(s)`);
  });
}

checkAvatars().catch(console.error);
