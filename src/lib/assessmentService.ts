import { supabase } from './supabase';

/**
 * Assessment Service
 * Handles database operations for patient assessments
 */

export interface PatientAssessment {
  id?: string;
  patient_id: string;
  nurse_id: string;
  nurse_name: string;
  assessment_type: 'physical' | 'pain' | 'neurological';
  assessment_date: string;
  
  // Physical Assessment Fields
  general_appearance?: string;
  level_of_consciousness?: string;
  skin_condition?: string;
  respiratory_assessment?: string;
  cardiovascular_assessment?: string;
  gastrointestinal_assessment?: string;
  genitourinary_assessment?: string;
  musculoskeletal_assessment?: string;
  neurological_assessment?: string;
  
  // Pain Assessment Fields
  pain_scale?: string;
  pain_location?: string;
  pain_quality?: string;
  pain_duration?: string;
  pain_triggers?: string;
  pain_relief_measures?: string;
  
  // Neurological Assessment Fields
  glasgow_coma_scale?: string;
  pupil_response?: string;
  motor_function?: string;
  sensory_function?: string;
  reflexes?: string;
  cognitive_function?: string;
  
  // Common Fields
  assessment_notes: string;
  recommendations?: string;
  follow_up_required: boolean;
  priority_level: 'routine' | 'urgent' | 'critical';
  
  created_at?: string;
  updated_at?: string;
}

/**
 * Create a new patient assessment
 */
export const createAssessment = async (assessment: PatientAssessment): Promise<PatientAssessment> => {
  try {
    console.log('Creating assessment:', assessment);
    
    const { data, error } = await supabase
      .from('patient_assessments')
      .insert(assessment)
      .select()
      .single();

    if (error) {
      console.error('Error creating assessment:', error);
      throw error;
    }

    console.log('Assessment created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error creating assessment:', error);
    throw error;
  }
};

/**
 * Fetch assessments for a patient
 */
export const fetchPatientAssessments = async (patientId: string): Promise<PatientAssessment[]> => {
  try {
    console.log('Fetching assessments for patient:', patientId);
    
    const { data, error } = await supabase
      .from('patient_assessments')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assessments:', error);
      throw error;
    }

    console.log('Assessments fetched successfully:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Error fetching assessments:', error);
    throw error;
  }
};

/**
 * Update an existing assessment
 */
export const updateAssessment = async (assessmentId: string, updates: Partial<PatientAssessment>): Promise<PatientAssessment> => {
  try {
    console.log('Updating assessment:', assessmentId, updates);
    
    const { data, error } = await supabase
      .from('patient_assessments')
      .update(updates)
      .eq('id', assessmentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating assessment:', error);
      throw error;
    }

    console.log('Assessment updated successfully:', data);
    return data;
  } catch (error) {
    console.error('Error updating assessment:', error);
    throw error;
  }
};

/**
 * Delete an assessment
 */
export const deleteAssessment = async (assessmentId: string): Promise<void> => {
  try {
    console.log('Deleting assessment:', assessmentId);
    
    const { error } = await supabase
      .from('patient_assessments')
      .delete()
      .eq('id', assessmentId);

    if (error) {
      console.error('Error deleting assessment:', error);
      throw error;
    }

    console.log('Assessment deleted successfully');
  } catch (error) {
    console.error('Error deleting assessment:', error);
    throw error;
  }
};