/**
 * Template Service — CRUD, snapshots, versioning, and comparison for simulation templates.
 */

import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';
import type {
  SimulationTemplate,
  SimulationTemplateWithDetails,
  CreateTemplateParams,
  SimulationFunctionResult,
  SimulationTemplateFilters,
} from '../../features/simulation/types/simulation';

// ============================================================================
// TEMPLATE CRUD
// ============================================================================

/**
 * Create a new simulation template
 */
export async function createSimulationTemplate(
  params: CreateTemplateParams
): Promise<SimulationFunctionResult> {
  try {
    const { data, error } = await supabase.rpc('create_simulation_template', {
      p_name: params.name,
      p_description: params.description || null,
      p_default_duration_minutes: params.default_duration_minutes || 120,
      p_primary_categories: params.primary_categories || null,
    });

    if (error) throw error;
    return data as SimulationFunctionResult;
  } catch (error: any) {
    secureLogger.error('Error creating simulation template:', error);
    throw error;
  }
}

/**
 * Get all simulation templates
 */
export async function getSimulationTemplates(
  filters?: SimulationTemplateFilters
): Promise<SimulationTemplateWithDetails[]> {
  try {
    let query = supabase
      .from('simulation_templates')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    if (filters?.created_by) {
      query = query.eq('created_by', filters.created_by);
    }
    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as SimulationTemplateWithDetails[];
  } catch (error: any) {
    secureLogger.error('Error fetching simulation templates:', error);
    throw error;
  }
}

/**
 * Get a single template by ID with full details
 */
export async function getSimulationTemplate(
  templateId: string
): Promise<SimulationTemplateWithDetails | null> {
  try {
    const { data, error } = await supabase
      .from('simulation_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) throw error;
    return data as SimulationTemplateWithDetails;
  } catch (error: any) {
    secureLogger.error('Error fetching simulation template:', error);
    return null;
  }
}

/**
 * Update template details
 */
export async function updateSimulationTemplate(
  templateId: string,
  updates: Partial<Pick<SimulationTemplate, 'name' | 'description' | 'default_duration_minutes' | 'status'>>
): Promise<void> {
  try {
    const { error } = await supabase
      .from('simulation_templates')
      .update(updates)
      .eq('id', templateId);

    if (error) throw error;
  } catch (error: any) {
    secureLogger.error('Error updating simulation template:', error);
    throw error;
  }
}

/**
 * Update the folder assignment for a template.
 * Pass null to remove a template from its folder (moves to Uncategorized).
 */
export async function updateTemplateFolder(
  templateId: string,
  folder: string | null
): Promise<void> {
  try {
    const { error } = await supabase
      .from('simulation_templates')
      .update({ folder })
      .eq('id', templateId);

    if (error) throw error;
  } catch (error: any) {
    secureLogger.error('Error updating template folder:', error);
    throw error;
  }
}

/**
 * Delete a template — also deletes its backing tenant (patients, meds, notes,
 * everything). A raw `DELETE FROM simulation_templates` alone leaves the tenant
 * orphaned forever since patients.tenant_id is ON DELETE SET NULL, not CASCADE.
 */
export async function deleteSimulationTemplate(templateId: string): Promise<void> {
  try {
    const { data, error } = await supabase.rpc('delete_simulation_template', {
      p_template_id: templateId,
    });

    if (error) throw error;
    if (data && (data as any).success === false) {
      throw new Error((data as any).message || 'Failed to delete template');
    }
  } catch (error: any) {
    secureLogger.error('Error deleting simulation template:', error);
    throw error;
  }
}

// ============================================================================
// SNAPSHOTS & VERSIONING
// ============================================================================

/**
 * Save a frozen snapshot of the template's live tenant data (V2 config-driven).
 * This overwrites the template's default snapshot_data.
 */
export async function saveTemplateSnapshot(
  templateId: string
): Promise<SimulationFunctionResult> {
  try {
    const cleanId = templateId.trim();
    secureLogger.debug('Calling save_template_snapshot_v2 with ID:', cleanId);

    const { data, error } = await supabase.rpc('save_template_snapshot_v2', {
      p_template_id: cleanId,
    });

    if (error) {
      secureLogger.error('RPC Error details:', error);
      throw error;
    }

    secureLogger.debug('Snapshot saved (V2):', data);
    return data as SimulationFunctionResult;
  } catch (error: any) {
    secureLogger.error('Error saving template snapshot:', error);
    throw error;
  }
}

/**
 * Save the template tenant's current data as a new named state (e.g. "Week 2"),
 * independent of the template's default snapshot_data.
 */
export async function saveTemplateState(
  templateId: string,
  label: string,
  changelogNote?: string
): Promise<SimulationFunctionResult> {
  try {
    const { data, error } = await supabase.rpc('save_template_state', {
      p_template_id: templateId.trim(),
      p_label: label.trim(),
      p_changelog_note: changelogNote || null,
    });

    if (error) throw error;
    return data as SimulationFunctionResult;
  } catch (error: any) {
    secureLogger.error('Error saving template state:', error);
    throw error;
  }
}

/**
 * Get all named states for a template, oldest first.
 */
export async function getTemplateStates(templateId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('simulation_template_states')
      .select('id, label, changelog_note, sort_order, created_at, created_by')
      .eq('template_id', templateId)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    secureLogger.error('Error fetching template states:', error);
    throw error;
  }
}

/**
 * Rename a template state's label and/or changelog note.
 */
export async function updateTemplateState(
  stateId: string,
  updates: { label?: string; changelog_note?: string }
): Promise<void> {
  const { error } = await supabase
    .from('simulation_template_states')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', stateId);

  if (error) throw error;
}

/**
 * Delete a template state.
 */
export async function deleteTemplateState(stateId: string): Promise<void> {
  const { error } = await supabase
    .from('simulation_template_states')
    .delete()
    .eq('id', stateId);

  if (error) throw error;
}

/**
 * Compare simulation's patient list with its template
 */
export async function compareSimulationTemplatePatients(simulationId: string): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('compare_simulation_template_patients', {
      p_simulation_id: simulationId,
    });

    if (error) throw error;
    return data;
  } catch (error: any) {
    secureLogger.error('Error comparing patient lists:', error);
    throw error;
  }
}

/**
 * Compare active simulation data vs current template
 */
export async function compareSimulationVsTemplate(simulationId: string): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('compare_simulation_vs_template', {
      p_simulation_id: simulationId,
    });

    if (error) throw error;
    return data;
  } catch (error: any) {
    secureLogger.error('Error comparing simulation vs template:', error);
    throw error;
  }
}
