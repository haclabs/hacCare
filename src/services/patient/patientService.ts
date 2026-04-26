import { supabase } from '../../lib/api/supabase';
import { Patient, VitalSigns, PatientNote } from '../../types';
import { logAction } from '../operations/auditService';
import { secureLogger } from '../../lib/security/secureLogger';

// Legacy type for simulation_patients table (older approach pre-multi-tenant)
interface SimulationPatient {
  id: string;
  patient_id: string;
  patient_name: string;
  date_of_birth: string;
  gender?: string;
  room_number?: string;
  bed_number?: string;
  admission_date?: string;
  condition?: string;
  diagnosis?: string;
  allergies?: string[];
  blood_type?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  assigned_nurse?: string;
}

/**
 *    // Fetch vitals for all patients
    const { data: vitals, error: vitalsError } = await supabase
      .from('patient_vitals')
      .select('*')
      .order('recorded_at', { ascending: false });ent Service
 * Handles all database operations for patient data
 */

export interface DatabasePatient {
  id: string;
  patient_id: string;
  tenant_id?: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  room_number: string;
  bed_number: string;
  admission_date: string;
  condition: string;
  diagnosis: string;
  allergies: string[];
  blood_type: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  assigned_nurse?: string;
  avatar_id?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseVitals {
  id: string;
  patient_id: string;
  temperature: number | null;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  oxygen_saturation: number | null;
  oxygen_delivery?: string;
  oxygen_flow_rate?: string;
  recorded_at: string;
}

export interface DatabaseMedicationAdministration {
  id: string;
  medication_id: string;
  patient_id: string;
  administered_by: string;
  administered_by_id: string;
  timestamp: string;
  notes?: string;
  created_at: string;
}

/**
 * Convert database vitals to app vitals format
 */
const convertDatabaseVitals = (dbVitals: DatabaseVitals[]): VitalSigns[] => {
  return dbVitals.map(vital => ({
    id: vital.id,
    temperature: vital.temperature ?? undefined,
    bloodPressure: (vital.blood_pressure_systolic !== null && vital.blood_pressure_diastolic !== null) ? {
      systolic: vital.blood_pressure_systolic,
      diastolic: vital.blood_pressure_diastolic
    } : undefined,
    heartRate: vital.heart_rate ?? undefined,
    respiratoryRate: vital.respiratory_rate ?? undefined,
    oxygenSaturation: vital.oxygen_saturation ?? undefined,
    oxygenDelivery: vital.oxygen_delivery || 'Room Air',
    oxygenFlowRate: vital.oxygen_flow_rate || 'N/A',
    recorded_at: vital.recorded_at,
    lastUpdated: vital.recorded_at
  }));
};

/**
 * Convert database patient to app patient format
 */
const convertDatabasePatient = (dbPatient: DatabasePatient, vitals?: DatabaseVitals[]): Patient => {
  return {
    id: dbPatient.id,
    patient_id: dbPatient.patient_id,
    tenant_id: dbPatient.tenant_id,
    first_name: dbPatient.first_name,
    last_name: dbPatient.last_name,
    date_of_birth: dbPatient.date_of_birth,
    gender: dbPatient.gender as 'Male' | 'Female' | 'Other',
    room_number: dbPatient.room_number,
    bed_number: dbPatient.bed_number,
    admission_date: dbPatient.admission_date,
    condition: dbPatient.condition as 'Critical' | 'Stable' | 'Improving' | 'Discharged',
    diagnosis: dbPatient.diagnosis,
    allergies: dbPatient.allergies || [],
    blood_type: dbPatient.blood_type,
    avatar_id: dbPatient.avatar_id,
    emergency_contact_name: dbPatient.emergency_contact_name,
    emergency_contact_relationship: dbPatient.emergency_contact_relationship,
    emergency_contact_phone: dbPatient.emergency_contact_phone,
    assigned_nurse: dbPatient.assigned_nurse,
    vitals: vitals ? convertDatabaseVitals(vitals) : [],
    medications: [], // Always initialize as empty array - medications loaded separately
    notes: [] // Will be loaded separately
  };
};

/**
 * Convert app patient to database format
 */
const convertToDatabase = (patient: Patient): Omit<DatabasePatient, 'id' | 'created_at' | 'updated_at'> => {
  return {
    patient_id: patient.patient_id,
    first_name: patient.first_name,
    last_name: patient.last_name,
    date_of_birth: patient.date_of_birth,
    gender: patient.gender,
    room_number: patient.room_number,
    bed_number: patient.bed_number,
    admission_date: patient.admission_date,
    condition: patient.condition,
    diagnosis: patient.diagnosis,
    allergies: patient.allergies,
    blood_type: patient.blood_type,
    emergency_contact_name: patient.emergency_contact_name,
    emergency_contact_relationship: patient.emergency_contact_relationship,
    emergency_contact_phone: patient.emergency_contact_phone,
    assigned_nurse: patient.assigned_nurse,
    avatar_id: patient.avatar_id
  };
};

/**
 * Convert simulation patient to app patient format for compatibility
 */
const convertSimulationPatient = (simulationPatient: SimulationPatient): Patient => {
  // Split patient_name into first and last names
  const nameParts = simulationPatient.patient_name.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  return {
    id: simulationPatient.id,
    patient_id: simulationPatient.patient_id,
    tenant_id: '', // Simulation patients don't have tenant_id in the interface
    first_name: firstName,
    last_name: lastName,
    date_of_birth: simulationPatient.date_of_birth,
    gender: simulationPatient.gender as 'Male' | 'Female' | 'Other' || 'Other',
    room_number: simulationPatient.room_number || '',
    bed_number: simulationPatient.bed_number || '',
    admission_date: simulationPatient.admission_date || '',
    condition: simulationPatient.condition as 'Critical' | 'Stable' | 'Improving' | 'Discharged' || 'Stable',
    diagnosis: simulationPatient.diagnosis || '',
    allergies: simulationPatient.allergies || [],
    blood_type: simulationPatient.blood_type || '',
    emergency_contact_name: simulationPatient.emergency_contact_name || '',
    emergency_contact_relationship: simulationPatient.emergency_contact_relationship || '',
    emergency_contact_phone: simulationPatient.emergency_contact_phone || '',
    assigned_nurse: simulationPatient.assigned_nurse || '',
    avatar_id: undefined, // Simulation patients don't have avatars yet
    vitals: [], // Will be populated from simulation_patient_vitals
    medications: [], // Will be populated from simulation_patient_medications  
    notes: [] // Will be populated from simulation_patient_notes
  };
};

/**
 * Fetch all patients from database or simulation
 */
export const fetchPatients = async (simulationId?: string, tenantId?: string): Promise<Patient[]> => {
  try {
    // If simulation mode, fetch simulation patients
    if (simulationId) {
      secureLogger.debug('Fetching simulation patients for simulation:', simulationId);
      
      const { data: simulationPatients, error: simError } = await supabase
        .from('simulation_patients')
        .select(`
          *,
          vitals:simulation_patient_vitals(*),
          medications:simulation_patient_medications(*),
          notes:simulation_patient_notes(*)
        `)
        .eq('active_simulation_id', simulationId)
        .eq('is_template', false)
        .order('created_at', { ascending: false });

      if (simError) {
        throw simError;
      }

      if (!simulationPatients || simulationPatients.length === 0) {
        secureLogger.debug('No simulation patients found');
        return [];
      }

      secureLogger.debug(`Found ${simulationPatients.length} simulation patients`);
      
      // Convert simulation patients to Patient format
      const convertedPatients = simulationPatients.map(convertSimulationPatient);
      secureLogger.debug('Simulation patients converted successfully');
      return convertedPatients;
    }
    
    secureLogger.debug('Fetching patients from database...', tenantId ? `for tenant: ${tenantId}` : '(all tenants)');
    
    // Build query for patients
    let query = supabase
      .from('patients')
      .select('*');
    
    // Filter by tenant_id if provided (multi-tenant isolation)
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    
    // Fetch patients
    const { data: patients, error: patientsError } = await query
      .order('created_at', { ascending: false });

    if (patientsError) {
      throw patientsError;
    }

    if (!patients || patients.length === 0) {
      secureLogger.debug('No patients found in database');
      return [];
    }

    secureLogger.debug(`Found ${patients.length} patients`);

    // Fetch vitals for all patients
    const { data: allVitals, error: vitalsError } = await supabase
      .from('patient_vitals')
      .select('*')
      .order('recorded_at', { ascending: false });

    if (vitalsError) {
      secureLogger.error('Error fetching vitals:', vitalsError);
    }

    // Group vitals by patient
    const vitalsByPatient = (allVitals || []).reduce((acc, vital) => {
      if (!acc[vital.patient_id]) {
        acc[vital.patient_id] = [];
      }
      acc[vital.patient_id].push(vital);
      return acc;
    }, {} as Record<string, DatabaseVitals[]>);

    // Convert patients with their vitals
    const patientsWithVitals = patients.map(patient => 
      convertDatabasePatient(patient, vitalsByPatient[patient.id] || [])
    );

    secureLogger.debug('Patients converted successfully');
    return patientsWithVitals;
  } catch (error) {
    secureLogger.error('Error fetching patients:', error);
    secureLogger.debug('Database error, returning empty array');
    return [];
  }
};

/**
 * Fetch a single patient by ID from database
 */
export const fetchPatientById = async (patientId: string, simulationId?: string): Promise<Patient | null> => {
  try {
    secureLogger.debug('Fetching patient by ID:', patientId);
    
    // If simulation mode, fetch simulation patient
    if (simulationId) {
      secureLogger.debug('Fetching simulation patient for simulation:', simulationId);
      
      const { data: simulationPatient, error: simError } = await supabase
        .from('simulation_patients')
        .select(`
          *,
          vitals:simulation_patient_vitals(*),
          medications:simulation_patient_medications(*),
          notes:simulation_patient_notes(*)
        `)
        .eq('id', patientId)
        .eq('active_simulation_id', simulationId)
        .eq('is_template', false)
        .single();

      if (simError) {
        if (simError.code === 'PGRST116') {
          secureLogger.debug('Simulation patient not found:', patientId);
          return null;
        }
        throw simError;
      }

      if (!simulationPatient) {
        secureLogger.debug('Simulation patient not found:', patientId);
        return null;
      }

      secureLogger.debug('Found simulation patient:', simulationPatient.patient_name);
      return convertSimulationPatient(simulationPatient);
    }
    
    // Fetch patient
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (patientError) {
      if (patientError.code === 'PGRST116') {
        // No rows returned from database
        secureLogger.debug('Patient not found in database:', patientId);
        return null;
      }
      throw patientError;
    }

    if (!patient) {
      secureLogger.debug('Patient not found in database:', patientId);
      return null;
    }

    secureLogger.debug('Found patient:', patient.patient_id);

    // Fetch vitals for this patient
    const { data: vitals, error: vitalsError } = await supabase
      .from('patient_vitals')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false });

