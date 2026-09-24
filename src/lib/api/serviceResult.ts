/**
 * The `{ data, error }` shape returned by the service layer.
 *
 * These functions surface two different failures: a `PostgrestError` from
 * Supabase, and whatever a `catch` block caught. Both are represented here so
 * call sites can read `.message` without narrowing, which is what they already
 * do — `error: any` was hiding that this was a union all along, not a licence
 * for the error to be anything at all.
 *
 * Normalise a caught value with `toError()` from `@/lib/errors` before putting
 * it in one of these.
 */
import type { PostgrestError } from '@supabase/supabase-js';

/** A failure a service function can report. Both members carry `.message`. */
export type ServiceError = PostgrestError | Error;

/** Standard service return shape: data on success, error on failure. */
export interface ServiceResult<T> {
  data: T | null;
  error: ServiceError | null;
}
