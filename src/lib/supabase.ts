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
 * 
 * IMPORTANT: This app uses ONLY Supabase for data persistence.
 * No localStorage or sessionStorage is used for application data.
 * All user sessions, profiles, and application state are managed by Supabase.
 */

// Extract environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Log configuration status for debugging
console.log('🔧 Supabase Environment Check:');
console.log('  URL:', supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : 'Not set');
console.log('  Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 30)}...` : 'Not set');

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

/**
 * Test connection to Supabase
 * Verifies that the Supabase instance is reachable and properly configured
 */
const testSupabaseConnection = async () => {
  if (!hasValidConfig) {
    console.warn('⚠️ Supabase is not configured. Please set up your Supabase project.');
    return false;
  }

  try {
    console.log('🔍 Testing Supabase connection...');
    const testClient = createClient(supabaseUrl, supabaseAnonKey);
    
    // Simple test query to check connectivity
    const { data, error } = await testClient
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection test failed:', error.message);
      if (error.message.includes('Failed to fetch')) {
        console.error('💡 This usually means:');
        console.error('   - The Supabase URL is incorrect');
        console.error('   - The Supabase project is paused or deleted');
        console.error('   - Network connectivity issues');
        console.error('   - CORS issues (check Supabase project settings)');
      }
      return false;
    }
    
    console.log('✅ Supabase connection test successful');
    return true;
  } catch (error: any) {
    console.error('❌ Supabase connection test error:', error.message);
    return false;
  }
};

// Run connection test in development
if (import.meta.env.DEV && hasValidConfig) {
  testSupabaseConnection();
}

/**
 * Fallback configuration for unconfigured environments
 * Prevents initialization errors when Supabase is not set up
 * These are dummy values that won't work for actual operations
 */
const fallbackUrl = 'https://dummy.supabase.co';
const fallbackKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1bW15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTI4MDAsImV4cCI6MTk2MDc2ODgwMH0.dummy';

/**
 * Supabase Client Instance
 * Configured with optimized settings for the hospital management system
 * 
 * Key Configuration Notes:
 * - autoRefreshToken: Automatically refreshes auth tokens
 * - persistSession: Persists sessions across browser sessions (via Supabase, not localStorage)
 * - detectSessionInUrl: Handles auth redirects
 * - flowType: Uses PKCE for enhanced security
 * - Custom headers for client identification
 */
export const supabase = createClient(
  hasValidConfig ? supabaseUrl : fallbackUrl,
  hasValidConfig ? supabaseAnonKey : fallbackKey,
  {
    auth: {
      autoRefreshToken: hasValidConfig,    // Only auto-refresh if properly configured
      persistSession: hasValidConfig,      // Only persist sessions if configured (uses Supabase storage)
      detectSessionInUrl: hasValidConfig,  // Only detect URL sessions if configured
      flowType: 'pkce',                   // Use PKCE flow for enhanced security
      storage: hasValidConfig ? undefined : {
        // Dummy storage for unconfigured environments
        // Note: When configured, Supabase uses its own storage mechanism
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
 * When false, the app will show configuration prompts instead of trying to use the database
 */
export const isSupabaseConfigured = hasValidConfig;

/**
 * User Role Types
 * Defines the available roles in the hospital management system
 * These roles control access to different features and data
 */
export type UserRole = 'nurse' | 'admin' | 'super_admin';

/**
 * User Profile Interface
 * Defines the structure of user profile data stored in the Supabase database
 * This data is fetched from the user_profiles table, not stored locally
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

/**
 * Database Health Check
 * Utility function to verify database connectivity
 * Can be called from components to check if Supabase is accessible
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    return !error;
  } catch {
    return false;
  }
};

/**
 * Clear Supabase Session
 * Utility function to clear the current Supabase session
 * This is the proper way to sign out and clear session data
 */
export const clearSupabaseSession = async (): Promise<void> => {
  try {
    await supabase.auth.signOut();
    console.log('✅ Supabase session cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing Supabase session:', error);
    throw error;
  }
};