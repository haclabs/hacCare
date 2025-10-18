import { supabase } from '../../lib/api/supabase';

/**
 * Bowel Record Service
 * Handles database operations for patient bowel records
 */

export interface BowelRecord {
  id?: string;
  patient_id: string;
  nurse_id: string;
  nurse_name: string;
  recorded_at: string;
  
  // Bowel Record Fields
  bowel_incontinence: 'Continent' | 'Incontinent' | 'Partial';
  stool_appearance: 'Normal' | 'Abnormal' | 'Blood present' | 'Mucus present';
  stool_consistency: 'Formed' | 'Loose' | 'Watery' | 'Hard' | 'Soft';
  stool_colour: 'Brown' | 'Green' | 'Yellow' | 'Black' | 'Red' | 'Clay colored';
  stool_amount: 'Small' | 'Moderate' | 'Large' | 'None';
  
  // Additional fields
  notes: string;
  
  created_at?: string;
  updated_at?: string;
}

/**
 * Create a new bowel record
 * Stores bowel records in a dedicated table
 */
export const createBowelRecord = async (record: BowelRecord): Promise<BowelRecord> => {
  try {
    console.log('Creating bowel record:', record);

    const { data, error } = await supabase
      .from('bowel_records')
      .insert({
        patient_id: record.patient_id,
        nurse_id: record.nurse_id,
        nurse_name: record.nurse_name,
        recorded_at: record.recorded_at,
        bowel_incontinence: record.bowel_incontinence,
        stool_appearance: record.stool_appearance,
        stool_consistency: record.stool_consistency,
        stool_colour: record.stool_colour,
        stool_amount: record.stool_amount,
        notes: record.notes
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bowel record:', error);
      throw new Error(`Failed to create bowel record: ${error.message}`);
    }

    console.log('Bowel record created successfully:', data);
    return data as BowelRecord;
  } catch (error: any) {
    console.error('Error in createBowelRecord:', error);
    throw error;
  }
};

/**
 * Fetch bowel records for a patient
 * Returns last 10 records ordered by recorded_at desc
 */
export const fetchPatientBowelRecords = async (patientId: string): Promise<BowelRecord[]> => {
  try {
    console.log('Fetching bowel records for patient:', patientId);

    const { data, error } = await supabase
      .from('bowel_records')
      .select('*')
      .eq('patient_id', patientId)
      .order('recorded_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching bowel records:', error);
      throw new Error(`Failed to fetch bowel records: ${error.message}`);
    }

    console.log(`Fetched ${data?.length || 0} bowel records for patient ${patientId}`);
    return data || [];
  } catch (error: any) {
    console.error('Error in fetchPatientBowelRecords:', error);
    return []; // Return empty array instead of throwing to prevent UI crashes
  }
};

/**
 * Update an existing bowel record
 */
export const updateBowelRecord = async (recordId: string, updates: Partial<BowelRecord>): Promise<BowelRecord> => {
  try {
    console.log('Updating bowel record:', recordId, updates);

    const { data, error } = await supabase
      .from('bowel_records')
      .update(updates)
      .eq('id', recordId)
      .select()
      .single();

    if (error) {
      console.error('Error updating bowel record:', error);
      throw new Error(`Failed to update bowel record: ${error.message}`);
    }

    console.log('Bowel record updated successfully:', data);
    return data as BowelRecord;
  } catch (error: any) {
    console.error('Error in updateBowelRecord:', error);
    throw error;
  }
};

/**
 * Delete a bowel record
 */
export const deleteBowelRecord = async (recordId: string): Promise<void> => {
  try {
    console.log('Deleting bowel record:', recordId);

    const { error } = await supabase
      .from('bowel_records')
      .delete()
      .eq('id', recordId);

    if (error) {
      console.error('Error deleting bowel record:', error);
      throw new Error(`Failed to delete bowel record: ${error.message}`);
    }

    console.log('Bowel record deleted successfully');
  } catch (error: any) {
    console.error('Error in deleteBowelRecord:', error);
    throw error;
  }
};
