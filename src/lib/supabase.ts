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
console.log('  URL:', supabaseUrl ? `${supabaseUrl.substring(0, 50)}...` : 'Not set');
console.log('  Key:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 30)}...` : 'Not set');

/**
 * Validate Supabase configuration
 * Checks if environment variables are properly set and valid
 */
const hasValidConfig = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_url_here' && 
  supabaseAnonKey !== 'your_supabase_anon_key_here' &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key-here' &&
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co');

console.log('✅ Configuration valid:', hasValidConfig);

if (!hasValidConfig) {
  console.warn('⚠️ Supabase not configured properly. Please check your .env file.');
  console.warn('💡 Copy .env.example to .env and add your Supabase credentials.');
}

/**
 * Supabase Client Instance
 * Configured with optimized settings for the hospital management system
 */
export const supabase = createClient(
  supabaseUrl || 'https://dummy.supabase.co',
  supabaseAnonKey || 'dummy-key',
  {
    auth: {
      autoRefreshToken: hasValidConfig,
      persistSession: hasValidConfig,
      detectSessionInUrl: hasValidConfig,
      flowType: 'pkce',
    },
    global: {
      headers: {
        'x-client-info': 'haccare-hospital@1.0.0'
      },
      fetch: (url, options = {}) => {
        // Skip fetch if not configured
        if (!hasValidConfig) {
          return Promise.reject(new Error('Supabase not configured'));
        }
        
        // Add timeout and better error handling for fetch requests
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        return fetch(url, {
          ...options,
          signal: controller.signal,
        }).finally(() => {
          clearTimeout(timeoutId);
        }).catch((error) => {
          if (error.name === 'AbortError') {
            throw new Error('Request timeout - please check your internet connection');
          }
          throw error;
        });
      }
    },
    db: {
      schema: 'public'
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
  created_at: string;
  updated_at: string;
}

/**
 * Database Health Check with improved error handling
 */
export const checkDatabaseHealth = async (): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    console.log('Database not configured, using mock data mode');
    return false;
  }

  try {
    console.log('🔍 Testing database connection...');
    
    // Use a simple query that should always work
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Database health check failed:', error.message);
      
      // Check for specific error types
      if (error.message.includes('Failed to fetch')) {
        console.error('Network connectivity issue detected');
        throw new Error('Unable to connect to database. Please check your internet connection.');
      }
      
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error: any) {
    console.error('Database health check error:', error.message);
    
    // Provide more specific error messages
    if (error.message.includes('fetch')) {
      console.error('Network error: Unable to reach Supabase servers');
    } else if (error.message.includes('timeout')) {
      console.error('Connection timeout: Request took too long');
    }
    
    return false;
  }
};

/**
 * Clear Supabase Session
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

/**
 * Test Supabase connection with retry logic
 */
export const testSupabaseConnection = async (retries = 3): Promise<boolean> => {
  for (let i = 0; i < retries; i++) {
    try {
      const isHealthy = await checkDatabaseHealth();
      if (isHealthy) {
        return true;
      }
    } catch (error) {
      console.log(`Connection attempt ${i + 1} failed:`, error);
      if (i < retries - 1) {
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  return false;
};