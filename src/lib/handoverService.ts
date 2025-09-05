/**
 * Handover Notes Service
 * 
 * Manages SBAR (Situation, Background, Assessment, Recommendations) handover notes
 * for patient care transitions and communication between healthcare providers.
 */

import { supabase } from './supabase';

export interface HandoverNote {
  id: string;
  patient_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  
  // SBAR Framework fields
  situation: string;
  background: string;
  assessment: string;
  recommendations: string;
  
  // Metadata
  shift: 'day' | 'evening' | 'night';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  acknowledged_by?: string;
  acknowledged_at?: string;
  
  // Creator information
  created_by_name: string;
  created_by_role: string;
}

export interface CreateHandoverNoteData {
  patient_id: string;
  situation: string;
  background: string;
  assessment: string;
  recommendations: string;
  shift: 'day' | 'evening' | 'night';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  created_by: string;
  created_by_name: string;
  created_by_role: string;
}

/**
 * Create a new handover note
 */
export const createHandoverNote = async (noteData: CreateHandoverNoteData): Promise<HandoverNote> => {
  try {
    const { data, error } = await supabase
      .from('handover_notes')
      .insert([{
        ...noteData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select('*')
      .single();

    if (error) {
      console.error('Error creating handover note:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in createHandoverNote:', error);
    throw error;
  }
};

/**
 * Get handover notes for a patient
 */
export const getPatientHandoverNotes = async (patientId: string): Promise<HandoverNote[]> => {
  try {
    const { data, error } = await supabase
      .from('handover_notes')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching handover notes:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getPatientHandoverNotes:', error);
    throw error;
  }
};

/**
 * Get recent handover notes across all patients (for dashboard)
 */
export const getRecentHandoverNotes = async (limit: number = 10): Promise<HandoverNote[]> => {
  try {
    const { data, error } = await supabase
      .from('handover_notes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent handover notes:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getRecentHandoverNotes:', error);
    throw error;
  }
};

/**
 * Update a handover note
 */
export const updateHandoverNote = async (
  noteId: string, 
  updates: Partial<CreateHandoverNoteData>
): Promise<HandoverNote> => {
  try {
    const { data, error } = await supabase
      .from('handover_notes')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating handover note:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateHandoverNote:', error);
    throw error;
  }
};

/**
 * Acknowledge a handover note
 */
export const acknowledgeHandoverNote = async (
  noteId: string,
  acknowledgedBy: string
): Promise<HandoverNote> => {
  try {
    const { data, error } = await supabase
      .from('handover_notes')
      .update({
        acknowledged_by: acknowledgedBy,
        acknowledged_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', noteId)
      .select('*')
      .single();

    if (error) {
      console.error('Error acknowledging handover note:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in acknowledgeHandoverNote:', error);
    throw error;
  }
};

/**
 * Delete a handover note
 */
export const deleteHandoverNote = async (noteId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('handover_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      console.error('Error deleting handover note:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteHandoverNote:', error);
    throw error;
  }
};
