/**
 * Simulation Lifecycle Service — launch, start, reset, complete, delete.
 */

import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';
import type {
  SimulationActiveWithDetails,
  LaunchSimulationParams,
  SimulationFunctionResult,
  SimulationActiveFilters,
} from '../../features/simulation/types/simulation';

// ============================================================================
// LAUNCH & QUERIES
// ============================================================================

/**
 * Launch a new simulation from a template
 */
export async function launchSimulation(
  params: LaunchSimulationParams
): Promise<SimulationFunctionResult> {
  try {
    if (!params.name?.trim()) {
      throw new Error('A simulation name is required');
    }

    secureLogger.debug('Launching simulation with params:', params);

    const { data, error } = await supabase.rpc('launch_simulation', {
      p_template_id: params.template_id,
      p_name: params.name.trim(),
      p_duration_minutes: params.duration_minutes,
      p_participant_user_ids: params.participant_user_ids,
      p_participant_roles: params.participant_roles || null,
      p_primary_categories: params.primary_categories || [],
      p_sub_categories: params.sub_categories || [],
      p_state_id: params.state_id || null,
    });

    if (error) throw error;
    secureLogger.debug('Simulation launched successfully:', data);
    return data as SimulationFunctionResult;
  } catch (error: unknown) {
    secureLogger.error('Error launching simulation:', error);
    throw error;
  }
}

/**
 * Get all active simulations (with optional filters)
 */
