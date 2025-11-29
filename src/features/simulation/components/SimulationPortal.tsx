/**
 * Simulation Portal - Entry point for simulation.haccare.app
 * 
 * This component handles automatic routing based on user role and simulation assignments:
 * - Students: Auto-route to assigned simulation (if only one) or show selection screen
 * - Instructors: Show dashboard with active simulations and quick launch
 * - Unassigned users: Show helpful message with instructions
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Monitor, Users, Play, Clock, ArrowRight, AlertCircle, Loader2, BookOpen } from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useTenant } from '../../../contexts/TenantContext';
import { supabase } from '../../../lib/api/supabase';
import StudentQuickIntro from '../../../components/StudentQuickIntro';

interface SimulationAssignment {
  id: string;
  simulation_id: string;
  role: string;
  granted_at: string;
  simulation: {
    id: string;
    name: string;
    status: string;
    starts_at: string;
    tenant_id: string;
    template?: {
      name: string;
      description: string;
    };
  };
}

const SimulationPortal: React.FC = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const { enterSimulationTenant } = useTenant();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<SimulationAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enteringSimulation, setEnteringSimulation] = useState(false);
  const [showQuickIntro, setShowQuickIntro] = useState(false);

  const loadAssignments = React.useCallback(async (retryCount = 0, isBackgroundRefresh = false) => {
    if (!user) {
      console.log('⚠️ loadAssignments: No user, skipping');
      return;
    }

    console.log(`📡 loadAssignments: Starting fetch for user: ${user.id} (attempt ${retryCount + 1}/3)${isBackgroundRefresh ? ' [background]' : ''}`);
    try {
      // Only show loading spinner on initial load, not background refreshes
      if (!isBackgroundRefresh) {
        setLoading(true);
      }
      setError(null);
      
      // Use RPC function with longer timeout for initial load (cold start can be slow)
      // Background refreshes use shorter timeout since function should be warm
      const timeoutDuration = isBackgroundRefresh ? 5000 : 15000;
      console.log(`📡 loadAssignments: Calling RPC function (${timeoutDuration/1000}s timeout)...`);
      const rpcCall = supabase.rpc(
        'get_user_simulation_assignments',
        { p_user_id: user.id }
      );
      
      const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), timeoutDuration)
      );
      
      const { data: rpcData, error: rpcError } = await Promise.race([
        rpcCall,
        timeoutPromise
      ]).catch((error) => {
        // Only log errors for initial load, not background refreshes
        if (!isBackgroundRefresh) {
          console.error('📡 RPC call failed or timed out:', error);
        }
        return { data: null, error };
      });
      
      if (rpcError) {
        // Only log detailed errors for initial load
        if (!isBackgroundRefresh) {
          console.error(`❌ RPC error details (attempt ${retryCount + 1}):`, rpcError);
        }
        
        // Retry on timeout (cold start issue), max 2 retries - but only on initial load
        if (rpcError.message?.includes('timeout') && retryCount < 2 && !isBackgroundRefresh) {
          console.log(`🔄 Retrying... (${retryCount + 1}/2)`);
          // Wait a bit before retry
          await new Promise(resolve => setTimeout(resolve, 500));
          return loadAssignments(retryCount + 1, isBackgroundRefresh);
        }
        
        // Show error only on initial load failures, silently fail background refreshes
        if (!isBackgroundRefresh) {
          if (rpcError.message?.includes('function') || rpcError.message?.includes('does not exist')) {
            setError('Unable to load simulations. Please contact your administrator.');
          } else if (rpcError.message?.includes('timeout')) {
            setError('Connection is slow. Please refresh the page or try again later.');
          } else {
            setError('Unable to load simulations. Please try again.');
          }
        } else {
          console.log('⚠️ Background refresh failed silently, keeping existing data');
        }
        
        // Only clear assignments on initial load failure, keep existing data on background refresh failure
        if (!isBackgroundRefresh) {
          setAssignments([]);
        }
        setLoading(false);
        return;
      }
      
      const data = rpcData || [];
      console.log('✅ loadAssignments: Received', data.length, 'assignments', data);
      setAssignments(data);

      // DISABLED: Auto-routing is completely disabled to prevent unwanted redirects
      // Students must manually click to join simulations
      // This prevents issues where:
      // 1. Background refreshes trigger unwanted navigation
      // 2. Pending/resetting simulations auto-join before they're ready
      // 3. Students get forced into simulations they didn't choose
      
      if (data.length === 0 && profile?.role !== 'admin' && profile?.role !== 'instructor') {
        // No assignments for non-instructor: Show message
        console.log('ℹ️ No simulation assignments found');
      }
    } catch (err) {
      console.error('❌ Error loading simulation assignments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load simulations');
      setAssignments([]);
    } finally {
      console.log('🏁 loadAssignments: Complete, setting loading to false');
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    console.log('🎯 SimulationPortal useEffect - authLoading:', authLoading, 'user:', !!user);
    if (!authLoading && user) {
      console.log('✅ Conditions met, waiting for Supabase session to be ready...');
      
      let isMounted = true;
      let sessionCheckAttempts = 0;
      const maxSessionAttempts = 10; // Max 5 seconds of checking
      
      // Wait for Supabase session to be fully established before making RPC calls
      // This prevents race condition where user exists but session token isn't ready
      const waitForSession = async () => {
        if (!isMounted) return;
        
        try {
          sessionCheckAttempts++;
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log('✅ Supabase session confirmed, loading assignments...');
            // Give it a tiny bit more time to fully propagate
            setTimeout(() => {
              if (isMounted) loadAssignments();
            }, 200);
          } else if (sessionCheckAttempts < maxSessionAttempts) {
            console.warn(`⚠️ No session found, retrying (${sessionCheckAttempts}/${maxSessionAttempts})...`);
            setTimeout(waitForSession, 500);
          } else {
            console.error('❌ Session never established after', maxSessionAttempts, 'attempts');
            setError('Unable to establish connection. Please refresh the page.');
            setLoading(false);
          }
        } catch (error) {
          console.error('❌ Error checking session:', error);
          if (sessionCheckAttempts < maxSessionAttempts) {
            setTimeout(waitForSession, 500);
          }
        }
      };
      
      waitForSession();
      
      // Auto-refresh every 15 seconds to show newly launched simulations
      const refreshInterval = setInterval(() => {
        loadAssignments(0, true); // Background refresh - fail silently
      }, 15000);
      
      return () => {
        isMounted = false;
        clearInterval(refreshInterval);
      };
    } else if (!authLoading && !user) {
      // Redirect to login if not authenticated
      console.log('🔒 No user, redirecting to login');
      navigate('/login?redirect=/simulation-portal');
    } else {
      console.log('⏳ Still loading auth...');
    }
  }, [user, authLoading, navigate, loadAssignments]);

  const enterSimulation = async (tenantId: string, simulationName: string) => {
    try {
      setEnteringSimulation(true);
      console.log('🔄 Switching to simulation tenant:', tenantId);
      await enterSimulationTenant(tenantId);
      console.log('✅ Entered simulation:', simulationName);
      // Navigate to dashboard which will now show simulation patients
      // Force a full page reload to ensure all contexts refresh with new tenant
      window.location.href = '/app';
    } catch (err) {
      console.error('Error entering simulation:', err);
      setError(err instanceof Error ? err.message : 'Failed to enter simulation');
      setEnteringSimulation(false);
    }
  };

  const handleJoinSimulation = (assignment: SimulationAssignment) => {
    enterSimulation(assignment.simulation.tenant_id, assignment.simulation.name);
  };

  const handleManageSimulations = () => {
    // Stay within /app context - renderContent will handle showing simulations tab
    navigate('/app');
    // Note: Consider passing state to set activeTab to 'simulations'
  };

  if (authLoading || loading || enteringSimulation) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-full flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">
            {enteringSimulation ? 'Entering simulation...' : 'Loading simulation portal...'}
          </p>
        </div>
      </div>
    );
  }

  // Auto-routing to single simulation (only for non-simulation_only users)
  if (assignments.length === 1 && !profile?.simulation_only) {
    const assignment = assignments[0];
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-full flex items-center justify-center py-12">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-600 rounded-full animate-pulse">
              <Monitor className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Entering Simulation</h2>
          <p className="text-gray-600 mb-4">{assignment.simulation.name}</p>
          <div className="flex items-center justify-center text-sm text-gray-500">
            <ArrowRight className="h-4 w-4 mr-2 animate-pulse" />
            Redirecting you now...
          </div>
        </div>
      </div>
    );
  }

  // Instructor view or multiple simulations
  const isInstructor = profile?.role === 'admin' || profile?.role === 'instructor';

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-blue-600 rounded-full">
              <Monitor className="h-12 w-12 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Simulation Portal</h1>
          <p className="text-xl text-gray-600">
            {isInstructor ? 'Manage and launch simulations' : 'Your active simulations'}
          </p>
          
          {/* Quick Intro Button - Only show for simulation_only users */}
          {profile?.simulation_only && (
            <div className="flex justify-center mt-4">
              <button
                onClick={() => setShowQuickIntro(true)}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-md hover:shadow-lg"
                title="Student Quick Introduction Guide"
              >
                <BookOpen className="h-5 w-5 mr-2" />
                Quick Intro
              </button>
            </div>
          )}
        </div>



        {/* Error Message */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructor Actions */}
        {isInstructor && (
          <div className="mb-8">
            <div className="bg-white rounded-lg shadow-md p-6 max-w-2xl mx-auto">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="flex gap-4">
                <button
                  onClick={handleManageSimulations}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <Play className="h-5 w-5 mr-2" />
                  Launch New Simulation
                </button>
                <button
                  onClick={handleManageSimulations}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Manage All Simulations
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Simulations List */}
        {assignments.length > 0 ? (
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {isInstructor ? 'Your Active Simulations' : 'Select a Simulation'}
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 cursor-pointer"
                  onClick={() => handleJoinSimulation(assignment)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {assignment.simulation.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {assignment.simulation.template?.description || 'Simulation session'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      assignment.simulation.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {assignment.simulation.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      <span className="capitalize">{assignment.role}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>
                        Started {new Date(assignment.simulation.starts_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoinSimulation(assignment);
                    }}
                    className="mt-4 w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    Enter Simulation
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          !isInstructor && (
            // No assignments for students
            <div className="max-w-2xl mx-auto">
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-gray-100 rounded-full">
                    <AlertCircle className="h-8 w-8 text-gray-400" />
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No Active Simulations
                </h3>
                <p className="text-gray-600 mb-4">
                  You are not currently assigned to any active simulations.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700">
                  <p className="font-medium mb-2">To join a simulation:</p>
                  <ul className="text-left space-y-1 ml-6 list-disc">
                    <li>Contact your instructor for simulation access</li>
                    <li>Check your email for simulation invitations</li>
                    <li>Wait for your instructor to add you to a simulation</li>
                  </ul>
                </div>
              </div>
            </div>
          )
        )}

        {/* Footer Help */}
        <div className="text-center mt-12">
          <p className="text-sm text-gray-500">
            Need help? Contact your instructor or administrator
          </p>
        </div>
      </div>

      {/* Student Quick Intro Modal */}
      {showQuickIntro && (
        <StudentQuickIntro onClose={() => setShowQuickIntro(false)} />
      )}
    </div>
  );
};

export default SimulationPortal;
