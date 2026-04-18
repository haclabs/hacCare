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
 * Delete a template
 */
export async function deleteSimulationTemplate(templateId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('simulation_templates')
      .delete()
      .eq('id', templateId);

    if (error) throw error;
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
 * Automatically archives the previous version for history.
 */
export async function saveTemplateSnapshot(
  templateId: string,
  changeNotes?: string
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

    if (data.success && (data as any).snapshot_data) {
      try {
        secureLogger.debug('Archiving template version...');
        await supabase.rpc('save_template_version', {
          p_template_id: cleanId,
          p_new_snapshot: (data as any).snapshot_data,
          p_change_notes: changeNotes || 'Snapshot saved',
          p_user_id: null,
        });
        secureLogger.debug('Version archived successfully');
      } catch (versionError) {
        secureLogger.error('Failed to archive version (non-critical):', versionError);
      }
    }

    return data as SimulationFunctionResult;
  } catch (error: any) {
    secureLogger.error('Error saving template snapshot:', error);
    throw error;
  }
}

/**
 * Save template snapshot and archive a named version.
 */
export async function saveTemplateSnapshotWithVersion(
  templateId: string,
  changeNotes?: string
): Promise<SimulationFunctionResult> {
  try {
    const cleanId = templateId.trim();
    secureLogger.debug('Saving template with version archiving:', cleanId);

    const snapshotResult = await saveTemplateSnapshot(cleanId);
    if (!snapshotResult.success) {
      throw new Error('Failed to save template snapshot');
    }

    const { data, error } = await supabase.rpc('save_template_version', {
      p_template_id: cleanId,
      p_new_snapshot: (snapshotResult as any).snapshot_data,
      p_change_notes: changeNotes || null,
      p_user_id: null,
    });

    if (error) {
      secureLogger.error('RPC Error archiving version:', error);
      throw error;
    }

    secureLogger.debug('Template version archived:', data);
    return data as SimulationFunctionResult;
  } catch (error: any) {
    secureLogger.error('Error saving template with version:', error);
    throw error;
  }
}

/**
 * Get template version history
 */
export async function getTemplateVersions(templateId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('simulation_template_versions')
      .select(`
        *,
        user_profiles!saved_by(id, email, first_name, last_name)
      `)
      .eq('template_id', templateId)
      .order('version', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    secureLogger.error('Error fetching template versions:', error);
    throw error;
  }
}

/**
 * Compare two template versions
 */
export async function compareTemplateVersions(
  templateId: string,
  versionOld: number,
  versionNew: number
): Promise<any> {
  try {
    const { data, error } = await supabase.rpc('compare_template_versions', {
      p_template_id: templateId,
      p_version_old: versionOld,
      p_version_new: versionNew,
    });

    if (error) throw error;
    return data;
  } catch (error: any) {
    secureLogger.error('Error comparing template versions:', error);
    throw error;
  }
}

/**
 * Restore a previous template version
 */
export async function restoreTemplateVersion(
  templateId: string,
  versionToRestore: number,
  restoreNotes?: string
): Promise<SimulationFunctionResult> {
  try {
    const { data, error } = await supabase.rpc('restore_template_version', {
      p_template_id: templateId,
      p_version_to_restore: versionToRestore,
      p_user_id: null,
      p_restore_notes: restoreNotes || null,
    });

    if (error) throw error;
    return data as SimulationFunctionResult;
  } catch (error: any) {
    secureLogger.error('Error restoring template version:', error);
    throw error;
  }
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
