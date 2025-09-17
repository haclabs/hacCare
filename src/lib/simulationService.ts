import { supabase } from './supabase';
import {
  ScenarioTemplate,
  ActiveSimulation,
  SimulationPatient,
  SimulationPatientVital,
  SimulationPatientMedication,
  SimulationMedicationAdministration,
  SimulationPatientNote,
  SimulationEvent,
  SimulationAssessment,
  CreateScenarioTemplateRequest,
  CreateSimulationRequest,
  CreateSimulationPatientRequest
} from '../types';

// Helper function to get current tenant ID
async function getCurrentTenantId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  // Use the same RPC function as tenantService to get tenant_id
  const { data: tenantData, error } = await supabase
    .rpc('get_user_current_tenant', { target_user_id: user.id });

  if (error) {
    console.error('Error fetching user tenant:', error);
    throw new Error('Could not determine user tenant');
  }

  if (!tenantData || !Array.isArray(tenantData) || tenantData.length === 0) {
    throw new Error('User has no associated tenant');
  }

  const tenantId = tenantData[0]?.tenant_id;
  if (!tenantId) {
    throw new Error('Invalid tenant data returned for user');
  }

  return tenantId;
}

// ============================================================================
// SCENARIO TEMPLATE MANAGEMENT
// ============================================================================

