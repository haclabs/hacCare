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
  type: 'Pressure Ulcer' | 'Surgical' | 'Traumatic' | 'Diabetic' | 'Venous' | 'Arterial' | 'Other';
  stage: 'Stage 1' | 'Stage 2' | 'Stage 3' | 'Stage 4' | 'Unstageable' | 'Deep Tissue Injury' | 'N/A';
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
  type: 'Pressure Ulcer' | 'Surgical' | 'Traumatic' | 'Diabetic' | 'Venous' | 'Arterial' | 'Other';
  stage: 'Stage 1' | 'Stage 2' | 'Stage 3' | 'Stage 4' | 'Unstageable' | 'Deep Tissue Injury' | 'N/A';
  size: {
    length: number;
    width: number;
    depth?: number;
  };
  description: string;
  treatment: string;
  assessedBy: string;
  assessmentDate: string;
  healingProgress: 'Improving' | 'Stable' | 'Deteriorating' | 'New';
}

/**
 * Convert database wound to UI wound format
 */
const convertToUIWound = (dbWound: Wound): WoundUI => {
  return {
    id: dbWound.id,
    location: dbWound.location,
    coordinates: { 
      x: dbWound.coordinates_x, 
      y: dbWound.coordinates_y 
    },
    view: dbWound.view,
    type: dbWound.type,
    stage: dbWound.stage,
    size: {
      length: dbWound.size_length,
      width: dbWound.size_width,
      depth: dbWound.size_depth
    },
    description: dbWound.description || '',
    treatment: dbWound.treatment || '',
    assessedBy: dbWound.assessed_by,
    assessmentDate: dbWound.assessment_date,
    healingProgress: dbWound.healing_progress
  };
};

/**
 * Convert UI wound to database format
 */
const convertToDatabaseWound = (uiWound: WoundUI, patientId: string): Omit<Wound, 'id' | 'created_at' | 'updated_at'> => {
  return {
    patient_id: patientId,
    location: uiWound.location,
    coordinates_x: uiWound.coordinates.x,
    coordinates_y: uiWound.coordinates.y,
    view: uiWound.view,
    type: uiWound.type,
    stage: uiWound.stage,
    size_length: uiWound.size.length,
    size_width: uiWound.size.width,
    size_depth: uiWound.size.depth,
    description: uiWound.description,
    treatment: uiWound.treatment,
    assessed_by: uiWound.assessedBy,
    assessment_date: uiWound.assessmentDate,
    healing_progress: uiWound.healingProgress
  };
};

/**
 * Fetch all wounds for a patient
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
    return (data || []).map(convertToUIWound);
  } catch (error) {
    console.error('Error fetching patient wounds:', error);
    throw error;
  }
};

/**
 * Create a new wound
 */
export const createWound = async (wound: WoundUI, patientId: string): Promise<WoundUI> => {
  try {
    console.log('Creating wound:', wound);
    
    const dbWound = convertToDatabaseWound(wound, patientId);
    
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
    return convertToUIWound(data);
  } catch (error) {
    console.error('Error creating wound:', error);
    throw error;
  }
};

/**
 * Update an existing wound
 */
export const updateWound = async (woundId: string, updates: Partial<WoundUI>, patientId: string): Promise<WoundUI> => {
  try {
    console.log('Updating wound:', woundId, updates);
    
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
    return convertToUIWound(data);
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