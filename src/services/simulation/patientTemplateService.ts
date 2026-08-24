/**
 * Patient Template Service — CRUD + snapshot + copy-into-simulation-template
 * for the Patient Templates library. Mirrors templateService.ts's shape.
 */
import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';
import type {
  PatientTemplate,
  CreatePatientTemplateParams,
  PatientTemplateFunctionResult,
} from '../../features/simulation/types/patientTemplate';

export async function createPatientTemplate(
  params: CreatePatientTemplateParams
): Promise<PatientTemplateFunctionResult> {
  try {
    const { data, error } = await supabase.rpc('create_patient_template', {
      p_name: params.name,
      p_description: params.description || null,
      p_primary_categories: params.primary_categories || null,
    });

    if (error) throw error;
    return data as PatientTemplateFunctionResult;
  } catch (error: any) {
    secureLogger.error('Error creating patient template:', error);
    throw error;
  }
}

export async function getPatientTemplates(): Promise<PatientTemplate[]> {
  try {
    const { data, error } = await supabase
      .from('patient_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as PatientTemplate[];
  } catch (error: any) {
    secureLogger.error('Error fetching patient templates:', error);
    throw error;
  }
}

export async function deletePatientTemplate(patientTemplateId: string): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('delete_patient_template', {
      p_patient_template_id: patientTemplateId,
    });

    if (error) throw error;
    if (data && (data as any).success === false) {
      throw new Error((data as any).message || 'Failed to delete patient template');
    }
  } catch (error: any) {
    secureLogger.error('Error deleting patient template:', error);
    throw error;
  }
}

export async function savePatientTemplateSnapshot(
  patientTemplateId: string
): Promise<PatientTemplateFunctionResult> {
  try {
    const { data, error } = await supabase.rpc('save_patient_template_snapshot', {
      p_patient_template_id: patientTemplateId,
    });

    if (error) throw error;
    return data as PatientTemplateFunctionResult;
  } catch (error: any) {
    secureLogger.error('Error saving patient template snapshot:', error);
    throw error;
  }
}

/**
 * Copies a patient template's single patient (+ all clinical data) into a
 * simulation template's tenant. Always mints a fresh patient id/barcode —
 * copy-once, no ongoing sync back to the patient template.
 */
export async function addPatientTemplateToSimulationTemplate(
  patientTemplateId: string,
  simulationTemplateId: string
): Promise<PatientTemplateFunctionResult> {
  try {
    const { data, error } = await supabase.rpc('add_patient_template_to_simulation_template', {
      p_patient_template_id: patientTemplateId,
      p_simulation_template_id: simulationTemplateId,
    });

    if (error) throw error;
    return data as PatientTemplateFunctionResult;
  } catch (error: any) {
    secureLogger.error('Error adding patient template to simulation template:', error);
    throw error;
  }
}
