import { supabase } from '../../lib/api/supabase';

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
 * Stores assessments in patient_notes table with proper formatting
 */
export const createAssessment = async (assessment: PatientAssessment): Promise<PatientAssessment> => {
  try {
    console.log('Creating assessment as patient note:', assessment);
    
    // Create comprehensive note content from assessment data
    let noteContent = `Assessment Type: ${assessment.assessment_type.charAt(0).toUpperCase() + assessment.assessment_type.slice(1)}\n\n`;
    
    // Add type-specific fields
    if (assessment.assessment_type === 'physical') {
      if (assessment.general_appearance) noteContent += `General Appearance: ${assessment.general_appearance}\n`;
      if (assessment.level_of_consciousness) noteContent += `Level of Consciousness: ${assessment.level_of_consciousness}\n`;
      if (assessment.respiratory_assessment) noteContent += `Respiratory: ${assessment.respiratory_assessment}\n`;
      if (assessment.cardiovascular_assessment) noteContent += `Cardiovascular: ${assessment.cardiovascular_assessment}\n`;
    } else if (assessment.assessment_type === 'pain') {
      if (assessment.pain_scale) noteContent += `Pain Scale: ${assessment.pain_scale}/10\n`;
      if (assessment.pain_location) noteContent += `Pain Location: ${assessment.pain_location}\n`;
      if (assessment.pain_quality) noteContent += `Pain Quality: ${assessment.pain_quality}\n`;
      if (assessment.pain_duration) noteContent += `Duration: ${assessment.pain_duration}\n`;
    } else if (assessment.assessment_type === 'neurological') {
      if (assessment.glasgow_coma_scale) noteContent += `Glasgow Coma Scale: ${assessment.glasgow_coma_scale}\n`;
      if (assessment.pupil_response) noteContent += `Pupil Response: ${assessment.pupil_response}\n`;
      if (assessment.motor_function) noteContent += `Motor Function: ${assessment.motor_function}\n`;
      if (assessment.cognitive_function) noteContent += `Cognitive Function: ${assessment.cognitive_function}\n`;
    }
    
    // Add common fields
    noteContent += `\nAssessment Notes: ${assessment.assessment_notes}\n`;
    if (assessment.recommendations) noteContent += `Recommendations: ${assessment.recommendations}\n`;
    noteContent += `Priority: ${assessment.priority_level}\n`;
    noteContent += `Follow-up Required: ${assessment.follow_up_required ? 'Yes' : 'No'}`;

    const { data, error } = await supabase
      .from('patient_notes')
      .insert({
        patient_id: assessment.patient_id,
        nurse_id: assessment.nurse_id,
        nurse_name: assessment.nurse_name,
        type: 'Assessment',
        content: noteContent,
        priority: assessment.priority_level === 'critical' ? 'Critical' : 
                 assessment.priority_level === 'urgent' ? 'High' : 'Medium'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating assessment note:', error);
      throw new Error(`Failed to save assessment: ${error.message}`);
    }

    // Convert back to assessment format for consistency
    const savedAssessment: PatientAssessment = {
      id: data.id,
      patient_id: assessment.patient_id,
      nurse_id: assessment.nurse_id,
      nurse_name: assessment.nurse_name,
      assessment_type: assessment.assessment_type,
      assessment_date: data.created_at,
      assessment_notes: assessment.assessment_notes,
      recommendations: assessment.recommendations,
      follow_up_required: assessment.follow_up_required,
      priority_level: assessment.priority_level,
      created_at: data.created_at
    };

    console.log('Assessment saved successfully:', savedAssessment);
    return savedAssessment;
  } catch (error: any) {
    console.error('Error creating assessment:', error);
    throw new Error(`Failed to create assessment: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Fetch assessments for a patient
 * Retrieves assessment notes from patient_notes table
 */
export const fetchPatientAssessments = async (patientId: string): Promise<PatientAssessment[]> => {
  try {
    console.log('Fetching assessment notes for patient:', patientId);
    
    const { data, error } = await supabase
      .from('patient_notes')
      .select('*')
      .eq('patient_id', patientId)
      .eq('type', 'Assessment')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching assessment notes:', error);
      // Don't throw error, return empty array to prevent UI crashes
      return [];
    }

    // Convert notes back to assessment format
    const assessments: PatientAssessment[] = (data || []).map(note => {
      // Parse assessment type from content
      let assessmentType: 'physical' | 'pain' | 'neurological' = 'physical';
      if (note.content.includes('Assessment Type: Pain')) {
        assessmentType = 'pain';
      } else if (note.content.includes('Assessment Type: Neurological')) {
        assessmentType = 'neurological';
      }

      return {
        id: note.id,
        patient_id: note.patient_id,
        nurse_id: note.nurse_id,
        nurse_name: note.nurse_name,
        assessment_type: assessmentType,
        assessment_date: note.created_at,
        assessment_notes: note.content.split('Assessment Notes: ')[1]?.split('\n')[0] || note.content,
        recommendations: note.content.includes('Recommendations: ') ? 
          note.content.split('Recommendations: ')[1]?.split('\n')[0] : '',
        follow_up_required: note.content.includes('Follow-up Required: Yes'),
        priority_level: note.priority === 'Critical' ? 'critical' : 
                       note.priority === 'High' ? 'urgent' : 'routine',
        created_at: note.created_at
      };
    });

    console.log(`Fetched ${assessments.length} assessments for patient ${patientId}`);
    return assessments;
  } catch (error: any) {
    console.error('Error fetching assessments:', error);
    return []; // Return empty array instead of throwing to prevent UI crashes
  }
};

/**
 * Update an existing assessment
 */
export const updateAssessment = async (assessmentId: string, updates: Partial<PatientAssessment>): Promise<PatientAssessment> => {
  try {
    console.log('Updating assessment note:', assessmentId, updates);
    
    // Create updated note content
    let noteContent = `Assessment Type: ${updates.assessment_type || 'Physical'}\n\n`;
    if (updates.assessment_notes) noteContent += `Assessment Notes: ${updates.assessment_notes}\n`;
    if (updates.recommendations) noteContent += `Recommendations: ${updates.recommendations}\n`;
    noteContent += `Priority: ${updates.priority_level || 'routine'}\n`;
    noteContent += `Follow-up Required: ${updates.follow_up_required ? 'Yes' : 'No'}`;

    const { data, error } = await supabase
      .from('patient_notes')
      .update({
        content: noteContent,
        priority: updates.priority_level === 'critical' ? 'Critical' : 
                 updates.priority_level === 'urgent' ? 'High' : 'Medium'
      })
      .eq('id', assessmentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating assessment note:', error);
      throw new Error(`Failed to update assessment: ${error.message}`);
    }

    // Convert back to assessment format
    const updatedAssessment: PatientAssessment = {
      id: data.id,
      patient_id: data.patient_id,
      nurse_id: data.nurse_id,
      nurse_name: data.nurse_name,
      assessment_type: updates.assessment_type || 'physical',
      assessment_date: data.created_at,
      assessment_notes: updates.assessment_notes || '',
      recommendations: updates.recommendations,
      follow_up_required: updates.follow_up_required || false,
      priority_level: updates.priority_level || 'routine',
      created_at: data.created_at
    };

    console.log('Assessment updated successfully:', updatedAssessment);
    return updatedAssessment;
  } catch (error: any) {
    console.error('Error updating assessment:', error);
    throw new Error(`Failed to update assessment: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Delete an assessment
 */
export const deleteAssessment = async (assessmentId: string): Promise<void> => {
  try {
    console.log('Deleting assessment note:', assessmentId);
    
    const { error } = await supabase
      .from('patient_notes')
      .delete()
      .eq('id', assessmentId);

    if (error) {
      console.error('Error deleting assessment note:', error);
      throw new Error(`Failed to delete assessment: ${error.message}`);
    }

    console.log('Assessment deleted successfully');
  } catch (error: any) {
    console.error('Error deleting assessment:', error);
    throw new Error(`Failed to delete assessment: ${error.message || 'Unknown error'}`);
  }
};