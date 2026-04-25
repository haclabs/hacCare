import { supabase, isSupabaseConfigured } from '../api/supabase';
import { secureLogger } from '../security/secureLogger';

/**
 * Connection Test Utility
 * 
 * This module provides functions to test and diagnose Supabase connection issues.
 */

/**
 * Run a comprehensive connection test
 * Tests various aspects of the Supabase connection and returns detailed results
 */
export const runConnectionTest = async () => {
  secureLogger.debug('Running comprehensive Supabase connection test...');
  
  const results = {
    configPresent: false,
    configValid: false,
    networkReachable: false,
    authServiceWorking: false,
    databaseQueryWorking: false,
    errors: [] as string[]
  };
  
  // Check if configuration is present
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  results.configPresent = !!(supabaseUrl && supabaseAnonKey);
  
  if (!results.configPresent) {
    results.errors.push('Supabase configuration missing. Check your .env file.');
    secureLogger.error('Supabase configuration missing');
    return results;
  }
  
  // Check if configuration looks valid
  results.configValid = isSupabaseConfigured;
  
  if (!results.configValid) {
    results.errors.push('Supabase configuration invalid. URL should start with https:// and include .supabase.co');
    secureLogger.error('Supabase configuration invalid');
    return results;
  }
  
  // Check network connectivity
  try {
    await fetch(supabaseUrl, { 
      method: 'HEAD',
      mode: 'no-cors'
    });
    results.networkReachable = true;
    secureLogger.debug('Network connectivity test passed');
  } catch (error) {
    results.errors.push(`Network connectivity issue: ${error}`);
    secureLogger.error('Network connectivity test failed', error);
    return results;
  }
  
  // Test auth service
  try {
    const { error } = await supabase.auth.getSession();
    results.authServiceWorking = !error;
    
    if (error) {
      results.errors.push(`Auth service error: ${error.message}`);
      secureLogger.error('Auth service test failed', error);
    } else {
      secureLogger.debug('Auth service test passed');
    }
  } catch (error: any) {
    results.errors.push(`Auth service exception: ${error.message}`);
    secureLogger.error('Auth service test exception', error);
  }
  
  // Test database query
  try {
    const { error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    results.databaseQueryWorking = !error;
    
    if (error) {
      results.errors.push(`Database query error: ${error.message}`);
      secureLogger.error('Database query test failed', error);
    } else {
      secureLogger.debug('Database query test passed');
    }
  } catch (error: any) {
    results.errors.push(`Database query exception: ${error.message}`);
    secureLogger.error('Database query test exception', error);
  }
  
  secureLogger.debug('Connection test complete', { results });
  return results;
};

/**
 * Get connection status summary
 * Returns a user-friendly summary of the connection status
 */
export const getConnectionStatus = async () => {
  const results = await runConnectionTest();
  
  if (!results.configPresent) {
    return {
      status: 'unconfigured',
      message: 'Supabase configuration is missing. Please check your .env file.',
      details: results
    };
  }
  
  if (!results.configValid) {
    return {
      status: 'invalid',
      message: 'Supabase configuration is invalid. Please check your URL and API key.',
      details: results
    };
  }
  
  if (!results.networkReachable) {
    return {
      status: 'network',
      message: 'Cannot reach Supabase servers. Please check your internet connection.',
      details: results
    };
  }
  
  if (!results.authServiceWorking) {
    return {
      status: 'auth',
      message: 'Authentication service is not working. Your API key may be invalid.',
      details: results
    };
  }
  
  if (!results.databaseQueryWorking) {
    return {
      status: 'database',
      message: 'Database queries are failing. Check your database schema and permissions.',
      details: results
    };
  }
  
  return {
    status: 'connected',
    message: 'Connected to Supabase successfully.',
    details: results
  };
};