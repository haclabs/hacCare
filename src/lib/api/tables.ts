/**
 * Shorthands for the generated Postgres table types.
 *
 * `src/types/supabase.ts` is regenerated with `npm run supabase:types` and is
 * the schema's own description of itself. Annotating query results with these
 * makes a renamed or dropped column fail the build instead of silently
 * producing `undefined` — which is how five debrief fields went years without
 * anyone noticing they were always empty.
 *
 * The Supabase client is not yet created with `createClient<Database>()`, so
 * results still arrive untyped and these annotations are what ties a given
 * query to the real schema. They are checked against the generated types
 * regardless, so the loop body is verified even while the client is not. See
 * Phase 4 in REFACTOR.md for the migration that makes this automatic.
 */
import type { Database } from '../../types/supabase';

type Tables = Database['public']['Tables'];

/** A row as `select('*')` returns it. */
export type Row<T extends keyof Tables> = Tables[T]['Row'];

/** The shape `insert()` accepts — optional columns are those with defaults. */
export type Insert<T extends keyof Tables> = Tables[T]['Insert'];

/** The shape `update()` accepts — every column optional. */
export type Update<T extends keyof Tables> = Tables[T]['Update'];

/**
 * Convert a nullable column to an optional domain field.
 *
 * Postgres says `null` for "no value"; the domain types in `src/features/*`
 * generally say `undefined`. Services are the boundary between the two, so the
 * conversion belongs there rather than being papered over with `any` — which is
 * how `bloodPressure: { systolic: null }` ended up satisfying a type that
 * declared both values required.
 */
export function orUndefined<T>(value: T | null | undefined): T | undefined {
  return value ?? undefined;
}
