import { supabase } from './supabase';
import { Patient } from '../types';
import { logAction } from './auditService';

/**
 * Patient Transfer Service - Updated to use SQL functions
 * Handles moving and duplicating patients between tenants using database functions
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
  recordsCopied?: any;
}

/**
 * Move or duplicate a patient to another tenant using SQL functions
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
    console.log(`🔄 ${preserveOriginal ? 'Duplicating' : 'Moving'} patient ${sourcePatientId} to tenant ${targetTenantId}`);
    console.log(`📋 Transfer options:`, { transferVitals, transferMedications, transferNotes, transferAssessments });

    if (preserveOriginal) {
      // Use SQL function for duplication - more reliable
      console.log('🔧 Calling duplicate_patient_to_tenant SQL function...');
      
      const { data, error } = await supabase
        .rpc('duplicate_patient_to_tenant', {
          p_source_patient_id: sourcePatientId,
          p_target_tenant_id: targetTenantId,
          p_new_patient_id: newPatientId || null,
          p_include_vitals: transferVitals,
          p_include_medications: transferMedications,
          p_include_notes: transferNotes,
          p_include_assessments: transferAssessments
        });

      if (error) {
        console.error('❌ SQL function error:', error);
        return {
          success: false,
          message: 'Failed to duplicate patient',
          error: error.message
        };
      }

      console.log('✅ SQL function response:', data);
      
      if (!data || data.length === 0) {
        return {
          success: false,
          message: 'No data returned from duplication function',
          error: 'Empty response from database function'
        };
      }

      const result = data[0];
      console.log('📊 Duplication result:', result);

      // Log the action
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await logAction(
          user,
          'duplicate_patient',
          result.new_patient_id,
          'patient',
          {
            sourcePatientId,
            targetTenantId,
            newPatientId: result.new_patient_id,
            recordsCopied: result.records_created
          }
        );
      } catch (logError) {
        console.warn('⚠️ Failed to log action:', logError);
      }

      return {
        success: true,
        newPatientId: result.new_patient_id,
        message: `Patient duplicated successfully! New ID: ${result.new_patient_identifier}`,
        recordsCopied: result.records_created
      };
    } else {
      // Use SQL function for moving
      console.log('🔧 Calling move_patient_to_tenant SQL function...');
      
      const { data, error } = await supabase
        .rpc('move_patient_to_tenant', {
          p_patient_id: sourcePatientId,
          p_target_tenant_id: targetTenantId
        });

      if (error) {
        console.error('❌ SQL function error:', error);
        return {
          success: false,
          message: 'Failed to move patient',
          error: error.message
        };
      }

      console.log('✅ Move result:', data);

      // Log the action
      try {
        const { data: { user } } = await supabase.auth.getUser();
        await logAction(
          user,
          'move_patient',
          sourcePatientId,
          'patient',
          {
            sourcePatientId,
            targetTenantId
          }
        );
      } catch (logError) {
        console.warn('⚠️ Failed to log action:', logError);
      }

      return {
        success: true,
        newPatientId: sourcePatientId, // Same ID when moving
        message: 'Patient moved successfully'
      };
    }
  } catch (error) {
    console.error('💥 Transfer error:', error);
    return {
      success: false,
      message: 'Transfer failed due to unexpected error',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Get available tenants for transfer (excluding source patient's tenant)
 */
export const getAvailableTenantsForTransfer = async (sourcePatientId: string) => {
  try {
    const { data, error } = await supabase
      .rpc('get_available_tenants_for_transfer', {
        p_source_patient_id: sourcePatientId
      });

    if (error) {
      console.error('Error getting available tenants:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error getting tenants:', error);
    return [];
  }
};

/**
 * Check if a patient can be transferred
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
      return {
        canTransfer: false,
        reason: 'Patient not found'
      };
    }

    // Check if there are available target tenants
    const availableTenants = await getAvailableTenantsForTransfer(patientId);
    
    if (availableTenants.length === 0) {
      return {
        canTransfer: false,
        reason: 'No available target tenants'
      };
    }

    return {
      canTransfer: true
    };
  } catch (error) {
    return {
      canTransfer: false,
      reason: 'Error checking transfer eligibility'
    };
  }
};

/**
 * Test the SQL functions are working
 */
export const testSQLFunctions = async () => {
  try {
    console.log('🧪 Testing SQL functions...');
    
    // Test get_available_tenants_for_transfer
    const { data: testTenants, error: tenantError } = await supabase
      .rpc('get_available_tenants_for_transfer', {
        p_source_patient_id: '00000000-0000-0000-0000-000000000000' // Dummy ID
      });
    
    if (tenantError) {
      console.error('❌ get_available_tenants_for_transfer failed:', tenantError);
      return false;
    }
    
    console.log('✅ get_available_tenants_for_transfer works, returned:', testTenants?.length || 0, 'tenants');
    return true;
  } catch (error) {
    console.error('❌ SQL function test failed:', error);
    return false;
  }
};