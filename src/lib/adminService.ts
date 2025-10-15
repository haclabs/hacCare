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

import { supabase } from './supabase';

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
    console.log('📊 Fetching active sessions...');
    
    // First check if we can access the user_sessions table at all
    const { count, error: countError } = await supabase
      .from('user_sessions')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Cannot access user_sessions table:', countError);
      throw countError;
    }

    console.log(`📈 Total sessions in database: ${count}`);

    // Now get active sessions
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('status', 'active')
      .is('logout_time', null)
      .order('last_activity', { ascending: false });

    if (sessionsError) {
      console.error('❌ Error fetching active sessions:', sessionsError);
      throw sessionsError;
    }

    console.log(`🔍 Raw sessions query result:`, sessionsData);

    if (!sessionsData || sessionsData.length === 0) {
      console.log('⚠️ No active sessions found. Checking all sessions...');
      
      // Check what sessions exist with different statuses
      const { data: allSessions } = await supabase
        .from('user_sessions')
        .select('status, COUNT(*)')
        .is('logout_time', null);
        
      console.log('📊 Session status breakdown:', allSessions);
      return [];
    }

    console.log(`✅ Found ${sessionsData.length} active sessions:`, sessionsData.map(s => ({ id: s.id, user_id: s.user_id, ip: s.ip_address, status: s.status })));

    // Get unique user IDs from sessions, filtering out null values
    const userIds = [...new Set(sessionsData.map(session => session.user_id).filter(id => id !== null))];
    
    let profilesData: any[] = [];
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
      console.warn('Could not fetch user profiles:', profilesError);
    }

    // Create a map of user profiles for quick lookup
    const profilesMap = new Map();
    (profilesData || []).forEach(profile => {
      profilesMap.set(profile.id, profile);
    });

    // Get unique tenant IDs for tenant name lookup
    const tenantIds = [...new Set(sessionsData.map(session => session.tenant_id).filter(id => id !== null))];
    
    // Fetch tenant names
    let tenantsData: any[] = [];
    if (tenantIds.length > 0) {
      const { data, error: tenantError } = await supabase
        .from('tenants')
        .select('id, name')
        .in('id', tenantIds);
      
      if (tenantError) {
        console.warn('Could not fetch tenant names:', tenantError);
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

    console.log(`✅ Retrieved ${sessions.length} active sessions`);
    return sessions;
  } catch (error) {
    console.error('Failed to fetch active sessions:', error);
    return [];
  }
};



/**
 * Create or update user session
 */
export const createUserSession = async (
  ipAddress: string | null,
  userAgent?: string,
  tenantId?: string
): Promise<string | null> => {
  try {
    console.log('🔐 Creating/updating user session...');
    
    // Use a default IP address if detection failed (database requires non-null)
    const finalIpAddress = ipAddress || '0.0.0.0';
    
    const { data, error } = await supabase.rpc('create_user_session', {
      p_ip_address: finalIpAddress,
      p_user_agent: userAgent,
      p_tenant_id: tenantId
    });

    if (error) {
      console.error('Error creating user session:', error);
      throw error;
    }

    console.log('✅ User session created/updated:', data);
    return data;
  } catch (error) {
    console.error('Failed to create user session:', error);
    return null;
  }
};

/**
 * End current user session
 */
export const endUserSession = async (): Promise<boolean> => {
  try {
    console.log('🚪 Ending user session...');
    
    const { data, error } = await supabase.rpc('end_user_session');

    if (error) {
      console.error('Error ending user session:', error);
      throw error;
    }

    console.log('✅ User session ended successfully');
    return data;
  } catch (error) {
    console.error('Failed to end user session:', error);
    return false;
  }
};



/**
 * Get recent login history (last 20 logins)
 */
export const getRecentLoginHistory = async (): Promise<UserSession[]> => {
  try {
    console.log('📜 Fetching recent login history...');
    
    const { data, error } = await supabase
      .from('recent_login_history')
      .select('*')
      .lte('login_rank', 20)
      .order('login_time', { ascending: false });

    if (error) {
      console.error('❌ Error fetching login history:', error);
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

    console.log(`📜 Retrieved ${loginHistory.length} login history records`);
    return loginHistory;
  } catch (error) {
    console.error('Failed to fetch login history:', error);
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
    console.error('Failed to get system stats:', error);
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
    console.log('🧹 Cleaning up old sessions...');
    
    const { data, error } = await supabase.rpc('cleanup_old_sessions');

    if (error) {
      console.error('Error cleaning up sessions:', error);
      throw error;
    }

    console.log(`✅ Cleanup complete - Sessions deleted: ${data || 0}`);
    
    return {
      sessionsDeleted: data || 0
    };
  } catch (error) {
    console.error('Failed to cleanup old sessions:', error);
    return { sessionsDeleted: 0 };
  }
};

/**
 * Get client IP address using external service
 */
export const getClientIpAddress = async (): Promise<string | null> => {
  try {
    // Try multiple IP detection services for reliability
    const ipServices = [
      'https://api.ipify.org?format=json',
      'https://ipapi.co/json/',
      'https://api64.ipify.org?format=json'
    ];
    
    for (const service of ipServices) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        const response = await fetch(service, { 
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          
          // Handle different response formats
          const ip = data.ip || data.query || 'unknown';
          if (ip && ip !== 'unknown' && ip.length > 6) {
            console.log(`🌐 Detected IP address: ${ip} (via ${service})`);
            return ip;
          }
        }
      } catch (serviceError) {
        console.log(`IP service ${service} failed:`, serviceError);
        continue;
      }
    }
    
    console.warn('⚠️ Could not detect IP address, using NULL');
    return null; // Return null for database compatibility
  } catch (error) {
    console.error('❌ IP detection failed:', error);
    return null; // Return null for database compatibility
  }
};

/**
 * Initialize session tracking on login
 */
export const initializeSessionTracking = async (tenantId?: string) => {
  try {
    // Check authentication first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ No authenticated user found for session tracking');
      return null;
    }

    console.log('👤 Creating session for user:', user.email, 'ID:', user.id);

    // Start IP detection in background - don't wait for it
    const ipPromise = getClientIpAddress();
    const userAgent = navigator.userAgent;
    
    console.log('🔐 Initializing session tracking (async)...');
    
    // Create session in background without blocking login
    ipPromise.then(async (ipAddress) => {
      try {
        console.log('🌐 Got IP address:', ipAddress, 'creating session...');
        const sessionId = await createUserSession(ipAddress, userAgent, tenantId);
        
        if (sessionId) {
          console.log('✅ Session tracking completed successfully:', sessionId);
        } else {
          console.warn('⚠️ Session creation returned null');
        }
      } catch (error) {
        console.warn('⚠️ Background session creation failed:', error);
      }
    }).catch(error => {
      console.warn('⚠️ Background session tracking failed:', error);
    });
    
    // Return immediately - don't block login
    console.log('🚀 Login proceeding while session creates in background');
    return null; // We don't wait for the session ID
    
  } catch (error) {
    console.error('❌ Failed to initialize session tracking:', error);
    return null;
  }
};

