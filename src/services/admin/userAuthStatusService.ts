/**
 * User Auth Status Service
 * Exposes auth.users.last_sign_in_at / email_confirmed_at (not queryable
 * directly via PostgREST) via the get_user_auth_status RPC, so User
 * Management can flag accounts that have never signed in yet.
 */

import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';

export interface UserAuthStatus {
  lastSignInAt: string | null;
  emailConfirmedAt: string | null;
}

export async function getUserAuthStatus(
  userIds: string[]
): Promise<{ data: Record<string, UserAuthStatus> | null; error: string | null }> {
  if (userIds.length === 0) {
    return { data: {}, error: null };
  }

  try {
    const { data, error } = await supabase.rpc('get_user_auth_status', { p_user_ids: userIds });

    if (error) {
      secureLogger.error('Error fetching user auth status', error);
      return { data: null, error: error.message };
    }

    const map: Record<string, UserAuthStatus> = {};
    (data || []).forEach((row: { user_id: string; last_sign_in_at: string | null; email_confirmed_at: string | null }) => {
      map[row.user_id] = { lastSignInAt: row.last_sign_in_at, emailConfirmedAt: row.email_confirmed_at };
    });

    return { data: map, error: null };
  } catch (error) {
    secureLogger.error('Unexpected error fetching user auth status', error);
    return { data: null, error: (error as Error)?.message || 'Failed to fetch user sign-in status' };
  }
}
