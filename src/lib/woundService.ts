import { supabase } from './supabase';

/**
 * Wound Service
 * Handles database operations for patient wound assessments
 */

// Database wound interface
export interface DbWound {
  id: string;
  patient_id: string;
  location: string;
  coordinates_x: number;
  coordinates_y: number;
  view: string;
  type: string;
  stage: string;
  size_length: number;
  size_width: number;
  size_depth?: number | null;
  description?: string | null;
  treatment?: string | null;
  assessed_by: string;
  assessment_date: string;
  healing_progress: string;
  created_at?: string;
  updated_at?: string;
}

// UI wound interface
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
 * Convert database wound to UI wound
 */
const convertDbToUiWound = (dbWound: DbWound): WoundUI => {
  return {
    id: dbWound.id,
    location: dbWound.location,
    coordinates: {
      x: Number(dbWound.coordinates_x),
      y: Number(dbWound.coordinates_y)
    },
    view: dbWound.view as 'anterior' | 'posterior',
    type: dbWound.type as WoundUI['type'],
    stage: dbWound.stage as WoundUI['stage'],
    size: {
      length: Number(dbWound.size_length),
      width: Number(dbWound.size_width),
      depth: dbWound.size_depth ? Number(dbWound.size_depth) : undefined
    },
    description: dbWound.description || '',
    treatment: dbWound.treatment || '',
    assessedBy: dbWound.assessed_by,
    assessmentDate: dbWound.assessment_date,
    healingProgress: dbWound.healing_progress as WoundUI['healingProgress']
  };
};

/**
 * Convert UI wound to database format
 */
const convertUiToDbWound = (wound: WoundUI, patientId: string): Omit<DbWound, 'id' | 'created_at' | 'updated_at'> => {
  return {
    patient_id: patientId,
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
    return (data || []).map(convertDbToUiWound);
  } catch (error) {
    console.error('Error fetching patient wounds:', error);
    throw error;
  }
};

/**
 * Create a new wound
 */
export const createWound = async (wound: Omit<WoundUI, 'id'>, patientId: string): Promise<WoundUI> => {
  try {
    console.log('Creating wound:', wound);
    
    const dbWound = convertUiToDbWound(wound as WoundUI, patientId);
    
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
    return convertDbToUiWound(data);
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
    
    // Convert partial UI wound to partial DB wound
    const dbUpdates: Partial<DbWound> = {};
    
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.coordinates !== undefined) {
      dbUpdates.coordinates_x = updates.coordinates.x;
      dbUpdates.coordinates_y = updates.coordinates.y;
    }
    if (updates.view !== undefined) dbUpdates.view = updates.view;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.stage !== undefined) dbUpdates.stage = updates.stage;
    if (updates.size !== undefined) {
      dbUpdates.size_length = updates.size.length;
      dbUpdates.size_width = updates.size.width;
      dbUpdates.size_depth = updates.size.depth;
    }
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.treatment !== undefined) dbUpdates.treatment = updates.treatment;
    if (updates.assessedBy !== undefined) dbUpdates.assessed_by = updates.assessedBy;
    if (updates.assessmentDate !== undefined) dbUpdates.assessment_date = updates.assessmentDate;
    if (updates.healingProgress !== undefined) dbUpdates.healing_progress = updates.healingProgress;
    
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
    return convertDbToUiWound(data);
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