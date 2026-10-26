/**
 * User Institution Service
 * Resolves the institution(s) each user belongs to (via tenant memberships, program
 * assignments, rosters and simulation participation) through the get_user_institutions RPC.
 */

import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';

export interface UserInstitution {
  id: string;
  name: string;
}

export async function getUserInstitutions(
  userIds: string[]
): Promise<{ data: Record<string, UserInstitution[]> | null; error: string | null }> {
  if (userIds.length === 0) {
    return { data: {}, error: null };
  }

  try {
    const { data, error } = await supabase.rpc('get_user_institutions', { p_user_ids: userIds });

    if (error) {
      secureLogger.error('Error fetching user institutions', error);
      return { data: null, error: error.message };
    }

    const map: Record<string, UserInstitution[]> = {};
    (data || []).forEach((row: { user_id: string; institution_id: string; institution_name: string }) => {
      (map[row.user_id] = map[row.user_id] || []).push({ id: row.institution_id, name: row.institution_name });
    });
    Object.values(map).forEach(list => list.sort((a, b) => a.name.localeCompare(b.name)));

    return { data: map, error: null };
  } catch (error) {
    secureLogger.error('Unexpected error fetching user institutions', error);
    return { data: null, error: (error as Error)?.message || 'Failed to fetch user institutions' };
  }
}
