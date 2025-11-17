/**
 * Device Assessment Service
 * CRUD operations for device_assessments table
 */

import { supabase } from '../../lib/api/supabase';
import type {
  DeviceAssessment,
  CreateDeviceAssessmentInput,
  UpdateDeviceAssessmentInput
} from '../../types/hacmap';

/**
 * Create a new device assessment
 */
export async function createDeviceAssessment(
  input: CreateDeviceAssessmentInput
): Promise<DeviceAssessment> {
  console.log('Creating device assessment:', input);

  const { data, error } = await supabase
    .from('device_assessments')
    .insert([{
      device_id: input.device_id,
      patient_id: input.patient_id,
      tenant_id: input.tenant_id,
      assessed_at: input.assessed_at || new Date().toISOString(),
      student_name: input.student_name,
      device_type: input.device_type,
      status: input.status,
      output_amount_ml: input.output_amount_ml,
      notes: input.notes,
      assessment_data: input.assessment_data || {}
    }])
    .select('*')
    .single();

  if (error) {
    console.error('Error creating device assessment:', error);
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
): Promise<DeviceAssessment[]> {
  const { data, error } = await supabase
    .from('device_assessments')
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
 * Get all assessments for a patient
 */
export async function getPatientDeviceAssessments(
  patientId: string,
  tenantId: string
): Promise<DeviceAssessment[]> {
  const { data, error } = await supabase
    .from('device_assessments')
    .select('*')
    .eq('patient_id', patientId)
    .eq('tenant_id', tenantId)
    .order('assessed_at', { ascending: false });

  if (error) {
    console.error('Error fetching patient device assessments:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get a single assessment by ID
 */
export async function getDeviceAssessment(
  assessmentId: string,
  tenantId: string
): Promise<DeviceAssessment | null> {
  const { data, error } = await supabase
    .from('device_assessments')
    .select('*')
    .eq('id', assessmentId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching device assessment:', error);
    throw error;
  }

  return data;
}

/**
 * Update an existing assessment
 */
export async function updateDeviceAssessment(
  assessmentId: string,
  tenantId: string,
  input: UpdateDeviceAssessmentInput
): Promise<DeviceAssessment> {
  const { data, error } = await supabase
    .from('device_assessments')
    .update({
      ...input,
      updated_at: new Date().toISOString()
    })
    .eq('id', assessmentId)
    .eq('tenant_id', tenantId)
    .select('*')
    .single();

  if (error) {
    console.error('Error updating device assessment:', error);
    throw error;
  }

  return data;
}

/**
 * Delete an assessment
 */
export async function deleteDeviceAssessment(
  assessmentId: string,
  tenantId: string
): Promise<void> {
  const { error } = await supabase
    .from('device_assessments')
    .delete()
    .eq('id', assessmentId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deleting device assessment:', error);
    throw error;
  }
}

/**
 * Get the most recent assessment for a device
 */
export async function getLatestDeviceAssessment(
  deviceId: string,
  tenantId: string
): Promise<DeviceAssessment | null> {
  const { data, error } = await supabase
    .from('device_assessments')
    .select('*')
    .eq('device_id', deviceId)
    .eq('tenant_id', tenantId)
    .order('assessed_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    console.error('Error fetching latest device assessment:', error);
    throw error;
  }

  return data;
}

/**
 * Get assessments by device type
 */
export async function getAssessmentsByDeviceType(
  deviceType: string,
  tenantId: string
): Promise<DeviceAssessment[]> {
  const { data, error } = await supabase
    .from('device_assessments')
    .select('*')
    .eq('device_type', deviceType)
    .eq('tenant_id', tenantId)
    .order('assessed_at', { ascending: false });

  if (error) {
    console.error('Error fetching assessments by device type:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get assessments by student name (for debrief)
 */
export async function getAssessmentsByStudent(
  studentName: string,
  tenantId: string
): Promise<DeviceAssessment[]> {
  const { data, error } = await supabase
    .from('device_assessments')
    .select('*')
    .eq('student_name', studentName)
    .eq('tenant_id', tenantId)
    .order('assessed_at', { ascending: false });

  if (error) {
    console.error('Error fetching assessments by student:', error);
    throw error;
  }

  return data || [];
}
