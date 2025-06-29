import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Configuration and Client Setup
 * 
 * This module handles the initialization and configuration of the Supabase client
 * for the hacCare hospital management system. It includes:
 * - Environment variable validation
 * - Client configuration with optimized settings
 * - Type definitions for user profiles and roles
 * - Fallback handling for unconfigured environments
 */

// Extract environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log configuration status for debugging
console.log('🔧 Supabase Environment Check:');
console.log('  URL:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'Not set');
console.log('  Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'Not set');

/**
 * Validate Supabase configuration
 * Checks if environment variables are properly set and valid
 */
const hasValidConfig = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_url_here' && 
  supabaseAnonKey !== 'your_supabase_anon_key_here' &&
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co');

console.log('✅ Configuration valid:', hasValidConfig);

if (!hasValidConfig) {
  console.warn('⚠️ Supabase is not configured. Please set up your Supabase project.');
}

/**
 * Fallback configuration for unconfigured environments
 * Prevents initialization errors when Supabase is not set up
 */
const fallbackUrl = 'https://dummy.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.dummy';

/**
 * Supabase Client Instance
 * Configured with optimized settings for the hospital management system
 */
export const supabase = createClient(
  hasValidConfig ? supabaseUrl : fallbackUrl,
  hasValidConfig ? supabaseAnonKey : fallbackKey,
  {
    auth: {
      autoRefreshToken: hasValidConfig,    // Only auto-refresh if properly configured
      persistSession: hasValidConfig,      // Only persist sessions if configured
      detectSessionInUrl: hasValidConfig,  // Only detect URL sessions if configured
      flowType: 'pkce',                   // Use PKCE flow for enhanced security
      storage: hasValidConfig ? undefined : {
        // Dummy storage for unconfigured environments
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {}
      }
    },
    global: {
      headers: {
        'x-client-info': 'haccare-hospital@1.0.0' // Client identification
      }
    },
    db: {
      schema: 'public' // Use public schema
    },
    realtime: {
      params: {
        eventsPerSecond: 10 // Limit realtime events for performance
      }
    }
  }
);

/**
 * Configuration status flag
 * Used throughout the app to check if Supabase is properly configured
 */
export const isSupabaseConfigured = hasValidConfig;

/**
 * User Role Types
 * Defines the available roles in the hospital management system
 */
export type UserRole = 'nurse' | 'admin' | 'super_admin';

/**
 * User Profile Interface
 * Defines the structure of user profile data stored in the database
 */
export interface UserProfile {
  id: string;              // UUID from Supabase Auth
  email: string;           // User's email address
  first_name: string;      // User's first name
  last_name: string;       // User's last name
  role: UserRole;          // User's role in the system
  department?: string;     // Department assignment (optional)
  license_number?: string; // Professional license number (optional)
  phone?: string;          // Contact phone number (optional)
  is_active: boolean;      // Account active status
  created_at: string;      // Account creation timestamp
  updated_at: string;      // Last update timestamp
}