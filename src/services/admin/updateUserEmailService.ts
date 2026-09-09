/**
 * Update User Email Service
 * Calls the admin-update-user-email Edge Function to change a user's actual
 * login email (auth.users) — editing user_profiles.email directly never
 * touches the real credential, since they're separate tables.
 */

import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';

export async function updateUserEmail(
  userId: string,
  newEmail: string
): Promise<{ error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('admin-update-user-email', {
      body: { userId, newEmail },
    });

    if (error) {
      secureLogger.error('Error updating user email', error);
      return { error: error.message || 'Failed to update email' };
    }

    if (!data?.success) {
      return { error: data?.error || 'Failed to update email' };
    }

    if (data.warning) {
      secureLogger.warn('User email updated with a warning', data.warning);
    }

    return { error: null };
  } catch (error: any) {
    secureLogger.error('Unexpected error updating user email', error);
    return { error: error?.message || 'Failed to update email' };
  }
}
