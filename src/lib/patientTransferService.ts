import { supabase } from './supabase';
import { Patient } from '../types';

export interface PatientTransferOptions {
  sourcePatientId: string;
  targetTenantId: string;
  preserveOriginal?: boolean;
  transferNotes?: boolean;
  transferVitals?: boolean;
  transferMedications?: boolean;
  transferAssessments?: boolean;
  newPatientId?: string;
}

export interface PatientTransferResult {
  success: boolean;
  newPatientId?: string;
  message: string;
  error?: string;
  recordsCopied?: any;
}

export const transferPatient = async (options: PatientTransferOptions): Promise<PatientTransferResult> => {
  const {
    sourcePatientId,
    targetTenantId,
    preserveOriginal = false,
    transferVitals = true,
    transferMedications = true,
    transferNotes = true,
    transferAssessments = true,
    newPatientId
  } = options;

  try {
    console.log('🚀 Transfer patient:', sourcePatientId, 'to', targetTenantId);
    console.log('🔍 sourcePatientId type:', typeof sourcePatientId, 'value:', JSON.stringify(sourcePatientId));

    // Determine if sourcePatientId is a UUID or a patient_id string
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourcePatientId);
    console.log('🔍 Is UUID?', isUUID);
    
    let patientIdString: string;
    
    if (isUUID) {
      // sourcePatientId is a UUID, get the patient_id string
      console.log('🔍 Looking up patient by UUID:', sourcePatientId);
      const { data: patient, error: lookupError } = await supabase
        .from('patients')
        .select('patient_id, first_name, last_name')
        .eq('id', sourcePatientId)
        .single();
      
      console.log('🔍 Patient lookup result:', { patient, lookupError });
      
      if (!patient) {
        throw new Error('Patient not found');
      }
      
      patientIdString = patient.patient_id;
      console.log('🔍 Found patient_id string:', patientIdString);
    } else {
      // sourcePatientId is already a patient_id string
      patientIdString = sourcePatientId;
      console.log('🔍 Using sourcePatientId as patient_id string:', patientIdString);
    }
    
    console.log('✅ Using patient_id string:', patientIdString);

    if (preserveOriginal) {
      console.log('📝 Calling duplicate_patient_to_tenant with params:', {
        p_source_patient_id: patientIdString,
        p_target_tenant_id: targetTenantId,
        p_new_patient_id: newPatientId || null,
        p_include_vitals: transferVitals,
        p_include_medications: transferMedications,
        p_include_notes: transferNotes,
        p_include_assessments: transferAssessments
      });

      const { data, error } = await supabase
        .rpc('duplicate_patient_to_tenant', {
          p_source_patient_id: patientIdString,
          p_target_tenant_id: targetTenantId,
          p_new_patient_id: newPatientId || null,
          p_include_vitals: transferVitals,
          p_include_medications: transferMedications,
          p_include_notes: transferNotes,
          p_include_assessments: transferAssessments
        });

      if (error) {
        console.error('SQL error:', error);
        return {
          success: false,
          message: 'Failed to duplicate patient',
          error: error.message
        };
      }

      const result = data?.[0];
      console.log('Success:', result);

      return {
        success: true,
        newPatientId: result?.new_patient_id,
        message: `Patient duplicated! ID: ${result?.new_patient_identifier}`,
        recordsCopied: result?.records_created
      };
    }

    return {
      success: false,
      message: 'Move not implemented yet'
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      success: false,
      message: 'Transfer failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const getAvailableTenantsForTransfer = async (sourcePatientId: string) => {
  try {
    // Determine if sourcePatientId is a UUID or a patient_id string
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourcePatientId);
    
    let patientIdString: string;
    let currentTenantId: string;
    
    if (isUUID) {
      // sourcePatientId is a UUID, get the patient_id string
      const { data: patient } = await supabase
        .from('patients')
        .select('patient_id, tenant_id')
        .eq('id', sourcePatientId)
        .single();
      
      if (!patient) {
        throw new Error('Patient not found');
      }
      
      patientIdString = patient.patient_id;
      currentTenantId = patient.tenant_id;
    } else {
      // sourcePatientId is already a patient_id string
      patientIdString = sourcePatientId;
      
      // Get tenant_id for fallback
      const { data: patient } = await supabase
        .from('patients')
        .select('tenant_id')
        .eq('patient_id', sourcePatientId)
        .single();
      
      currentTenantId = patient?.tenant_id || '';
    }

    const { data, error } = await supabase
      .rpc('get_available_tenants_for_transfer', {
        p_source_patient_id: patientIdString
      });

    if (error) {
      console.error('SQL error:', error);
      // Fallback using current tenant ID
      const { data: fallback } = await supabase
        .from('tenants')
        .select('id, name, subdomain')
        .neq('id', currentTenantId);
      
      return fallback?.map(t => ({
        id: t.id,
        name: t.name,
        subdomain: t.subdomain
      })) || [];
    }

    // Map SQL function response to expected format
    return data?.map((t: any) => ({
      id: t.tenant_id,
      name: t.tenant_name,
      subdomain: t.subdomain
    })) || [];
  } catch (error) {
    console.error('Error:', error);
    return [];
  }
};

export const canTransferPatient = async (patientId: string): Promise<{ canTransfer: boolean; reason?: string }> => {
  try {
    const availableTenants = await getAvailableTenantsForTransfer(patientId);
    
    if (availableTenants.length === 0) {
      return {
        canTransfer: false,
        reason: 'No available target tenants'
      };
    }

    return { canTransfer: true };
  } catch (error) {
    return {
      canTransfer: false,
      reason: 'Error checking transfer eligibility'
    };
  }
};
