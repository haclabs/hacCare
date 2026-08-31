/**
 * ===========================================================================
 * KB WALKTHROUGH SERVICE
 * ===========================================================================
 * CRUD for the Knowledge Base's embedded Scribe walkthroughs.
 * Reads are open to any authenticated user; writes are restricted to
 * super_admin by RLS (see database/migrations/20260831000000_create_kb_walkthroughs.sql).
 * ===========================================================================
 */

import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';

export interface KBWalkthrough {
  id: string;
  title: string;
  description: string | null;
  scribe_url: string;
  category: string | null;
  display_order: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type KBWalkthroughInput = Pick<KBWalkthrough, 'title' | 'scribe_url'> &
  Partial<Pick<KBWalkthrough, 'description' | 'category' | 'display_order' | 'is_active'>>;

export async function getWalkthroughs(): Promise<KBWalkthrough[]> {
  const { data, error } = await supabase
    .from('kb_walkthroughs')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) {
    secureLogger.error('Error fetching walkthroughs:', error);
    return [];
  }
  return (data as KBWalkthrough[]) || [];
}

export async function createWalkthrough(
  input: KBWalkthroughInput
): Promise<{ data: KBWalkthrough | null; error: unknown }> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('kb_walkthroughs')
    .insert({ ...input, created_by: userData.user?.id })
    .select()
    .single();

  if (error) secureLogger.error('Error creating walkthrough:', error);
  return { data: data as KBWalkthrough | null, error };
}

export async function updateWalkthrough(
  id: string,
  updates: Partial<KBWalkthroughInput>
): Promise<{ data: KBWalkthrough | null; error: unknown }> {
  const { data, error } = await supabase
    .from('kb_walkthroughs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) secureLogger.error('Error updating walkthrough:', error);
  return { data: data as KBWalkthrough | null, error };
}

export async function deleteWalkthrough(id: string): Promise<{ error: unknown }> {
  const { error } = await supabase.from('kb_walkthroughs').delete().eq('id', id);
  if (error) secureLogger.error('Error deleting walkthrough:', error);
  return { error };
}
