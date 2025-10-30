// Basic tests for the simulation reset functionality
import { createClient } from '@supabase/supabase-js';

// Test configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test data
const TEST_TEMPLATE = {
  name: 'Test Simulation Template',
  description: 'Test template for reset verification',
  specialty: 'Emergency',
  difficulty_level: 2,
  estimated_duration: 60,
  learning_objectives: ['Test objective 1', 'Test objective 2']
};

const TEST_PATIENT = {
  public_patient_id: 'TEST-PAT-001',
  demographics: { age: 45, gender: 'M' },
  baseline_vitals: { hr: 80, bp: '120/80' },
  baseline_alerts: [],
  room: '101',
  bed: 'A'
};

const TEST_MEDICATION = {
  medication_name: 'Test Medication',
  dosage: '5mg',
  route: 'IV',
  frequency: 'Q4H'
};

const TEST_BARCODE = {
  public_barcode_id: 'TEST-MED-001'
};

describe('Simulation Reset Tests', () => {
  let templateId: string;
  let snapshotId: string;
  let runId: string;
  let patientId: string;
  let barcodeId: string;

  beforeAll(async () => {
    // Setup: Create test template
    const { data: template, error: templateError } = await supabase
      .from('sim_templates')
      .insert({
        ...TEST_TEMPLATE,
        tenant_id: 'test-tenant-id' // You'll need to use a real tenant ID
      })
      .select()
      .single();

    if (templateError) throw templateError;
    templateId = template.id;

    // Create template patient
    const { data: patient, error: patientError } = await supabase
      .from('sim_template_patients')
      .insert({
        ...TEST_PATIENT,
        template_id: templateId
      })
      .select()
      .single();

    if (patientError) throw patientError;

    // Create template medication
    const { data: medication, error: medError } = await supabase
      .from('sim_template_meds')
      .insert({
        ...TEST_MEDICATION,
        template_id: templateId,
        template_patient_id: patient.id
      })
      .select()
      .single();

    if (medError) throw medError;

    // Create template barcode
    const { data: barcode, error: barcodeError } = await supabase
      .from('sim_template_barcodes')
      .insert({
        ...TEST_BARCODE,
        template_id: templateId,
        template_med_id: medication.id
      })
      .select()
      .single();

    if (barcodeError) throw barcodeError;
  });

  afterAll(async () => {
    // Cleanup: Delete test data
    if (templateId) {
      await supabase.from('sim_templates').delete().eq('id', templateId);
    }
  });

  test('should create snapshot from template', async () => {
    const { data, error } = await supabase.rpc('create_snapshot', {
      p_template_id: templateId,
      p_name: 'Test Snapshot',
      p_description: 'Snapshot for reset testing'
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    snapshotId = data;

    // Verify snapshot was created
    const { data: snapshot, error: snapshotError } = await supabase
      .from('sim_snapshots')
      .select('*')
      .eq('id', snapshotId)
      .single();

    expect(snapshotError).toBeNull();
    expect(snapshot).toBeDefined();
    expect(snapshot.snapshot_data).toBeDefined();
    expect(snapshot.snapshot_data.patients).toBeDefined();
    expect(snapshot.snapshot_data.medications).toBeDefined();
    expect(snapshot.snapshot_data.barcodes).toBeDefined();
  });

  test('should launch run from snapshot', async () => {
    const { data, error } = await supabase.rpc('launch_run', {
      p_snapshot_id: snapshotId,
      p_run_name: 'Test Run for Reset'
    });

    expect(error).toBeNull();
    expect(data).toBeDefined();
    runId = data;

    // Verify run was created
    const { data: run, error: runError } = await supabase
      .from('sim_runs')
      .select('*')
      .eq('id', runId)
      .single();

    expect(runError).toBeNull();
    expect(run).toBeDefined();
    expect(run.status).toBe('active');

    // Verify run patients were created with stable IDs
    const { data: runPatients, error: patientsError } = await supabase
      .from('sim_run_patients')
      .select('*')
      .eq('run_id', runId);

    expect(patientsError).toBeNull();
    expect(runPatients).toBeDefined();
    expect(runPatients.length).toBe(1);
    expect(runPatients[0].public_patient_id).toBe(TEST_PATIENT.public_patient_id);
    patientId = runPatients[0].id;

    // Verify barcode pool was created with stable IDs
    const { data: barcodePool, error: barcodeError } = await supabase
      .from('sim_run_barcode_pool')
      .select('*')
      .eq('run_id', runId);

    expect(barcodeError).toBeNull();
    expect(barcodePool).toBeDefined();
    expect(barcodePool.length).toBe(1);
    expect(barcodePool[0].public_barcode_id).toBe(TEST_BARCODE.public_barcode_id);
    barcodeId = barcodePool[0].id;
  });

  test('should add student data (vitals, med admin, alerts, notes)', async () => {
    // Add vitals
    const { error: vitalsError } = await supabase
      .from('sim_run_vitals_events')
      .insert({
        run_id: runId,
        run_patient_id: patientId,
        vital_type: 'heart_rate',
        value: { value: 95 },
        recorded_by: 'test-user-id'
      });

    expect(vitalsError).toBeNull();

    // Add medication administration
    const { error: medError } = await supabase
      .from('sim_run_med_admin_events')
      .insert({
        run_id: runId,
        run_patient_id: patientId,
        barcode_scanned: TEST_BARCODE.public_barcode_id,
        medication_name: TEST_MEDICATION.medication_name,
        dose_given: { amount: '5mg', route: 'IV' },
        administered_by: 'test-user-id'
      });

    expect(medError).toBeNull();

    // Add alert acknowledgment
    const { error: alertError } = await supabase
      .from('sim_run_alert_acks')
      .insert({
        run_id: runId,
        run_patient_id: patientId,
        alert_key: 'test_alert_high_hr',
        alert_type: 'vital_alert',
        alert_message: 'High heart rate detected',
        severity: 'medium',
        acknowledged_by: 'test-user-id'
      });

    expect(alertError).toBeNull();

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
        content: 'This is a test note from student'
      });

    expect(noteError).toBeNull();
  });

  test('should reset simulation and preserve IDs while clearing events', async () => {
    // Verify data exists before reset
    const { data: vitalsBefore } = await supabase
      .from('sim_run_vitals_events')
      .select('*')
      .eq('run_id', runId);

    const { data: medsBefore } = await supabase
      .from('sim_run_med_admin_events')
      .select('*')
      .eq('run_id', runId);

    const { data: alertsBefore } = await supabase
      .from('sim_run_alert_acks')
      .select('*')
      .eq('run_id', runId);

    const { data: notesBefore } = await supabase
      .from('sim_run_notes')
      .select('*')
      .eq('run_id', runId)
      .neq('note_type', 'system'); // Exclude system reset notes

    expect(vitalsBefore?.length).toBeGreaterThan(0);
    expect(medsBefore?.length).toBeGreaterThan(0);
    expect(alertsBefore?.length).toBeGreaterThan(0);
    expect(notesBefore?.length).toBeGreaterThan(0);

    // Perform reset
    const { data: resetResult, error: resetError } = await supabase.rpc('reset_run', {
      p_run_id: runId
    });

    expect(resetError).toBeNull();
    expect(resetResult).toBeDefined();
    expect(resetResult.total_deleted).toBeGreaterThan(0);

    // Verify all event data was deleted
    const { data: vitalsAfter } = await supabase
      .from('sim_run_vitals_events')
      .select('*')
      .eq('run_id', runId);

    const { data: medsAfter } = await supabase
      .from('sim_run_med_admin_events')
      .select('*')
      .eq('run_id', runId);

    const { data: alertsAfter } = await supabase
      .from('sim_run_alert_acks')
      .select('*')
      .eq('run_id', runId);

    const { data: notesAfter } = await supabase
      .from('sim_run_notes')
      .select('*')
      .eq('run_id', runId)
      .neq('note_type', 'system'); // Exclude system reset notes

    expect(vitalsAfter?.length).toBe(0);
    expect(medsAfter?.length).toBe(0);
    expect(alertsAfter?.length).toBe(0);
    expect(notesAfter?.length).toBe(0);

    // Verify stable entities are preserved
    const { data: patientsAfter } = await supabase
      .from('sim_run_patients')
      .select('*')
      .eq('run_id', runId);

    const { data: barcodesAfter } = await supabase
      .from('sim_run_barcode_pool')
      .select('*')
      .eq('run_id', runId);

    expect(patientsAfter?.length).toBe(1);
    expect(patientsAfter?.[0].public_patient_id).toBe(TEST_PATIENT.public_patient_id);
    expect(patientsAfter?.[0].id).toBe(patientId); // Same UUID

    expect(barcodesAfter?.length).toBe(1);
    expect(barcodesAfter?.[0].public_barcode_id).toBe(TEST_BARCODE.public_barcode_id);
    expect(barcodesAfter?.[0].id).toBe(barcodeId); // Same UUID

    // Verify run status was updated
    const { data: runAfter } = await supabase
      .from('sim_runs')
      .select('*')
      .eq('id', runId)
      .single();

    expect(runAfter.updated_at).toBeDefined();
    expect(new Date(runAfter.updated_at).getTime()).toBeGreaterThan(
      new Date(runAfter.created_at).getTime()
    );
  });

  test('should allow adding new data after reset', async () => {
    // Add new vitals after reset
    const { error: newVitalsError } = await supabase
      .from('sim_run_vitals_events')
      .insert({
        run_id: runId,
        run_patient_id: patientId,
        vital_type: 'temperature',
        value: { value: 98.6, unit: 'F' },
        recorded_by: 'test-user-id'
      });

    expect(newVitalsError).toBeNull();

    // Verify new data was added
    const { data: newVitals } = await supabase
      .from('sim_run_vitals_events')
      .select('*')
      .eq('run_id', runId);

    expect(newVitals?.length).toBe(1);
    expect(newVitals?.[0].vital_type).toBe('temperature');
  });
});

// Manual test function for interactive testing
export async function runManualTests() {
  console.log('Starting manual simulation reset tests...');

  try {
    // You can run these tests manually by calling this function
    console.log('✅ Manual test setup complete');
    console.log('Run the Jest tests with: npm test simulation.test.ts');
  } catch (error) {
    console.error('❌ Manual test failed:', error);
  }
}

// Export for external testing
export {
  TEST_TEMPLATE,
  TEST_PATIENT,
  TEST_MEDICATION,
  TEST_BARCODE
};