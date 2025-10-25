/**
 * ===========================================================================
 * SIMULATION SYSTEM V2.0 - SERVICE LAYER
 * ===========================================================================
 * Service functions for managing simulations, templates, and history
 * ===========================================================================
 */

import { supabase } from '../../lib/api/supabase';
import type {
  SimulationTemplate,
  SimulationTemplateWithDetails,
  SimulationActive,
  SimulationActiveWithDetails,
  SimulationHistory,
  SimulationHistoryWithDetails,
  SimulationParticipant,
  SimulationActivityLog,
  CreateTemplateParams,
  LaunchSimulationParams,
  SaveDebriefParams,
  SimulationFunctionResult,
  ActivityLogEntry,
  SimulationTemplateFilters,
  SimulationActiveFilters,
  SimulationHistoryFilters,
} from '../../features/simulation/types/simulation';

// ============================================================================
// TEMPLATE MANAGEMENT
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
    });

    if (error) throw error;
    return data as SimulationFunctionResult;
  } catch (error: any) {
    console.error('Error creating simulation template:', error);
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

    // Apply filters
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
    console.error('Error fetching simulation templates:', error);
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
    console.error('Error fetching simulation template:', error);
    return null;
  }
}

/**
 * Save snapshot of template
 */
export async function saveTemplateSnapshot(
  templateId: string
): Promise<SimulationFunctionResult> {
  try {
    console.log('🔍 DEBUG: Calling save_template_snapshot');
    console.log('📝 Template ID:', templateId);
    console.log('📝 Template ID type:', typeof templateId);
    
    const { data, error } = await supabase.rpc('save_template_snapshot', {
      p_template_id: templateId,
    });

    console.log('📦 Response data:', JSON.stringify(data, null, 2));
    console.log('❌ Response error:', JSON.stringify(error, null, 2));

    if (error) {
      console.error('💥 Error details:', JSON.stringify({
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      }, null, 2));
      throw error;
    }
    
    console.log('✅ Snapshot saved successfully:', JSON.stringify(data, null, 2));
    return data as SimulationFunctionResult;
  } catch (error: any) {
    console.error('❌ FULL Error saving template snapshot:', JSON.stringify(error, null, 2));
    throw error;
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
    console.error('Error updating simulation template:', error);
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
    console.error('Error deleting simulation template:', error);
    throw error;
  }
}

// ============================================================================
// ACTIVE SIMULATION MANAGEMENT
// ============================================================================

/**
 * Launch a new simulation from template
 */
