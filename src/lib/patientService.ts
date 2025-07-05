import { supabase } from './supabase';
import { Patient, VitalSigns, Medication, PatientNote, MedicationAdministration } from '../types';

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
    temperature: vital.temperature * (9/5) + 32, // Convert Celsius to Fahrenheit for display
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
      .from('patients')
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
      .from('patient_vitals')
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
 * Create a new patient
 */
export const createPatient = async (patient: Patient): Promise<Patient> => {
  try {
    const dbPatient = convertToDatabase(patient);
    
    const { data, error } = await supabase
      .from('patients')
      .insert(dbPatient)
      .select()
      .single();

    if (error) {
      throw error;
    }

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
      .from('patients')
      .update(dbPatient)
      .eq('id', patient.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

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
    const { error } = await supabase
      .from('patients')
      .delete()
      .eq('id', patientId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting patient:', error);
    throw error;
  }
};

/**
 * Update patient vitals
 */
export const updatePatientVitals = async (patientId: string, vitals: VitalSigns): Promise<void> => {
  try {
    console.log('Inserting vitals for patient:', patientId, vitals);
    
    const { error } = await supabase
      .from('patient_vitals')
      .insert({
        patient_id: patientId,
        temperature: (vitals.temperature - 32) * (5/9), // Convert Fahrenheit to Celsius for storage
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

    console.log('Vitals inserted successfully');
  } catch (error) {
    console.error('Error updating patient vitals:', error);
    throw error;
  }
};

/**
 * Clear all vital records for a patient
 * Only accessible to super admins
 */
export const clearPatientVitals = async (patientId: string): Promise<void> => {
  try {
    console.log('Clearing all vitals for patient:', patientId);
    
    // First, verify the patient exists to avoid deleting wrong records
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .single();
    
    if (patientError) {
      console.error('Error verifying patient before clearing vitals:', patientError);
      throw new Error(`Patient with ID ${patientId} not found`);
    }
    
    // Delete all vitals for this patient with explicit patient_id check
    const { error } = await supabase
      .from('patient_vitals')
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
      .from('patient_vitals')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching vitals history:', error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} vitals records for patient ${patientId}`);
    return data || [];
  } catch (error) {
    console.error('Error fetching patient vitals history:', error);
    throw error;
  }
};