import { supabase } from './supabase';
import { Medication, MedicationAdministration } from '../types';
import { logAction } from './auditService';
import { Patient } from '../types';

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
    const now = new Date();
    console.log('Current time:', now.toISOString());
    
    const { data, error } = await supabase
      .from('patient_medications')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching medications:', error);
      throw error;
    } else if (!data || data.length === 0) {
      console.log('No medications found for patient:', patientId);
      return [];
    }

    // Log each medication's next_due time for debugging
    data.forEach(med => {
      const now = new Date();
      let nextDue;
      try {
        nextDue = new Date(med.next_due);
      } catch (e) {
        console.error(`Invalid next_due date for medication ${med.name}:`, med.next_due);
        nextDue = now; // Default to current time if invalid
      }
      
      const isOverdue = nextDue < now && med.status === 'Active';
      const isDueSoon = !isOverdue && (nextDue.getTime() - now.getTime() <= 60 * 60 * 1000) && med.status === 'Active';
      
      console.log(`Medication ${med.name}:`, {
        next_due: med.next_due,
        status: med.status,
        is_overdue: isOverdue,
        is_due_soon: isDueSoon,
        minutes_diff: isOverdue 
          ? -Math.round((now.getTime() - nextDue.getTime()) / (1000 * 60)) // Negative for overdue
          : Math.round((nextDue.getTime() - now.getTime()) / (1000 * 60))  // Positive for due soon
      });
    });

    console.log(`Found ${data.length} medications for patient ${patientId}`);
    return data;
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

    // Log the action
    const user = (await supabase.auth.getUser()).data.user;
    await logAction(
      user,
      'created_medication',
      medication.patient_id || '',
      'patient',
      { 
        medication_id: data.id,
        name: medication.name,
        dosage: medication.dosage
      }
    );

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

    // Log the action
    const user = (await supabase.auth.getUser()).data.user;
    await logAction(
      user,
      'updated_medication',
      data.patient_id,
      'patient',
      { 
        medication_id: medicationId,
        name: data.name,
        changes: Object.keys(updates)
      }
    );

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
    console.log('Medication ID:', administration.medication_id || 'MISSING');
    console.log('Patient ID:', administration.patient_id || 'MISSING');
    console.log('Administered by:', administration.administered_by || 'MISSING');
    console.log('Timestamp:', administration.timestamp || 'MISSING');

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
    // Ensure we have all required fields with proper types
    const cleanAdministration: Omit<MedicationAdministration, 'id'> = {
      medication_id: administration.medication_id,
      patient_id: administration.patient_id,
      administered_by: administration.administered_by,
      administered_by_id: administration.administered_by_id,
      timestamp: administration.timestamp,
      notes: administration.notes
    };
    
    console.log('Clean administration object:', cleanAdministration);

    // Ensure timestamp is in ISO format
    try {
      if (typeof cleanAdministration.timestamp === 'string') {
        // If it's already an ISO string, this will work fine
        // If it's in YYYY-MM-DD HH:MM format, we need to convert it
        if (!cleanAdministration.timestamp.includes('T')) {
          cleanAdministration.timestamp = new Date(cleanAdministration.timestamp).toISOString();
        }
      } else if (cleanAdministration.timestamp instanceof Date) {
        cleanAdministration.timestamp = cleanAdministration.timestamp.toISOString();
      }
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      // Fallback to current time if there's an error
      cleanAdministration.timestamp = new Date().toISOString();
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

    // Get medication details for the audit log
    const { data: medicationData } = await supabase
      .from('patient_medications')
      .select('name, dosage')
      .eq('id', administration.medication_id)
      .single();

    // Log the action
    const user = (await supabase.auth.getUser()).data.user;
    await logAction(
      user,
      'administered_medication',
      administration.patient_id,
      'patient',
      { 
        medication_id: administration.medication_id,
        name: medicationData?.name || 'Unknown medication',
        dosage: medicationData?.dosage || '',
        administered_at: cleanAdministration.timestamp
      }
    );

    // Update medication's last_administered time
    const nextDueTime = await calculateNextDueTime(cleanAdministration.medication_id);
    
    console.log(`Updating medication ${cleanAdministration.medication_id} after administration:`);
    console.log(`- Last administered: ${cleanAdministration.timestamp}`);
    console.log(`- Next due: ${nextDueTime}`);

    // Update medication with last administered time and next due time
    const { data: updatedMed, error: updateError } = await supabase
      .from('patient_medications')
      .update({ 
        last_administered: cleanAdministration.timestamp,
        next_due: nextDueTime
      })
      .eq('id', administration.medication_id)
      .select();
    
    if (updateError) { 
      console.error('Error updating medication last_administered and next_due:', updateError);
      // Continue anyway since the administration was recorded
    } else {
      console.log('Medication updated successfully:', updatedMed);
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
    console.log('Calculating next due time for medication:', medicationId);
    // Get the medication to check its frequency
    const { data: medication, error } = await supabase 
      .from('patient_medications')
      .select('frequency')
      .eq('id', medicationId)
      .single();
    
    if (error) {
      console.error('Error fetching medication for next due calculation:', error);
      return new Date().toISOString(); // Fallback to current time
    } else if (!medication) {
      console.error('Medication not found for next due calculation:', medicationId);
      return new Date().toISOString(); // Fallback to current time
    }
    
    console.log('Medication frequency:', medication.frequency);
    
    // Create a new Date object for the next due time
    const currentTime = new Date();
    let nextDue = new Date(currentTime);
    
    // Calculate next due time based on frequency
    switch (medication.frequency) {
      case 'Once daily':
        // If current time is before 8 AM, due at 8 AM today, otherwise 8 AM tomorrow 
        if (currentTime.getHours() < 8) {
          nextDue.setHours(8, 0, 0, 0); // 8:00 AM today
        } else {
          nextDue.setDate(nextDue.getDate() + 1);
          nextDue.setHours(8, 0, 0, 0); // 8:00 AM tomorrow
        }
        break;
      case 'Twice daily':
        // If before 8 PM, next dose at 8 PM, otherwise next day at 8 AM 
        if (currentTime.getHours() < 20) {
          nextDue.setHours(20, 0, 0, 0); // 8:00 PM today
        } else {
          nextDue.setDate(nextDue.getDate() + 1);
          nextDue.setHours(8, 0, 0, 0);  // 8:00 AM tomorrow
        }
        break;
      case 'Three times daily':
        const threeTimes = [8, 14, 20]; // 8 AM, 2 PM, 8 PM
        for (const hour of threeTimes) {
          if (currentTime.getHours() < hour) {
            nextDue.setHours(hour, 0, 0, 0);
            return nextDue.toISOString();
          }
        }
        // If we're past all times today, set for tomorrow morning
        nextDue.setDate(nextDue.getDate() + 1);
        nextDue.setHours(8, 0, 0, 0);
        break;
      case 'Every 4 hours':
        nextDue = new Date(currentTime.getTime() + 4 * 60 * 60 * 1000);
        break;
      case 'Every 6 hours':
        const sixHourTimes = [6, 12, 18, 24]; // 6 AM, 12 PM, 6 PM, 12 AM
        for (const hour of sixHourTimes) {
          if (currentTime.getHours() < hour) {
            nextDue.setHours(hour, 0, 0, 0);
            return nextDue.toISOString();
          }
        }
        // If we're past all times today, set for tomorrow morning
        nextDue.setDate(nextDue.getDate() + 1);
        nextDue.setHours(6, 0, 0, 0);
        break;
      case 'Every 8 hours':
        const eightHourTimes = [8, 16, 24]; // 8 AM, 4 PM, 12 AM
        for (const hour of eightHourTimes) {
          if (currentTime.getHours() < hour) {
            nextDue.setHours(hour, 0, 0, 0);
            return nextDue.toISOString();
          }
        }
        // If we're past all times today, set for tomorrow morning
        nextDue.setDate(nextDue.getDate() + 1);
        nextDue.setHours(8, 0, 0, 0);
        break;
      case 'Every 12 hours':
        const twelveHourTimes = [8, 20]; // 8 AM, 8 PM
        for (const hour of twelveHourTimes) {
          if (currentTime.getHours() < hour) {
            nextDue.setHours(hour, 0, 0, 0);
            return nextDue.toISOString();
          }
        }
        // If we're past all times today, set for tomorrow morning
        nextDue.setDate(nextDue.getDate() + 1);
        nextDue.setHours(8, 0, 0, 0);
        break;
      case 'As needed (PRN)':
        return currentTime.toISOString(); // Immediate availability
      default:
        // Default to 8 AM tomorrow
        nextDue.setDate(nextDue.getDate() + 1);
        nextDue.setHours(8, 0, 0, 0);
    }
    
    const result = nextDue.toISOString();
    console.log(`Calculated next due time for ${medication?.frequency || 'unknown frequency'}:`, result);
    console.log(`Current time:`, currentTime.toISOString());
    console.log(`Time difference:`, nextDue.getTime() - currentTime.getTime(), 'ms');
    return result;
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
    console.log('For patient:', patientId);
    
    if (!medicationId || !patientId) {
      console.error('Missing required parameters for fetching history');
      console.error('Medication ID:', medicationId);
      console.error('Patient ID:', patientId);
      return [];
    }
    
    const { data, error } = await supabase
      .from('medication_administrations')
      .select('*')
      .eq('medication_id', medicationId) 
      .eq('patient_id', patientId) 
      .order('timestamp', { ascending: false });

    if (error) {
      console.error('Error fetching administration history:', error);
      return [];
    }

    console.log(`Found ${data?.length || 0} administration records for medication ${medicationId} and patient ${patientId}`);
    
    if (data && data.length > 0) {
      console.log('First record:', JSON.stringify(data[0]));
    } else {
      console.log('No administration records found');
      
      // Check if there are any records for this medication at all
      const { data: allRecords, error: allRecordsError } = await supabase
        .from('medication_administrations')
        .select('count')
        .eq('medication_id', medicationId);
        
      if (!allRecordsError) {
        console.log(`Total records for this medication (any patient): ${allRecords?.length || 0}`);
      }
      
      // Check if there are any records for this patient
      const { data: patientRecords, error: patientRecordsError } = await supabase
        .from('medication_administrations')
        .select('count')
        .eq('patient_id', patientId);
        
      if (!patientRecordsError) {
        console.log(`Total records for this patient (any medication): ${patientRecords?.length || 0}`);
      }
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching medication administration history:', error);
    return []; // Return empty array instead of throwing to prevent UI crashes
  }
};

/**
 * Get patient by medication ID
 * Looks up the patient associated with a medication barcode
 */
export const getPatientByMedicationId = async (medicationId: string): Promise<{ patientId: string, medicationId: string } | null> => {
  try {
    console.log('Looking up patient by medication ID:', medicationId);
    console.log('Medication ID type:', typeof medicationId);
    
    // Extract the actual medication ID from the barcode format (e.g., "MED123456" -> "123456")
    const extractedId = medicationId.startsWith('MED') ? medicationId.substring(3) : medicationId;
    console.log('Extracted ID from barcode:', extractedId, typeof extractedId);
    
    // Fetch all medications to perform client-side matching
    const { data, error } = await supabase
      .from('patient_medications')
      .select('id, patient_id')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error looking up patient by medication ID:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('No medications found in database');
      return null;
    }

    console.log(`Checking ${data.length} medications for a match with ${extractedId}`);
    
    // Find medication whose ID ends with the extracted ID (last 6 characters)
    const matchedMedication = data.find(med => {
      // Get the last 6 characters of the medication ID
      const medIdSuffix = med.id.substring(Math.max(0, med.id.length - 6));
      // Also try to match by including the ID anywhere in the medication ID
      const isMatch = medIdSuffix === extractedId || med.id.includes(extractedId);
      console.log(`Comparing medication ${med.id} (suffix: ${medIdSuffix}) with extracted ID ${extractedId} - Match: ${isMatch}`);
      return isMatch;
    });
    
    if (matchedMedication) {
      console.log('Found matching medication:', matchedMedication);
      return {
        patientId: matchedMedication.patient_id,
        medicationId: matchedMedication.id
      };
    } else {
      console.log('No medication found with ID suffix:', extractedId);
      return null;
    }
  } catch (error) {
    console.error('Error in getPatientByMedicationId:', error);
    return null;
  }
};