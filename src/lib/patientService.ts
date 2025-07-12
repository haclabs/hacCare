import { supabase } from './supabase';
import { Patient, VitalSigns, Medication, PatientNote, MedicationAdministration } from '../types';
import { logAction } from './auditService';
import { v4 as uuidv4 } from 'uuid';

/**
 * Patient Service
 * Handles all database operations for patient data
 */

export interface DatabasePatient {
  id: string;
  patient_id: string;
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
  assigned_nurse: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseVitals {
  id: string;
  patient_id: string;
  temperature: number; 
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  heart_rate: number; 
  respiratory_rate: number; 
  oxygen_saturation: number; 
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
    temperature: vital.temperature,
    bloodPressure: {
      systolic: vital.blood_pressure_systolic,
      diastolic: vital.blood_pressure_diastolic
    },
    heartRate: vital.heart_rate,
    respiratoryRate: vital.respiratory_rate,
    oxygenSaturation: vital.oxygen_saturation,
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
    emergency_contact_name: dbPatient.emergency_contact_name,
    emergency_contact_relationship: dbPatient.emergency_contact_relationship,
    emergency_contact_phone: dbPatient.emergency_contact_phone,
    assigned_nurse: dbPatient.assigned_nurse,
    vitals: vitals ? convertDatabaseVitals(vitals) : [],
    medications: [], // Will be loaded separately
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
    assigned_nurse: patient.assigned_nurse
  };
};

/**
 * Fetch all patients from database
 */
export const fetchPatients = async (): Promise<Patient[]> => {
  try {
    console.log('Fetching patients from database...');
    
    // Fetch patients
    const { data: patients, error: patientsError } = await supabase
      .from<DatabasePatient>('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (patientsError) {
      throw patientsError;
    }

    if (!patients || patients.length === 0) {
      console.log('No patients found in database');
      return [];
    }

    console.log(`Found ${patients.length} patients`);

    // Fetch vitals for all patients
    const { data: allVitals, error: vitalsError } = await supabase
      .from<DatabaseVitals>('patient_vitals')
      .select('*')
      .order('recorded_at', { ascending: false });

    if (vitalsError) {
      console.error('Error fetching vitals:', vitalsError);
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

    console.log('Patients converted successfully');
    return patientsWithVitals;
  } catch (error) {
    console.error('Error fetching patients:', error);
    throw error;
  }
};

/**
 * Fetch a single patient by ID from database
 */
export const fetchPatientById = async (patientId: string): Promise<Patient | null> => {
  try {
    console.log('Fetching patient by ID:', patientId);
    
    // Fetch patient
    const { data: patient, error: patientError } = await supabase
      .from<DatabasePatient>('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (patientError) {
      if (patientError.code === 'PGRST116') {
        // No rows returned
        console.log('Patient not found:', patientId);
        return null;
      }
      throw patientError;
    }

    if (!patient) {
      console.log('Patient not found:', patientId);
      return null;
    }

    console.log('Found patient:', patient.patient_id);

    // Fetch vitals for this patient
    const { data: vitals, error: vitalsError } = await supabase
      .from<DatabaseVitals>('patient_vitals')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false });

    if (vitalsError) {
      console.error('Error fetching vitals for patient:', vitalsError);
    }

    // Convert patient with vitals
    const patientWithVitals = convertDatabasePatient(patient, vitals || []);

    console.log('Patient fetched successfully');
    return patientWithVitals;
  } catch (error) {
    console.error('Error fetching patient by ID:', error);
    throw error;
  }
};

/**
 * Create a new patient
 */
export const createPatient = async (patient: Patient): Promise<Patient> => {
  try {
    const dbPatient = convertToDatabase(patient);
    
    const { data, error } = await supabase
      .from<DatabasePatient>('patients')
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
    console.error('Error creating patient:', error);
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
      .from<DatabasePatient>('patients')
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
    console.error('Error updating patient:', error);
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
      .from<DatabasePatient>('patients')
      .select('patient_id')
      .eq('id', patientId)
      .single();

    const { error } = await supabase
      .from<DatabasePatient>('patients')
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
    console.error('Error deleting patient:', error);
    throw error;
  }
};

/**
 * Create a new patient note
 */
export const createPatientNote = async (note: any): Promise<PatientNote> => {
  try {
    console.log('Creating patient note:', note);
    
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
      console.error('Error creating patient note:', error);
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

    console.log('Note created successfully:', createdNote);
    return createdNote;
  } catch (error) {
    console.error('Error creating patient note:', error);
    throw error;
  }
};

/**
 * Update an existing patient note
 */
export const updatePatientNote = async (noteId: string, updates: Partial<PatientNote>): Promise<PatientNote | null> => {
  try {
    console.log('Updating patient note:', noteId, updates);
    
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
      console.error('Error updating patient note:', error);
      throw error;
    }

    if (!data) {
      console.log('No note found with ID:', noteId);
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

    console.log('Note updated successfully:', updatedNote);
    return updatedNote;
  } catch (error) {
    console.error('Error updating patient note:', error);
    throw error;
  }
};

/**
 * Delete a patient note
 */
