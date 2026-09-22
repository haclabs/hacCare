/**
 * Supabase URL validation — deliberately side-effect free.
 *
 * Lives in its own module so `config/environment.ts` can validate a URL without
 * importing `lib/api/supabase.ts`, which instantiates the Supabase client at
 * module load.
 */

/**
 * A Supabase URL is valid if it is either a hosted project
 * (https://<ref>.supabase.co) or a local CLI stack
 * (http://127.0.0.1:54321 / http://localhost:54321).
 *
 * The previous check required `.supabase.co`, so a local stack failed
 * validation: the client was still constructed with the right URL, but
 * `isSupabaseConfigured` went false, which gates real behaviour in
 * AuthContext, PatientContext and useAuthQueries (including
 * `enabled: isSupabaseConfigured`) and forces `detectSessionInUrl: false`.
 * Local dev therefore loaded and then behaved as if the database were absent.
 */
export function isValidSupabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    const isLocal =
      (u.protocol === 'http:' || u.protocol === 'https:') &&
      (u.hostname === '127.0.0.1' || u.hostname === 'localhost' || u.hostname === '[::1]');
    const isHosted = u.protocol === 'https:' && u.hostname.endsWith('.supabase.co');
    return isLocal || isHosted;
  } catch {
    return false;
  }
}