    if (vitalsError) {
      secureLogger.error('Error fetching vitals for patient:', vitalsError);
    }

    // Convert patient with vitals
    const patientWithVitals = convertDatabasePatient(patient, vitals || []);

    secureLogger.debug('Patient fetched successfully');
    return patientWithVitals;
  } catch (error) {
    secureLogger.error('Error fetching patient by ID:', error);
    throw error;
  }
};

/**
 * Create a new patient
 * 
 * CRITICAL FIX (2025-11-07): Patient Tenant Race Condition
 * 
 * PROBLEM: Patients were being created in wrong tenant despite correct UI selection
 * ROOT CAUSE:
 *   1. TenantContext loads asynchronously from localStorage
 *   2. PatientManagement uses React Query hooks which bypass PatientContext
 *   3. This service had no tenant_id assignment logic for super admin users
 * 
 * SOLUTION: Read superAdminTenantId from sessionStorage at call time
 * WHY: Avoids race condition and works for all code paths (context or direct service call)
 * 
 * TESTING:
 *   - Check sessionStorage.getItem('superAdminTenantId') matches tenant_id in database
 *   - Verify console logs show correct tenant_id being used
 * 
 * RELATED: src/contexts/PatientContext.tsx (secondary fix), 
 *          database/migrations/simulation_config_v2/HOTFIX_RLS_SIMULATION_ACTIVE.sql
 */
