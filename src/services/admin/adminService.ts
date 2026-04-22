/**
 * Admin Service
 * Handles session track    // Now get active sessions (within last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('status', 'active')
      .is('logout_time', null)
      .gte('last_activity', twentyFourHoursAgo)  // Only sessions active in last 24 hours
      .order('last_activity', { ascending: false }); audit logging for admin dashboard
 */

import { supabase } from '../../lib/api/supabase';
import { secureLogger } from '../../lib/security/secureLogger';

export interface UserSession {
  id: string;
  user_id: string;
  ip_address: string;
  user_agent?: string;
  tenant_id?: string;
  login_time: string;
  last_activity: string;
  logout_time?: string;
  status: 'active' | 'idle' | 'logged_out';
  
  // Joined data
  user_email?: string;
  user_name?: string;
  tenant_name?: string;
}

// Focused on login sessions only - no activity logging

/**
 * Get active user sessions with user and tenant information
 */
export const getActiveSessions = async (): Promise<UserSession[]> => {
  try {
    secureLogger.debug('📊 Fetching active sessions...');
    
    // First check if we can access the user_sessions table at all
    const { count, error: countError } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      secureLogger.error('❌ Cannot access user_sessions table:', countError);
      throw countError;
    }

    secureLogger.debug(`📈 Total sessions in database: ${count}`);

    // Now get active sessions
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('status', 'active')
      .is('logout_time', null)
      .order('last_activity', { ascending: false });

    if (sessionsError) {
      secureLogger.error('❌ Error fetching active sessions:', sessionsError);
      throw sessionsError;
    }

    secureLogger.debug(`🔍 Raw sessions query result:`, sessionsData);

    if (!sessionsData || sessionsData.length === 0) {
      secureLogger.debug('⚠️ No active sessions found. Checking all sessions...');
      
      // Check what sessions exist with different statuses
      const { data: allSessions } = await supabase
        .from('user_sessions')
        .select('status, COUNT(*)')
        .is('logout_time', null);
        
      secureLogger.debug('📊 Session status breakdown:', allSessions);
      return [];
    }

    secureLogger.debug(`✅ Found ${sessionsData.length} active sessions:`, sessionsData.map(s => ({ id: s.id, user_id: s.user_id, ip: s.ip_address, status: s.status })));

    // Get unique user IDs from sessions, filtering out null values
    const userIds = [...new Set(sessionsData.map(session => session.user_id).filter(id => id !== null))];
    
    let profilesData: { id: string; email: string; first_name: string; last_name: string }[] = [];
    let profilesError = null;
    
    // Only fetch user profiles if we have valid user IDs
    if (userIds.length > 0) {
      const result = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);
      
      profilesData = result.data || [];
      profilesError = result.error;
    }

    if (profilesError) {
      secureLogger.warn('Could not fetch user profiles:', profilesError);
    }

    // Create a map of user profiles for quick lookup
    const profilesMap = new Map();
    (profilesData || []).forEach(profile => {
      profilesMap.set(profile.id, profile);
    });

    // Get unique tenant IDs for tenant name lookup
    const tenantIds = [...new Set(sessionsData.map(session => session.tenant_id).filter(id => id !== null))];
    
    // Fetch tenant names
    let tenantsData: { id: string; name: string }[] = [];
    if (tenantIds.length > 0) {
      const { data, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name')
        .in('id', tenantIds);
      
      if (tenantError) {
        secureLogger.warn('Could not fetch tenant names:', tenantError);
      } else {
        tenantsData = data || [];
      }
    }

    // Create tenant name map
    const tenantsMap = new Map();
    tenantsData.forEach(tenant => {
      tenantsMap.set(tenant.id, tenant.name);
    });

    // Combine session data with user profiles and tenant names
    const sessions: UserSession[] = sessionsData.map(session => {
      const profile = profilesMap.get(session.user_id);
      const tenantName = tenantsMap.get(session.tenant_id);
      
      return {
        id: session.id,
        user_id: session.user_id,
        ip_address: session.ip_address,
        user_agent: session.user_agent,
        tenant_id: session.tenant_id,
        login_time: session.login_time,
        last_activity: session.last_activity,
        logout_time: session.logout_time,
        status: session.status,
        user_email: profile?.email || 'Unknown',
        user_name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : 'Unknown User',
        tenant_name: tenantName || 'Unknown Tenant'
      };
    });

    secureLogger.debug(`✅ Retrieved ${sessions.length} active sessions`);
    return sessions;
  } catch (error) {
    secureLogger.error('Failed to fetch active sessions:', error);
    return [];
  }
};



/**
 * Create or update user session
 */
