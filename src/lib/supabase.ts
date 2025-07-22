import { createClient } from '@supabase/supabase-js';

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

// Log configuration status for debugging (with more details for troubleshooting)
console.log('🔧 Supabase Environment Check:');
if (supabaseUrl) {
  console.log('  URL:', `${supabaseUrl.substring(0, 50)}...`);
} else {
  console.error('  URL: Not set - Please check your .env file');
}

if (supabaseAnonKey) {
  console.log('  Key:', `${supabaseAnonKey.substring(0, 30)}...`);
} else {
  console.error('  Key: Not set - Please check your .env file');
}

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
  console.error('⚠️ Missing or invalid Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'undefined'
  });
  console.warn('💡 Copy .env.example to .env and add your Supabase credentials.');
  console.warn('🔗 Get your credentials from: https://app.supabase.com/project/[your-project]/settings/api');
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
    global: {
      headers: {
        'x-application-name': 'haccare-hospital'
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
 * Organization Interface
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  settings: Record<string, any>;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

/**
 * User Profile Interface
 */
export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  organization_id?: string;
  organization?: Organization;
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
    console.warn('⚠️ Supabase client not properly configured - check environment variables');
    return false; 
  }

  try {
    console.log('🔍 Testing database connection...');
    
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
        console.warn('🔌 Database connection failed:', error.message);
        console.warn('🔌 Database connection failed - please check your Supabase configuration and internet connection');
        return false;
      }
      
      console.log('✅ Database connection successful');
      return true;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.warn('🔌 Database connection timeout - request took too long');
      } else {
        console.warn('🔌 Database connection error:', fetchError.message);
      }
      
      return false;
    }
    
  } catch (error: any) {
    // Consolidate all network-related errors into a single informative message
    console.warn('🔌 Unable to connect to database - please verify your Supabase URL and API key in .env file');
    return false;
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
        console.log(`✅ Connection successful on attempt ${i + 1}`);
        return true;
      }
      console.log(`❌ Connection attempt ${i + 1} failed, will retry ${retries - i - 1} more times`);
    } catch (error) {
      console.log(`Connection attempt ${i + 1} failed:`, error);
      if (i < retries - 1) {
        // Wait before retrying (exponential backoff)
        const backoffTime = Math.pow(2, i) * 1000;
        console.log(`Waiting ${backoffTime}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      }
    }
  }
  console.log('All connection attempts failed');
  return false;
};