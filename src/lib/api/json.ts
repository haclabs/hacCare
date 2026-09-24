/**
 * Narrowing helpers for JSONB values and RPC results.
 *
 * `supabase.rpc(...)` and JSONB columns both come back as `Json`, which is a
 * union covering strings, numbers, booleans, arrays and objects. Reading
 * `.success` straight off one compiles only because the client is currently
 * untyped; with types on, it is an error — correctly, because nothing
 * guarantees the value is an object at all.
 *
 * Asserting with `as` would silence that without checking anything. These
 * helpers check at runtime instead, so a function that returns something
 * unexpected fails where it happens rather than several frames later with an
 * undefined property.
 */
import type { Json } from '../../types/supabase';

/** True when a Json value is a plain object rather than an array or scalar. */
function isJsonObject(value: Json | null | undefined): value is { [key: string]: Json } {
  return value !== null && value !== undefined
    && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Narrow a Json value to an object shape, or `null` when it is not an object.
 *
 * Use for JSONB columns, where absent or malformed data should degrade to an
 * empty section rather than throw.
 */
export function asJsonObject<T extends object>(value: Json | null | undefined): T | null {
  return isJsonObject(value) ? (value as T) : null;
}

/**
 * Narrow an RPC result to its expected shape, throwing if it is not an object.
 *
 * Use at `supabase.rpc()` boundaries. A SECURITY DEFINER function returning a
 * scalar or null where an object was expected means the call did not do what
 * the caller thinks, and failing loudly at the boundary is far easier to trace
 * than `undefined` surfacing somewhere downstream.
 */
export function expectJsonObject<T extends object>(
  value: Json | null | undefined,
  context: string,
): T {
  const narrowed = asJsonObject<T>(value);
  if (narrowed === null) {
    throw new Error(
      `${context}: expected an object result, received ${
        value === null || value === undefined ? String(value) : typeof value
      }`,
    );
  }
  return narrowed;
}