export const createUserSession = async (
  ipAddress: string | null,
  userAgent?: string,
  tenantId?: string,
  accessToken?: string
): Promise<string | null> => {
  try {
    secureLogger.debug('🔐 Creating/updating user session...');

    let data: string | null = null;

    if (accessToken) {
      // Use a direct fetch with the already-obtained access token so we never call
      // supabase.auth.getSession() → _acquireLock, which would contend with the
      // MFA challenge flow running concurrently on the same lock.
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/create_user_session`, {
        method: 'POST',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          p_ip_address: ipAddress,
          p_user_agent: userAgent,
          p_tenant_id: tenantId ?? null,
        }),
      });
      if (!response.ok) {
        const msg = await response.text();
        secureLogger.error('Error creating user session (direct fetch):', msg);
        return null;
      }
      data = await response.json();
    } else {
      const result = await supabase.rpc('create_user_session', {
        p_ip_address: ipAddress,
        p_user_agent: userAgent,
        p_tenant_id: tenantId,
      });
      if (result.error) {
        secureLogger.error('Error creating user session:', result.error);
        throw result.error;
      }
      data = result.data;
    }

    secureLogger.debug('✅ User session created/updated:', data);
    return data;
  } catch (error) {
    secureLogger.error('Failed to create user session:', error);
    return null;
  }
};

/**
 * End current user session
 */
export const endUserSession = async (): Promise<boolean> => {
  try {
    secureLogger.debug('🚪 Ending user session...');
    
    const { data, error } = await supabase.rpc('end_user_session');

    if (error) {
      secureLogger.error('Error ending user session:', error);
      throw error;
    }

    secureLogger.debug('✅ User session ended successfully');
    return data;
  } catch (error) {
    secureLogger.error('Failed to end user session:', error);
    return false;
  }
};



/**
 * Get recent login history (last 20 logins)
 */
export const getRecentLoginHistory = async (): Promise<UserSession[]> => {
  try {
    secureLogger.debug('📜 Fetching recent login history...');
    
    const { data, error } = await supabase
      .from('recent_login_history')
      .select('*')
      .lte('login_rank', 20)
      .order('login_time', { ascending: false });

    if (error) {
      secureLogger.error('❌ Error fetching login history:', error);
      throw error;
    }

    const loginHistory: UserSession[] = (data || []).map(record => ({
      id: record.id,
      user_id: record.user_id,
      ip_address: record.ip_address,
      user_agent: record.user_agent,
      tenant_id: record.tenant_id,
      login_time: record.login_time,
      last_activity: record.login_time, // For history, this is the same as login_time
      logout_time: record.logout_time,
      status: record.status as 'active' | 'idle' | 'logged_out',
      user_email: record.email || 'Unknown',
      user_name: record.first_name && record.last_name 
        ? `${record.first_name} ${record.last_name}`.trim() 
        : 'Unknown User',
      tenant_name: record.tenant_name || 'Unknown Tenant'
    }));

    secureLogger.debug(`📜 Retrieved ${loginHistory.length} login history records`);
    return loginHistory;
  } catch (error) {
    secureLogger.error('Failed to fetch login history:', error);
    return [];
  }
};

/**
 * Get system statistics for admin dashboard
 */
export const getSystemStats = async () => {
  try {
    const activeSessions = await getActiveSessions();

    return {
      activeSessionCount: activeSessions.length,
      systemStatus: 'online'
    };
  } catch (error) {
    secureLogger.error('Failed to get system stats:', error);
    return {
      activeSessionCount: 0,
      systemStatus: 'error'
    };
  }
};

/**
 * Cleanup old sessions (admin function)
 */
export const cleanupOldSessions = async () => {
  try {
    secureLogger.debug('🧹 Cleaning up old sessions...');
    
    const { data, error } = await supabase.rpc('cleanup_old_sessions');

    if (error) {
      secureLogger.error('Error cleaning up sessions:', error);
      throw error;
    }

    secureLogger.debug(`✅ Cleanup complete - Sessions deleted: ${data || 0}`);
    
    return {
      sessionsDeleted: data || 0
    };
  } catch (error) {
    secureLogger.error('Failed to cleanup old sessions:', error);
    return { sessionsDeleted: 0 };
  }
};

/**
 * Initialize session tracking on login (non-blocking, fire-and-forget).
 *
 * @param tenantId - Optional tenant ID
 * @param preloadedUser - Pass the user from onAuthStateChange session to avoid
 *   calling supabase.auth.getUser() inside an auth subscriber, which would queue
 *   another _acquireLock call inside signInWithPassword's drain loop and delay
 *   the subsequent mfa.getAuthenticatorAssuranceLevel() call.
 */
export const initializeSessionTracking = async (
  tenantId?: string,
  preloadedUser?: { id: string; email?: string } | null,
  accessToken?: string
) => {
  try {
    let user = preloadedUser ?? null;

    // Only call getUser() if we weren't given the user — avoids Supabase lock
    // contention when called from within an onAuthStateChange subscriber.
    if (!user) {
      const { data } = await supabase.auth.getUser();
      user = data.user;
    }

    if (!user) {
      secureLogger.error('❌ No authenticated user found for session tracking');
      return null;
    }

    // Pass the access token through so createUserSession can use a direct fetch
    // instead of supabase.rpc() → _getAccessToken() → getSession() → _acquireLock.
    createUserSession(null, navigator.userAgent, tenantId, accessToken)
      .then(sessionId => {
        if (sessionId) {
          secureLogger.debug('✅ Session tracking completed successfully:', sessionId);
        }
      })
      .catch(error => {
        secureLogger.warn('⚠️ Background session tracking failed (non-critical):', error);
      });

    return null;
  } catch (error) {
    secureLogger.error('❌ Failed to initialize session tracking:', error);
    return null;
  }
};

