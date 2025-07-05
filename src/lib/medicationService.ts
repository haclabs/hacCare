import { supabase } from './supabase';
import { Medication, MedicationAdministration } from '../types';

/**
 * Medication Service
 * Handles database operations for medications and medication administrations
 */

/**
 * Fetch medications for a patient
 */
export const fetchPatientMedications = async (patientId: string): Promise<Medication[]> => {
  try {
    console.log('Fetching medications for patient:', patientId);
    
    const { data, error } = await supabase
      .from('patient_medications')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching medications:', error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} medications for patient ${patientId}`);
    return data || [];
  } catch (error) {
    console.error('Error fetching patient medications:', error);
    throw error;
  }
};

/**
 * Create a new medication
 */
export const createMedication = async (medication: Omit<Medication, 'id'>): Promise<Medication> => {
  try {
    console.log('Creating medication:', medication);
    
    const { data, error } = await supabase
      .from('patient_medications')
      .insert(medication)
      .select()
      .single();

    if (error) {
      console.error('Error creating medication:', error);
      throw error;
    }

    console.log('Medication created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error creating medication:', error);
    throw error;
  }
};

/**
 * Update an existing medication
 */
export const updateMedication = async (medicationId: string, updates: Partial<Medication>): Promise<Medication> => {
  try {
    console.log('Updating medication:', medicationId, updates);
    
    const { data, error } = await supabase
      .from('patient_medications')
      .update(updates)
      .eq('id', medicationId)
      .select()
      .single();

    if (error) {
      console.error('Error updating medication:', error);
      throw error;
    }

    console.log('Medication updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Error updating medication:', error);
    throw error;
  }
};

/**
 * Delete a medication
 */
export const deleteMedication = async (medicationId: string): Promise<void> => {
  try {
    console.log('Deleting medication:', medicationId);
    
    const { error } = await supabase
      .from('patient_medications')
      .delete()
      .eq('id', medicationId);

    if (error) {
      console.error('Error deleting medication:', error);
      throw error;
    }

    console.log('Medication deleted successfully');
  } catch (error) {
    console.error('Error deleting medication:', error);
    throw error;
  }
};

/**
 * Record medication administration
 */
export const recordMedicationAdministration = async (administration: Omit<MedicationAdministration, 'id'>): Promise<MedicationAdministration> => {
  try {
    console.log('Recording medication administration:', administration);
    
    const { data, error } = await supabase
      .from('medication_administrations')
      .insert(administration)
      .select()
      .single();

    if (error) {
      console.error('Error recording medication administration:', error);
      throw error;
    }

    // Update medication's last_administered time
    const { error: updateError } = await supabase
      .from('patient_medications')
      .update({
        last_administered: administration.timestamp
      })
      .eq('id', administration.medication_id);
    
    if (updateError) {
      console.error('Error updating medication last_administered:', updateError);
      // Continue anyway since the administration was recorded
    }

    console.log('Medication administration recorded successfully:', data);
    return data;
  } catch (error) {
    console.error('Error recording medication administration:', error);
    throw error;
  }
};

/**
 * Fetch medication administration history
 */
export const fetchMedicationAdministrationHistory = async (medicationId: string, patientId: string): Promise<MedicationAdministration[]> => {
  try {
    console.log('Fetching administration history for medication:', medicationId);
    
    const { data, error } = await supabase
      .from('medication_administrations')
      .select('*')
      .eq('medication_id', medicationId)
      .eq('patient_id', patientId)
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching administration history:', error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} administration records for medication ${medicationId}`);
    return data || [];
  } catch (error) {
    console.error('Error fetching medication administration history:', error);
    throw error;
  }
};