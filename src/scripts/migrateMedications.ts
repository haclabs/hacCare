/**
 * JavaScript Migration Script for Medication Format Update
 * Run this once to migrate existing medications to the new daily-based format
 * 
 * This script:
 * 1. Updates frequency formats from old to new system
 * 2. Creates admin_times arrays from existing admin_time values
 * 3. Handles multiple administration times per day
 */

import { supabase } from '../config/database'; // Adjust import path as needed

interface OldMedication {
  id: string;
  name: string;
  frequency: string;
  admin_time: string;
  admin_times?: string[];
  category?: string;
  [key: string]: any;
}

// Frequency mapping from old format to new format
const FREQUENCY_MAPPING: Record<string, string> = {
  'Q4H': 'QID (Four times daily)',
  'Q6H': 'QID (Four times daily)',
  'Q8H': 'TID (Three times daily)',
  'Q12H': 'BID (Twice daily)',
  'Q4H (Every 4 hours)': 'QID (Four times daily)',
  'Q6H (Every 6 hours)': 'QID (Four times daily)',
  'Q8H (Every 8 hours)': 'TID (Three times daily)',
  'Q12H (Every 12 hours)': 'BID (Twice daily)',
  'BID': 'BID (Twice daily)',
  'TID': 'TID (Three times daily)',
  'QID': 'QID (Four times daily)',
  'PRN': 'PRN (As needed)',
  'Once daily': 'Once daily',
  'Continuous': 'Continuous'
};

// Generate administration times based on frequency
function generateAdminTimes(frequency: string, baseTime: string = '08:00'): string[] {
  const [baseHour, baseMinute] = baseTime.split(':').map(Number);
  
  switch (frequency) {
    case 'QID (Four times daily)':
      return [
        baseTime,
        formatTime((baseHour + 6) % 24, baseMinute),
        formatTime((baseHour + 12) % 24, baseMinute),
        formatTime((baseHour + 18) % 24, baseMinute)
      ];
    
    case 'TID (Three times daily)':
      return [
        baseTime,
        formatTime((baseHour + 8) % 24, baseMinute),
        formatTime((baseHour + 16) % 24, baseMinute)
      ];
    
    case 'BID (Twice daily)':
      return [
        baseTime,
        formatTime((baseHour + 12) % 24, baseMinute)
      ];
    
    default:
      return [baseTime];
  }
}

