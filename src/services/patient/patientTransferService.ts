import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';

export interface PatientTransferOptions {
  sourcePatientId: string;
  targetTenantId: string;
  preserveOriginal?: boolean;
  transferNotes?: boolean;
  transferVitals?: boolean;
  transferMedications?: boolean;
  transferAssessments?: boolean;
  transferHandoverNotes?: boolean;
  transferAlerts?: boolean;
  transferBBITEntries?: boolean;
  transferBowelRecords?: boolean;
  transferWoundCare?: boolean;
  transferDoctorsOrders?: boolean;
  transferAdmissionRecords?: boolean;
  transferAdvancedDirectives?: boolean;
  transferHacmap?: boolean;
  transferIntakeOutput?: boolean;
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
    transferAssessments = true,
    transferHandoverNotes = true,
    transferAlerts = true,
    transferBBITEntries = true,
    transferBowelRecords = true,
    transferWoundCare = true,
    transferDoctorsOrders = true,
    transferHacmap = true,
    transferIntakeOutput = true,
    newPatientId
  } = options;

  try {
    secureLogger.debug('🚀 Transfer patient:', sourcePatientId, 'to', targetTenantId);
    secureLogger.debug('🔍 sourcePatientId type:', typeof sourcePatientId, 'value:', JSON.stringify(sourcePatientId));

    // Determine if sourcePatientId is a UUID or a patient_id string
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourcePatientId);
    secureLogger.debug('🔍 Is UUID?', isUUID);
    
    let patientIdString: string;
    
    if (isUUID) {
      // sourcePatientId is a UUID, get the patient_id string
      secureLogger.debug('🔍 Looking up patient by UUID:', sourcePatientId);
      const { data: patient, error: lookupError } = await supabase
        .from('patients')
        .select('patient_id, first_name, last_name')
        .eq('id', sourcePatientId)
        .single();
      
      secureLogger.debug('🔍 Patient lookup result:', { patient, lookupError });
      
      if (!patient) {
        throw new Error('Patient not found');
      }
      
      patientIdString = patient.patient_id;
      secureLogger.debug('🔍 Found patient_id string:', patientIdString);
    } else {
      // sourcePatientId is already a patient_id string
      patientIdString = sourcePatientId;
      secureLogger.debug('🔍 Using sourcePatientId as patient_id string:', patientIdString);
    }
    
    secureLogger.debug('✅ Using patient_id string:', patientIdString);

    if (preserveOriginal) {
      secureLogger.debug('📝 Calling duplicate_patient_to_tenant with params:', {
        p_source_patient_id: patientIdString,
        p_target_tenant_id: targetTenantId,
        p_new_patient_id: newPatientId || null,
        p_include_vitals: transferVitals,
        p_include_medications: transferMedications,
        p_include_assessments: transferAssessments,
        p_include_handover_notes: transferHandoverNotes,
        p_include_alerts: transferAlerts,
        p_include_diabetic_records: transferBBITEntries,
        p_include_bowel_records: transferBowelRecords,
        p_include_wound_care: transferWoundCare,
        p_include_doctors_orders: transferDoctorsOrders,
        p_include_hacmap: transferHacmap,
        p_include_intake_output: transferIntakeOutput
      });

      const { data, error } = await supabase
        .rpc('duplicate_patient_to_tenant', {
          p_source_patient_id: patientIdString,
          p_target_tenant_id: targetTenantId,
          p_new_patient_id: newPatientId || null,
          p_include_vitals: transferVitals,
          p_include_medications: transferMedications,
          p_include_assessments: transferAssessments,
          p_include_handover_notes: transferHandoverNotes,
          p_include_alerts: transferAlerts,
          p_include_diabetic_records: transferBBITEntries,
          p_include_bowel_records: transferBowelRecords,
          p_include_wound_care: transferWoundCare,
          p_include_doctors_orders: transferDoctorsOrders,
          p_include_hacmap: transferHacmap,
          p_include_intake_output: transferIntakeOutput
        });

      if (error) {
        secureLogger.error('SQL error:', error);
        return {
          success: false,
          message: 'Failed to duplicate patient',
          error: error.message
        };
      }

      secureLogger.debug('Raw RPC response:', { data, type: typeof data, isArray: Array.isArray(data) });
      
      // When RETURNS TABLE is used, Supabase returns an array of rows
      // data is already the array: [{ success: true, new_patient_id: 'uuid', ... }]
      const result = Array.isArray(data) ? data[0] : data;
      secureLogger.debug('Parsed result:', result);

      if (!result || !result.success) {
        return {
          success: false,
          message: result?.message || 'Patient duplication failed',
          error: result?.message
        };
      }

      // Check if patient was actually created
      if (!result.new_patient_id) {
        secureLogger.error('⚠️ WARNING: Function returned success but new_patient_id is null!');
        secureLogger.error('This indicates the database function may have an issue or is returning the wrong format.');
        secureLogger.error('Result:', result);
      }

      return {
        success: true,
        newPatientId: result.new_patient_id,
        message: result.message || `Patient duplicated! ID: ${result.new_patient_identifier}`,
        recordsCopied: result.records_created
      };
    }

    return {
      success: false,
      message: 'Move not implemented yet'
    };
  } catch (error) {
    secureLogger.error('Error:', error);
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
      secureLogger.error('SQL error:', error);
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
    secureLogger.error('Error:', error);
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
