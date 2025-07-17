import { QueryClient } from '@tanstack/react-query';

/**
 * React Query Client Configuration for hacCare
 * 
 * Optimized for healthcare applications with:
 * - Aggressive caching for patient data
 * - Smart retry logic for medical operations
 * - Healthcare-specific error handling
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache patient data for 5 minutes (patients don't change frequently)
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Custom retry logic for healthcare data
      retry: (failureCount, error: any) => {
        // Never retry on authentication/authorization errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        
        // Don't retry on client errors (4xx)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        
        // Retry up to 3 times for server errors and network issues
        return failureCount < 3;
      },
      // Retry delay increases exponentially
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Retry mutations once on network errors
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

/**
 * Query Keys Factory
 * Centralized query key management for consistency
 */
export const queryKeys = {
  // Patient-related queries
  patients: ['patients'] as const,
  patient: (id: string) => ['patient', id] as const,
  patientVitals: (id: string) => ['patient', id, 'vitals'] as const,
  patientNotes: (id: string) => ['patient', id, 'notes'] as const,
  patientMedications: (id: string) => ['patient', id, 'medications'] as const,
  patientImages: (id: string) => ['patient', id, 'images'] as const,
  patientAssessments: (id: string) => ['patients', id, 'assessments'] as const,
  patientWounds: (id: string) => ['patients', id, 'wounds'] as const,
  
  // Authentication queries
  auth: {
    all: ['auth'] as const,
    user: ['auth', 'user'] as const,
    listener: ['auth', 'listener'] as const,
    profile: (userId: string) => ['auth', 'profile', userId] as const,
  },
  
  // Alert queries
  alerts: {
    all: ['alerts'] as const,
    active: ['alerts', 'active'] as const,
    acknowledged: ['alerts', 'acknowledged'] as const,
    unread: ['alerts', 'unread'] as const,
  },
  
  // Medication-related queries
  medications: ['medications'] as const,
  allMedications: () => ['medications', 'list'] as const,
  medication: (id: string) => ['medications', id] as const,
  medicationAdministration: (patientId: string) => ['medications', 'administration', patientId] as const,
  dueMedications: (patientId: string) => ['medications', 'due', patientId] as const,
  overdueMedications: (patientId: string) => ['medications', 'overdue', patientId] as const,
  
  // User management queries
  users: ['users'] as const,
  user: (id: string) => ['user', id] as const,
} as const;
