/**
 * Invite User Service
 * Calls the invite-user Edge Function to create an instructor account and
 * send them a branded "set your password" welcome email (no manual password).
 */

import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';

export interface InviteUserParams {
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface InviteUserResult {
  userId: string;
}

export async function inviteUser(
  params: InviteUserParams
): Promise<{ data: InviteUserResult | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: params,
    });

    if (error) {
      secureLogger.error('Error inviting user', error);
      return { data: null, error: error.message || 'Failed to send invitation email' };
    }

    if (!data?.success || !data?.userId) {
      return { data: null, error: data?.error || 'Failed to send invitation email' };
    }

    return { data: { userId: data.userId }, error: null };
  } catch (error: any) {
    secureLogger.error('Unexpected error inviting user', error);
    return { data: null, error: error?.message || 'Failed to send invitation email' };
  }
}
