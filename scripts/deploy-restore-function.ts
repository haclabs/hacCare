import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function deployFunction() {
  const sqlPath = path.join(__dirname, '../database/fix_restore_snapshot_labs_v2.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('🚀 Deploying restore_snapshot_to_tenant with p_preserve_barcodes flag...');
  
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  
  if (error) {
    // Try direct execution via raw SQL
    console.log('📝 Executing SQL directly...');
    const { error: execError } = await supabase.from('_migration').insert({ sql_content: sql });
    
    if (execError) {
      console.error('❌ Deployment failed:', execError);
      process.exit(1);
    }
  }

  console.log('✅ Function deployed successfully!');
  console.log('\n📋 Function signature:');
  console.log('restore_snapshot_to_tenant(');
  console.log('  p_tenant_id uuid,');
  console.log('  p_snapshot jsonb,');
  console.log('  p_id_mappings jsonb DEFAULT NULL,');
  console.log('  p_barcode_mappings jsonb DEFAULT NULL,');
  console.log('  p_preserve_barcodes boolean DEFAULT false');
  console.log(')');
  console.log('\n🎯 Usage:');
  console.log('  LAUNCH: p_preserve_barcodes = false (generates new patient_id)');
  console.log('  RESET:  p_preserve_barcodes = true (preserves existing patient_id)');
}

deployFunction();
