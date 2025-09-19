import { supabase } from './supabase';
import { Patient } from '../types';
import { logAction } from './auditService';

/**
 * Patient Transfer Service
 * Handles moving and duplicating patients between tenants
 */

export interface PatientTransferOptions {
  sourcePatientId: string;
  targetTenantId: string;
  preserveOriginal?: boolean; // true = duplicate, false = move
  transferNotes?: boolean;
  transferVitals?: boolean;
  transferMedications?: boolean;
  transferAssessments?: boolean;
  newPatientId?: string; // For duplicates, specify new patient ID
}

export interface PatientTransferResult {
  success: boolean;
  newPatientId?: string;
  message: string;
  error?: string;
}

/**
 * Move or duplicate a patient to another tenant
 */
export const transferPatient = async (options: PatientTransferOptions): Promise<PatientTransferResult> => {
  const {
    sourcePatientId,
    targetTenantId,
    preserveOriginal = false,
    transferNotes = true,
    transferVitals = true,
    transferMedications = true,
    transferAssessments = true,
    newPatientId
  } = options;

  try {
    console.log(`${preserveOriginal ? 'Duplicating' : 'Moving'} patient ${sourcePatientId} to tenant ${targetTenantId}`);

    // 1. Get the source patient with all data
    const { data: sourcePatient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', sourcePatientId)
      .single();

    if (patientError || !sourcePatient) {
      return {
        success: false,
        message: 'Source patient not found',
        error: patientError?.message
      };
    }

    // 2. Verify target tenant exists
    const { data: targetTenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name')
      .eq('id', targetTenantId)
      .single();

    if (tenantError || !targetTenant) {
      return {
        success: false,
        message: 'Target tenant not found',
        error: tenantError?.message
      };
    }

    // 3. Generate new patient ID if duplicating
    const finalPatientId = preserveOriginal 
      ? (newPatientId || await generateUniquePatientId(targetTenantId))
      : sourcePatient.patient_id;

    // 4. Create/update patient record
    const patientData = {
      ...sourcePatient,
      tenant_id: targetTenantId,
      patient_id: finalPatientId,
      created_at: preserveOriginal ? new Date().toISOString() : sourcePatient.created_at,
      updated_at: new Date().toISOString()
    };

    let resultPatientId: string;

    if (preserveOriginal) {
      // Create new patient record (duplicate)
      delete patientData.id; // Remove ID so a new one is generated
      
      const { data: newPatient, error: createError } = await supabase
        .from('patients')
        .insert(patientData)
        .select()
        .single();

      if (createError) {
        return {
          success: false,
          message: 'Failed to create duplicate patient',
          error: createError.message
        };
      }

      resultPatientId = newPatient.id;
    } else {
      // Move existing patient (update tenant_id)
      const { error: updateError } = await supabase
        .from('patients')
        .update({ 
          tenant_id: targetTenantId,
          updated_at: new Date().toISOString()
        })
        .eq('id', sourcePatientId);

      if (updateError) {
        return {
          success: false,
          message: 'Failed to move patient',
          error: updateError.message
        };
      }

      resultPatientId = sourcePatientId;
    }

    // 5. Transfer related data if requested
    const transferPromises: Promise<any>[] = [];

    if (transferVitals) {
      transferPromises.push(transferPatientVitals(sourcePatientId, resultPatientId, preserveOriginal));
    }

    if (transferMedications) {
      transferPromises.push(transferPatientMedications(sourcePatientId, resultPatientId, preserveOriginal));
    }

    if (transferNotes) {
      transferPromises.push(transferPatientNotes(sourcePatientId, resultPatientId, preserveOriginal));
    }

    if (transferAssessments) {
      transferPromises.push(transferPatientAssessments(sourcePatientId, resultPatientId, preserveOriginal));
    }

    // Wait for all transfers to complete
    await Promise.all(transferPromises);

    // 6. Log the action
    const { data: { user } } = await supabase.auth.getUser();
    const action = preserveOriginal ? 'duplicated_patient' : 'moved_patient';
    const details = {
      source_patient_id: sourcePatientId,
      target_tenant_id: targetTenantId,
      new_patient_id: resultPatientId,
      transferred_data: {
        vitals: transferVitals,
        medications: transferMedications,
        notes: transferNotes,
        assessments: transferAssessments
      }
    };

    await logAction(user, action, resultPatientId, 'patient', details);

    return {
      success: true,
      newPatientId: resultPatientId,
      message: preserveOriginal 
        ? `Patient duplicated successfully to ${targetTenant.name}`
        : `Patient moved successfully to ${targetTenant.name}`
    };

  } catch (error) {
    console.error('Patient transfer error:', error);
    return {
      success: false,
      message: 'Transfer failed due to unexpected error',
      error: (error as Error).message
    };
  }
};

/**
 * Generate a unique patient ID for a tenant
 */
const generateUniquePatientId = async (tenantId: string): Promise<string> => {
  // Get the tenant's subdomain for prefix
  const { data: tenant } = await supabase
    .from('tenants')
    .select('subdomain')
    .eq('id', tenantId)
    .single();

  const prefix = tenant?.subdomain?.substring(0, 3).toUpperCase() || 'PT';
  
  // Find the next available number
  const { data: existingPatients } = await supabase
    .from('patients')
    .select('patient_id')
    .eq('tenant_id', tenantId)
    .like('patient_id', `${prefix}%`);

  const existingNumbers = existingPatients
    ?.map(p => parseInt(p.patient_id.replace(prefix, '')))
    .filter(n => !isNaN(n))
    .sort((a, b) => b - a) || [];

  const nextNumber = existingNumbers.length > 0 ? existingNumbers[0] + 1 : 1;
  return `${prefix}${nextNumber.toString().padStart(3, '0')}`;
};

/**
 * Transfer patient vitals
 */
const transferPatientVitals = async (sourcePatientId: string, targetPatientId: string, duplicate: boolean) => {
  const { data: vitals } = await supabase
    .from('patient_vitals')
    .select('*')
    .eq('patient_id', sourcePatientId);

  if (!vitals || vitals.length === 0) return;

  if (duplicate) {
    // Create new vitals records
    const newVitals = vitals.map(vital => ({
      ...vital,
      patient_id: targetPatientId,
      id: undefined, // Let the database generate new IDs
      created_at: new Date().toISOString()
    }));

    await supabase.from('patient_vitals').insert(newVitals);
  } else {
    // Update existing vitals to point to moved patient
    await supabase
      .from('patient_vitals')
      .update({ patient_id: targetPatientId })
      .eq('patient_id', sourcePatientId);
  }
};

/**
 * Transfer patient medications
 */
const transferPatientMedications = async (sourcePatientId: string, targetPatientId: string, duplicate: boolean) => {
  const { data: medications } = await supabase
    .from('patient_medications')
    .select('*')
    .eq('patient_id', sourcePatientId);

  if (!medications || medications.length === 0) return;

  if (duplicate) {
    const newMedications = medications.map(med => ({
      ...med,
      patient_id: targetPatientId,
      id: undefined,
      created_at: new Date().toISOString()
    }));

    await supabase.from('patient_medications').insert(newMedications);
  } else {
    await supabase
      .from('patient_medications')
      .update({ patient_id: targetPatientId })
      .eq('patient_id', sourcePatientId);
  }
};

/**
 * Transfer patient notes
 */
const transferPatientNotes = async (sourcePatientId: string, targetPatientId: string, duplicate: boolean) => {
  const { data: notes } = await supabase
    .from('patient_notes')
    .select('*')
    .eq('patient_id', sourcePatientId);

  if (!notes || notes.length === 0) return;

  if (duplicate) {
    const newNotes = notes.map(note => ({
      ...note,
      patient_id: targetPatientId,
      id: undefined,
      created_at: new Date().toISOString()
    }));

    await supabase.from('patient_notes').insert(newNotes);
  } else {
    await supabase
      .from('patient_notes')
      .update({ patient_id: targetPatientId })
      .eq('patient_id', sourcePatientId);
  }
};

/**
 * Transfer patient assessments
 */
const transferPatientAssessments = async (sourcePatientId: string, targetPatientId: string, duplicate: boolean) => {
  const { data: assessments } = await supabase
    .from('patient_assessments')
    .select('*')
    .eq('patient_id', sourcePatientId);

  if (!assessments || assessments.length === 0) return;

  if (duplicate) {
    const newAssessments = assessments.map(assessment => ({
      ...assessment,
      patient_id: targetPatientId,
      id: undefined,
      created_at: new Date().toISOString()
    }));

    await supabase.from('patient_assessments').insert(newAssessments);
  } else {
    await supabase
      .from('patient_assessments')
      .update({ patient_id: targetPatientId })
      .eq('patient_id', sourcePatientId);
  }
};

/**
 * Get available tenants for transfer (excluding source tenant)
 */
export const getAvailableTenantsForTransfer = async (sourcePatientId: string) => {
  // Get source patient's tenant
  const { data: sourcePatient } = await supabase
    .from('patients')
    .select('tenant_id')
    .eq('id', sourcePatientId)
    .single();

  // Get all tenants except the source tenant
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, name, subdomain')
    .neq('id', sourcePatient?.tenant_id || '')
    .eq('tenant_type', 'institution') // Only regular tenants, not simulations
    .order('name');

  if (error) {
    console.error('Error fetching tenants:', error);
    return [];
  }

  return tenants || [];
};

/**
 * Check if patient can be transferred (permissions, etc.)
 */
export const canTransferPatient = async (patientId: string): Promise<{ canTransfer: boolean; reason?: string }> => {
  try {
    // Check if patient exists
    const { data: patient, error } = await supabase
      .from('patients')
      .select('id, tenant_id')
      .eq('id', patientId)
      .single();

    if (error || !patient) {
      return { canTransfer: false, reason: 'Patient not found' };
    }

    // Check user permissions (basic check - extend as needed)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { canTransfer: false, reason: 'User not authenticated' };
    }

    // Add additional permission checks here as needed
    // For example, check if user has admin role, or belongs to source tenant, etc.

    return { canTransfer: true };
  } catch (error) {
    return { canTransfer: false, reason: 'Permission check failed' };
  }
};