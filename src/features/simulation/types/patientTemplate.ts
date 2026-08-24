/**
 * Types for the Patient Templates library — reusable single-patient templates
 * that can be copied into simulation templates. See simulation.ts for the
 * (unrelated) simulation template types this mirrors.
 */
import type { SimulationTemplateStatus } from './simulation';

export interface PatientTemplate {
  id: string;
  name: string;
  description: string | null;
  tenant_id: string;
  status: SimulationTemplateStatus;
  snapshot_data: any;
  snapshot_taken_at: string | null;
  primary_categories: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePatientTemplateParams {
  name: string;
  description?: string;
  primary_categories?: string[];
}

export interface PatientTemplateFunctionResult {
  success: boolean;
  message?: string;
  patient_template_id?: string;
  tenant_id?: string;
  [key: string]: any;
}
