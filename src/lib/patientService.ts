import { supabase } from './supabase';
import { Patient, VitalSigns, Medication, PatientNote } from '../types';

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

/**
 * Convert database patient to app patient format
 */
const convertDatabasePatient = (dbPatient: DatabasePatient, vitals?: DatabaseVitals): Patient => {
  return {
    id: dbPatient.id,
    patientId: dbPatient.patient_id,
    firstName: dbPatient.first_name,
    lastName: dbPatient.last_name,
    dateOfBirth: dbPatient.date_of_birth,
    gender: dbPatient.gender as 'Male' | 'Female' | 'Other',
    roomNumber: dbPatient.room_number,
    bedNumber: dbPatient.bed_number,
    admissionDate: dbPatient.admission_date,
    condition: dbPatient.condition as 'Critical' | 'Stable' | 'Improving' | 'Discharged',
    diagnosis: dbPatient.diagnosis,
    allergies: dbPatient.allergies || [],
    bloodType: dbPatient.blood_type,
    emergencyContact: {
      name: dbPatient.emergency_contact_name,
      relationship: dbPatient.emergency_contact_relationship,
      phone: dbPatient.emergency_contact_phone
    },
    assignedNurse: dbPatient.assigned_nurse,
    vitals: vitals ? {
      temperature: vitals.temperature,
      bloodPressure: {
        systolic: vitals.blood_pressure_systolic,
        diastolic: vitals.blood_pressure_diastolic
      },
      heartRate: vitals.heart_rate,
      respiratoryRate: vitals.respiratory_rate,
      oxygenSaturation: vitals.oxygen_saturation,
      lastUpdated: vitals.recorded_at
    } : {
      // For new patients, set vitals to zero/empty until first recording
      temperature: 0,
      bloodPressure: { systolic: 0, diastolic: 0 },
      heartRate: 0,
      respiratoryRate: 0,
      oxygenSaturation: 0,
      lastUpdated: ''
    },
    medications: [], // Will be loaded separately
    notes: [] // Will be loaded separately
  };
};

/**
 * Convert app patient to database format
 */
const convertToDatabase = (patient: Patient): Omit<DatabasePatient, 'id' | 'created_at' | 'updated_at'> => {
  return {
    patient_id: patient.patientId,
    first_name: patient.firstName,
    last_name: patient.lastName,
    date_of_birth: patient.dateOfBirth,
    gender: patient.gender,
    room_number: patient.roomNumber,
    bed_number: patient.bedNumber,
    admission_date: patient.admissionDate,
    condition: patient.condition,
    diagnosis: patient.diagnosis,
    allergies: patient.allergies,
    blood_type: patient.bloodType,
    emergency_contact_name: patient.emergencyContact.name,
    emergency_contact_relationship: patient.emergencyContact.relationship,
    emergency_contact_phone: patient.emergencyContact.phone,
    assigned_nurse: patient.assignedNurse
  };
};

/**
 * Fetch all patients from database
 */
export const fetchPatients = async (): Promise<Patient[]> => {
  try {
    // Fetch patients with their latest vitals
    const { data: patients, error: patientsError } = await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false });

    if (patientsError) {
      throw patientsError;
    }

    if (!patients || patients.length === 0) {
      return [];
    }

    // Fetch latest vitals for each patient
    const patientsWithVitals = await Promise.all(
      patients.map(async (patient) => {
        const { data: vitals } = await supabase
          .from('patient_vitals')
          .select('*')
          .eq('patient_id', patient.id)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .single();

        return convertDatabasePatient(patient, vitals || undefined);
      })
    );

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

    // Only insert initial vitals if they have actual values (not zeros)
    if (patient.vitals.temperature > 0 || patient.vitals.heartRate > 0) {
      const { error: vitalsError } = await supabase
        .from('patient_vitals')
        .insert({
          patient_id: data.id,
          temperature: patient.vitals.temperature,
          blood_pressure_systolic: patient.vitals.bloodPressure.systolic,
          blood_pressure_diastolic: patient.vitals.bloodPressure.diastolic,
          heart_rate: patient.vitals.heartRate,
          respiratory_rate: patient.vitals.respiratoryRate,
          oxygen_saturation: patient.vitals.oxygenSaturation
        });

      if (vitalsError) {
        console.error('Error inserting initial vitals:', vitalsError);
      }
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
    const { error } = await supabase
      .from('patient_vitals')
      .insert({
        patient_id: patientId,
        temperature: vitals.temperature,
        blood_pressure_systolic: vitals.bloodPressure.systolic,
        blood_pressure_diastolic: vitals.bloodPressure.diastolic,
        heart_rate: vitals.heartRate,
        respiratory_rate: vitals.respiratoryRate,
        oxygen_saturation: vitals.oxygenSaturation
      });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error updating patient vitals:', error);
    throw error;
  }
};

/**
 * Fetch patient vitals history
 */
export const fetchPatientVitalsHistory = async (patientId: string, limit: number = 10): Promise<DatabaseVitals[]> => {
  try {
    const { data, error } = await supabase
      .from('patient_vitals')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching patient vitals history:', error);
    throw error;
  }
};