export async function createScenarioTemplate(data: CreateScenarioTemplateRequest): Promise<ScenarioTemplate> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const tenantId = await getCurrentTenantId();

  const { data: result, error } = await supabase
    .from('scenario_templates')
    .insert({
      ...data,
      tenant_id: tenantId,
      created_by: user.id,
      is_active: true
    })
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function getScenarioTemplates(): Promise<ScenarioTemplate[]> {
  const { data, error } = await supabase
    .from('scenario_templates')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getScenarioTemplate(id: string): Promise<ScenarioTemplate | null> {
  const { data, error } = await supabase
    .from('scenario_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

export async function getScenarioTemplateDetails(id: string): Promise<ScenarioTemplate> {
  const scenario = await getScenarioTemplate(id);
  if (!scenario) throw new Error('Scenario template not found');
  return scenario;
}

export async function updateScenarioTemplate(id: string, updates: Partial<CreateScenarioTemplateRequest>): Promise<ScenarioTemplate> {
  const { data, error } = await supabase
    .from('scenario_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteScenarioTemplate(id: string): Promise<void> {
  // Soft delete by setting is_active to false
  const { error } = await supabase
    .from('scenario_templates')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// ACTIVE SIMULATION MANAGEMENT
// ============================================================================

export async function createActiveSimulation(data: CreateSimulationRequest): Promise<ActiveSimulation> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const tenantId = await getCurrentTenantId();
  
  // Generate simulation access key in the application
  const simulationAccessKey = `sim_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;

  const { data: result, error } = await supabase
    .from('active_simulations')
    .insert({
      ...data,
      tenant_id: tenantId,
      instructor_id: user.id,
      start_time: new Date().toISOString(),
      status: 'running',
      sim_access_key: simulationAccessKey
    })
    .select(`
      *,
      scenario_template:scenario_templates(*)
    `)
    .single();

  if (error) throw error;
  
  // Verify we have the sim_access_key
  if (!result.sim_access_key) {
    throw new Error('Failed to set simulation access key');
  }
  
  // Copy template patients to the active simulation
  try {
    await copyTemplateToActiveSimulation(data.scenario_template_id, result.id);
    console.log('Template patients copied to active simulation successfully');
  } catch (copyError) {
    console.error('Error copying template patients to active simulation:', copyError);
    // Note: We don't throw here to avoid breaking simulation creation
    // The simulation can still run without patients if needed
  }
  
  return result;
}

export async function getActiveSimulations(): Promise<ActiveSimulation[]> {
  const { data, error } = await supabase
    .from('active_simulations')
    .select(`
      *,
      scenario_template:scenario_templates(*)
    `)
    .order('start_time', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getActiveSimulation(id: string): Promise<ActiveSimulation | null> {
  const { data, error } = await supabase
    .from('active_simulations')
    .select(`
      *,
      scenario_template:scenario_templates(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

export async function getActiveSimulationByToken(token: string): Promise<ActiveSimulation | null> {
  console.log('🔍 Looking up simulation with token:', token);
  
  // First, let's try to query the table without any filters to see if RLS is the issue
  try {
    console.log('🔍 Testing basic table access...');
    const testQuery = await supabase
      .from('active_simulations')
      .select('id, session_name, sim_access_key, allow_anonymous_access, status')
      .limit(5);
    
    console.log('🔍 Basic table query result:', testQuery);
  } catch (testError) {
    console.error('❌ Basic table access failed:', testError);
  }
  
  const { data, error } = await supabase
    .from('active_simulations')
    .select(`
      *,
      scenario_template:scenario_templates(*)
    `)
    .eq('sim_access_key', token)
    .single();

  if (error) {
    console.error('❌ Simulation lookup error:', error);
    console.error('❌ Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  
  console.log('✅ Simulation lookup successful:', data);
  return data;
}

export async function updateSimulationStatus(simulationId: string, status: 'running' | 'paused' | 'completed' | 'reset'): Promise<void> {
  const { error } = await supabase
    .from('active_simulations')
    .update({ 
      status,
      ...(status === 'completed' ? { end_time: new Date().toISOString() } : {})
    })
    .eq('id', simulationId);

  if (error) throw error;
}

export async function deleteActiveSimulation(simulationId: string): Promise<void> {
  // First check if simulation is in a state that allows deletion
  const simulation = await getActiveSimulation(simulationId);
  if (!simulation) {
    throw new Error('Simulation not found');
  }

  // Only allow deletion of completed, paused, or reset simulations
  if (simulation.status === 'running') {
    throw new Error('Cannot delete a running simulation. Please stop it first.');
  }

  const { error } = await supabase
    .from('active_simulations')
    .delete()
    .eq('id', simulationId);

  if (error) throw error;
}

export async function resetSimulation(simulationId: string): Promise<void> {
  // Reset simulation status and clear any live data
  await updateSimulationStatus(simulationId, 'reset');
  
  // This would typically involve restoring vitals, medications, etc.
  // Implementation depends on your reset requirements
}

// ============================================================================
// SIMULATION PATIENT MANAGEMENT
// ============================================================================

export async function createSimulationPatient(scenarioTemplateId: string, data: CreateSimulationPatientRequest): Promise<SimulationPatient> {
  const { data: result, error } = await supabase
    .from('simulation_patients')
    .insert({
      ...data,
      scenario_template_id: scenarioTemplateId,
      is_template: true
    })
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function createActiveSimulationPatient(activeSimulationId: string, data: CreateSimulationPatientRequest): Promise<SimulationPatient> {
  console.log('Creating patient for active simulation:', activeSimulationId);
  console.log('Patient data:', data);

  const { data: result, error } = await supabase
    .from('simulation_patients')
    .insert({
      ...data,
      active_simulation_id: activeSimulationId,
      scenario_template_id: null,
      is_template: false
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating active simulation patient:', error);
    throw error;
  }
  
  console.log('Created active simulation patient:', result);
  return result;
}

export async function getSimulationPatients(scenarioTemplateId?: string, isTemplate: boolean = false, activeSimulationId?: string): Promise<SimulationPatient[]> {
  let query = supabase
    .from('simulation_patients')
    .select(`
      *,
      vitals:simulation_patient_vitals(*),
      medications:simulation_patient_medications(*),
      notes:simulation_patient_notes(*)
    `)
    .order('created_at', { ascending: false });

  if (scenarioTemplateId && isTemplate) {
    query = query.eq('scenario_template_id', scenarioTemplateId).eq('is_template', true);
  } else if (activeSimulationId) {
    query = query.eq('active_simulation_id', activeSimulationId).eq('is_template', false);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function getSimulationPatient(id: string): Promise<SimulationPatient | null> {
  const { data, error } = await supabase
    .from('simulation_patients')
    .select(`
      *,
      vitals:simulation_patient_vitals(*),
      medications:simulation_patient_medications(*),
      notes:simulation_patient_notes(*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // Not found
    throw error;
  }
  return data;
}

export async function updateSimulationPatient(id: string, updates: Partial<SimulationPatient>): Promise<SimulationPatient> {
  const { data, error } = await supabase
    .from('simulation_patients')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSimulationPatient(id: string): Promise<void> {
  const { error } = await supabase
    .from('simulation_patients')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ============================================================================
// VITAL SIGNS MANAGEMENT
// ============================================================================

export async function createSimulationPatientVital(patientId: string, vitals: Omit<SimulationPatientVital, 'id' | 'simulation_patient_id' | 'created_at'>): Promise<SimulationPatientVital> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('simulation_patient_vitals')
    .insert({
      ...vitals,
      simulation_patient_id: patientId,
      recorded_by: user?.email || 'Unknown'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSimulationPatientVital(id: string, updates: Partial<SimulationPatientVital>): Promise<SimulationPatientVital> {
  const { data, error } = await supabase
    .from('simulation_patient_vitals')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSimulationPatientVital(id: string): Promise<void> {
  const { error } = await supabase
    .from('simulation_patient_vitals')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function addPatientVitals(patientId: string, vitals: Omit<SimulationPatientVital, 'id' | 'simulation_patient_id' | 'created_at'>): Promise<SimulationPatientVital> {
  return createSimulationPatientVital(patientId, vitals);
}

export async function getPatientVitals(patientId: string): Promise<SimulationPatientVital[]> {
  const { data, error } = await supabase
    .from('simulation_patient_vitals')
    .select('*')
    .eq('simulation_patient_id', patientId)
    .order('recorded_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// MEDICATION MANAGEMENT
// ============================================================================

export async function createSimulationPatientMedication(patientId: string, medication: Omit<SimulationPatientMedication, 'id' | 'simulation_patient_id' | 'created_at'>): Promise<SimulationPatientMedication> {
  const { data, error } = await supabase
    .from('simulation_patient_medications')
    .insert({
      ...medication,
      simulation_patient_id: patientId,
      is_template: true
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSimulationPatientMedication(id: string, updates: Partial<SimulationPatientMedication>): Promise<SimulationPatientMedication> {
  const { data, error } = await supabase
    .from('simulation_patient_medications')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSimulationPatientMedication(id: string): Promise<void> {
  const { error } = await supabase
    .from('simulation_patient_medications')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function addPatientMedication(patientId: string, medication: Omit<SimulationPatientMedication, 'id' | 'simulation_patient_id' | 'created_at'>): Promise<SimulationPatientMedication> {
  return createSimulationPatientMedication(patientId, medication);
}

export async function getPatientMedications(patientId: string): Promise<SimulationPatientMedication[]> {
  const { data, error } = await supabase
    .from('simulation_patient_medications')
    .select('*')
    .eq('simulation_patient_id', patientId)
    .order('admin_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function administerMedication(data: Omit<SimulationMedicationAdministration, 'id'>): Promise<SimulationMedicationAdministration> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data: result, error } = await supabase
    .from('simulation_medication_administrations')
    .insert({
      ...data,
      administered_by: user?.id || 'unknown',
      administered_by_name: user?.email || 'Unknown User',
      instructor_verified: false
    })
    .select()
    .single();

  if (error) throw error;
  return result;
}

export async function getMedicationAdministrations(patientId: string): Promise<SimulationMedicationAdministration[]> {
  const { data, error } = await supabase
    .from('simulation_medication_administrations')
    .select('*')
    .eq('simulation_patient_id', patientId)
    .order('administered_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// PATIENT NOTES MANAGEMENT
// ============================================================================

export async function createSimulationPatientNote(patientId: string, note: Omit<SimulationPatientNote, 'id' | 'simulation_patient_id' | 'created_at' | 'created_by' | 'created_by_name'>): Promise<SimulationPatientNote> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('simulation_patient_notes')
    .insert({
      ...note,
      simulation_patient_id: patientId,
      created_by: user?.id || 'unknown',
      created_by_name: user?.email || 'Unknown User',
      is_template: true
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateSimulationPatientNote(id: string, updates: Partial<SimulationPatientNote>): Promise<SimulationPatientNote> {
  const { data, error } = await supabase
    .from('simulation_patient_notes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteSimulationPatientNote(id: string): Promise<void> {
  const { error } = await supabase
    .from('simulation_patient_notes')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function addPatientNote(patientId: string, note: Omit<SimulationPatientNote, 'id' | 'simulation_patient_id' | 'created_at' | 'created_by' | 'created_by_name'>): Promise<SimulationPatientNote> {
  return createSimulationPatientNote(patientId, note);
}

export async function getPatientNotes(patientId: string): Promise<SimulationPatientNote[]> {
  const { data, error } = await supabase
    .from('simulation_patient_notes')
    .select('*')
    .eq('simulation_patient_id', patientId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// EVENT LOGGING
// ============================================================================

export async function logSimulationEvent(simulationId: string, event: Omit<SimulationEvent, 'id' | 'active_simulation_id' | 'timestamp'>): Promise<SimulationEvent> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('simulation_events')
    .insert({
      ...event,
      active_simulation_id: simulationId,
      student_id: event.student_id || user?.id,
      student_name: event.student_name || user?.email,
      timestamp: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSimulationEvents(simulationId: string): Promise<SimulationEvent[]> {
  const { data, error } = await supabase
    .from('simulation_events')
    .select('*')
    .eq('active_simulation_id', simulationId)
    .order('timestamp', { ascending: true });

  if (error) throw error;
  return data || [];
}

// ============================================================================
// ASSESSMENT MANAGEMENT
// ============================================================================

export async function addSimulationAssessment(assessment: Omit<SimulationAssessment, 'id' | 'assessed_at' | 'assessed_by' | 'assessed_by_name'>): Promise<SimulationAssessment> {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { data, error } = await supabase
    .from('simulation_assessments')
    .insert({
      ...assessment,
      assessed_by: user?.id || 'unknown',
      assessed_by_name: user?.email || 'Unknown Instructor',
      assessed_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getSimulationAssessments(simulationId: string, studentId?: string): Promise<SimulationAssessment[]> {
  let query = supabase
    .from('simulation_assessments')
    .select('*')
    .eq('active_simulation_id', simulationId)
    .order('assessed_at', { ascending: false });

  if (studentId) {
    query = query.eq('student_id', studentId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export async function copyTemplateToActiveSimulation(scenarioTemplateId: string, activeSimulationId: string): Promise<void> {
  // Copy template patients to active simulation
  const templatePatients = await getSimulationPatients(scenarioTemplateId, true);
  
  for (const templatePatient of templatePatients) {
    if (templatePatient.is_template) {
      // Create a new patient for the active simulation (exclude id and timestamps to let DB generate new ones)
      const { id, vitals, medications, notes, created_at, ...patientData } = templatePatient;
      
      const { data: newPatient, error: patientError } = await supabase
        .from('simulation_patients')
        .insert({
          ...patientData,
          active_simulation_id: activeSimulationId,
          scenario_template_id: null,
          is_template: false
        })
        .select()
        .single();

      if (patientError) throw patientError;

      // Copy baseline vitals
      if (vitals && vitals.length > 0) {
        for (const vital of vitals.filter(v => v.is_baseline)) {
          const { id: vitalId, simulation_patient_id, created_at: vitalCreatedAt, ...vitalData } = vital;
          await supabase
            .from('simulation_patient_vitals')
            .insert({
              ...vitalData,
              simulation_patient_id: newPatient.id
            });
        }
      }

      // Copy medications
      if (medications && medications.length > 0) {
        for (const medication of medications) {
          const { id: medId, simulation_patient_id, created_at: medCreatedAt, ...medData } = medication;
          await supabase
            .from('simulation_patient_medications')
            .insert({
              ...medData,
              simulation_patient_id: newPatient.id
            });
        }
      }

      // Copy notes
      if (notes && notes.length > 0) {
        for (const note of notes) {
          const { id: noteId, simulation_patient_id, created_at: noteCreatedAt, ...noteData } = note;
          await supabase
            .from('simulation_patient_notes')
            .insert({
              ...noteData,
              simulation_patient_id: newPatient.id
            });
        }
      }
    }
  }
}