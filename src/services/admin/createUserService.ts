/**
 * Create User Service
 * Calls the create-user Edge Function to create a pre-confirmed account with
 * an admin-chosen password. Public sign-up is disabled, so client-side
 * auth.signUp() can't create accounts.
 */

import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';
import { getErrorMessage } from '@/lib/errors';

export interface CreateUserParams {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export async function createUserWithPassword(
  params: CreateUserParams
): Promise<{ userId: string | null; error: string | null }> {
  try {
    const { data, error } = await supabase.functions.invoke('create-user', { body: params });

    if (error) {
      secureLogger.error('Error creating user', error);
      // Non-2xx responses carry the reason (duplicate email, short password) in the body
      if (error instanceof FunctionsHttpError) {
        const body = await error.context.json().catch(() => null);
        if (body?.error) return { userId: null, error: body.error };
      }
      return { userId: null, error: error.message || 'Failed to create user' };
    }

    if (!data?.success || !data?.userId) {
      return { userId: null, error: data?.error || 'Failed to create user' };
    }

    return { userId: data.userId, error: null };
  } catch (error: unknown) {
    secureLogger.error('Unexpected error creating user', error);
    return { userId: null, error: getErrorMessage(error) || 'Failed to create user' };
  }
}
