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
import { Monitor, Users, Play, Clock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../contexts/TenantContext';
import { getUserSimulationAssignments } from '../../services/simulation/simulationService';

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

  useEffect(() => {
    if (!authLoading && user) {
      loadAssignments();
    } else if (!authLoading && !user) {
      // Redirect to login if not authenticated
      navigate('/login?redirect=/simulation-portal');
    }
  }, [user, authLoading, navigate]);

  const loadAssignments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getUserSimulationAssignments(user.id);
      setAssignments(data);

      // Auto-routing logic
      if (data.length === 1) {
        // Single simulation: Auto-redirect
        const assignment = data[0];
        console.log('🎯 Auto-routing to single simulation:', assignment.simulation.name);
        setTimeout(async () => {
          await enterSimulation(assignment.simulation.tenant_id, assignment.simulation.name);
        }, 1500); // Give user brief moment to see the portal
      } else if (data.length === 0 && profile?.role !== 'admin' && profile?.role !== 'instructor') {
        // No assignments for non-instructor: Show message
        console.log('ℹ️ No simulation assignments found');
      }
    } catch (err: any) {
      console.error('Error loading simulation assignments:', err);
      setError(err.message || 'Failed to load simulation assignments');
    } finally {
      setLoading(false);
    }
  };

  const enterSimulation = async (tenantId: string, simulationName: string) => {
    try {
      setEnteringSimulation(true);
      console.log('🔄 Switching to simulation tenant:', tenantId);
      await enterSimulationTenant(tenantId);
      console.log('✅ Entered simulation:', simulationName);
      // Navigate to dashboard which will now show simulation patients
      // Force a full page reload to ensure all contexts refresh with new tenant
      window.location.href = '/app';
    } catch (err: any) {
      console.error('Error entering simulation:', err);
      setError(err.message || 'Failed to enter simulation');
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

  // Auto-routing to single simulation
  if (assignments.length === 1) {
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
    </div>
  );
};

export default SimulationPortal;