export const createPatient = async (patient: Patient): Promise<Patient> => {
  try {
    const dbPatient = convertToDatabase(patient);
    
    // CRITICAL: For super admins, read tenant ID from sessionStorage at call time.
    // This prevents race condition where tenant context isn't initialized yet.
    // React Query hooks call this service directly, bypassing PatientContext.
    // Note: sessionStorage (not localStorage) — tenant context must not persist across sessions.
    const freshTenantId = sessionStorage.getItem('superAdminTenantId');
    if (freshTenantId && !dbPatient.tenant_id) {
      secureLogger.debug('PATIENT SERVICE: Setting tenant_id from sessionStorage:', freshTenantId);
      dbPatient.tenant_id = freshTenantId;
    }
    
    secureLogger.debug('PATIENT SERVICE: Creating patient with tenant_id:', dbPatient.tenant_id);
    
    const { data, error } = await supabase
      .from('patients')
      .insert(dbPatient)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log the action
    const user = (await supabase.auth.getUser()).data.user;
    await logAction(
      user,
      'created_patient',
      data.id,
      'patient',
      { patient_id: data.patient_id }
    );

    return convertDatabasePatient(data);
  } catch (error) {
    secureLogger.error('Error creating patient:', error);
    throw error;
  }
};

/**
 * Update an existing patient
 */
