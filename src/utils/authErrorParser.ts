/**
 * Auth Error Parser
 * 
 * Utility for parsing and standardizing authentication error messages
 * to provide consistent, user-friendly error feedback.
 */

/**
 * Parse authentication error into a user-friendly message
 * 
 * @param {any} error - The error object from authentication operations
 * @returns {string} A user-friendly error message
 */
export function parseAuthError(error: any): string {
  // Return early if no error or message
  if (!error) return "An unknown error occurred";
  if (!error.message) return "Authentication failed";
  
  const msg = error.message.toLowerCase();
  
  // Network and connectivity errors
  if (msg.includes('failed to fetch') || 
      msg.includes('networkerror') || 
      msg.includes('network error')) {
    return "Network connection error. Please check your internet connection and try again.";
  }
  
  if (msg.includes('timeout')) {
    return "Connection timeout. Please check your internet connection and try again.";
  }
  
  // Authentication specific errors
  if (msg.includes('invalid login credentials')) {
    return "Invalid email or password. Please check your credentials and try again.";
  }
  
  if (msg.includes('email not confirmed')) {
    return "Please confirm your email address before signing in.";
  }
  
  if (msg.includes('too many requests') || msg.includes('rate limit')) {
    return "Too many login attempts. Please wait a moment before trying again.";
  }
  
  if (msg.includes('user not found')) {
    return "Account not found. Please check your email or create a new account.";
  }
  
  if (msg.includes('invalid refresh token') || 
      msg.includes('refresh token not found') ||
      msg.includes('refresh_token_not_found')) {
    return "Your session has expired. Please sign in again.";
  }
  
  // Database and configuration errors
  if (msg.includes('database connection') || 
      msg.includes('supabase not configured')) {
    return "Database connection not configured. Please check your environment variables.";
  }
  
  // Password-related errors
  if (msg.includes('password')) {
    if (msg.includes('too short')) {
      return "Password is too short. Please use at least 6 characters.";
    }
    if (msg.includes('too weak')) {
      return "Password is too weak. Please include a mix of letters, numbers, and special characters.";
    }
    if (msg.includes('do not match')) {
      return "Passwords do not match. Please try again.";
    }
  }
  
  // Return the original message if no specific case matches
  return error.message;
}