export const deletePatientNote = async (noteId: string): Promise<void> => {
  try {
    console.log('Deleting patient note:', noteId);
    
    // Get note info before deletion for audit log
    const { data: note } = await supabase
      .from('patient_notes')
      .select('patient_id, type')
      .eq('id', noteId)
      .maybeSingle();

    const { error } = await supabase
      .from('patient_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      console.error('Error deleting patient note:', error);
      throw error;
    }

    // Log the action
    const user = (await supabase.auth.getUser()).data.user;
    await logAction(
      user,
      'deleted_note',
      note?.patient_id || 'unknown',
      'patient',
      { note_id: noteId, type: note?.type }
    );

    console.log('Note deleted successfully');
  } catch (error) {
    console.error('Error deleting patient note:', error);
    throw error;
  }
};

/**
 * Update patient vitals
 */
export const updatePatientVitals = async (patientId: string, vitals: VitalSigns): Promise<void> => {
  try {
    console.log('Inserting vitals for patient:', patientId, vitals);
    console.log('Storing temperature in Celsius:', vitals.temperature);
    
    const { error } = await supabase
      .from<DatabaseVitals>('patient_vitals')
      .insert({
        patient_id: patientId,
        temperature: vitals.temperature, // Store as Celsius
        blood_pressure_systolic: vitals.bloodPressure.systolic,
        blood_pressure_diastolic: vitals.bloodPressure.diastolic,
        heart_rate: vitals.heartRate,
        respiratory_rate: vitals.respiratoryRate,
        oxygen_saturation: vitals.oxygenSaturation
      });

    if (error) {
      console.error('Database error inserting vitals:', error);
      throw error;
    }

    // Log the action
    const user = (await supabase.auth.getUser()).data.user;
    await logAction(
      user,
      'recorded_vitals',
      patientId,
      'patient',
      {
        temperature: vitals.temperature,
        blood_pressure: `${vitals.bloodPressure.systolic}/${vitals.bloodPressure.diastolic}`,
        heart_rate: vitals.heartRate,
        oxygen_saturation: vitals.oxygenSaturation
      }
    );

    console.log('Vitals inserted successfully');
  } catch (error) {
    console.error('Error updating patient vitals:', error);
    throw error;
  }
};

/**
 * Fetch patient vitals
 */
export const fetchPatientVitals = async (patientId: string): Promise<VitalSigns[]> => {
  try {
    console.log('Fetching vitals for patient:', patientId);
    
    // Use the existing fetchPatientVitalsHistory function
    const vitalsHistory = await fetchPatientVitalsHistory(patientId);
    
    // Convert to app format
    return convertDatabaseVitals(vitalsHistory);
  } catch (error) {
    console.error('Error fetching patient vitals:', error);
    return []; // Return empty array instead of throwing to prevent UI crashes
  }
}

/**
 * Get patient vitals (latest record)
 */
export const getPatientVitals = async (patientId: string): Promise<VitalSigns | null> => {
  try {
    console.log('Fetching latest vitals for patient:', patientId);
    
    const { data, error } = await supabase
      .from<DatabaseVitals>('patient_vitals')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching patient vitals:', error);
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

    console.log('Latest vitals fetched successfully');
    console.log('Temperature in Celsius:', vitals.temperature);
    return vitals;
  } catch (error) {
    console.error('Error fetching patient vitals:', error);
    throw error;
  }
};

/**
 * Fetch patient notes
 */
export const fetchPatientNotes = async (patientId: string): Promise<PatientNote[]> => {
  try {
    console.log('Fetching notes for patient:', patientId);
    
    const { data, error } = await supabase
      .from<any>('patient_notes')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching patient notes:', error);
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

    console.log(`Found ${notes.length} notes for patient ${patientId}`);
    return notes;
  } catch (error) {
    console.error('Error fetching patient notes:', error);
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
    console.log('Clearing all vitals for patient:', patientId);
    
    // First, verify the patient exists to avoid deleting wrong records
    const { data: patient, error: patientError } = await supabase
      .from<DatabasePatient>('patients')
      .select('id')
      .eq('id', patientId)
      .single();
    
    if (patientError) {
      console.error('Error verifying patient before clearing vitals:', patientError);
      throw new Error(`Patient with ID ${patientId} not found`);
    }
    
    // Delete all vitals for this patient with explicit patient_id check
    const { error } = await supabase
      .from<DatabaseVitals>('patient_vitals')
      .delete()
      .eq('patient_id', patientId);

    if (error) {
      console.error('Database error deleting vitals:', error);
      throw error;
    }

    console.log('All vitals cleared successfully');
  } catch (error) {
    console.error('Error clearing patient vitals:', error);
    throw error;
  }
};

/**
 * Fetch patient vitals history
 */
export const fetchPatientVitalsHistory = async (patientId: string, limit: number = 10): Promise<DatabaseVitals[]> => {
  try { 
    console.log('Fetching vitals history for patient:', patientId);
    
    const { data, error } = await supabase
      .from<DatabaseVitals>('patient_vitals')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) { 
      console.error('Error fetching vitals history:', error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} vitals records for patient ${patientId}`);
    
    // Return the data with proper typing
    return (data || []) as DatabaseVitals[];
  } catch (error) {
    console.error('Error fetching patient vitals history:', error);
    throw error;
  }
};