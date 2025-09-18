import React, { useState, useEffect } from 'react';
import { Plus, Play, Pause, Square, RotateCcw, Users, Clock, Target, Edit, Trash2, Link, Copy, Settings } from 'lucide-react';
import { SimulationSubTenantService, SimulationSubTenant, CreateSimulationRequest } from '../../lib/simulationSubTenantService';
import { useTenant } from '../../contexts/TenantContext';
import SimulationEditor from './SimulationEditor';

interface SimulationDashboardProps {
  className?: string;
}

interface SimulationDashboardProps {
  className?: string;
}

const SimulationDashboard: React.FC<SimulationDashboardProps> = ({ className }) => {
  const [scenarios, setScenarios] = useState<ScenarioTemplate[]>([]);
  const [activeSimulations, setActiveSimulations] = useState<ActiveSimulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'templates'>('active');
  const [showCreateScenario, setShowCreateScenario] = useState(false);
  const [showCreateSimulation, setShowCreateSimulation] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<ScenarioTemplate | null>(null);
  const [editingScenario, setEditingScenario] = useState<ScenarioTemplate | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [scenariosData, simulationsData] = await Promise.all([
        getScenarioTemplates(),
        getActiveSimulations()
      ]);
      setScenarios(scenariosData);
      setActiveSimulations(simulationsData);
    } catch (error) {
      console.error('Error loading simulation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScenario = async (data: CreateScenarioTemplateRequest) => {
    try {
      await createScenarioTemplate(data);
      await loadData();
      setShowCreateScenario(false);
    } catch (error) {
      console.error('Error creating scenario:', error);
      // Show user-friendly error message
      alert(`Failed to create scenario: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCreateSimulation = async (data: CreateSimulationRequest) => {
    try {
      const simulation = await createActiveSimulation(data);
      
      // Copy template data to active simulation
      await copyTemplateToActiveSimulation(data.scenario_template_id, simulation.id);
      
      await loadData();
      setShowCreateSimulation(false);
      setSelectedScenario(null);
    } catch (error) {
      console.error('Error creating simulation:', error);
      // Show user-friendly error message
      alert(`Failed to create simulation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSimulationStatusChange = async (simulationId: string, status: 'running' | 'paused' | 'completed' | 'reset') => {
    try {
      await updateSimulationStatus(simulationId, status);
      await loadData();
    } catch (error) {
      console.error('Error updating simulation status:', error);
    }
  };

  const handleDeleteSimulation = async (simulationId: string) => {
    if (!confirm('Are you sure you want to delete this simulation? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteActiveSimulation(simulationId);
      await loadData();
    } catch (error) {
      console.error('Error deleting simulation:', error);
      alert(`Failed to delete simulation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCopySimulationLink = (simulation: ActiveSimulation) => {
    const baseUrl = window.location.origin;
    const simulationUrl = `${baseUrl}/?sim=${simulation.sim_access_key}`;
    
    navigator.clipboard.writeText(simulationUrl).then(() => {
      alert('Simulation link copied to clipboard! Share this link with students.');
    }).catch(() => {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = simulationUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Simulation link copied to clipboard! Share this link with students.');
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'paused': return 'bg-yellow-500';
      case 'completed': return 'bg-blue-500';
      case 'reset': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="text-lg">Loading simulation dashboard...</div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Simulation Dashboard</h1>
        <div className="space-x-2">
          <button 
            onClick={() => setShowCreateScenario(true)} 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Scenario
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Active Simulations
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Scenario Templates
          </button>
        </nav>
      </div>

      {/* Active Simulations Tab */}
      {activeTab === 'active' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Active Simulations</h2>
            <span className="bg-gray-100 text-gray-800 text-sm px-2 py-1 rounded">
              {activeSimulations.length} running
            </span>
          </div>

          {activeSimulations.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <div className="flex flex-col items-center justify-center">
                <p className="text-gray-500 mb-4">No active simulations</p>
                <button 
                  onClick={() => setShowCreateSimulation(true)}
                  disabled={scenarios.length === 0}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Start Simulation
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeSimulations.map((simulation) => (
                <div key={simulation.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold">{simulation.session_name}</h3>
                    <span className={`${getStatusColor(simulation.status)} text-white text-xs px-2 py-1 rounded`}>
                      {simulation.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {simulation.scenario_template?.name}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      {simulation.student_ids.length} students
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="w-4 h-4 mr-2" />
                      Started {new Date(simulation.start_time).toLocaleString()}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {/* Copy simulation link button for running simulations */}
                    {simulation.status === 'running' && (
                      <button
                        onClick={() => handleCopySimulationLink(simulation)}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded text-sm flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        Copy Link
                      </button>
                    )}
                    
                    {simulation.status === 'running' && (
                      <button
                        onClick={() => handleSimulationStatusChange(simulation.id, 'paused')}
                        className="bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded text-sm flex items-center gap-1"
                      >
                        <Pause className="w-3 h-3" />
                        Pause
                      </button>
                    )}
                    {simulation.status === 'paused' && (
                      <button
                        onClick={() => handleSimulationStatusChange(simulation.id, 'running')}
                        className="bg-green-100 hover:bg-green-200 text-green-800 px-3 py-1 rounded text-sm flex items-center gap-1"
                      >
                        <Play className="w-3 h-3" />
                        Resume
                      </button>
                    )}
                    <button
                      onClick={() => handleSimulationStatusChange(simulation.id, 'completed')}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded text-sm flex items-center gap-1"
                    >
                      <Square className="w-3 h-3" />
                      End
                    </button>
                    <button
                      onClick={() => handleSimulationStatusChange(simulation.id, 'reset')}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                    {/* Show delete button for stopped simulations */}
                    {(simulation.status === 'completed' || simulation.status === 'paused' || simulation.status === 'reset') && (
                      <button
                        onClick={() => handleDeleteSimulation(simulation.id)}
                        className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scenario Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Scenario Templates</h2>
            <span className="bg-gray-100 text-gray-800 text-sm px-2 py-1 rounded">
              {scenarios.length} templates
            </span>
          </div>

          {scenarios.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <div className="flex flex-col items-center justify-center">
                <p className="text-gray-500 mb-4">No scenario templates yet</p>
                <button 
                  onClick={() => setShowCreateScenario(true)} 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create First Template
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {scenarios.map((scenario) => (
                <div key={scenario.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-semibold">{scenario.name}</h3>
                    <span className={`${getDifficultyColor(scenario.difficulty_level)} text-xs px-2 py-1 rounded`}>
                      {scenario.difficulty_level}
                    </span>
                  </div>
                  
                  {scenario.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {scenario.description}
                    </p>
                  )}
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Target className="w-4 h-4 mr-2" />
                      {scenario.learning_objectives?.length || 0} objectives
                    </div>
                    
                    {scenario.estimated_duration_minutes && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        ~{scenario.estimated_duration_minutes} minutes
                      </div>
                    )}
                  </div>

                  {scenario.tags && scenario.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {scenario.tags.slice(0, 3).map((tag, index) => (
                        <span key={index} className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                          {tag}
                        </span>
                      ))}
                      {scenario.tags.length > 3 && (
                        <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                          +{scenario.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setSelectedScenario(scenario);
                        setShowCreateSimulation(true);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" />
                      Start
                    </button>
                    <button 
                      onClick={() => setEditingScenario(scenario)}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded text-sm flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" />
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Scenario Modal */}
      {showCreateScenario && (
        <CreateScenarioModal
          onClose={() => setShowCreateScenario(false)}
          onSubmit={handleCreateScenario}
        />
      )}

      {/* Create Simulation Modal */}
      {showCreateSimulation && (
        <CreateSimulationModal
          onClose={() => {
            setShowCreateSimulation(false);
            setSelectedScenario(null);
          }}
          onSubmit={handleCreateSimulation}
          scenarios={scenarios}
          selectedScenario={selectedScenario}
        />
      )}

      {/* Simulation Editor */}
      {editingScenario && (
        <SimulationEditor
          scenarioId={editingScenario.id}
          onClose={() => setEditingScenario(null)}
          onSave={() => {
            loadData(); // Refresh the data after saving
          }}
        />
      )}
    </div>
  );
};

// Temporary placeholder modals (we'll replace these)
const CreateScenarioModal: React.FC<{
  onClose: () => void;
  onSubmit: (data: CreateScenarioTemplateRequest) => Promise<void>;
}> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState<CreateScenarioTemplateRequest>({
    name: '',
    description: '',
    learning_objectives: [],
    difficulty_level: 'beginner',
    estimated_duration_minutes: undefined,
    tags: []
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      await onSubmit(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Create New Scenario</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scenario Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
              Create Scenario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreateSimulationModal: React.FC<{
  onClose: () => void;
  onSubmit: (data: CreateSimulationRequest) => Promise<void>;
  scenarios: ScenarioTemplate[];
  selectedScenario: ScenarioTemplate | null;
}> = ({ onClose, onSubmit, scenarios, selectedScenario }) => {
  const [formData, setFormData] = useState<CreateSimulationRequest>({
    scenario_template_id: selectedScenario?.id || '',
    session_name: '',
    student_ids: [],
    simulation_notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.scenario_template_id && formData.session_name.trim()) {
      await onSubmit(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Start New Simulation</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Session Name
            </label>
            <input
              type="text"
              value={formData.session_name}
              onChange={(e) => setFormData({ ...formData, session_name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scenario Template
            </label>
            <select
              value={formData.scenario_template_id}
              onChange={(e) => setFormData({ ...formData, scenario_template_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            >
              <option value="">Select a scenario...</option>
              {scenarios.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
              Start Simulation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SimulationDashboard;