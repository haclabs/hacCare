import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  X, 
  Search, 
  UserCheck, 
  UserPlus, 
  AlertCircle,
  CheckCircle2 
} from 'lucide-react';
import { SimulationSubTenantService } from '../../lib/simulationSubTenantService';

interface ExistingUser {
  id: string;
  email: string;
  username?: string;
  full_name?: string;
  role?: string;
  is_simulation_user?: boolean;
  last_sign_in_at?: string;
}

interface SimulationUser {
  id?: string;
  email: string;
  username: string;
  role: 'student' | 'instructor' | 'nurse';
  is_existing_user: boolean;
  is_simulation_only?: boolean;
}

interface Props {
  currentTenantId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (simulation: any) => void;
}

export default function EnhancedSimulationCreationModal({ 
  currentTenantId, 
  isOpen, 
  onClose, 
  onSuccess 
}: Props) {
  const [sessionName, setSessionName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [scenarioTemplates, setScenarioTemplates] = useState<any[]>([]);
  
  const [simulationUsers, setSimulationUsers] = useState<SimulationUser[]>([]);
  const [existingUsers, setExistingUsers] = useState<ExistingUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  
  const [newUser, setNewUser] = useState<Partial<SimulationUser>>({
    email: '',
    username: '',
    role: 'student',
    is_existing_user: false,
    is_simulation_only: false
  });
  
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'details' | 'users'>('details');

  useEffect(() => {
    if (isOpen) {
      loadScenarioTemplates();
      loadExistingUsers();
    }
  }, [isOpen, currentTenantId]);

  const loadScenarioTemplates = async () => {
    try {
      const templates = await SimulationSubTenantService.getScenarioTemplates(currentTenantId);
      setScenarioTemplates(templates);
    } catch (error) {
      console.error('Failed to load scenario templates:', error);
    }
  };

  const loadExistingUsers = async () => {
    try {
      const users = await SimulationSubTenantService.getExistingTenantUsers(currentTenantId);
      setExistingUsers(users);
    } catch (error) {
      console.error('Failed to load existing users:', error);
      setExistingUsers([]);
    }
  };

  const filteredExistingUsers = existingUsers.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddExistingUser = (user: ExistingUser) => {
    const isAlreadyAdded = simulationUsers.some(su => su.email === user.email);
    if (isAlreadyAdded) {
      alert('User already added to simulation');
      return;
    }

    const simulationUser: SimulationUser = {
      id: user.id,
      email: user.email,
      username: user.username || user.email.split('@')[0],
      role: (user.role as any) || 'student',
      is_existing_user: true,
      is_simulation_only: user.is_simulation_user || false
    };

    setSimulationUsers([...simulationUsers, simulationUser]);
  };

  const handleAddNewUser = () => {
    if (!newUser.email || !newUser.username) {
      alert('Email and username are required');
      return;
    }

    const isAlreadyAdded = simulationUsers.some(su => su.email === newUser.email);
    if (isAlreadyAdded) {
      alert('User with this email already added');
      return;
    }

    const simulationUser: SimulationUser = {
      email: newUser.email!,
      username: newUser.username!,
      role: newUser.role || 'student',
      is_existing_user: false,
      is_simulation_only: newUser.is_simulation_only || false
    };

    setSimulationUsers([...simulationUsers, simulationUser]);
    setNewUser({
      email: '',
      username: '',
      role: 'student',
      is_existing_user: false,
      is_simulation_only: false
    });
    setShowAddUserForm(false);
  };

  const handleRemoveUser = (email: string) => {
    setSimulationUsers(simulationUsers.filter(user => user.email !== email));
  };

  const handleFlagAsSimulationOnly = (email: string) => {
    setSimulationUsers(simulationUsers.map(user =>
      user.email === email 
        ? { ...user, is_simulation_only: !user.is_simulation_only }
        : user
    ));
  };

  const handleCreateSimulation = async () => {
    if (!sessionName.trim()) {
      alert('Session name is required');
      return;
    }

    if (simulationUsers.length === 0) {
      alert('At least one user is required');
      return;
    }

    try {
      setLoading(true);
      
      const request = {
        session_name: sessionName,
        template_id: selectedTemplate,
        parent_tenant_id: currentTenantId,
        users: simulationUsers.map(user => ({
          username: user.username,
          email: user.email,
          role: user.role,
          is_existing_user: user.is_existing_user,
          is_simulation_only: user.is_simulation_only
        }))
      };

      const result = await SimulationSubTenantService.createSimulationEnvironment(request);
      onSuccess(result);
      handleClose();
    } catch (error) {
      console.error('Failed to create simulation:', error);
      alert('Failed to create simulation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSessionName('');
    setDescription('');
    setSelectedTemplate('');
    setSimulationUsers([]);
    setNewUser({
      email: '',
      username: '',
      role: 'student',
      is_existing_user: false,
      is_simulation_only: false
    });
    setShowAddUserForm(false);
    setStep('details');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold">Create New Simulation</h3>
              <p className="text-sm text-gray-600 mt-1">
                Set up a new simulation environment with users and templates
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center mt-4 space-x-4">
            <div className={`flex items-center ${step === 'details' ? 'text-blue-600' : 'text-green-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'details' ? 'bg-blue-100' : 'bg-green-100'
              }`}>
                {step === 'users' ? <CheckCircle2 className="h-5 w-5" /> : '1'}
              </div>
              <span className="ml-2 text-sm font-medium">Simulation Details</span>
            </div>
            <div className="flex-1 h-px bg-gray-200"></div>
            <div className={`flex items-center ${step === 'users' ? 'text-blue-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'users' ? 'bg-blue-100' : 'bg-gray-100'
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Add Users</span>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {step === 'details' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session Name *
                </label>
                <input
                  type="text"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Enter simulation session name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 h-20"
                  placeholder="Enter simulation description (optional)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Scenario Template
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">Use default template</option>
                  {scenarioTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} ({template.difficulty_level})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to create a basic template automatically
                </p>
              </div>
            </div>
          )}

          {step === 'users' && (
            <div className="space-y-6">
              {/* Search Existing Users */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Add Existing Users</h4>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search users by email, username, or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>

                {filteredExistingUsers.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                    {filteredExistingUsers.map((user) => (
                      <div
                        key={user.id}
                        className="p-3 border-b border-gray-100 last:border-b-0 flex items-center justify-between hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{user.full_name || user.username}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          <div className="text-xs text-gray-400 flex items-center gap-2">
                            <span>Role: {user.role}</span>
                            {user.is_simulation_user && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                Simulation User
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddExistingUser(user)}
                          className="ml-3 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-1"
                        >
                          <UserCheck className="h-4 w-4" />
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create New User */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-md font-medium text-gray-900">Create New User</h4>
                  <button
                    onClick={() => setShowAddUserForm(!showAddUserForm)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add New User
                  </button>
                </div>

                {showAddUserForm && (
                  <div className="border border-gray-200 rounded-md p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={newUser.email || ''}
                          onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="user@example.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input
                          type="text"
                          value={newUser.username || ''}
                          onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                          placeholder="username"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select
                          value={newUser.role || 'student'}
                          onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2"
                        >
                          <option value="student">Student</option>
                          <option value="instructor">Instructor</option>
                          <option value="nurse">Nurse</option>
                        </select>
                      </div>
                      <div className="flex items-center pt-6">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={newUser.is_simulation_only || false}
                            onChange={(e) => setNewUser({ ...newUser, is_simulation_only: e.target.checked })}
                            className="rounded border-gray-300 text-blue-600"
                          />
                          <span className="ml-2 text-sm text-gray-700">Simulation-only user</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setShowAddUserForm(false)}
                        className="px-3 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddNewUser}
                        className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                      >
                        Add User
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Added Users */}
              {simulationUsers.length > 0 && (
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">
                    Simulation Users ({simulationUsers.length})
                  </h4>
                  <div className="space-y-2">
                    {simulationUsers.map((user, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded-md"
                      >
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{user.username}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                          <div className="text-xs text-gray-400 flex items-center gap-2">
                            <span>Role: {user.role}</span>
                            {user.is_existing_user ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                                Existing User
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full">
                                New User
                              </span>
                            )}
                            {user.is_simulation_only && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                                Simulation-Only
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleFlagAsSimulationOnly(user.email)}
                            className={`px-2 py-1 text-xs rounded-md ${
                              user.is_simulation_only
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                            title="Toggle simulation-only access"
                          >
                            {user.is_simulation_only ? 'Simulation-Only' : 'Full Access'}
                          </button>
                          <button
                            onClick={() => handleRemoveUser(user.email)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between">
            {step === 'details' ? (
              <div></div>
            ) : (
              <button
                onClick={() => setStep('details')}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Back
              </button>
            )}
            
            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              
              {step === 'details' ? (
                <button
                  onClick={() => setStep('users')}
                  disabled={!sessionName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
                >
                  Next: Add Users
                </button>
              ) : (
                <button
                  onClick={handleCreateSimulation}
                  disabled={loading || simulationUsers.length === 0}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400"
                >
                  {loading ? 'Creating...' : 'Create Simulation'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}