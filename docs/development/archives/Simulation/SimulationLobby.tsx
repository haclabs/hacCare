import React, { useState, useEffect } from 'react';
import { Users, Clock, Play, Wifi, WifiOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LobbyUser {
  user_id: string;
  username: string;
  role: 'student' | 'instructor' | 'nurse';
  status: 'waiting' | 'ready' | 'in_simulation';
  joined_at: string;
  online_status: 'online' | 'offline';
}

interface SimulationLobbyProps {
  simulationId: string;
  currentUserId: string;
  onSimulationStart: () => void;
}

export default function SimulationLobby({ simulationId, currentUserId, onSimulationStart }: SimulationLobbyProps) {
  const [lobbyStatus, setLobbyStatus] = useState<{
    simulation_status: string;
    lobby_message: string;
    user_role: string;
    can_start_simulation: boolean;
  } | null>(null);
  
  const [lobbyUsers, setLobbyUsers] = useState<LobbyUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    joinLobby();
    const interval = setInterval(() => {
      updatePresence();
      fetchLobbyUsers();
    }, 5000); // Update every 5 seconds

    // Subscribe to simulation status changes
    const subscription = supabase
      .channel(`simulation_${simulationId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'active_simulations',
          filter: `id=eq.${simulationId}`
        }, 
        (payload) => {
          console.log('Simulation status changed:', payload);
          if (payload.new && payload.new.simulation_status === 'running') {
            onSimulationStart();
          }
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'simulation_lobby',
          filter: `simulation_id=eq.${simulationId}`
        },
        () => {
          fetchLobbyUsers();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      subscription.unsubscribe();
    };
  }, [simulationId, currentUserId]);

  const joinLobby = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('join_simulation_lobby', {
        p_simulation_id: simulationId,
        p_user_id: currentUserId
      });

      if (error) throw error;

      setLobbyStatus(data);
      
      // If simulation is already running, redirect immediately
      if (data.simulation_status === 'running') {
        onSimulationStart();
        return;
      }

      await fetchLobbyUsers();
    } catch (error) {
      console.error('Error joining lobby:', error);
      setError('Failed to join simulation lobby');
    } finally {
      setLoading(false);
    }
  };

  const updatePresence = async () => {
    try {
      await supabase
        .from('simulation_lobby')
        .update({ last_ping: new Date().toISOString() })
        .eq('simulation_id', simulationId)
        .eq('user_id', currentUserId);
    } catch (error) {
      console.error('Error updating presence:', error);
    }
  };

  const fetchLobbyUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('simulation_lobby_status')
        .select('*')
        .eq('simulation_id', simulationId);

      if (error) throw error;
      setLobbyUsers(data || []);
    } catch (error) {
      console.error('Error fetching lobby users:', error);
    }
  };

  const startSimulation = async () => {
    try {
      setIsStarting(true);
      const { data, error } = await supabase.rpc('start_simulation', {
        p_simulation_id: simulationId,
        p_instructor_id: currentUserId
      });

      if (error) throw error;

      // The subscription will handle the redirect
    } catch (error) {
      console.error('Error starting simulation:', error);
      setError('Failed to start simulation');
    } finally {
      setIsStarting(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'instructor': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'nurse': return 'bg-green-100 text-green-800 border-green-200';
      case 'student': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (onlineStatus: string) => {
    return onlineStatus === 'online' ? 
      <Wifi className="w-4 h-4 text-green-500" /> : 
      <WifiOff className="w-4 h-4 text-gray-400" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900">Joining Simulation...</h2>
            <p className="text-gray-600 mt-2">Please wait while we connect you to the simulation.</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold text-gray-900">Connection Error</h2>
            <p className="text-gray-600 mt-2">{error}</p>
            <button 
              onClick={joinLobby}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Simulation Lobby</h1>
                <p className="text-gray-600 mt-1">{lobbyStatus?.lobby_message}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-600">
                    {new Date().toLocaleTimeString()}
                  </span>
                </div>
                {lobbyStatus?.can_start_simulation && (
                  <button
                    onClick={startSimulation}
                    disabled={isStarting}
                    className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                    {isStarting ? 'Starting...' : 'Start Simulation'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Participants</p>
                  <p className="text-2xl font-bold text-gray-900">{lobbyUsers.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Wifi className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Online</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {lobbyUsers.filter(u => u.online_status === 'online').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${
                  lobbyStatus?.simulation_status === 'lobby' ? 'bg-yellow-100' : 
                  lobbyStatus?.simulation_status === 'running' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Clock className={`w-6 h-6 ${
                    lobbyStatus?.simulation_status === 'lobby' ? 'text-yellow-600' : 
                    lobbyStatus?.simulation_status === 'running' ? 'text-green-600' : 'text-gray-600'
                  }`} />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Status</p>
                  <p className="text-lg font-bold text-gray-900 capitalize">
                    {lobbyStatus?.simulation_status}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Participants List */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Participants</h2>
            
            {lobbyUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No participants have joined yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lobbyUsers.map((user) => (
                  <div 
                    key={user.user_id}
                    className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                      user.user_id === currentUserId ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(user.online_status)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {user.username}
                            {user.user_id === currentUserId && (
                              <span className="text-blue-600 text-sm ml-1">(You)</span>
                            )}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Joined {new Date(user.joined_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleColor(user.role)}`}>
                        {user.role}
                      </span>
                      <div className={`w-3 h-3 rounded-full ${
                        user.online_status === 'online' ? 'bg-green-500' : 'bg-gray-400'
                      }`} title={user.online_status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-6 bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">What happens next?</h3>
            <div className="space-y-2">
              {lobbyStatus?.user_role === 'instructor' ? (
                <>
                  <p className="text-gray-600">
                    • You can see all participants who have joined the simulation
                  </p>
                  <p className="text-gray-600">
                    • When ready, click "Start Simulation" to begin the scenario
                  </p>
                  <p className="text-gray-600">
                    • All participants will automatically be moved into the simulation environment
                  </p>
                </>
              ) : (
                <>
                  <p className="text-gray-600">
                    • Please wait for the instructor to start the simulation
                  </p>
                  <p className="text-gray-600">
                    • You can see other participants joining in real-time
                  </p>
                  <p className="text-gray-600">
                    • You'll automatically enter the simulation when it starts
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}