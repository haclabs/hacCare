#!/usr/bin/env node

/**
 * Create Test Tenant Script
 * Creates a lethpoly tenant for testing subdomain branding
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://cwhqffubvqolhnkecyck.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aHFmZnVidnFvbGhua2VjeWNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM4NTk3MzgsImV4cCI6MjA0OTQzNTczOH0.nPV1MkfPCd7tuvGYCJCYGxOvqT0qKshlCnOKoQCFNdk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestTenant() {
  try {
    console.log('🏥 Creating test tenant: lethpoly...');

    const tenantData = {
      name: 'Lethpoly Healthcare',
      subdomain: 'lethpoly',
      status: 'active',
      settings: {
        features: {
          medication_tracking: true,
          patient_records: true,
          scheduling: true,
          billing: false
        },
        branding: {
          primary_color: '#0ea5e9',
          secondary_color: '#64748b',
          logo_url: null
        }
      },
      subscription_plan: 'standard',
      admin_email: 'admin@lethpoly.com',
      phone: '+1-555-0123',
      address: '123 Healthcare Ave, Medical City, MC 12345'
    };

    // First check if tenant already exists
    const { data: existingTenant, error: checkError } = await supabase
      .from('tenants')
      .select('*')
      .eq('subdomain', 'lethpoly')
      .single();

    if (existingTenant) {
      console.log('✅ Tenant already exists:', existingTenant.name);
      return existingTenant;
    }

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking existing tenant:', checkError);
      return null;
    }

    // Create new tenant
    const { data, error } = await supabase
      .from('tenants')
      .insert([tenantData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating tenant:', error);
      return null;
    }

    console.log('✅ Successfully created tenant:', data.name);
    console.log('🌐 Subdomain:', data.subdomain);
    console.log('📧 Admin email:', data.admin_email);
    
    return data;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return null;
  }
}

// Run the script
createTestTenant()
  .then((tenant) => {
    if (tenant) {
      console.log('\n🎉 Test tenant created successfully!');
      console.log('🔗 Test URL: https://lethpoly.haccare.app');
      console.log('🔗 Local URL: http://lethpoly.localhost:5173');
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