export async function launchSimulation(
  params: LaunchSimulationParams
): Promise<SimulationFunctionResult> {
  try {
    console.log('🚀 DEBUG: Launching simulation with params:', JSON.stringify(params, null, 2));
    
    const { data, error } = await supabase.rpc('launch_simulation', {
      p_template_id: params.template_id,
      p_name: params.name,
      p_duration_minutes: params.duration_minutes,
      p_participant_user_ids: params.participant_user_ids,
      p_participant_roles: params.participant_roles || null,
    });

    console.log('📦 Launch response data:', JSON.stringify(data, null, 2));
    console.log('❌ Launch response error:', JSON.stringify(error, null, 2));

    if (error) {
      console.error('💥 Launch error details:', JSON.stringify({
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      }, null, 2));
      throw error;
    }
    
    console.log('✅ Simulation launched successfully:', JSON.stringify(data, null, 2));
    return data as SimulationFunctionResult;
  } catch (error: any) {
    console.error('❌ FULL Error launching simulation:', JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Get all active simulations
 */
export async function getActiveSimulations(
  filters?: SimulationActiveFilters
): Promise<SimulationActiveWithDetails[]> {
  try {
    let query = supabase
      .from('simulation_active')
      .select(`
        *,
        template:simulation_templates(id, name, description),
        tenant:tenants(id, name),
        participants:simulation_participants(
          id,
          user_id,
          role,
          granted_at
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
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

    // Fetch user profiles for all participants
    const userIds = new Set<string>();
    (data || []).forEach((sim: any) => {
      sim.participants?.forEach((p: any) => {
        if (p.user_id) userIds.add(p.user_id);
      });
    });

    let userProfiles: any = {};
    if (userIds.size > 0) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name')
        .in('id', Array.from(userIds));
      
      if (profiles) {
        profiles.forEach((profile: any) => {
          userProfiles[profile.id] = profile;
        });
      }
    }

    // Calculate time remaining for each simulation and attach user profiles
    const enrichedData = (data || []).map((sim: any) => {
      const endsAt = new Date(sim.ends_at);
      const now = new Date();
      const timeRemainingMs = endsAt.getTime() - now.getTime();
      const timeRemainingMinutes = Math.max(0, Math.floor(timeRemainingMs / 60000));

      // Attach user profiles to participants
      const participantsWithProfiles = sim.participants?.map((p: any) => ({
        ...p,
        user_profiles: userProfiles[p.user_id] || null,
      })) || [];

      return {
        ...sim,
        participants: participantsWithProfiles,
        time_remaining_minutes: timeRemainingMinutes,
        is_expired: timeRemainingMinutes === 0 && sim.status === 'running',
        participant_count: sim.participants?.length || 0,
      };
    });

    return enrichedData as SimulationActiveWithDetails[];
  } catch (error: any) {
    console.error('Error fetching active simulations:', error);
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
        participants:simulation_participants(
          id,
          user_id,
          role,
          granted_at,
          last_accessed_at
        )
      `)
      .eq('id', simulationId)
      .single();

    if (error) throw error;

    // Calculate time remaining
    const endsAt = new Date(data.ends_at);
    const now = new Date();
    const timeRemainingMs = endsAt.getTime() - now.getTime();
    const timeRemainingMinutes = Math.max(0, Math.floor(timeRemainingMs / 60000));

    return {
      ...data,
      time_remaining_minutes: timeRemainingMinutes,
      is_expired: timeRemainingMinutes === 0 && data.status === 'running',
      participant_count: data.participants?.length || 0,
    } as SimulationActiveWithDetails;
  } catch (error: any) {
    console.error('Error fetching active simulation:', error);
    return null;
  }
}

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
    console.error('Error updating simulation status:', error);
    throw error;
  }
}

/**
 * Reset simulation for next session (RECOMMENDED)
 * Clears student work but preserves all medications and patient/medication IDs
 * Use this for classroom scenarios where you've printed labels or added medications
 */
export async function resetSimulationForNextSession(
  simulationId: string
): Promise<SimulationFunctionResult> {
  try {
    const { data, error } = await supabase.rpc('reset_simulation_for_next_session', {
      p_simulation_id: simulationId,
    });

    if (error) throw error;
    return data as SimulationFunctionResult;
  } catch (error: any) {
    console.error('Error resetting simulation for next session:', error);
    throw error;
  }
}

/**
 * Reset simulation to EXACT template snapshot (NUCLEAR OPTION)
 * WARNING: Deletes ALL medications not in original template!
 * Only use when you need exact restoration and are willing to reprint labels
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
    console.error('Error resetting simulation to template:', error);
    throw error;
  }
}

/**
 * Reset simulation (alias for resetSimulationForNextSession)
 * @deprecated Use resetSimulationForNextSession or resetSimulationToTemplate explicitly
 */
export async function resetSimulation(
  simulationId: string
): Promise<SimulationFunctionResult> {
  console.warn('resetSimulation is deprecated. Use resetSimulationForNextSession instead.');
  return resetSimulationForNextSession(simulationId);
}

/**
 * Complete simulation and move to history
 */
export async function completeSimulation(
  simulationId: string
): Promise<SimulationFunctionResult> {
  try {
    const { data, error } = await supabase.rpc('complete_simulation', {
      p_simulation_id: simulationId,
    });

    if (error) throw error;
    return data as SimulationFunctionResult;
  } catch (error: any) {
    console.error('Error completing simulation:', error);
    throw error;
  }
}

/**
 * Delete simulation (with optional archiving)
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
    console.error('Error deleting simulation:', error);
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

    const { error } = await supabase
      .from('simulation_participants')
      .insert(records);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error adding simulation participants:', error);
    throw error;
  }
}

/**
 * Remove participant from simulation
 */
export async function removeSimulationParticipant(
  participantId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('simulation_participants')
      .delete()
      .eq('id', participantId);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error removing simulation participant:', error);
    throw error;
  }
}

