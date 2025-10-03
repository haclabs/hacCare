import { supabase } from './supabase';

/**
 * Wound Service
 * Handles database operations for patient wound assessments
 * Updated to match comprehensive wound_assessments table structure
 */

// Database interface matching wound_assessments table
export interface WoundAssessment {
  id: string;
  patient_id: string;
  tenant_id: string;
  assessment_date: string;
  wound_location: string;
  wound_type: 'surgical' | 'pressure' | 'venous' | 'arterial' | 'diabetic' | 'traumatic' | 'other';
  stage?: string;
  length_cm: number;
  width_cm: number;
  depth_cm: number;
  wound_bed: 'red' | 'yellow' | 'black' | 'mixed';
  exudate_amount: 'none' | 'minimal' | 'moderate' | 'heavy';
  exudate_type: 'serous' | 'sanguineous' | 'serosanguineous' | 'purulent' | 'other';
  periwound_condition: string;
  pain_level: number; // 0-10
  odor: boolean;
  signs_of_infection: boolean;
  assessment_notes: string;
  photos?: string[];
  assessor_id: string;
  assessor_name: string;
  created_at?: string;
  updated_at?: string;
}

// UI interface for frontend components (keeping backward compatibility)
export interface WoundUI {
  id: string;
  location: string;
  coordinates: { x: number; y: number };
  view: 'anterior' | 'posterior';
  type: string;
  stage?: string;
  size: {
    length: number;
    width: number;
    depth: number;
  };
  woundBed: 'red' | 'yellow' | 'black' | 'mixed';
  exudate: {
    amount: 'none' | 'minimal' | 'moderate' | 'heavy';
    type: 'serous' | 'sanguineous' | 'serosanguineous' | 'purulent' | 'other';
  };
  periwoundCondition: string;
  painLevel: number;
  odor: boolean;
  signsOfInfection: boolean;
  description: string; // assessment_notes
  treatment?: string;
  assessedBy: string;
  assessmentDate: string;
  healingProgress: 'Improving' | 'Stable' | 'Deteriorating' | 'New';
  photos?: string[];
}

// Legacy interface for backward compatibility
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

/**
 * Convert database wound assessment to UI format
 */
const convertToUIFormat = (assessment: WoundAssessment): WoundUI => {
  // Parse coordinates from wound_location if it contains coordinate data
  // For now, using default coordinates - this should be updated based on your coordinate system
  const coordinates = { x: 50, y: 50 }; // Default center position
  const view = 'anterior' as const; // Default view
  
  return {
    id: assessment.id,
    location: assessment.wound_location,
    coordinates,
    view,
    type: assessment.wound_type,
    stage: assessment.stage,
    size: {
      length: assessment.length_cm,
      width: assessment.width_cm,
      depth: assessment.depth_cm
    },
    woundBed: assessment.wound_bed,
    exudate: {
      amount: assessment.exudate_amount,
      type: assessment.exudate_type
    },
    periwoundCondition: assessment.periwound_condition,
    painLevel: assessment.pain_level,
    odor: assessment.odor,
    signsOfInfection: assessment.signs_of_infection,
    description: assessment.assessment_notes,
    assessedBy: assessment.assessor_name,
    assessmentDate: assessment.assessment_date,
    healingProgress: 'Stable', // Default - could be derived from assessment data
    photos: assessment.photos
  };
};

/**
 * Convert UI wound to database format
 */
const convertToDatabaseFormat = (
  wound: WoundUI, 
  patientId: string, 
  assessorId: string,
  tenantId: string
): Omit<WoundAssessment, 'id' | 'created_at' | 'updated_at'> => {
  return {
    patient_id: patientId,
    tenant_id: tenantId,
    assessment_date: wound.assessmentDate,
    wound_location: wound.location,
    wound_type: wound.type as WoundAssessment['wound_type'],
    stage: wound.stage || '',
    length_cm: wound.size.length,
    width_cm: wound.size.width,
    depth_cm: wound.size.depth,
    wound_bed: wound.woundBed,
    exudate_amount: wound.exudate.amount,
    exudate_type: wound.exudate.type,
    periwound_condition: wound.periwoundCondition,
    pain_level: wound.painLevel,
    odor: wound.odor,
    signs_of_infection: wound.signsOfInfection,
    assessment_notes: wound.description,
    photos: wound.photos,
    assessor_id: assessorId,
    assessor_name: wound.assessedBy
  };
};

/**
 * Fetch wound assessments for a patient
 */
