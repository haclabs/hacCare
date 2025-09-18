import { useState, useEffect } from 'react';
import { Plus, StopCircle, Link, Trash2, Users, RotateCcw, UserCheck } from 'lucide-react';
import { SimulationSubTenantService, CreateSimulationRequest, SimulationSubTenant, SimulationUser } from '../../lib/simulationSubTenantService';
import SimulationPatients from '../simulations/SimulationPatients';

interface Props {
  currentTenantId: string;
}

export default function SimulationSubTenantManager({ currentTenantId }: Props) {
  const [simulations, setSimulations] = useState<SimulationSubTenant[]>([]);
  const [selectedSimulation, setSelectedSimulation] = useState<string | null>(null);
  const [simulationUsers, setSimulationUsers] = useState<SimulationUser[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'patients'>('users');

  // Form state for creating new simulation
  const [newSimulation, setNewSimulation] = useState<CreateSimulationRequest>({
    session_name: '',
    template_id: '', // This would come from simulation templates
    parent_tenant_id: currentTenantId,
    users: [
      { username: 'instructor1', email: '', role: 'instructor' },
      { username: 'nurse1', email: '', role: 'nurse' },
      { username: 'student1', email: '', role: 'student' },
      { username: 'student2', email: '', role: 'student' },
    ],
  });

  useEffect(() => {
    loadSimulations();
  }, [currentTenantId]);

  useEffect(() => {
    if (selectedSimulation) {
      loadSimulationUsers(selectedSimulation);
    }
  }, [selectedSimulation]);

  const loadSimulations = async () => {
    try {
      setLoading(true);
      const data = await SimulationSubTenantService.getSimulationSubTenants(currentTenantId);
      setSimulations(data);
    } catch (error) {
      console.error('Failed to load simulations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSimulationUsers = async (simulationTenantId: string) => {
    try {
      const users = await SimulationSubTenantService.getSimulationUsers(simulationTenantId);
      setSimulationUsers(users);
    } catch (error) {
      console.error('Failed to load simulation users:', error);
    }
  };

  const handleCreateSimulation = async () => {
    try {
      // Validate form
      if (!newSimulation.session_name?.trim()) {
        alert('Please enter a session name');
        return;
      }

      if (!currentTenantId) {
        alert('No tenant selected. Please ensure you are logged in to a valid tenant.');
        return;
      }

      setLoading(true);
      
      // Update the parent_tenant_id to ensure it's current
      const simulationRequest = {
        ...newSimulation,
        parent_tenant_id: currentTenantId,
        session_name: newSimulation.session_name.trim(),
      };

      await SimulationSubTenantService.createSimulationEnvironment(simulationRequest);
      
      // Reset form
      setNewSimulation({
        session_name: '',
        template_id: '', // Will be auto-created if empty
        parent_tenant_id: currentTenantId,
        users: [
          { username: 'instructor1', email: '', role: 'instructor' },
          { username: 'nurse1', email: '', role: 'nurse' },
          { username: 'student1', email: '', role: 'student' },
          { username: 'student2', email: '', role: 'student' },
        ],
      });
      
      setShowCreateForm(false);
      await loadSimulations();
    } catch (error) {
      console.error('Failed to create simulation:', error);
      alert(`Failed to create simulation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEndSimulation = async (simulationTenantId: string) => {
    if (!window.confirm('Are you sure you want to end this simulation? All data will be archived.')) {
      return;
    }

    try {
      setLoading(true);
      await SimulationSubTenantService.endSimulation(simulationTenantId);
      await loadSimulations();
      if (selectedSimulation === simulationTenantId) {
        setSelectedSimulation(null);
        setSimulationUsers([]);
      }
    } catch (error) {
      console.error('Failed to end simulation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetSimulation = async (simulationId: string) => {
    if (!window.confirm('Are you sure you want to reset this simulation? All patient data will be reset to template defaults.')) {
      return;
    }

    try {
      setLoading(true);
      await SimulationSubTenantService.resetSimulation(simulationId);
      alert('Simulation has been reset to template defaults.');
      // Reload simulation data if this simulation is selected
      if (selectedSimulation === simulationId) {
        await loadSimulationUsers(simulationId);
      }
    } catch (error) {
      console.error('Failed to reset simulation:', error);
      alert(`Failed to reset simulation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSimulation = async (simulationId: string) => {
    if (!window.confirm('Are you sure you want to delete this simulation? This action cannot be undone and will delete all simulation data.')) {
      return;
    }

    try {
      setLoading(true);
      await SimulationSubTenantService.deleteSimulation(simulationId);
      
      // Clear selection if this simulation was selected
      if (selectedSimulation === simulationId) {
        setSelectedSimulation(null);
        setSimulationUsers([]);
      }
      
      // Small delay to ensure database changes are committed
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh simulations list
      await loadSimulations();
      
      alert('Simulation deleted successfully.');
    } catch (error) {
      console.error('Failed to delete simulation:', error);
      alert(`Failed to delete simulation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = (index: number, field: string, value: string) => {
    const updatedUsers = [...newSimulation.users];
    updatedUsers[index] = { ...updatedUsers[index], [field]: value };
    setNewSimulation({ ...newSimulation, users: updatedUsers });
  };

  const addUserRow = () => {
    setNewSimulation({
      ...newSimulation,
      users: [
        ...newSimulation.users,
        { username: '', email: '', role: 'student' }
      ]
    });
  };

  const removeUserRow = (index: number) => {
    const updatedUsers = newSimulation.users.filter((_, i) => i !== index);
    setNewSimulation({ ...newSimulation, users: updatedUsers });
  };

  const generateLoginCredentials = async (simulationTenantId: string) => {
    try {
      const credentials = await SimulationSubTenantService.getSimulationLoginCredentials(simulationTenantId);
      
      // Create a downloadable text file with credentials
      const credentialsText = `
Simulation: ${credentials.simulation_name}
Login URL: ${credentials.login_url}

User Credentials:
${credentials.users.map(user => 
  `Username: ${user.username} | Email: ${user.email} | Role: ${user.role} | Password: ${user.temporary_password || 'user-set'}`
).join('\n')}
      `;
      
      const blob = new Blob([credentialsText], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `simulation-credentials-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate credentials:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Simulation Management</h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          disabled={loading}
        >
          <Plus className="w-4 h-4" />
          Create Simulation
        </button>
      </div>

      {/* Simulations List */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Left Panel: Simulations */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Active Simulations</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {loading && simulations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">Loading simulations...</div>
            ) : simulations.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No active simulations</div>
            ) : (
              simulations.map(simulation => (
                <div
                  key={simulation.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedSimulation === simulation.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                  }`}
                  onClick={() => setSelectedSimulation(simulation.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium text-gray-900">{simulation.name}</h4>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(simulation.created_at).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">
                        Auto-cleanup: {new Date(simulation.auto_cleanup_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          generateLoginCredentials(simulation.id);
                        }}
                        className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                        title="Download login credentials"
                      >
                        <Link className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResetSimulation(simulation.id);
                        }}
                        className="p-1 text-yellow-600 hover:bg-yellow-100 rounded"
                        title="Reset simulation to template defaults"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSimulation(simulation.id);
                        }}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="Delete simulation permanently"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEndSimulation(simulation.id);
                        }}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                        title="End simulation"
                      >
                        <StopCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Panel: Simulation Details */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {!selectedSimulation ? (
            <div className="p-8 text-center">
              <UserCheck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Simulation</h3>
              <p className="text-gray-500">Choose a simulation from the list to view details and manage patients.</p>
            </div>
          ) : (
            <>
              {/* Tab Navigation */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                      activeTab === 'users'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Users className="h-4 w-4" />
                    Users ({simulationUsers.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('patients')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                      activeTab === 'patients'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <UserCheck className="h-4 w-4" />
                    Patients
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-4">
                {activeTab === 'users' ? (
                  simulationUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-gray-500">No users assigned</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {simulationUsers.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">{user.username}</p>
                            <p className="text-sm text-gray-500">{user.email || 'No email'}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            user.role === 'instructor' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'nurse' ? 'bg-green-100 text-green-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <div className="h-96 overflow-y-auto">
                    <SimulationPatients 
                      simulationId={selectedSimulation}
                      simulationStatus="running"
                      onPatientDataChange={() => {
                        // Refresh data if needed
                        console.log('Patient data changed');
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Create Simulation Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Simulation</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Simulation Name
                  </label>
                  <input
                    type="text"
                    value={newSimulation.session_name}
                    onChange={(e) => setNewSimulation({ ...newSimulation, session_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="e.g., Cardiac Emergency Scenario"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={newSimulation.template_id}
                    onChange={(e) => setNewSimulation({ ...newSimulation, template_id: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                    placeholder="Leave empty for custom simulation"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Users</label>
                    <button
                      onClick={addUserRow}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add User
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {newSimulation.users.map((user, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input
                          type="text"
                          value={user.username}
                          onChange={(e) => handleAddUser(index, 'username', e.target.value)}
                          placeholder="Username"
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        <input
                          type="email"
                          value={user.email}
                          onChange={(e) => handleAddUser(index, 'email', e.target.value)}
                          placeholder="Email"
                          className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
                        />
                        <select
                          value={user.role}
                          onChange={(e) => handleAddUser(index, 'role', e.target.value)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm"
                        >
                          <option value="student">Student</option>
                          <option value="nurse">Nurse</option>
                          <option value="instructor">Instructor</option>
                        </select>
                        {newSimulation.users.length > 1 && (
                          <button
                            onClick={() => removeUserRow(index)}
                            className="text-red-600 hover:text-red-800 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSimulation}
                  disabled={loading || !newSimulation.session_name}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Simulation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}