/**
 * Update participant's last accessed time
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
    console.error('Error updating participant access:', error);
  }
}

/**
 * Get user's simulation assignments with full simulation details
 * Used by simulation portal to show active simulations for a user
 */
export async function getUserSimulationAssignments(
  userId: string
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('simulation_participants')
      .select(`
        id,
        simulation_id,
        role,
        granted_at,
        simulation:simulation_active!inner(
          id,
          name,
          status,
          starts_at,
          tenant_id,
          template:simulation_templates(name, description)
        )
      `)
      .eq('user_id', userId)
      .eq('simulation.status', 'running')
      .order('granted_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Error getting user simulation assignments:', error);
    throw error;
  }
}

// ============================================================================
// SIMULATION HISTORY
// ============================================================================

/**
 * Get simulation history
 */
export async function getSimulationHistory(
  filters?: SimulationHistoryFilters
): Promise<SimulationHistoryWithDetails[]> {
  try {
    let query = supabase
      .from('simulation_history')
      .select(`
        *,
        template:simulation_templates(id, name, description)
      `)
      .order('completed_at', { ascending: false, nullsFirst: false });

    // Apply filters
    if (filters?.template_id) {
      query = query.eq('template_id', filters.template_id);
    }

    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    if (filters?.date_range) {
      query = query
        .gte('started_at', filters.date_range.start)
        .lte('started_at', filters.date_range.end);
    }

    if (filters?.created_by) {
      query = query.eq('created_by', filters.created_by);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as SimulationHistoryWithDetails[];
  } catch (error: any) {
    console.error('Error fetching simulation history:', error);
    throw error;
  }
}

/**
 * Get single history record
 */
export async function getSimulationHistoryRecord(
  historyId: string
): Promise<SimulationHistoryWithDetails | null> {
  try {
    const { data, error } = await supabase
      .from('simulation_history')
      .select(`
        *,
        template:simulation_templates(id, name, description)
      `)
      .eq('id', historyId)
      .single();

    if (error) throw error;
    return data as SimulationHistoryWithDetails;
  } catch (error: any) {
    console.error('Error fetching simulation history record:', error);
    return null;
  }
}

/**
 * Save debrief data to history
 */
export async function saveSimulationDebrief(
  params: SaveDebriefParams
): Promise<void> {
  try {
    const { error } = await supabase
      .from('simulation_history')
      .update({ debrief_data: params.debrief_data })
      .eq('id', params.history_id);

    if (error) throw error;
  } catch (error: any) {
    console.error('Error saving simulation debrief:', error);
    throw error;
  }
}

// ============================================================================
// ACTIVITY LOGGING
// ============================================================================

/**
 * Log simulation activity
 */
export async function logSimulationActivity(
  simulationId: string,
  entry: ActivityLogEntry
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('simulation_activity_log')
      .insert({
        simulation_id: simulationId,
        user_id: user.id,
        ...entry,
      });

    if (error) throw error;
  } catch (error: any) {
    console.error('Error logging simulation activity:', error);
  }
}

/**
 * Get activity log for simulation
 */
export async function getSimulationActivityLog(
  simulationId: string
): Promise<SimulationActivityLog[]> {
  try {
    const { data, error } = await supabase
      .from('simulation_activity_log')
      .select('*')
      .eq('simulation_id', simulationId)
      .order('occurred_at', { ascending: false });

    if (error) throw error;
    return (data || []) as SimulationActivityLog[];
  } catch (error: any) {
    console.error('Error fetching simulation activity log:', error);
    throw error;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check for expired simulations
 */
export async function checkExpiredSimulations(): Promise<SimulationFunctionResult> {
  try {
    const { data, error } = await supabase.rpc('check_expired_simulations');

    if (error) throw error;
    return data as SimulationFunctionResult;
  } catch (error: any) {
    console.error('Error checking expired simulations:', error);
    throw error;
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
    console.error('Error fetching user accessible simulations:', error);
    return [];
  }
}
