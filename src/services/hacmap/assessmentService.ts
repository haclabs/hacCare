/**
 * ===========================================================================
 * ASSESSMENT SERVICE
 * ===========================================================================
 * CRUD operations for device and wound assessments
 * Tracks ongoing evaluation and treatment of devices and wounds over time
 * ===========================================================================
 */

import { supabase } from '../../lib/api/supabase';
import type { 
  Assessment, 
  CreateAssessmentInput, 
  UpdateAssessmentInput 
} from '../../types/hacmap';

/**
 * Create a new assessment for a device or wound
 */
export async function createAssessment(input: CreateAssessmentInput): Promise<Assessment> {
  if (!input.device_id && !input.wound_id) {
    throw new Error('Either device_id or wound_id must be provided');
  }

  if (input.device_id && input.wound_id) {
    throw new Error('Cannot assess both device and wound at the same time');
  }

  const { data, error } = await supabase
    .from('wound_assessments')
    .insert([{
      device_id: input.device_id || null,
      wound_id: input.wound_id || null,
      patient_id: input.patient_id,
      tenant_id: input.tenant_id,
      assessed_at: input.assessed_at || new Date().toISOString(),
      student_name: input.student_name,
      site_condition: input.site_condition,
      pain_level: input.pain_level,
      notes: input.notes,
      wound_length_cm: input.wound_length_cm,
      wound_width_cm: input.wound_width_cm,
      wound_depth_cm: input.wound_depth_cm,
      wound_appearance: input.wound_appearance,
      drainage_type: input.drainage_type,
      drainage_amount: input.drainage_amount,
      surrounding_skin: input.surrounding_skin,
      treatment_applied: input.treatment_applied,
      dressing_type: input.dressing_type,
      device_functioning: input.device_functioning,
      output_amount_ml: input.output_amount_ml,
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating assessment:', error);
    throw error;
  }

  return data;
}

/**
 * Get all assessments for a specific device
 */
export async function getDeviceAssessments(
  deviceId: string,
  tenantId: string
): Promise<Assessment[]> {
  const { data, error } = await supabase
    .from('wound_assessments')
    .select('*')
    .eq('device_id', deviceId)
    .eq('tenant_id', tenantId)
    .order('assessed_at', { ascending: false });

  if (error) {
    console.error('Error fetching device assessments:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get all assessments for a specific wound
 */
export async function getWoundAssessments(
  woundId: string,
  tenantId: string
): Promise<Assessment[]> {
  const { data, error } = await supabase
    .from('wound_assessments')
    .select('*')
    .eq('wound_id', woundId)
    .eq('tenant_id', tenantId)
    .order('assessed_at', { ascending: false });

  if (error) {
    console.error('Error fetching wound assessments:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get all assessments for a patient
 */
export async function getPatientAssessments(
  patientId: string,
  tenantId: string
): Promise<Assessment[]> {
  const { data, error } = await supabase
    .from('wound_assessments')
    .select('*')
    .eq('patient_id', patientId)
    .eq('tenant_id', tenantId)
    .order('assessed_at', { ascending: false });

  if (error) {
    console.error('Error fetching patient assessments:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single assessment by ID
 */
export async function getAssessment(
  assessmentId: string,
  tenantId: string
): Promise<Assessment | null> {
  const { data, error } = await supabase
    .from('wound_assessments')
    .select('*')
    .eq('id', assessmentId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Error fetching assessment:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing assessment
 */
export async function updateAssessment(
  assessmentId: string,
  tenantId: string,
  input: UpdateAssessmentInput
): Promise<Assessment> {
  const { data, error} = await supabase
    .from('wound_assessments')
    .update({
      assessed_at: input.assessed_at,
      student_name: input.student_name,
      site_condition: input.site_condition,
      pain_level: input.pain_level,
      notes: input.notes,
      wound_length_cm: input.wound_length_cm,
      wound_width_cm: input.wound_width_cm,
      wound_depth_cm: input.wound_depth_cm,
      wound_appearance: input.wound_appearance,
      drainage_type: input.drainage_type,
      drainage_amount: input.drainage_amount,
      surrounding_skin: input.surrounding_skin,
      treatment_applied: input.treatment_applied,
      dressing_type: input.dressing_type,
      device_functioning: input.device_functioning,
      output_amount_ml: input.output_amount_ml,
      updated_at: new Date().toISOString(),
    })
    .eq('id', assessmentId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    console.error('Error updating assessment:', error);
    throw error;
  }

  return data;
}

/**
 * Delete an assessment
 */
export async function deleteAssessment(
  assessmentId: string,
  tenantId: string
): Promise<void> {
  const { error } = await supabase
    .from('wound_assessments')
    .delete()
    .eq('id', assessmentId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deleting assessment:', error);
    throw error;
  }
}

/**
 * Get latest assessment for a device or wound
 */
export async function getLatestAssessment(
  deviceId: string | null,
  woundId: string | null,
  tenantId: string
): Promise<Assessment | null> {
  if (!deviceId && !woundId) {
    return null;
  }

  const query = supabase
    .from('wound_assessments')
    .select('*')
    .eq('tenant_id', tenantId);

  if (deviceId) {
    query.eq('device_id', deviceId);
  } else if (woundId) {
    query.eq('wound_id', woundId);
  }

  const { data, error } = await query
    .order('assessed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching latest assessment:', error);
    throw error;
  }

  return data;
}