export const fetchPatientWounds = async (patientId: string): Promise<WoundUI[]> => {
  try {
    console.log('Fetching wound assessments for patient:', patientId);
    
    const { data, error } = await supabase
      .from('wound_assessments')
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
 * Create a new wound assessment
 */
export const createWound = async (
  wound: WoundUI, 
  patientId: string, 
  assessorId: string
): Promise<WoundUI> => {
  try {
    console.log('Creating wound assessment for patient:', patientId);
    
    // Get the patient's tenant_id first for proper tenant support
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('tenant_id')
      .eq('id', patientId)
      .single();

    if (patientError) {
      console.error('Error fetching patient for tenant_id:', patientError);
      throw patientError;
    }

    if (!patient?.tenant_id) {
      throw new Error('Patient tenant_id not found');
    }
    
    // Convert UI format to database format
    const dbWound = convertToDatabaseFormat(wound, patientId, assessorId, patient.tenant_id);
    
    const { data, error } = await supabase
      .from('wound_assessments')
      .insert(dbWound)
      .select()
      .single();

    if (error) {
      console.error('Error creating wound assessment:', error);
      throw error;
    }

    console.log('Wound assessment created successfully:', data);
    return convertToUIFormat(data);
  } catch (error) {
    console.error('Error creating wound assessment:', error);
    throw error;
  }
};

/**
 * Update an existing wound assessment
 */
export const updateWound = async (
  woundId: string, 
  updates: Partial<WoundUI>,
  assessorId: string
): Promise<WoundUI> => {
  try {
    console.log('Updating wound assessment:', woundId);
    
    // Convert UI updates to database format
    const dbUpdates: Partial<WoundAssessment> = {};
    
    if (updates.location) dbUpdates.wound_location = updates.location;
    if (updates.type) dbUpdates.wound_type = updates.type as WoundAssessment['wound_type'];
    if (updates.stage) dbUpdates.stage = updates.stage;
    if (updates.size) {
      dbUpdates.length_cm = updates.size.length;
      dbUpdates.width_cm = updates.size.width;
      dbUpdates.depth_cm = updates.size.depth;
    }
    if (updates.woundBed) dbUpdates.wound_bed = updates.woundBed;
    if (updates.exudate) {
      dbUpdates.exudate_amount = updates.exudate.amount;
      dbUpdates.exudate_type = updates.exudate.type;
    }
    if (updates.periwoundCondition) dbUpdates.periwound_condition = updates.periwoundCondition;
    if (updates.painLevel !== undefined) dbUpdates.pain_level = updates.painLevel;
    if (updates.odor !== undefined) dbUpdates.odor = updates.odor;
    if (updates.signsOfInfection !== undefined) dbUpdates.signs_of_infection = updates.signsOfInfection;
    if (updates.description) dbUpdates.assessment_notes = updates.description;
    if (updates.photos) dbUpdates.photos = updates.photos;
    if (updates.assessedBy) dbUpdates.assessor_name = updates.assessedBy;
    if (updates.assessmentDate) dbUpdates.assessment_date = updates.assessmentDate;
    
    // Always update assessor info when making changes
    dbUpdates.assessor_id = assessorId;
    
    const { data, error } = await supabase
      .from('wound_assessments')
      .update(dbUpdates)
      .eq('id', woundId)
      .select()
      .single();

    if (error) {
      console.error('Error updating wound assessment:', error);
      throw error;
    }

    console.log('Wound assessment updated successfully:', data);
    return convertToUIFormat(data);
  } catch (error) {
    console.error('Error updating wound assessment:', error);
    throw error;
  }
};

/**
 * Delete a wound assessment
 */
export const deleteWound = async (woundId: string): Promise<void> => {
  try {
    console.log('Deleting wound assessment:', woundId);
    
    const { error } = await supabase
      .from('wound_assessments')
      .delete()
      .eq('id', woundId);

    if (error) {
      console.error('Error deleting wound assessment:', error);
      throw error;
    }

    console.log('Wound assessment deleted successfully');
  } catch (error) {
    console.error('Error deleting wound assessment:', error);
    throw error;
  }
};

/**
 * Get wound assessment statistics for a patient
 */
export const getWoundStatistics = async (patientId: string) => {
  try {
    const wounds = await fetchPatientWounds(patientId);
    
    return {
      total: wounds.length,
      byType: wounds.reduce((acc, wound) => {
        acc[wound.type] = (acc[wound.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byHealingProgress: wounds.reduce((acc, wound) => {
        acc[wound.healingProgress] = (acc[wound.healingProgress] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      averagePainLevel: wounds.length > 0 
        ? wounds.reduce((sum, wound) => sum + wound.painLevel, 0) / wounds.length 
        : 0,
      hasInfectionSigns: wounds.some(wound => wound.signsOfInfection),
      hasOdor: wounds.some(wound => wound.odor)
    };
  } catch (error) {
    console.error('Error getting wound statistics:', error);
    throw error;
  }
};

/**
 * Get latest wound assessment for a patient
 */
export const getLatestWoundAssessment = async (patientId: string): Promise<WoundUI | null> => {
  try {
    const wounds = await fetchPatientWounds(patientId);
    if (wounds.length === 0) return null;
    
    // Return the most recent assessment
    return wounds.sort((a, b) => 
      new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime()
    )[0];
  } catch (error) {
    console.error('Error getting latest wound assessment:', error);
    throw error;
  }
};

/**
 * Default wound assessment data for new assessments
 */
export const getDefaultWoundAssessment = (assessorName: string): Omit<WoundUI, 'id'> => {
  return {
    location: '',
    coordinates: { x: 50, y: 50 },
    view: 'anterior',
    type: 'other',
    stage: '',
    size: {
      length: 0,
      width: 0,
      depth: 0
    },
    woundBed: 'red',
    exudate: {
      amount: 'minimal',
      type: 'serous'
    },
    periwoundCondition: '',
    painLevel: 0,
    odor: false,
    signsOfInfection: false,
    description: '',
    assessedBy: assessorName,
    assessmentDate: new Date().toISOString(),
    healingProgress: 'New',
    photos: []
  };
};