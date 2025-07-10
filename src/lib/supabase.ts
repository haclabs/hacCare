import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types'

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
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

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
  supabaseUrl.includes('.supabase.co') &&
  supabaseUrl.length > 30 &&
  supabaseAnonKey.length > 50;

console.log('✅ Configuration valid:', hasValidConfig);

if (!hasValidConfig) {
  console.error('Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'undefined'
  })
  console.warn('💡 Copy .env.example to .env and add your Supabase credentials.');
  console.warn('🔗 Get your credentials from: https://app.supabase.com/project/[your-project]/settings/api');
}

/**
 * Supabase Client Instance
 * Configured with optimized settings for the hospital management system
 */
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: hasValidConfig,
        flowType: 'pkce',
      },
      global: {
        headers: {
          'x-application-name': 'nurse-dashboard'
        }
      },
      db: {
        schema: 'public'
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      }
    })
  : null;

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
  if (!supabase) {
    console.error('Supabase client not initialized - check environment variables')
    return false
  }

  try {
    console.log('🔍 Testing database connection...');
    
    // Use a simple query with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
    
    const { error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1)
      .abortSignal(controller.signal)
    
    clearTimeout(timeoutId)
    
    if (error) {
      console.error('Database health check failed:', error.message);
      
      // Check for specific error types
      if (error.message.includes('Failed to fetch')) {
        console.error('Network connectivity issue detected');
        return false;
      }
      
      return false;
    }
    
    console.log('✅ Database connection successful');
    return true;
  } catch (error: any) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('Database connection timeout')
      } else {
        console.error('Database health check failed:', error.message)
      }
    }
    
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
  if (!isSupabaseConfigured) {
    console.log('Supabase not configured, skipping session clear');
    return;
  }

  try {
    await supabase.auth.signOut();
    console.log('✅ Supabase session cleared successfully');
  } catch (error) {
    console.error('❌ Error clearing Supabase session:', error);
    // Don't throw error, just log it
    return;
  }
};

/**
 * Test Supabase connection with retry logic
 */
export const testSupabaseConnection = async (retries = 3): Promise<boolean> => {
  if (!isSupabaseConfigured) {
    console.log('Supabase not configured, skipping connection test');
    return false;
  }

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
  console.log('All connection attempts failed');
  return false;
};

// Initialize connection check
export async function initializeSupabase(): Promise<boolean> {
  if (!supabase) {
    console.warn('⚠️ Supabase not configured - running in offline mode')
    return false
  }
  
  const isHealthy = await checkDatabaseHealth()
  if (!isHealthy) {
    console.warn('⚠️ Database connection failed - some features may be limited')
  }
  
  return isHealthy
}