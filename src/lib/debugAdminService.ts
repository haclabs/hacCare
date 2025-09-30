import { supabase } from './supabase';
import type { UserSession } from './adminService';

/**
 * Debug version of getActiveSessions that shows all sessions if no active ones found
 */
export const getActiveSessionsDebug = async (): Promise<UserSession[]> => {
  try {
    console.log('🔍 DEBUG: Fetching sessions with detailed logging...');
    
    // Check database connectivity
    const { data: testData, error: testError } = await supabase
      .from('user_profiles')
      .select('COUNT(*)')
      .limit(1);

    if (testError) {
      console.error('❌ Database connection test failed:', testError);
      throw new Error('Cannot connect to database');
    }

    console.log('✅ Database connection working');

    // Get ALL sessions first to see what we have
    const { data: allSessionsData, error: allError } = await supabase
      .from('user_sessions')
      .select('*')
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('❌ Error fetching all sessions:', allError);
      throw allError;
    }

    console.log(`📊 Total sessions found: ${allSessionsData?.length || 0}`);
    if (allSessionsData && allSessionsData.length > 0) {
      console.log('Session details:', allSessionsData.map(s => ({
        id: s.id.substring(0, 8),
        user_id: s.user_id ? s.user_id.substring(0, 8) : 'null',
        status: s.status,
        ip: s.ip_address,
        created: s.created_at,
        logout: s.logout_time
      })));
    }

    // Try to get active sessions
    const { data: activeData, error: activeError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('status', 'active')
      .is('logout_time', null);

    if (activeError) {
      console.error('❌ Error fetching active sessions:', activeError);
    } else {
      console.log(`🟢 Active sessions found: ${activeData?.length || 0}`);
    }

    // Use active sessions if available, otherwise show recent sessions for debugging
    const sessionsToProcess = (activeData && activeData.length > 0) 
      ? activeData 
      : (allSessionsData ? allSessionsData.slice(0, 5) : []);

    if (sessionsToProcess.length === 0) {
      console.log('❌ No sessions found at all');
      return [];
    }

    // Get user IDs and fetch profiles
    const userIds = [...new Set(sessionsToProcess.map(session => session.user_id).filter(id => id !== null))];
    console.log(`👥 Unique user IDs: ${userIds.length}`);

    let profilesData: any[] = [];
    if (userIds.length > 0) {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);
      
      if (error) {
        console.error('⚠️ Error fetching profiles:', error);
      } else {
        profilesData = data || [];
        console.log(`👤 Profiles found: ${profilesData.length}`);
      }
    }

    // Create profiles map
    const profilesMap = new Map();
    profilesData.forEach(profile => {
      profilesMap.set(profile.id, profile);
    });

    // Map sessions to UserSession format
    const sessions: UserSession[] = sessionsToProcess.map(session => {
      const profile = profilesMap.get(session.user_id);
      
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
        tenant_name: 'Debug Mode'
      };
    });

    console.log(`✅ Returning ${sessions.length} sessions for display`);
    return sessions;

  } catch (error) {
    console.error('💥 DEBUG: Failed to fetch sessions:', error);
    return [];
  }
};