#!/usr/bin/env node

/**
 * Wound Care Migration Script
 * 
 * Applies the wound care database migration to create tables and policies.
 * Run this script to set up wound care functionality in your Supabase database.
 */

import { supabase } from '../../src/config/supabase.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyWoundCareMigration() {
  console.log('🏥 Starting wound care migration...');
  
  try {
    // Read the SQL migration file
    const migrationSQL = readFileSync(
      join(__dirname, '../setup/create-wound-care-tables.sql'),
      'utf-8'
    );
    
    console.log('📄 Executing wound care migration SQL...');
    
    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
    
    console.log('✅ Wound care migration completed successfully!');
    
    // Verify tables were created
    console.log('🔍 Verifying table creation...');
    
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['wound_assessments', 'wound_treatments'])
      .eq('table_schema', 'public');
    
    if (tableError) {
      console.warn('⚠️ Could not verify table creation:', tableError);
    } else {
      console.log('📊 Created tables:', tables?.map(t => t.table_name).join(', '));
    }
    
    // Check if storage bucket exists
    console.log('🗂️ Checking storage bucket...');
    
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.warn('⚠️ Could not check storage buckets:', bucketError);
    } else {
      const woundPhotosBucket = buckets?.find(b => b.name === 'wound-photos');
      if (woundPhotosBucket) {
        console.log('✅ Wound photos storage bucket exists');
      } else {
        console.warn('⚠️ Wound photos storage bucket not found');
      }
    }
    
    console.log('\n🎉 Wound care migration completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Verify the migration in your Supabase dashboard');
    console.log('2. Test wound care functionality in the application');
    console.log('3. Create sample wound assessments to verify everything works');
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  applyWoundCareMigration();
}

export { applyWoundCareMigration };
