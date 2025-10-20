/**
 * Types - Central Export
 * 
 * This file re-exports all types from their feature locations for backward compatibility.
 * New code should import directly from feature type modules when possible.
 * 
 * @example
 * // Preferred (feature-based):
 * import { Patient } from '@/features/patients/types';
 * 
 * // Also works (backward compatible):
 * import { Patient } from '@/types';
 */

// Utility types
export * from './utils';

// Schema types (remain centralized as used across all features)
export * from './schema';

// Feature-based types (re-exported for backward compatibility)
export * from '../features/patients/types';
export * from '../features/clinical/types';
export * from '../features/admin/types';
export * from '../features/simulation/types';
