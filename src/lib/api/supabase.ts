import { createClient } from '@supabase/supabase-js';
import { secureLogger } from '../security/secureLogger';

/**
 * Supabase Configuration and Client Setup
 * 
 * This module handles the initialization and configuration of the Supabase client
 * for the hacCare hospital management system. It includes:
 * - Environment variable validation
 * - Client configuration with optimized settings
 * - Type definitions for user profiles and roles
 * - Proper error handling for connection issues
 * 
 * IMPORTANT: This app uses ONLY Supabase for data persistence.
 * No localStorage or sessionStorage is used for application data.
 * All user sessions, profiles, and application state are managed by Supabase.
 */

// Extract environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// Log configuration status for debugging (development only)
if (import.meta.env.DEV) {
  secureLogger.debug('Supabase Environment Check', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlPrefix: supabaseUrl ? supabaseUrl.substring(0, 50) : 'not set',
    keyPrefix: supabaseAnonKey ? supabaseAnonKey.substring(0, 15) : 'not set'
  });
}

/**
 * Validate Supabase configuration
 * Checks if environment variables are properly set and valid
 */
// Validate configuration - strict validation for production environment
// Support both legacy JWT format and new sb_publishable_ format
const isValidUrl = supabaseUrl && (
  supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co')
);
const isValidKey = supabaseAnonKey && 
  supabaseAnonKey.length > 30 && 
  (
    // New format: sb_publishable_xxx
    supabaseAnonKey.startsWith('sb_') ||
    // Legacy format: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
    supabaseAnonKey.startsWith('eyJ')
  );
const hasValidConfig = isValidUrl && isValidKey;

if (import.meta.env.DEV) {
  secureLogger.debug('Supabase configuration valid', { hasValidConfig });
}

if (!hasValidConfig) {
  if (import.meta.env.DEV) {
    secureLogger.warn('Missing or invalid Supabase environment variables', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseAnonKey
    });
  }
}

/**
 * Supabase Client Instance
 * Configured with optimized settings for the hospital management system
 */
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: hasValidConfig,
      flowType: 'pkce',
    },
    db: {
      schema: 'public'
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

/**
 * Configuration status flag
 */
export const isSupabaseConfigured = hasValidConfig;

/**
 * User Role Types
 */
export type UserRole = 'nurse' | 'admin' | 'super_admin';

/**
 * User Profile Interface
 */
export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  department?: string;
  license_number?: string;
  phone?: string;
  is_active: boolean;
  simulation_only?: boolean | null;
  created_at: string;
  updated_at: string;
}

/**
 * Database Health Check with improved error handling
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    secureLogger.warn('Supabase client not properly configured - check environment variables');
    return false; 
  }

  try {
    secureLogger.debug('Testing database connection...');
    
    // Use a simple query with timeout
    const controller = new AbortController(); 
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout to 15 seconds
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .select('count')
        .limit(1)
        .abortSignal(controller.signal);
      
      clearTimeout(timeoutId);
      
      if (error) {
        secureLogger.warn('Database connection failed', { message: error.message });
        return false;
      }
      
      secureLogger.debug('Database connection successful');
      return true;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        secureLogger.warn('Database connection timeout');
      } else {
        secureLogger.warn('Database connection error', { message: fetchError.message });
      }
      
      return false;
    }
    
  } catch (error: any) {
    secureLogger.warn('Unable to connect to database - check Supabase URL and API key');
    return false;
  }
};

/**
 * Test Supabase connection with retry logic
 */
export const testSupabaseConnection = async (retries = 3): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    return false; 
  }

  for (let i = 0; i < retries; i++) {
    try {
      const isHealthy = await checkDatabaseHealth();
      if (isHealthy) {
        secureLogger.debug('Connection successful', { attempt: i + 1 });
        return true;
      }
      secureLogger.debug('Connection attempt failed, retrying', { attempt: i + 1, remaining: retries - i - 1 });
    } catch (error) {
      secureLogger.debug('Connection attempt exception', { attempt: i + 1 });
      if (i < retries - 1) {
        const backoffTime = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }
  secureLogger.warn('All connection attempts failed');
  return false;
};