// Helper function to format time
function formatTime(hour: number, minute: number): string {
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

// Check if medication might be diabetic based on name
function isDiabeticMedication(name: string): boolean {
  const diabeticKeywords = [
    'insulin', 'metformin', 'glipizide', 'glyburide', 
    'lantus', 'humalog', 'novolog', 'glucagon', 
    'januvia', 'ozempic', 'trulicity'
  ];
  
  return diabeticKeywords.some(keyword => 
    name.toLowerCase().includes(keyword.toLowerCase())
  );
}

// Main migration function
export async function migrateMedicationsToNewFormat(): Promise<{
  success: boolean;
  migrated: number;
  errors: string[];
  summary: any;
}> {
  console.log('🔄 Starting medication format migration...');
  
  const errors: string[] = [];
  let migratedCount = 0;
  
  try {
    // Fetch all medications
    const { data: medications, error: fetchError } = await supabase
      .from('medications')
      .select('*');
    
    if (fetchError) {
      throw new Error(`Failed to fetch medications: ${fetchError.message}`);
    }
    
    if (!medications || medications.length === 0) {
      console.log('ℹ️ No medications found to migrate');
      return { success: true, migrated: 0, errors: [], summary: {} };
    }
    
    console.log(`📋 Found ${medications.length} medications to process`);
    
    // Process each medication
    for (const medication of medications as OldMedication[]) {
      try {
        const updates: any = {};
        let needsUpdate = false;
        
        // 1. Update frequency if it needs mapping
        if (FREQUENCY_MAPPING[medication.frequency]) {
          updates.frequency = FREQUENCY_MAPPING[medication.frequency];
          needsUpdate = true;
        } else {
          updates.frequency = medication.frequency;
        }
        
        // 2. Create admin_times array if it doesn't exist
        if (!medication.admin_times) {
          const baseTime = medication.admin_time || '08:00';
          updates.admin_times = generateAdminTimes(updates.frequency, baseTime);
          needsUpdate = true;
        }
        
        // 3. Update category to diabetic if applicable (optional)
        if (!medication.category && isDiabeticMedication(medication.name)) {
          updates.category = 'diabetic';
          needsUpdate = true;
        }
        
        // 4. Ensure admin_time is set
        if (!medication.admin_time) {
          updates.admin_time = updates.admin_times?.[0] || '08:00';
          needsUpdate = true;
        }
        
        // Update the medication if changes are needed
        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('medications')
            .update(updates)
            .eq('id', medication.id);
          
          if (updateError) {
            errors.push(`Failed to update medication ${medication.name} (ID: ${medication.id}): ${updateError.message}`);
          } else {
            migratedCount++;
            console.log(`✅ Updated medication: ${medication.name}`);
          }
        }
        
      } catch (medicationError) {
        const errorMsg = `Error processing medication ${medication.name} (ID: ${medication.id}): ${medicationError}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }
    
    // Generate summary
    const { data: updatedMedications, error: summaryError } = await supabase
      .from('medications')
      .select('frequency, category')
      .not('admin_times', 'is', null);
    
    const summary = {
      totalProcessed: medications.length,
      migrated: migratedCount,
      errors: errors.length,
      frequencyDistribution: {},
      categoryDistribution: {}
    };
    
    if (!summaryError && updatedMedications) {
      // Count frequency distribution
      summary.frequencyDistribution = updatedMedications.reduce((acc: any, med) => {
        acc[med.frequency] = (acc[med.frequency] || 0) + 1;
        return acc;
      }, {});
      
      // Count category distribution
      summary.categoryDistribution = updatedMedications.reduce((acc: any, med) => {
        const category = med.category || 'unspecified';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {});
    }
    
    console.log('📊 Migration Summary:', summary);
    
    return {
      success: errors.length === 0,
      migrated: migratedCount,
      errors,
      summary
    };
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    return {
      success: false,
      migrated: migratedCount,
      errors: [error instanceof Error ? error.message : String(error)],
      summary: {}
    };
  }
}

// Function to verify migration results
export async function verifyMigration(): Promise<void> {
  console.log('🔍 Verifying migration results...');
  
  try {
    const { data: medications, error } = await supabase
      .from('medications')
      .select('*');
    
    if (error) {
      console.error('❌ Failed to fetch medications for verification:', error);
      return;
    }
    
    const issues = [];
    
    for (const med of medications || []) {
      // Check for missing admin_times
      if (!med.admin_times || !Array.isArray(med.admin_times) || med.admin_times.length === 0) {
        issues.push(`Medication "${med.name}" missing admin_times array`);
      }
      
      // Check frequency format
      if (med.frequency.includes('Q') && med.frequency.includes('H') && !med.frequency.includes('daily')) {
        issues.push(`Medication "${med.name}" still has old frequency format: ${med.frequency}`);
      }
      
      // Check admin_times count matches frequency
      const expectedTimes = med.frequency.includes('Four times') ? 4 :
                           med.frequency.includes('Three times') ? 3 :
                           med.frequency.includes('Twice') ? 2 : 1;
      
      if (med.admin_times && med.admin_times.length !== expectedTimes && 
          !med.frequency.includes('PRN') && !med.frequency.includes('Continuous')) {
        issues.push(`Medication "${med.name}" has ${med.admin_times.length} times but frequency "${med.frequency}" suggests ${expectedTimes}`);
      }
    }
    
    if (issues.length === 0) {
      console.log('✅ Migration verification passed - all medications look good!');
    } else {
      console.log('⚠️ Migration verification found issues:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }
    
  } catch (error) {
    console.error('💥 Verification failed:', error);
  }
}

// CLI runner (if running this script directly)
if (require.main === module) {
  migrateMedicationsToNewFormat()
    .then(result => {
      console.log('\n🎉 Migration completed!');
      console.log(`✅ Migrated: ${result.migrated} medications`);
      if (result.errors.length > 0) {
        console.log(`❌ Errors: ${result.errors.length}`);
        result.errors.forEach(error => console.log(`  - ${error}`));
      }
      
      // Run verification
      return verifyMigration();
    })
    .then(() => {
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Migration script failed:', error);
      process.exit(1);
    });
}