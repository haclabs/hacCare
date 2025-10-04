import { supabase, isSupabaseConfigured } from './supabase';

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
  console.log('🔍 Running comprehensive Supabase connection test...');
  
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
    console.error('❌ Supabase configuration missing');
    return results;
  }
  
  // Check if configuration looks valid
  results.configValid = isSupabaseConfigured;
  
  if (!results.configValid) {
    results.errors.push('Supabase configuration invalid. URL should start with https:// and include .supabase.co');
    console.error('❌ Supabase configuration invalid');
    return results;
  }
  
  // Check network connectivity
  try {
    const networkTest = await fetch(supabaseUrl, { 
      method: 'HEAD',
      mode: 'no-cors'
    });
    results.networkReachable = true;
    console.log('✅ Network connectivity test passed');
  } catch (error) {
    results.errors.push(`Network connectivity issue: ${error}`);
    console.error('❌ Network connectivity test failed:', error);
    return results;
  }
  
  // Test auth service
  try {
    const { data, error } = await supabase.auth.getSession();
    results.authServiceWorking = !error;
    
    if (error) {
      results.errors.push(`Auth service error: ${error.message}`);
      console.error('❌ Auth service test failed:', error);
    } else {
      console.log('✅ Auth service test passed');
    }
  } catch (error: any) {
    results.errors.push(`Auth service exception: ${error.message}`);
    console.error('❌ Auth service test exception:', error);
  }
  
  // Test database query
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);
    
    results.databaseQueryWorking = !error;
    
    if (error) {
      results.errors.push(`Database query error: ${error.message}`);
      console.error('❌ Database query test failed:', error);
    } else {
      console.log('✅ Database query test passed');
    }
  } catch (error: any) {
    results.errors.push(`Database query exception: ${error.message}`);
    console.error('❌ Database query test exception:', error);
  }
  
  console.log('🔍 Connection test results:', results);
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