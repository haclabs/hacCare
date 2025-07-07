import { supabase } from './supabase';

/**
 * Wound Service
 * Handles database operations for patient wound assessments
 */

export interface Wound {
  id: string;
  patient_id: string;
  location: string;
  coordinates_x: number;
  coordinates_y: number;
  view: 'anterior' | 'posterior';
  type: string;
  stage: string;
  size_length: number;
  size_width: number;
  size_depth?: number;
  description?: string;
  treatment?: string;
  assessed_by: string;
  assessment_date: string;
  healing_progress: 'Improving' | 'Stable' | 'Deteriorating' | 'New';
  created_at?: string;
  updated_at?: string;
}

export interface WoundUI {
  id: string;
  location: string;
  coordinates: { x: number; y: number };
  view: 'anterior' | 'posterior';
  type: string;
  stage: string;
  size: {
    length: number;
    width: number;
    depth?: number;
  };
  description?: string;
  treatment?: string;
  assessedBy: string;
  assessmentDate: string;
  healingProgress: 'Improving' | 'Stable' | 'Deteriorating' | 'New';
}

/**
 * Convert database wound to UI format
 */
const convertToUIFormat = (wound: Wound): WoundUI => {
  return {
    id: wound.id,
    location: wound.location,
    coordinates: {
      x: wound.coordinates_x,
      y: wound.coordinates_y
    },
    view: wound.view,
    type: wound.type,
    stage: wound.stage,
    size: {
      length: wound.size_length,
      width: wound.size_width,
      depth: wound.size_depth
    },
    description: wound.description,
    treatment: wound.treatment,
    assessedBy: wound.assessed_by,
    assessmentDate: wound.assessment_date,
    healingProgress: wound.healing_progress as 'Improving' | 'Stable' | 'Deteriorating' | 'New'
  };
};

/**
 * Convert UI wound to database format
 */
const convertToDatabaseFormat = (wound: WoundUI): Omit<Wound, 'id' | 'created_at' | 'updated_at'> => {
  return {
    patient_id: wound.id.includes('wound-') ? '' : wound.id, // Handle temporary IDs
    location: wound.location,
    coordinates_x: wound.coordinates.x,
    coordinates_y: wound.coordinates.y,
    view: wound.view,
    type: wound.type,
    stage: wound.stage,
    size_length: wound.size.length,
    size_width: wound.size.width,
    size_depth: wound.size.depth,
    description: wound.description,
    treatment: wound.treatment,
    assessed_by: wound.assessedBy,
    assessment_date: wound.assessmentDate,
    healing_progress: wound.healingProgress
  };
};

/**
 * Fetch wounds for a patient
 */
export const fetchPatientWounds = async (patientId: string): Promise<WoundUI[]> => {
  try {
    console.log('Fetching wounds for patient:', patientId);
    
    const { data, error } = await supabase
      .from('patient_wounds')
      .select('*')
      .eq('patient_id', patientId)
      .order('assessment_date', { ascending: false });

    if (error) {
      console.error('Error fetching wounds:', error);
      throw error;
    }

    console.log(`Found ${data?.length || 0} wounds for patient ${patientId}`);
    return (data || []).map(convertToUIFormat);
  } catch (error) {
    console.error('Error fetching patient wounds:', error);
    throw error;
  }
};

/**
 * Create a new wound
 */
export const createWound = async (wound: Wound, patientId: string): Promise<WoundUI> => {
  try {
    console.log('Creating wound for patient:', patientId);
    
    // Make sure patient_id is set correctly
    const dbWound = { ...wound, patient_id: patientId };
    
    const { data, error } = await supabase
      .from('patient_wounds')
      .insert(dbWound)
      .select()
      .single();

    if (error) {
      console.error('Error creating wound:', error);
      throw error;
    }

    console.log('Wound created successfully:', data);
    return convertToUIFormat(data);
  } catch (error) {
    console.error('Error creating wound:', error);
    throw error;
  }
};

/**
 * Update an existing wound
 */
export const updateWound = async (woundId: string, updates: Partial<WoundUI>): Promise<WoundUI> => {
  try {
    console.log('Updating wound:', woundId);
    
    // Convert UI updates to database format
    const dbUpdates: Partial<Wound> = {};
    
    if (updates.location) dbUpdates.location = updates.location;
    if (updates.coordinates) {
      dbUpdates.coordinates_x = updates.coordinates.x;
      dbUpdates.coordinates_y = updates.coordinates.y;
    }
    if (updates.view) dbUpdates.view = updates.view;
    if (updates.type) dbUpdates.type = updates.type;
    if (updates.stage) dbUpdates.stage = updates.stage;
    if (updates.size) {
      dbUpdates.size_length = updates.size.length;
      dbUpdates.size_width = updates.size.width;
      dbUpdates.size_depth = updates.size.depth;
    }
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.treatment !== undefined) dbUpdates.treatment = updates.treatment;
    if (updates.assessedBy) dbUpdates.assessed_by = updates.assessedBy;
    if (updates.assessmentDate) dbUpdates.assessment_date = updates.assessmentDate;
    if (updates.healingProgress) dbUpdates.healing_progress = updates.healingProgress;
    
    const { data, error } = await supabase
      .from('patient_wounds')
      .update(dbUpdates)
      .eq('id', woundId)
      .select()
      .single();

    if (error) {
      console.error('Error updating wound:', error);
      throw error;
    }

    console.log('Wound updated successfully:', data);
    return convertToUIFormat(data);
  } catch (error) {
    console.error('Error updating wound:', error);
    throw error;
  }
};

/**
 * Delete a wound
 */
export const deleteWound = async (woundId: string): Promise<void> => {
  try {
    console.log('Deleting wound:', woundId);
    
    const { error } = await supabase
      .from('patient_wounds')
      .delete()
      .eq('id', woundId);

    if (error) {
      console.error('Error deleting wound:', error);
      throw error;
    }

    console.log('Wound deleted successfully');
  } catch (error) {
    console.error('Error deleting wound:', error);
    throw error;
  }
};