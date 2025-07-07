import { supabase } from './supabase';
import { Medication, MedicationAdministration } from '../types';

/**
 * Medication Service
 * Handles database operations for medications and medication administrations
 */

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
      .insert({
        ...medication,
        // Ensure category is set to a valid value
        category: medication.category || 'scheduled'
      })
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
    
    // First delete any administration records for this medication
    const { error: adminError } = await supabase
      .from('medication_administrations')
      .delete()
      .eq('medication_id', medicationId);
    
    if (adminError) {
      console.error('Error deleting medication administrations:', adminError);
      // Continue anyway to try deleting the medication
    }
    
    // Now delete the medication itself
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
 * Update medication next due time
 */
export const updateMedicationNextDue = async (medicationId: string, nextDue: string): Promise<void> => {
  try {
    console.log('Updating medication next due time:', medicationId, nextDue);
    
    const { error } = await supabase
      .from('patient_medications')
      .update({ next_due: nextDue })
      .eq('id', medicationId);

    if (error) {
      console.error('Error updating medication next due time:', error);
      throw error;
    }

    console.log('Medication next due time updated successfully');
  } catch (error) {
    console.error('Error updating medication next due time:', error);
    throw error;
  }
};

/**
 * Record medication administration
 */
export const recordMedicationAdministration = async (administration: Omit<MedicationAdministration, 'id'>): Promise<MedicationAdministration> => {
  try {
    console.log('Recording medication administration:', administration);

    // Validate required fields
    if (!administration.medication_id) {
      throw new Error('Medication ID is required');
    }
    
    if (!administration.patient_id) {
      throw new Error('Patient ID is required');
    }
    
    if (!administration.administered_by) {
      throw new Error('Administrator name is required');
    }
    
    if (!administration.timestamp) {
      administration.timestamp = new Date().toISOString();
    }
    
    // Create a clean object without undefined values
    const cleanAdministration = Object.fromEntries(
      Object.entries(administration).filter(([_, v]) => v !== undefined)
    );
    
    console.log('Clean administration object:', cleanAdministration);

    // Ensure we have a timestamp in ISO format
    if (typeof cleanAdministration.timestamp === 'string' && !cleanAdministration.timestamp.includes('T')) {
      // Convert YYYY-MM-DD HH:MM format to ISO string
      cleanAdministration.timestamp = new Date(cleanAdministration.timestamp).toISOString();
    }

    const { data, error } = await supabase
      .from('medication_administrations')
      .insert(cleanAdministration)
      .select()
      .single();

    if (error) {
      console.error('Error recording medication administration:', error);
      
      // Provide detailed error information for debugging
      if (error.message.includes('permission denied')) {
        console.error('Permission denied error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        console.error('This is likely due to a permission issue with the RLS policies or foreign key constraints.');
        console.error('A database migration is needed to fix this issue.');
      }
      
      throw error;
    }

    // Update medication's last_administered time
    const nextDueTime = await calculateNextDueTime(cleanAdministration.medication_id);
    
    const { error: updateError } = await supabase
      .from('patient_medications')
      .update({ 
        last_administered: cleanAdministration.timestamp,
        // Calculate next due time based on frequency
        next_due: nextDueTime
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
 * Calculate next due time based on medication frequency
 */
const calculateNextDueTime = async (medicationId: string): Promise<string> => {
  try {
    // Get the medication to check its frequency
    const { data: medication, error } = await supabase
      .from('patient_medications')
      .select('frequency')
      .eq('id', medicationId)
      .single();
    
    if (error) {
      console.error('Error fetching medication for next due calculation:', error);
      return new Date().toISOString(); // Fallback to current time
    }
    
    const now = new Date();
    let nextDue = new Date(now);
    
    // Calculate next due time based on frequency
    switch (medication.frequency) {
      case 'Once daily':
        // Next day at 8 AM
        nextDue.setDate(nextDue.getDate() + 1);
        nextDue.setHours(8, 0, 0, 0);
        break;
      case 'Twice daily':
        // If before 8 PM, next dose at 8 PM, otherwise next day at 8 AM
        if (now.getHours() < 20) {
          nextDue.setHours(20, 0, 0, 0);
        } else {
          nextDue.setDate(nextDue.getDate() + 1);
          nextDue.setHours(8, 0, 0, 0);
        }
        break;
      case 'Every 4 hours':
        nextDue.setHours(nextDue.getHours() + 4);
        break;
      case 'Every 6 hours':
        nextDue.setHours(nextDue.getHours() + 6);
        break;
      case 'Every 8 hours':
        nextDue.setHours(nextDue.getHours() + 8);
        break;
      case 'Every 12 hours':
        nextDue.setHours(nextDue.getHours() + 12);
        break;
      default:
        // Default to 24 hours later
        nextDue.setHours(nextDue.getHours() + 24);
    }
    
    return nextDue.toISOString();
  } catch (error) {
    console.error('Error calculating next due time:', error);
    // Return 24 hours from now as fallback
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
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