export async function getActiveSimulations(
  filters?: SimulationActiveFilters
): Promise<SimulationActiveWithDetails[]> {
  try {
    let query = supabase
      .from('simulation_active')
      .select(`
        *,
        template:simulation_templates(id, name, description, snapshot_version),
        current_state:simulation_template_states(id, label),
        tenant:tenants(id, name),
        participants:simulation_participants(id, user_id, role, granted_at)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }
    if (filters?.template_id) {
      query = query.eq('template_id', filters.template_id);
    }
    if (filters?.created_by) {
      query = query.eq('created_by', filters.created_by);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Fetch user profiles for all participants in a single query
    const userIds = new Set<string>();
    (data || []).forEach((sim: any) => {
      sim.participants?.forEach((p: any) => { if (p.user_id) userIds.add(p.user_id); });
    });

    let userProfiles: Record<string, any> = {};
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name')
        .in('id', Array.from(userIds));

      if (profiles) {
        profiles.forEach((p: any) => { userProfiles[p.id] = p; });
      }
    }

    return (data || []).map((sim: any) => {
      const endsAt = new Date(sim.ends_at);
      const now = new Date();
      const timeRemainingMinutes = Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 60000));

      const launchedVersion = sim.template_snapshot_version_launched || sim.template_snapshot_version || 1;
      const syncedVersion = sim.template_snapshot_version_synced || launchedVersion;
      const currentTemplateVersion = sim.template?.snapshot_version || 1;

      return {
        ...sim,
        participants: sim.participants?.map((p: any) => ({
          ...p,
          user_profiles: userProfiles[p.user_id] || null,
        })) || [],
        time_remaining_minutes: timeRemainingMinutes,
        is_expired: timeRemainingMinutes === 0 && sim.status === 'running',
        participant_count: sim.participants?.length || 0,
        template_updated: currentTemplateVersion > syncedVersion,
        template_current_version: currentTemplateVersion,
        template_running_version: syncedVersion,
      };
    }) as SimulationActiveWithDetails[];
  } catch (error: unknown) {
    secureLogger.error('Error fetching active simulations:', error);
    throw error;
  }
}

// ============================================================================
// STATUS & RESET
// ============================================================================

/**
 * Start (Ready to Start → running). The RPC first shifts the chart's timestamps forward by the time
 * the simulation waited since launch/reset, so the group starts on a chart that is current.
 */
export async function startSimulation(simulationId: string): Promise<void> {
  const { error } = await supabase.rpc('start_simulation', { p_simulation_id: simulationId });
  if (error) {
    secureLogger.error('Error starting simulation:', error);
    throw error;
  }
}

/**
 * Rename a simulation. A database trigger keeps the tenant name in step.
 */
export async function renameSimulation(simulationId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('A simulation name is required');

  const { data, error } = await supabase
    .from('simulation_active')
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq('id', simulationId)
    .select('id');

  if (error) {
    secureLogger.error('Error renaming simulation:', error);
    throw error;
  }
  // RLS filters out rows the user may not update instead of raising an error.
  if (!data || data.length === 0) {
    throw new Error('You do not have permission to rename this simulation');
  }
}

/**
 * Reset simulation for the next session (preserves printed barcodes).
 * Optional stateId resets into a named template state instead of the
 * template's default snapshot.
 */
export async function resetSimulationForNextSession(
  simulationId: string,
  stateId?: string | null
): Promise<SimulationFunctionResult> {
  try {
    const { data: simulation, error: simError } = await supabase
      .from('simulation_active')
      .select('tenant_id, template_id')
      .eq('id', simulationId)
      .single();

    if (simError) throw simError;
    if (!simulation) throw new Error('Simulation not found');

    const { data: template, error: templateError } = await supabase
      .from('simulation_templates')
      .select('snapshot_data')
      .eq('id', simulation.template_id)
      .single();

    if (templateError) throw templateError;
    if (!template?.snapshot_data) throw new Error('Template snapshot not found');

    const { data, error } = await supabase.rpc('reset_simulation_for_next_session', {
      p_simulation_id: simulationId,
      p_state_id: stateId || null,
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Reset operation failed');

    secureLogger.debug('Reset completed with barcode preservation:', data);
    return data as SimulationFunctionResult;
  } catch (error: unknown) {
    secureLogger.error('Error resetting simulation:', error);
    throw error;
  }
}

/**
 * Reset simulation and sync to the latest template changes.
 * Requires patient list to be unchanged (no adds/removes). Optional stateId
 * syncs from a named template state instead of the template's default snapshot.
 */
export async function resetSimulationWithTemplateUpdates(
  simulationId: string,
  stateId?: string | null
): Promise<SimulationFunctionResult> {
  try {
    secureLogger.debug('Resetting simulation with template updates:', simulationId);

    const { data, error } = await supabase.rpc('reset_simulation_with_template_updates', {
      p_simulation_id: simulationId,
      p_state_id: stateId || null,
    });

    if (error) {
      if (error.message?.includes('PATIENT_LIST_CHANGED')) {
        throw new Error('Patient list in template has changed. Delete and relaunch simulation to get new barcodes.');
      }
      throw error;
    }

    if (!data) throw new Error('No response from reset function');
    if (!data.success) throw new Error(data.error || 'Reset operation failed');

    secureLogger.debug('Reset with template updates completed:', data);
    return data as SimulationFunctionResult;
  } catch (error: unknown) {
    secureLogger.error('Error resetting simulation with template updates:', error);
    throw error;
  }
}

/**
 * Complete simulation and move to history
 */
export async function completeSimulation(
  simulationId: string,
  activities: any[] = [],
  instructorName?: string
): Promise<SimulationFunctionResult> {
  try {
    const { data, error } = await supabase.rpc('complete_simulation', {
      p_simulation_id: simulationId,
      p_activities: activities,
      p_instructor_name: instructorName || null,
    });

    if (error) throw error;
    return data as SimulationFunctionResult;
  } catch (error: unknown) {
    secureLogger.error('Error completing simulation:', error);
    throw error;
  }
}

/**
 * Delete simulation (with optional archiving to history)
 */
export async function deleteSimulation(
  simulationId: string,
  archiveToHistory: boolean = true
): Promise<SimulationFunctionResult> {
  try {
    const { data, error } = await supabase.rpc('delete_simulation', {
      p_simulation_id: simulationId,
      p_archive_to_history: archiveToHistory,
    });

    if (error) throw error;
    return data as SimulationFunctionResult;
  } catch (error: unknown) {
    secureLogger.error('Error deleting simulation:', error);
    throw error;
  }
}
