#!/usr/bin/env node

/**
 * 🔬 Real-time Medication Fetch Test
 * 
 * This script tests the exact same query that the frontend uses
 * to see if we can reproduce the issue
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
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Create client with same settings as frontend
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testMedicationFetch() {
  console.log('🔬 TESTING MEDICATION FETCH (Frontend Simulation)');
  console.log('==================================================\n');

  const patientId = '40ed5e26-91d0-4e04-ac53-5143f13ad942'; // John Doe from debug output

  try {
    // 1. First, let's try to authenticate as the super admin
    console.log('1️⃣ Attempting to get current session...');
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('❌ Session error:', sessionError);
    } else if (!session) {
      console.log('⚠️  No active session found');
      console.log('💡 This might be why medications are not visible after refresh');
      console.log('💡 The user needs to be authenticated for RLS policies to work');
    } else {
      console.log('✅ Session found for user:', session.user.email);
    }

    // 2. Test the exact same query the frontend uses
    console.log('\n2️⃣ Testing medication fetch query...');
    const { data, error } = await supabase
      .from('patient_medications')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    console.log('📊 Query result:');
    console.log('  - Data:', data?.length || 0, 'medications found');
    console.log('  - Error:', error ? error.message : 'None');

    if (data && data.length > 0) {
      console.log('✅ Medications found:');
      data.forEach((med, index) => {
        console.log(`   ${index + 1}. ${med.name} - Created: ${med.created_at}`);
      });
    } else if (error) {
      console.log('❌ Error details:', error);
      
      if (error.message.includes('RLS') || error.message.includes('policy')) {
        console.log('🔐 This is an RLS policy violation');
        console.log('🔐 Likely causes:');
        console.log('   - User not authenticated');
        console.log('   - User session expired');
        console.log('   - RLS policy not matching user context');
      }
    } else {
      console.log('⚠️  No data returned (possible RLS filtering)');
    }

    // 3. Test with different authentication contexts
    console.log('\n3️⃣ Testing authentication status...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ User fetch error:', userError);
    } else if (!user) {
      console.log('⚠️  No authenticated user');
      console.log('💡 LIKELY CAUSE: Authentication state not persisting after refresh');
    } else {
      console.log('✅ Authenticated user:', user.email);
      
      // Check user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();
        
      if (profileError) {
        console.error('❌ Profile fetch error:', profileError);
      } else {
        console.log('✅ User role:', profile?.role);
        
        if (profile?.role === 'super_admin') {
          console.log('🔐 User is super admin - should have full access');
        }
      }
    }

    console.log('\n🎯 RECOMMENDATIONS:');
    console.log('===================');
    
    if (!session || !user) {
      console.log('🚨 PRIMARY ISSUE: Authentication not persisting after refresh');
      console.log('📋 Possible solutions:');
      console.log('   1. Check if auth session is being stored properly');
      console.log('   2. Verify auth persistence settings in Supabase client');
      console.log('   3. Check for authentication refresh on page load');
      console.log('   4. Look for any auth context loading race conditions');
    } else if (data && data.length === 0) {
      console.log('🚨 PRIMARY ISSUE: RLS policy filtering out data');
      console.log('📋 Possible solutions:');
      console.log('   1. Check tenant context loading timing');
      console.log('   2. Verify RLS policy conditions');
      console.log('   3. Check for tenant switching state issues');
    } else {
      console.log('✅ Fetch appears to be working - check frontend loading logic');
    }

  } catch (error) {
    console.error('🚨 Test failed:', error);
  }
}

// Run the test
testMedicationFetch();