export const updatePatient = async (patient: Patient): Promise<Patient> => {
  try {
    const dbPatient = convertToDatabase(patient);
    
    const { data, error } = await supabase
      .from('patients')
      .update(dbPatient)
      .eq('id', patient.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Log the action
    const user = (await supabase.auth.getUser()).data.user;
    await logAction(
      user,
      'updated_patient',
      data.id,
      'patient',
      { patient_id: data.patient_id }
    );

    return convertDatabasePatient(data);
  } catch (error) {
    secureLogger.error('Error updating patient:', error);
    throw error;
  }
};

/**
 * Delete a patient
 */
export const deletePatient = async (patientId: string): Promise<void> => {
  try {
    // Get patient info before deletion for audit log
    const { data: patient } = await supabase
      .from('patients')
      .select('patient_id')
      .eq('id', patientId)
      .single();

    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', patientId);

    if (error) {
      throw error;
    }
    
    // Log the action
    const user = (await supabase.auth.getUser()).data.user;
    await logAction(
      user,
      'deleted_patient',
      patientId,
      'patient',
      { patient_id: patient?.patient_id }
    );
  } catch (error) {
    secureLogger.error('Error deleting patient:', error);
    throw error;
  }
};

/**
 * Create a new patient note
 */
export const createPatientNote = async (note: any): Promise<PatientNote> => {
  try {
    secureLogger.debug('Creating patient note:', note);
    
    const { data, error } = await supabase
      .from('patient_notes')
      .insert({
        patient_id: note.patient_id,
        nurse_id: note.nurse_id,
        nurse_name: note.nurse_name,
        type: note.type,
        content: note.content,
        priority: note.priority
      })
      .select()
      .single();

    if (error) {
      secureLogger.error('Error creating patient note:', error);
      throw error;
    }

    // Log the action
    const user = (await supabase.auth.getUser()).data.user;
    await logAction(
      user,
      'created_note',
      note.patient_id,
      'patient',
      { type: note.type, priority: note.priority }
    );

    // Convert to app format
    const createdNote: PatientNote = {
      id: data.id,
      patient_id: data.patient_id,
      nurse_id: data.nurse_id,
      nurse_name: data.nurse_name,
      type: data.type,
      content: data.content,
      priority: data.priority,
      created_at: data.created_at
    };

    secureLogger.debug('Note created successfully:', createdNote);
    return createdNote;
  } catch (error) {
    secureLogger.error('Error creating patient note:', error);
    throw error;
  }
};

/**
 * Update an existing patient note
 */
export const updatePatientNote = async (noteId: string, updates: Partial<PatientNote>): Promise<PatientNote | null> => {
  try {
    secureLogger.debug('Updating patient note:', noteId, updates);
    
    // Convert to database format
    const dbUpdates: any = {};
    if (updates.type) dbUpdates.type = updates.type;
    if (updates.content) dbUpdates.content = updates.content;
    if (updates.priority) dbUpdates.priority = updates.priority;
    
    const { data, error } = await supabase
      .from('patient_notes')
      .update(dbUpdates)
      .eq('id', noteId)
      .select()
      .maybeSingle();

    if (error) {
      secureLogger.error('Error updating patient note:', error);
      throw error;
    }

    if (!data) {
      secureLogger.debug('No note found with ID:', noteId);
      return null;
    }

    // Log the action
    const user = (await supabase.auth.getUser()).data.user;
    await logAction(
      user,
      'updated_note',
      data.patient_id,
      'patient',
      { note_id: noteId, type: updates.type }
    );

    // Convert to app format
    const updatedNote: PatientNote = {
      id: data.id,
      patient_id: data.patient_id,
      nurse_id: data.nurse_id,
      nurse_name: data.nurse_name,
      type: data.type,
      content: data.content,
      priority: data.priority,
      created_at: data.created_at
    };

    secureLogger.debug('Note updated successfully:', updatedNote);
    return updatedNote;
  } catch (error) {
    secureLogger.error('Error updating patient note:', error);
    throw error;
  }
};

/**
 * Delete a patient note
 */
export const deletePatientNote = async (noteId: string): Promise<void> => {
  try {
    secureLogger.debug('Deleting patient note:', noteId);
    
    // Get the patient_id before deleting the note
    const { data: noteData } = await supabase
      .from('patient_notes')
      .select('patient_id')
      .eq('id', noteId)
      .maybeSingle();
    
    const patientId = noteData?.patient_id;

    // Delete the note directly without checking first
    const { error } = await supabase
      .from('patient_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      // If the note doesn't exist, just log it and return
      if (error.code === 'PGRST116') {
        secureLogger.debug('Note not found, nothing to delete');
        return;
      } else {
        secureLogger.error('Error deleting patient note:', error);
        throw error;
      }
    } else {
      secureLogger.debug('Note deleted successfully');
    }

    // Log the action
    const user = (await supabase.auth.getUser()).data.user;
    if (user) {
      try {
        await logAction(
          user,
          'deleted_note',
          patientId || 'unknown-patient',
          'patient',
          { note_id: noteId }
        );
      } catch (logError) {
        secureLogger.warn('Failed to log note deletion:', logError);
        // Continue even if logging fails
      }
    }
  } catch (error) {
    secureLogger.error('Error deleting patient note:', error);
    throw error;
  }
};

/**
 * Update patient vitals
 */
export const updatePatientVitals = async (patientId: string, vitals: VitalSigns, studentName?: string): Promise<void> => {
  try {
    secureLogger.debug('Inserting vitals for patient:', patientId, vitals);
    secureLogger.debug('Storing temperature in Celsius:', vitals.temperature);
    secureLogger.debug('🩺 Oxygen delivery:', vitals.oxygenDelivery);
    secureLogger.debug('💨 Flow rate:', vitals.oxygenFlowRate);
    
    // Get the patient's tenant_id first for proper tenant support
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('tenant_id')
      .eq('id', patientId)
      .single();

    if (patientError) {
      secureLogger.error('Error fetching patient for tenant_id:', patientError);
      throw patientError;
    }
    
    // Build insert object dynamically - only include fields that have values
    // This supports partial vitals entry (e.g., newborns without BP readings)
    const vitalRecord: any = {
      patient_id: patientId,
      tenant_id: patient?.tenant_id,
      recorded_at: new Date().toISOString(),
      oxygen_delivery: vitals.oxygenDelivery || 'Room Air',
      oxygen_flow_rate: vitals.oxygenFlowRate || 'N/A',
      student_name: studentName || null
    };

    // Only include vitals that were actually measured
    if (vitals.temperature != null) {
      vitalRecord.temperature = vitals.temperature;
    }
    if (vitals.heartRate != null) {
      vitalRecord.heart_rate = vitals.heartRate;
    }
    if (vitals.respiratoryRate != null) {
      vitalRecord.respiratory_rate = vitals.respiratoryRate;
    }
    if (vitals.oxygenSaturation != null) {
      vitalRecord.oxygen_saturation = vitals.oxygenSaturation;
    }
    
    // Blood pressure: include both or neither (must be a pair)
    if (vitals.bloodPressure?.systolic != null && vitals.bloodPressure?.diastolic != null) {
      vitalRecord.blood_pressure_systolic = vitals.bloodPressure.systolic;
      vitalRecord.blood_pressure_diastolic = vitals.bloodPressure.diastolic;
    }

    // Validate: at least one vital sign must be present
    const hasAtLeastOneVital = 
      vitalRecord.temperature != null ||
      vitalRecord.heart_rate != null ||
      vitalRecord.respiratory_rate != null ||
      vitalRecord.oxygen_saturation != null ||
      vitalRecord.blood_pressure_systolic != null;

    if (!hasAtLeastOneVital) {
      throw new Error('At least one vital sign measurement must be provided');
    }

    secureLogger.debug('📊 Recording partial vitals:', Object.keys(vitalRecord).filter(k => k.includes('_') && vitalRecord[k] != null));

    const { error } = await supabase
      .from('patient_vitals')
      .insert(vitalRecord);

    if (error) {
      secureLogger.error('Database error inserting vitals:', error);
      throw error;
    }

    // Log the action (only log vitals that were actually recorded)
    const user = (await supabase.auth.getUser()).data.user;
    const logData: any = {};
    if (vitals.temperature != null) logData.temperature = vitals.temperature;
    if (vitals.heartRate != null) logData.heart_rate = vitals.heartRate;
    if (vitals.respiratoryRate != null) logData.respiratory_rate = vitals.respiratoryRate;
    if (vitals.oxygenSaturation != null) logData.oxygen_saturation = vitals.oxygenSaturation;
    if (vitals.bloodPressure?.systolic != null && vitals.bloodPressure?.diastolic != null) {
      logData.blood_pressure = `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`;
    }
    
    await logAction(
      user,
      'recorded_vitals',
      patientId,
      'patient',
      logData
    );

    secureLogger.debug('Vitals inserted successfully');
  } catch (error) {
    secureLogger.error('Error updating patient vitals:', error);
    throw error;
  }
};

/**
 * Fetch patient vitals
 */
export const fetchPatientVitals = async (patientId: string): Promise<VitalSigns[]> => {
  try {
    secureLogger.debug('Fetching vitals for patient:', patientId);
    
    // Use the existing fetchPatientVitalsHistory function
    const vitalsHistory = await fetchPatientVitalsHistory(patientId);
    
    // Convert to app format
    return convertDatabaseVitals(vitalsHistory);
  } catch (error) {
    secureLogger.error('Error fetching patient vitals:', error);
    return []; // Return empty array instead of throwing to prevent UI crashes
  }
}

/**
 * Get patient vitals (latest record)
 */
export const getPatientVitals = async (patientId: string): Promise<VitalSigns | null> => {
  try {
    secureLogger.debug('Fetching latest vitals for patient:', patientId);
    
    const { data, error } = await supabase
      .from('patient_vitals')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      secureLogger.error('Error fetching patient vitals:', error);
      throw error;
    }

    if (!data) {
      return null;
    }

    // Convert to app format
    const vitals: VitalSigns = {
      id: data.id,
      temperature: data.temperature,
      bloodPressure: {
        systolic: data.blood_pressure_systolic,
        diastolic: data.blood_pressure_diastolic
      },
      heartRate: data.heart_rate,
      respiratoryRate: data.respiratory_rate,
      oxygenSaturation: data.oxygen_saturation,
      recorded_at: data.recorded_at,
      lastUpdated: data.recorded_at
    };

    secureLogger.debug('Latest vitals fetched successfully');
    secureLogger.debug('Temperature in Celsius:', vitals.temperature);
    return vitals;
  } catch (error) {
    secureLogger.error('Error fetching patient vitals:', error);
    throw error;
  }
};

