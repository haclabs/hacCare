/**
 * Simulation Lifecycle Service — launch, run, reset, complete, participants, assignments.
 */

import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';
import type {
  SimulationActive,
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
    secureLogger.debug('Launching simulation with params:', params);

    const { data, error } = await supabase.rpc('launch_simulation', {
      p_template_id: params.template_id,
      p_name: params.name,
      p_duration_minutes: params.duration_minutes,
      p_participant_user_ids: params.participant_user_ids,
      p_participant_roles: params.participant_roles || null,
      p_primary_categories: params.primary_categories || [],
      p_sub_categories: params.sub_categories || [],
    });

    if (error) throw error;
    secureLogger.debug('Simulation launched successfully:', data);
    return data as SimulationFunctionResult;
  } catch (error: any) {
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
  } catch (error: any) {
    secureLogger.error('Error fetching active simulations:', error);
    throw error;
  }
}

/**
 * Get a single active simulation by ID
 */
export async function getActiveSimulation(
  simulationId: string
): Promise<SimulationActiveWithDetails | null> {
  try {
    const { data, error } = await supabase
      .from('simulation_active')
      .select(`
        *,
        template:simulation_templates!simulation_active_template_id_fkey(id, name, description),
        tenant:tenants!simulation_active_tenant_id_fkey(id, name),
        participants:simulation_participants(id, user_id, role, granted_at, last_accessed_at)
      `)
      .eq('id', simulationId)
      .single();

    if (error) throw error;

    const endsAt = new Date(data.ends_at);
    const now = new Date();
    const timeRemainingMinutes = Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 60000));

    return {
      ...data,
      time_remaining_minutes: timeRemainingMinutes,
      is_expired: timeRemainingMinutes === 0 && data.status === 'running',
      participant_count: data.participants?.length || 0,
    } as SimulationActiveWithDetails;
  } catch (error: any) {
    secureLogger.error('Error fetching active simulation:', error);
    return null;
  }
}

/**
 * Get user's accessible simulations (for simulation-only users)
 */
export async function getUserAccessibleSimulations(): Promise<SimulationActiveWithDetails[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('simulation_active')
      .select(`
        *,
        template:simulation_templates!simulation_active_template_id_fkey(id, name, description),
        tenant:tenants!simulation_active_tenant_id_fkey(id, name),
        participants!inner(user_id)
      `)
      .eq('participants.user_id', user.id)
      .eq('status', 'running');

    if (error) throw error;
    return (data || []) as SimulationActiveWithDetails[];
  } catch (error: any) {
    secureLogger.error('Error fetching user accessible simulations:', error);
    return [];
  }
}

// ============================================================================
// STATUS & RESET
// ============================================================================

/**
 * Update simulation status
 */
export async function updateSimulationStatus(
  simulationId: string,
  status: SimulationActive['status']
): Promise<void> {
  try {
    const { error } = await supabase
      .from('simulation_active')
      .update({ status })
      .eq('id', simulationId);

    if (error) throw error;
  } catch (error: any) {
    secureLogger.error('Error updating simulation status:', error);
    throw error;
  }
}

/**
 * Reset simulation for the next session (preserves printed barcodes).
 */
export async function resetSimulationForNextSession(
  simulationId: string
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
    });

    if (error) throw error;
    if (!data.success) throw new Error(data.error || 'Reset operation failed');

    secureLogger.debug('Reset completed with barcode preservation:', data);
    return data as SimulationFunctionResult;
  } catch (error: any) {
    secureLogger.error('Error resetting simulation:', error);
    throw error;
  }
}

/**
 * Reset simulation to EXACT template snapshot (nuclear option — reprints required).
 */
export async function resetSimulationToTemplate(
  simulationId: string
): Promise<SimulationFunctionResult> {
  try {
    const { data, error } = await supabase.rpc('reset_simulation', {
      p_simulation_id: simulationId,
    });

    if (error) throw error;
    return data as SimulationFunctionResult;
  } catch (error: any) {
    secureLogger.error('Error resetting simulation to template:', error);
    throw error;
  }
}

/**
 * Alias for resetSimulationForNextSession.
 */
export async function resetSimulation(
  simulationId: string
): Promise<SimulationFunctionResult> {
  return resetSimulationForNextSession(simulationId);
}

/**
 * Reset simulation and sync to the latest template changes.
 * Requires patient list to be unchanged (no adds/removes).
 */
export async function resetSimulationWithTemplateUpdates(
  simulationId: string
): Promise<SimulationFunctionResult> {
  try {
    secureLogger.debug('Resetting simulation with template updates:', simulationId);

    const { data, error } = await supabase.rpc('reset_simulation_with_template_updates', {
      p_simulation_id: simulationId,
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
  } catch (error: any) {
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
  } catch (error: any) {
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
  } catch (error: any) {
    secureLogger.error('Error deleting simulation:', error);
    throw error;
  }
}

/**
 * Check for and expire any simulations that have passed their end time
 */
export async function checkExpiredSimulations(): Promise<SimulationFunctionResult> {
  try {
    const { data, error } = await supabase.rpc('check_expired_simulations');

    if (error) throw error;
    return data as SimulationFunctionResult;
  } catch (error: any) {
    secureLogger.error('Error checking expired simulations:', error);
    throw error;
  }
}

// ============================================================================
// PARTICIPANT MANAGEMENT
// ============================================================================

/**
 * Add participants to a simulation
 */
export async function addSimulationParticipants(
  simulationId: string,
  participants: Array<{ user_id: string; role: 'instructor' | 'student' }>
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const records = participants.map(p => ({
      simulation_id: simulationId,
      user_id: p.user_id,
      role: p.role,
      granted_by: user.id,
    }));

    const { error } = await supabase.from('simulation_participants').insert(records);
    if (error) throw error;
  } catch (error: any) {
    secureLogger.error('Error adding simulation participants:', error);
    throw error;
  }
}

/**
 * Remove a participant from a simulation
 */
export async function removeSimulationParticipant(participantId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('simulation_participants')
      .delete()
      .eq('id', participantId);

    if (error) throw error;
  } catch (error: any) {
    secureLogger.error('Error removing simulation participant:', error);
    throw error;
  }
}

/**
 * Update the current user's last-accessed timestamp for a simulation
 */
export async function updateParticipantAccess(simulationId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('simulation_participants')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('simulation_id', simulationId)
      .eq('user_id', user.id);

    if (error) throw error;
  } catch (error: any) {
    secureLogger.error('Error updating participant access:', error);
  }
}

/**
 * Get user's simulation assignments (running simulations they are a participant in)
 */
export async function getUserSimulationAssignments(userId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('simulation_participants')
      .select(`
        id,
        simulation_id,
        role,
        granted_at,
        simulation:simulation_active!inner(
          id, name, status, starts_at, tenant_id,
          template:simulation_templates(name, description)
        )
      `)
      .eq('user_id', userId)
      .eq('simulation.status', 'running')
      .order('granted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    secureLogger.error('Error getting user simulation assignments:', error);
    throw error;
  }
}
