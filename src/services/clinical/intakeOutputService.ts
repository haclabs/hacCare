/**
 * ============================================================================
 * INTAKE & OUTPUT SERVICE
 * ============================================================================
 * Handles CRUD operations for patient intake/output events
 * 
 * Clinical Purpose:
 * - Track fluid intake (oral, IV, tube feeds, etc.)
 * - Track fluid output (urine, stool, emesis, drains, etc.)
 * - Calculate net fluid balance for patient monitoring
 * ============================================================================
 */

import { supabase } from '../../lib/api/supabase';
import type { Database } from '../../types/supabase';

type IntakeOutputEvent = Database['public']['Tables']['patient_intake_output_events']['Row'];
type IntakeOutputInsert = Database['public']['Tables']['patient_intake_output_events']['Insert'];
type IntakeOutputUpdate = Database['public']['Tables']['patient_intake_output_events']['Update'];

export type IoDirection = 'intake' | 'output';
export type IoCategory = 'oral' | 'iv_fluid' | 'iv_med' | 'blood' | 'tube_feed' | 'urine' | 'stool' | 'emesis' | 'drain';

export interface IntakeOutputSummary {
  totalIntake: number;
  totalOutput: number;
  netBalance: number;
  events: IntakeOutputEvent[];
}

/**
 * Get intake/output events for a patient within a time window
 */
export async function getIntakeOutputEvents(
  patientId: string,
  options?: {
    hoursBack?: number;
    direction?: IoDirection;
    limit?: number;
  }
): Promise<IntakeOutputEvent[]> {
  try {
    const hoursBack = options?.hoursBack || 24;
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursBack);

    let query = supabase
      .from('patient_intake_output_events')
      .select('*')
      .eq('patient_id', patientId)
      .gte('event_timestamp', cutoffTime.toISOString())
      .order('event_timestamp', { ascending: false });

    if (options?.direction) {
      query = query.eq('direction', options.direction);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching I&O events:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in getIntakeOutputEvents:', error);
    throw error;
  }
}

/**
 * Get intake/output summary with totals and net balance
 */
export async function getIntakeOutputSummary(
  patientId: string,
  hoursBack: number = 24
): Promise<IntakeOutputSummary> {
  try {
    const events = await getIntakeOutputEvents(patientId, { hoursBack });

    const totalIntake = events
      .filter(e => e.direction === 'intake')
      .reduce((sum, e) => sum + Number(e.amount_ml), 0);

    const totalOutput = events
      .filter(e => e.direction === 'output')
      .reduce((sum, e) => sum + Number(e.amount_ml), 0);

    const netBalance = totalIntake - totalOutput;

    return {
      totalIntake,
      totalOutput,
      netBalance,
      events,
    };
  } catch (error) {
    console.error('Error in getIntakeOutputSummary:', error);
    throw error;
  }
}

/**
 * Create a new intake/output event
 */
export async function createIntakeOutputEvent(
  event: Omit<IntakeOutputInsert, 'id' | 'created_at' | 'updated_at'>
): Promise<IntakeOutputEvent> {
  try {
    console.log('💧 Creating I&O event with data:', event);
    console.log('💧 Student name being saved:', event.student_name);
    
    const { data, error } = await supabase
      .from('patient_intake_output_events')
      .insert(event)
      .select()
      .single();

    if (error) {
      console.error('Error creating I&O event:', error);
      throw error;
    }

    console.log('✅ I&O event created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in createIntakeOutputEvent:', error);
    throw error;
  }
}

/**
 * Update an existing intake/output event
 */
export async function updateIntakeOutputEvent(
  id: string,
  updates: IntakeOutputUpdate
): Promise<IntakeOutputEvent> {
  try {
    const { data, error } = await supabase
      .from('patient_intake_output_events')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating I&O event:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in updateIntakeOutputEvent:', error);
    throw error;
  }
}

/**
 * Delete an intake/output event
 */
export async function deleteIntakeOutputEvent(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('patient_intake_output_events')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting I&O event:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in deleteIntakeOutputEvent:', error);
    throw error;
  }
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: string): string {
  const names: Record<string, string> = {
    oral: 'Oral',
    iv_fluid: 'IV Fluid',
    iv_med: 'IV Medication',
    blood: 'Blood Product',
    tube_feed: 'Tube Feed',
    urine: 'Urine',
    stool: 'Stool',
    emesis: 'Emesis',
    drain: 'Drain',
  };
  return names[category] || category;
}

/**
 * Get direction display name with color
 */
export function getDirectionDisplay(direction: IoDirection): { label: string; color: string } {
  return direction === 'intake'
    ? { label: 'IN', color: 'blue' }
    : { label: 'OUT', color: 'orange' };
}
