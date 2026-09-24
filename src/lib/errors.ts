/**
 * Narrowing helpers for values caught in `catch`.
 *
 * A `catch` binding is `unknown`, because JavaScript lets you throw anything --
 * a string, a number, `undefined`. Typing it `any` silences the compiler but
 * keeps the hazard: `error.message` on a thrown string is `undefined`, and
 * `String(error)` on a plain object is "[object Object]". These helpers narrow
 * once, in one place, so call sites stay readable.
 *
 * Supabase errors are plain objects shaped `{ message, code?, details?, hint? }`
 * rather than `Error` instances, so an `instanceof Error` check alone is not
 * enough -- every helper here handles both.
 */

/** A structured error carrying at least a message, e.g. a PostgrestError. */
export interface ErrorLike {
  message?: unknown;
  code?: unknown;
  name?: unknown;
  details?: unknown;
  hint?: unknown;
}

function asRecord(error: unknown): ErrorLike | null {
  return typeof error === 'object' && error !== null ? (error as ErrorLike) : null;
}

/**
 * A human-readable message for any thrown value. Never throws, never returns
 * "[object Object]" -- falls back to a JSON rendering, then to String().
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  const record = asRecord(error);
  if (record && typeof record.message === 'string') return record.message;

  if (record) {
    try {
      const json = JSON.stringify(error);
      if (json && json !== '{}') return json;
    } catch {
      // circular structure -- fall through
    }
    return 'Unknown error';
  }

  return String(error);
}

/** The `code` of a Supabase/Postgres error, e.g. '23505' for unique violation. */
export function getErrorCode(error: unknown): string | undefined {
  const code = asRecord(error)?.code;
  return typeof code === 'string' ? code : undefined;
}

/** The `name` of an error, e.g. 'AbortError' on a timed-out fetch. */
export function getErrorName(error: unknown): string | undefined {
  if (error instanceof Error) return error.name;
  const name = asRecord(error)?.name;
  return typeof name === 'string' ? name : undefined;
}

/** True when the error carries this Postgres/Supabase error code. */
export function hasErrorCode(error: unknown, code: string): boolean {
  return getErrorCode(error) === code;
}

/**
 * True when the message contains `needle`. Guards the common
 * `error.message?.includes(...)` pattern, which silently evaluates to
 * `undefined` when the thrown value has no string message.
 *
 * Deliberately case-SENSITIVE, to match the `String.includes` calls this
 * replaced exactly. Making it case-insensitive would be a behaviour change
 * hidden inside a mechanical refactor -- if that is wanted, change it
 * knowingly and review the call sites that branch on it (several gate a
 * forced sign-out).
 */
export function errorMessageIncludes(error: unknown, needle: string): boolean {
  // Deliberately reads the raw `message` rather than going through
  // getErrorMessage(). That helper falls back to JSON.stringify(error), so a
  // needle appearing in some unrelated nested field would match where the
  // original `error.message?.includes(...)` saw `undefined` and did not. Some
  // call sites gate a forced sign-out on this, so the strict reading is the
  // safe one.
  const message = error instanceof Error ? error.message : asRecord(error)?.message;
  return typeof message === 'string' && message.includes(needle);
}

/**
 * Normalise a caught value into a real `Error`.
 *
 * `catch` bindings are `unknown` — a string, a number or a plain object are all
 * possible. Service functions that report `{ data, error }` need something with
 * a `.message`, because that is what every call site reads. Wrapping here keeps
 * that contract true without widening the type back to `any`.
 */
export function toError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error(getErrorMessage(error));
}
