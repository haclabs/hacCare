// Simple RLS policy fix
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://cwhqffubvqolhnkecyck.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aHFmZnVidnFvbGhua2VjeWNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTE0MTg5OSwiZXhwIjoyMDY2NzE3ODk5fQ.Gudx-86iQahXVymtw46Er4KPgPeNIL_UGOPFEDbYKY4'
);

async function simpleTest() {
  console.log('🔍 Checking current RLS policies...\n');
  
  try {
    const { data: policies, error } = await supabase
      .from('pg_policies')
      .select('policyname, cmd, permissive, qual, with_check')
      .eq('tablename', 'tenants');
    
    if (error) {
      console.error('Error checking policies:', error);
    } else {
      console.log('Current tenant policies:');
      if (policies.length === 0) {
        console.log('  No policies found!');
      } else {
        policies.forEach(policy => {
          console.log(`  - ${policy.policyname} (${policy.cmd})`);
        });
      }
    }
  } catch (error) {
    console.error('Error verifying policies:', error);
  }
  
  console.log('\n📊 Summary:');
  console.log('The issue is that there are no INSERT policies on the tenants table.');
  console.log('Only super admins can currently create tenants via existing policies.');
  console.log('\n💡 To fix this, you need to run this SQL in Supabase Dashboard:');
  console.log(`
-- Allow super admins to create any tenant
CREATE POLICY "Super admins can create tenants" ON tenants
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Allow users to create tenants where they will be the admin
CREATE POLICY "Users can create tenants they will admin" ON tenants
  FOR INSERT WITH CHECK (
    admin_user_id = auth.uid()
  );
  `);
}

simpleTest();
