/**
 * Simulation History Service — history records, debrief, activity log, archiving.
 */

import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';
import type {
  SimulationHistoryWithDetails,
  SimulationActivityLog,
  SaveDebriefParams,
  ActivityLogEntry,
  SimulationHistoryFilters,
} from '../../features/simulation/types/simulation';

// ============================================================================
// HISTORY
// ============================================================================

/**
 * Get simulation history records
 */
export async function getSimulationHistory(
  filters?: SimulationHistoryFilters
): Promise<SimulationHistoryWithDetails[]> {
  try {
    let query = supabase
      .from('simulation_history')
      .select('*')
      .order('completed_at', { ascending: false, nullsFirst: false });

    if (filters?.template_id) {
      query = query.eq('template_id', filters.template_id);
    }
    if (filters?.date_from) {
      query = query.gte('started_at', filters.date_from);
    }
    if (filters?.date_to) {
      query = query.lte('started_at', filters.date_to);
    }
    if (filters?.created_by) {
      query = query.eq('created_by', filters.created_by);
    }
    if (filters?.instructor_name) {
      query = query.eq('instructor_name', filters.instructor_name);
    }

    const showArchived = filters?.archived ?? false;
    query = query.eq('archived', showArchived);

    const { data: historyData, error } = await query;
    if (error) throw error;
    if (!historyData) return [];

    const enrichedData = await Promise.all(
      historyData.map(async (record) => {
        const { data: template } = await supabase
          .from('simulation_templates')
          .select('id, name, description')
          .eq('id', record.template_id)
          .single();

        let participantCount = 0;
        if (record.simulation_id) {
          const { data: participants } = await supabase
            .from('simulation_participants')
            .select('user_id')
            .eq('simulation_id', record.simulation_id);
          participantCount = participants?.length || 0;
        }

        return {
          ...record,
          template,
          participants: Array(participantCount).fill({}),
        };
      })
    );

    return enrichedData as SimulationHistoryWithDetails[];
  } catch (error: any) {
    secureLogger.error('Error fetching simulation history:', error);
    throw error;
  }
}

/**
 * Get a single history record by ID
 */
export async function getSimulationHistoryRecord(
  historyId: string
): Promise<SimulationHistoryWithDetails | null> {
  try {
    const { data, error } = await supabase
      .from('simulation_history')
      .select(`*, template:simulation_templates(id, name, description)`)
      .eq('id', historyId)
      .single();

    if (error) throw error;
    return data as SimulationHistoryWithDetails;
  } catch (error: any) {
    secureLogger.error('Error fetching simulation history record:', error);
    return null;
  }
}

/**
 * Save debrief data to a history record
 */
export async function saveSimulationDebrief(params: SaveDebriefParams): Promise<void> {
  try {
    const { error } = await supabase
      .from('simulation_history')
      .update({ debrief_data: params.debrief_summary })
      .eq('simulation_id', params.simulation_id);

    if (error) throw error;
  } catch (error: any) {
    secureLogger.error('Error saving simulation debrief:', error);
    throw error;
  }
}

/**
 * Archive a history record (creates folder path: InstructorName/YYYY-MM-DD/)
 */
export async function archiveSimulationHistory(historyId: string): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: record, error: fetchError } = await supabase
      .from('simulation_history')
      .select('instructor_name, completed_at')
      .eq('id', historyId)
      .single();

    if (fetchError) throw fetchError;
    if (!record) throw new Error('History record not found');

    const instructorName = record.instructor_name || 'Unknown Instructor';
    const date = record.completed_at ? new Date(record.completed_at) : new Date();
    const completedDate = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
    const archiveFolder = `${instructorName}/${completedDate}`;

    const { error } = await supabase
      .from('simulation_history')
      .update({
        archived: true,
        archived_at: new Date().toISOString(),
        archived_by: user.id,
        archive_folder: archiveFolder,
      })
      .eq('id', historyId);

    if (error) throw error;
    secureLogger.debug(`Archived to folder: ${archiveFolder}`);
  } catch (error: any) {
    secureLogger.error('Error archiving simulation history:', error);
    throw error;
  }
}

/**
 * Unarchive a history record
 */
export async function unarchiveSimulationHistory(historyId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('simulation_history')
      .update({ archived: false, archived_at: null, archived_by: null })
      .eq('id', historyId);

    if (error) throw error;
  } catch (error: any) {
    secureLogger.error('Error unarchiving simulation history:', error);
    throw error;
  }
}

/**
 * Re-query student activities from the live database and persist back into
 * simulation_history.student_activities (use when stored snapshot is stale).
 */
export async function regenerateDebriefSnapshot(
  historyId: string,
  simulationId: string,
  startedAt: string
): Promise<void> {
  const { getStudentActivitiesBySimulation } = await import('./studentActivityService');
  const activities = await getStudentActivitiesBySimulation(simulationId, startedAt);

  const { error } = await supabase
    .from('simulation_history')
    .update({ student_activities: activities as any })
    .eq('id', historyId);

  if (error) throw error;
}

/**
 * Permanently delete a history record
 */
export async function deleteSimulationHistory(historyId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('simulation_history')
      .delete()
      .eq('id', historyId);

    if (error) throw error;
  } catch (error: any) {
    secureLogger.error('Error deleting simulation history:', error);
    throw error;
  }
}

// ============================================================================
// ACTIVITY LOG
// ============================================================================

/**
 * Log a simulation activity event
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
      .insert({ simulation_id: simulationId, user_id: user.id, ...entry });

    if (error) throw error;
  } catch (error: any) {
    secureLogger.error('Error logging simulation activity:', error);
  }
}

/**
 * Get the activity log for a simulation
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
    secureLogger.error('Error fetching simulation activity log:', error);
    throw error;
  }
}
