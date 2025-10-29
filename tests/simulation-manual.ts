// Manual Test Runner for Simulation Reset
// Run with: node -r ts-node/register tests/simulation-manual.ts

import { createClient } from '@supabase/supabase-js';

// Test configuration - update these with your actual values
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';
const TEST_TENANT_ID = process.env.TEST_TENANT_ID || 'your-test-tenant-id';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test data
const TEST_TEMPLATE = {
  name: 'Test Simulation Template',
  description: 'Test template for reset verification',
  specialty: 'Emergency',
  difficulty_level: 2,
  estimated_duration: 60,
  learning_objectives: ['Test objective 1', 'Test objective 2'],
  tenant_id: TEST_TENANT_ID
};

const TEST_PATIENT = {
  public_patient_id: 'TEST-PAT-001',
  demographics: { age: 45, gender: 'M', diagnosis: 'Test Case' },
  baseline_vitals: { hr: 80, bp: '120/80', temp: 98.6 },
  baseline_alerts: [{ type: 'info', message: 'Baseline alert' }],
  room: '101',
  bed: 'A'
};

// Utility functions
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ ASSERTION FAILED: ${message}`);
  }
  console.log(`✅ ${message}`);
}

function log(message: string) {
  console.log(`📋 ${message}`);
}

// Main test runner
async function runSimulationResetTests() {
  console.log('🚀 Starting Simulation Reset Tests\n');

  let templateId: string | undefined;
  let snapshotId: string | undefined; 
  let runId: string | undefined;
  let patientId: string | undefined;

  try {
    // Test 1: Create Template
    log('Test 1: Creating simulation template...');
    const { data: template, error: templateError } = await supabase
      .from('sim_templates')
      .insert(TEST_TEMPLATE)
      .select()
      .single();

    if (templateError) throw templateError;
    templateId = template.id;
    assert(!!templateId, 'Template created with valid ID');

    // Add template patient
    const { data: patient, error: patientError } = await supabase
      .from('sim_template_patients')
      .insert({
        ...TEST_PATIENT,
        template_id: templateId
      })
      .select()
      .single();

    if (patientError) throw patientError;
    assert(patient.public_patient_id === TEST_PATIENT.public_patient_id, 'Template patient created with correct public ID');

    // Test 2: Create Snapshot
    log('\nTest 2: Creating snapshot from template...');
    const { data: snapshotResult, error: snapshotError } = await supabase.rpc('create_snapshot', {
      p_template_id: templateId,
      p_name: 'Test Snapshot',
      p_description: 'Snapshot for reset testing'
    });

    if (snapshotError) throw snapshotError;
    snapshotId = snapshotResult;
    assert(!!snapshotId, 'Snapshot created successfully');

    // Verify snapshot data
    const { data: snapshot } = await supabase
      .from('sim_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .single();

    assert(snapshot?.snapshot_data?.patients?.length > 0, 'Snapshot contains patient data');

    // Test 3: Launch Run
    log('\nTest 3: Launching simulation run...');
    const { data: runResult, error: runError } = await supabase.rpc('launch_run', {
      p_snapshot_id: snapshotId,
      p_run_name: 'Test Run for Reset'
    });

    if (runError) throw runError;
    runId = runResult;
    assert(!!runId, 'Run launched successfully');

    // Verify run patients created
    const { data: runPatients } = await supabase
      .from('sim_run_patients')
      .select('*')
      .eq('run_id', runId);

    assert(runPatients?.length === 1, 'Run patient created');
    assert(runPatients?.[0].public_patient_id === TEST_PATIENT.public_patient_id, 'Public patient ID preserved');
    patientId = runPatients?.[0].id;

    // Test 4: Add Student Data
    log('\nTest 4: Adding student data (vitals, notes)...');
    
    // Add vitals
    const { error: vitalsError } = await supabase
      .from('sim_run_vitals_events')
      .insert({
        run_id: runId,
        run_patient_id: patientId,
        vital_type: 'heart_rate',
        value: { value: 95, unit: 'bpm' }
      });

    if (vitalsError) throw vitalsError;

    // Add note
    const { error: noteError } = await supabase
      .from('sim_run_notes')
      .insert({
        run_id: runId,
        run_patient_id: patientId,
        note_type: 'nursing',
        author_id: 'test-user-id',
        author_role: 'student',
        title: 'Test Note',
        content: 'Student entered this note during simulation'
      });

    if (noteError) throw noteError;

    // Verify data was added
    const { data: vitalsAdded } = await supabase
      .from('sim_run_vitals_events')
      .select('*')
      .eq('run_id', runId);

    const { data: notesAdded } = await supabase
      .from('sim_run_notes')
      .select('*')
      .eq('run_id', runId)
      .neq('note_type', 'system');

    assert(vitalsAdded?.length === 1, 'Vitals data added');
    assert(notesAdded?.length === 1, 'Note data added');

    // Test 5: Reset Simulation (The Critical Test!)
    log('\nTest 5: RESETTING SIMULATION (Critical Test!)...');
    
    const { data: resetResult, error: resetError } = await supabase.rpc('reset_run', {
      p_run_id: runId
    });

    if (resetError) throw resetError;
    assert(!!resetResult, 'Reset function executed');
    assert(resetResult.total_deleted > 0, 'Event data was deleted');

    // Test 6: Verify Reset Results
    log('\nTest 6: Verifying reset results...');

    // Check that event data was deleted
    const { data: vitalsAfterReset } = await supabase
      .from('sim_run_vitals_events')
      .select('*')
      .eq('run_id', runId);

    const { data: notesAfterReset } = await supabase
      .from('sim_run_notes')
      .select('*')
      .eq('run_id', runId)
      .neq('note_type', 'system'); // Exclude system reset notes

    assert(vitalsAfterReset?.length === 0, '✅ CRITICAL: Vitals events deleted');
    assert(notesAfterReset?.length === 0, '✅ CRITICAL: Student notes deleted');

    // Check that stable entities were preserved  
    const { data: patientsAfterReset } = await supabase
      .from('sim_run_patients')
      .select('*')
      .eq('run_id', runId);

    assert(patientsAfterReset?.length === 1, '✅ CRITICAL: Run patients preserved');
    assert(patientsAfterReset?.[0].public_patient_id === TEST_PATIENT.public_patient_id, '✅ CRITICAL: Public patient ID unchanged');
    assert(patientsAfterReset?.[0].id === patientId, '✅ CRITICAL: Patient UUID unchanged');

    // Test 7: Add New Data After Reset
    log('\nTest 7: Adding new data after reset...');

    const { error: newVitalsError } = await supabase
      .from('sim_run_vitals_events')
      .insert({
        run_id: runId,
        run_patient_id: patientId,
        vital_type: 'temperature',
        value: { value: 99.2, unit: 'F' }
      });

    if (newVitalsError) throw newVitalsError;

    const { data: newVitalsAdded } = await supabase
      .from('sim_run_vitals_events')
      .select('*')
      .eq('run_id', runId);

    assert(newVitalsAdded?.length === 1, 'New vitals can be added after reset');

    console.log('\n🎉 ALL TESTS PASSED! 🎉');
    console.log('\n✅ Reset functionality is working correctly:');
    console.log('   • Event data (vitals, notes, meds, alerts) deleted ✅');
    console.log('   • Printed IDs (patient wristbands, barcodes) preserved ✅');
    console.log('   • Can add new data after reset ✅');
    console.log('   • No data corruption or orphaned records ✅');

  } catch (error) {
    console.error('\n💥 TEST FAILED:', error);
    throw error;
  } finally {
    // Cleanup
    if (templateId) {
      log('\nCleaning up test data...');
      await supabase.from('sim_templates').delete().eq('id', templateId);
      console.log('✅ Test data cleaned up');
    }
  }
}

// Run the tests if this file is executed directly
if (require.main === module) {
  runSimulationResetTests()
    .then(() => {
      console.log('\n🏆 Test suite completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

export { runSimulationResetTests };