/**
 * Fetch patient notes
 */
export const fetchPatientNotes = async (patientId: string): Promise<PatientNote[]> => {
  try {
    secureLogger.debug('Fetching notes for patient:', patientId);
    
    const { data, error } = await supabase
      .from('patient_notes')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      secureLogger.error('Error fetching patient notes:', error);
      throw error;
    }

    if (!data) {
      return [];
    }

    // Convert to app format
    const notes: PatientNote[] = data.map(note => ({
      id: note.id,
      patient_id: note.patient_id,
      nurse_id: note.nurse_id,
      nurse_name: note.nurse_name,
      type: note.type,
      content: note.content,
      priority: note.priority as 'Low' | 'Medium' | 'High',
      created_at: note.created_at
    }));

    secureLogger.debug(`Found ${notes.length} notes for patient ${patientId}`);
    return notes;
  } catch (error) {
    secureLogger.error('Error fetching patient notes:', error);
    throw error;
  }
};

// Keep the original function name for backward compatibility
export const getPatientNotes = fetchPatientNotes;

/**
 * Clear all vital records for a patient
 * Only accessible to super admins
 */
export const clearPatientVitals = async (patientId: string): Promise<void> => {
  try {
    secureLogger.debug('Clearing all vitals for patient:', patientId);
    
    // First, verify the patient exists to avoid deleting wrong records
    const { error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .single();
    
    if (patientError) {
      secureLogger.error('Error verifying patient before clearing vitals:', patientError);
      throw new Error(`Patient with ID ${patientId} not found`);
    }
    
    // Delete all vitals for this patient with explicit patient_id check
    const { error } = await supabase
      .from('patient_vitals')
      .delete()
      .eq('patient_id', patientId);

    if (error) {
      secureLogger.error('Database error deleting vitals:', error);
      throw error;
    }

    secureLogger.debug('All vitals cleared successfully');
  } catch (error) {
    secureLogger.error('Error clearing patient vitals:', error);
    throw error;
  }
};

/**
 * Fetch patient vitals history
 */
export const fetchPatientVitalsHistory = async (patientId: string, limit: number = 10): Promise<DatabaseVitals[]> => {
  try { 
    secureLogger.debug('Fetching vitals history for patient:', patientId);
    
    const { data, error } = await supabase
      .from('patient_vitals')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) { 
      secureLogger.error('Error fetching vitals history:', error);
      throw error;
    }

    secureLogger.debug(`Found ${data?.length || 0} vitals records for patient ${patientId}`);
    
    // Return the data with proper typing
    return (data || []) as DatabaseVitals[];
  } catch (error) {
    secureLogger.error('Error fetching patient vitals history:', error);
    throw error;
  }
};