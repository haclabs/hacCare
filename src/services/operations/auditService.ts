import { supabase } from '../../lib/api/supabase';
import { User } from '@supabase/supabase-js';

/**
 * Audit Service
 * Handles logging of user actions for audit trail purposes
 */

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  target_id: string;
  target_type: string;
  details: any;
  timestamp: string;
  user_name?: string; // Joined from user_profiles
}

/**
 * Log an action for audit purposes
 * 
 * @param user - Current user
 * @param action - Action performed (e.g., 'updated_patient', 'created_medication')
 * @param targetId - ID of the target object (e.g., patient ID)
 * @param targetType - Type of the target object (e.g., 'patient', 'medication')
 * @param details - Additional details about the action
 * @returns Promise resolving to the created audit log
 */
export const logAction = async (
  user: User | null,
  action: string,
  targetId: string,
  targetType: string,
  details: any = {}
): Promise<AuditLog | null> => {
  if (!user) {
    console.error('Cannot log action: No user provided');
    return null;
  }

  try {
    console.log(`Logging action: ${action} on ${targetType} ${targetId} by user ${user.id}`);
    
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action,
        target_id: targetId,
        target_type: targetType,
        details,
        timestamp: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging action:', error);
      return null;
    }

    console.log('Action logged successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in logAction:', error);
    return null;
  }
};

/**
 * Fetch recent activity for a specific target
 * 
 * @param targetId - ID of the target object
 * @param targetType - Type of the target object
 * @param limit - Maximum number of logs to return
 * @returns Promise resolving to array of audit logs
 */
export const fetchTargetActivity = async (
  targetId: string,
  targetType: string,
  limit: number = 10
): Promise<AuditLog[]> => {
  try {
    console.log(`Fetching activity for ${targetType} ${targetId}`);
    
    const { data, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        user_profiles:user_id (
          first_name,
          last_name
        )
      `)
      .eq('target_id', targetId)
      .eq('target_type', targetType)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching target activity:', error);
      return [];
    }

    // Format the data to include user name
    const formattedData = data.map(log => ({
      ...log,
      user_name: log.user_profiles ? 
        `${log.user_profiles.first_name} ${log.user_profiles.last_name}` : 
        'Unknown User'
    }));

    console.log(`Found ${formattedData.length} activity logs`);
    return formattedData;
  } catch (error) {
    console.error('Error in fetchTargetActivity:', error);
    return [];
  }
};

/**
 * Fetch recent activity for a user
 * 
 * @param userId - ID of the user
 * @param limit - Maximum number of logs to return
 * @returns Promise resolving to array of audit logs
 */
export const fetchUserActivity = async (
  userId: string,
  limit: number = 10
): Promise<AuditLog[]> => {
  try {
    console.log(`Fetching activity for user ${userId}`);
    
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching user activity:', error);
      return [];
    }

    console.log(`Found ${data.length} activity logs`);
    return data;
  } catch (error) {
    console.error('Error in fetchUserActivity:', error);
    return [];
  }
};