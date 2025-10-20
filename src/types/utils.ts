/**
 * Utility Types
 * Common TypeScript utility types used across the application
 */

/**
 * Makes a type nullable (allows null)
 * @example
 * type MaybeString = Nullable<string>; // string | null
 */
export type Nullable<T> = T | null;

/**
 * Makes a type optional (allows undefined)
 * @example
 * type MaybeNumber = Optional<number>; // number | undefined
 */
export type Optional<T> = T | undefined;

/**
 * Makes specific keys of an object optional while keeping others required
 * @example
 * type PartialPatient = MakeOptional<Patient, 'vitals' | 'medications'>;
 */
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Makes all properties of an object deeply partial
 * @example
 * type PartialPatientDeep = DeepPartial<Patient>;
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Requires at least one of the specified keys to be present
 * @example
 * type ContactInfo = RequireAtLeastOne<{ email: string; phone: string }, 'email' | 'phone'>;
 */
export type RequireAtLeastOne<T, Keys extends keyof T = keyof T> =
  Pick<T, Exclude<keyof T, Keys>>
  & {
      [K in Keys]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<Keys, K>>>
    }[Keys];

/**
 * Makes all properties of an object deeply required (no optional or nullable)
 * @example
 * type RequiredPatient = DeepRequired<Patient>;
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * ISO 8601 timestamp string
 * @example "2025-10-20T14:30:00Z"
 */
export type Timestamp = string;

/**
 * UUID or other unique identifier string
 * @example "123e4567-e89b-12d3-a456-426614174000"
 */
export type ID = string;

/**
 * Extracts the type of array elements
 * @example
 * type Item = ArrayElement<string[]>; // string
 */
export type ArrayElement<T> = T extends (infer U)[] ? U : never;

/**
 * Makes a type non-nullable (removes null and undefined)
 * @example
 * type DefiniteString = NonNullable<string | null | undefined>; // string
 */
export type NonNullable<T> = Exclude<T, null | undefined>;

/**
 * Creates a type with only the specified keys from the original type
 * @example
 * type PatientBasic = PickRequired<Patient, 'id' | 'first_name' | 'last_name'>;
 */
export type PickRequired<T, K extends keyof T> = Required<Pick<T, K>>;

/**
 * Omits specified keys and makes remaining keys optional
 * @example
 * type PatientUpdate = OmitAndPartial<Patient, 'id' | 'created_at'>;
 */
export type OmitAndPartial<T, K extends keyof T> = Partial<Omit<T, K>>;

/**
 * Type guard to check if a value is defined (not null or undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Type guard to check if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Type guard to check if an array is non-empty
 */
export function isNonEmptyArray<T>(value: T[]): value is [T, ...T[]] {
  return Array.isArray(value) && value.length > 0;
}
