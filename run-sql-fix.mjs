#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables:');
  console.error('VITE_SUPABASE_URL:', !!SUPABASE_URL);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!SUPABASE_SERVICE_ROLE_KEY);
  process.exit(1);
}

// Create admin client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Read the SQL fix file
const sqlFixPath = join(__dirname, 'sql-patches/fixes/fix-recursion-final.sql');
const sqlContent = readFileSync(sqlFixPath, 'utf8');

// Split SQL content into individual statements
const statements = sqlContent
  .split(';')
  .map(stmt => stmt.trim())
  .filter(stmt => stmt && !stmt.startsWith('--'));

console.log(`Found ${statements.length} SQL statements to execute`);

async function runSqlFix() {
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement) continue;
    
    console.log(`\nExecuting statement ${i + 1}/${statements.length}:`);
    console.log(statement.substring(0, 100) + (statement.length > 100 ? '...' : ''));
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { 
        sql_query: statement + ';' 
      });
      
      if (error) {
        console.error(`❌ Error in statement ${i + 1}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Statement ${i + 1} executed successfully`);
        successCount++;
      }
    } catch (err) {
      console.error(`❌ Exception in statement ${i + 1}:`, err.message);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Results: ${successCount} successful, ${errorCount} errors`);
  
  if (errorCount === 0) {
    console.log('🎉 All SQL statements executed successfully!');
    console.log('The infinite recursion issue should now be resolved.');
  } else {
    console.log('⚠️  Some statements failed. Please check the errors above.');
  }
}

runSqlFix().catch(console.error);
