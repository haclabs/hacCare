import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Users, 
  FileText, 
  Activity, 
  Pill,
  AlertCircle,
  CheckCircle 
} from 'lucide-react';
import { SimulationSubTenantService } from '../../lib/simulationSubTenantService';
import TemplateManagement from './TemplateManagement';

interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  learning_objectives: string[];
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration_minutes: number;
  tags: string[];
  is_active: boolean;
}

interface PatientTemplate {
  id: string;
  scenario_template_id: string;
  patient_name: string;
  age: number;
  gender: string;
  date_of_birth: string;
  room_number: string;
  bed_number: string;
  diagnosis: string;
  condition: string;
  allergies: string[];
  blood_type: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  assigned_nurse: string;
  is_active: boolean;
}

interface VitalTemplate {
  id: string;
  vital_type: string;
  value_systolic?: number;
  value_diastolic?: number;
  value_numeric?: number;
  unit: string;
  notes: string;
}

interface MedicationTemplate {
  id: string;
  medication_name: string;
  dosage: string;
  route: string;
  frequency: string;
  indication: string;
  is_prn: boolean;
  notes: string;
}

interface NoteTemplate {
  id: string;
  note_type: string;
  note_content: string;
  created_by_role: string;
}

interface Props {
  currentTenantId: string;
}

export default function ScenarioTemplateManager({ currentTenantId }: Props) {
  const [scenarioTemplates, setScenarioTemplates] = useState<ScenarioTemplate[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [patientTemplates, setPatientTemplates] = useState<PatientTemplate[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  
  const [vitalsTemplates, setVitalsTemplates] = useState<VitalTemplate[]>([]);
  const [medicationsTemplates, setMedicationsTemplates] = useState<MedicationTemplate[]>([]);
  const [notesTemplates, setNotesTemplates] = useState<NoteTemplate[]>([]);
  
  const [activeTab, setActiveTab] = useState<'scenarios' | 'patients' | 'vitals' | 'medications' | 'notes'>('scenarios');
  const [showCreateScenario, setShowCreateScenario] = useState(false);
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [showTemplateManagement, setShowTemplateManagement] = useState(false);
  const [selectedScenarioForTemplates, setSelectedScenarioForTemplates] = useState<ScenarioTemplate | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [newScenario, setNewScenario] = useState<Partial<ScenarioTemplate>>({
    name: '',
    description: '',
    learning_objectives: [],
    difficulty_level: 'beginner',
    estimated_duration_minutes: 30,
    tags: [],
    is_active: true
  });

  const [newPatient, setNewPatient] = useState<Partial<PatientTemplate>>({
    patient_name: '',
    age: 65,
    gender: 'Male',
    date_of_birth: '1959-01-01',
    room_number: '101',
    bed_number: 'A',
    diagnosis: '',
    condition: 'Stable',
    allergies: [],
    blood_type: 'O+',
    emergency_contact_name: '',
    emergency_contact_relationship: 'Spouse',
    emergency_contact_phone: '',
    assigned_nurse: '',
    is_active: true
  });

  useEffect(() => {
    loadScenarioTemplates();
  }, [currentTenantId]);

  useEffect(() => {
    if (selectedScenario) {
      loadPatientTemplates(selectedScenario);
    }
  }, [selectedScenario]);

  useEffect(() => {
    if (selectedPatient) {
      loadPatientTemplateDetails(selectedPatient);
    }
  }, [selectedPatient]);

  const loadScenarioTemplates = async () => {
    try {
      setLoading(true);
      const templates = await SimulationSubTenantService.getScenarioTemplates(currentTenantId);
      setScenarioTemplates(templates);
    } catch (error) {
      console.error('Failed to load scenario templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientTemplates = async (scenarioId: string) => {
    try {
      setLoading(true);
      const patients = await SimulationSubTenantService.getPatientTemplates(scenarioId);
      setPatientTemplates(patients);
    } catch (error) {
      console.error('Failed to load patient templates:', error);
      setPatientTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientTemplateDetails = async (patientId: string) => {
    try {
      // For now, set empty arrays - future implementation would load vitals, medications, and notes templates
      setVitalsTemplates([]);
      setMedicationsTemplates([]);
      setNotesTemplates([]);
    } catch (error) {
      console.error('Failed to load patient template details:', error);
    }
  };

  const handleCreateScenario = async () => {
    try {
      setLoading(true);
      await SimulationSubTenantService.createScenarioTemplate(currentTenantId, newScenario);
      await loadScenarioTemplates();
      setShowCreateScenario(false);
      setNewScenario({
        name: '',
        description: '',
        learning_objectives: [],
        difficulty_level: 'beginner',
        estimated_duration_minutes: 30,
        tags: [],
        is_active: true
      });
    } catch (error) {
      console.error('Failed to create scenario template:', error);
      alert('Failed to create scenario template');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteScenario = async (scenarioId: string, scenarioName: string) => {
    if (!confirm(`Are you sure you want to delete the scenario template "${scenarioName}"? This will also delete all associated patient templates and cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      await SimulationSubTenantService.deleteScenarioTemplate(scenarioId);
      
      // Clear selected scenario if it was the one being deleted
      if (selectedScenario === scenarioId) {
        setSelectedScenario(null);
        setPatientTemplates([]);
      }
      
      await loadScenarioTemplates();
    } catch (error) {
      console.error('Failed to delete scenario template:', error);
      alert('Failed to delete scenario template');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePatient = async () => {
    if (!selectedScenario) return;
    
    try {
      setLoading(true);
      await SimulationSubTenantService.createPatientTemplate(selectedScenario, newPatient);
      await loadPatientTemplates(selectedScenario);
      setShowCreatePatient(false);
      setNewPatient({
        patient_name: '',
        age: 65,
        gender: 'Male',
        date_of_birth: '1959-01-01',
        room_number: '101',
        bed_number: 'A',
        diagnosis: '',
        condition: 'Stable',
        allergies: [],
        blood_type: 'O+',
        emergency_contact_name: '',
        emergency_contact_relationship: 'Spouse',
        emergency_contact_phone: '',
        assigned_nurse: '',
        is_active: true
      });
    } catch (error) {
      console.error('Failed to create patient template:', error);
      alert('Failed to create patient template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-900">Scenario Template Manager</h1>
          <p className="text-gray-600 mt-2">Create and manage simulation scenarios, patients, and template data</p>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'scenarios', label: 'Scenarios', icon: FileText },
              { key: 'patients', label: 'Patients', icon: Users },
              { key: 'vitals', label: 'Vitals', icon: Activity },
              { key: 'medications', label: 'Medications', icon: Pill },
              { key: 'notes', label: 'Notes', icon: AlertCircle }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Scenarios Tab */}
          {activeTab === 'scenarios' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Scenario Templates</h3>
                <button
                  onClick={() => setShowCreateScenario(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Create Scenario
                </button>
              </div>

              {scenarioTemplates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p>No scenario templates found</p>
                  <p className="text-sm">Create your first scenario template to get started</p>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {scenarioTemplates.map((scenario) => (
                    <div
                      key={scenario.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        selectedScenario === scenario.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedScenario(scenario.id)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{scenario.name}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          scenario.difficulty_level === 'beginner' ? 'bg-green-100 text-green-800' :
                          scenario.difficulty_level === 'intermediate' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {scenario.difficulty_level}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{scenario.description}</p>
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-gray-500">
                          <span>{scenario.estimated_duration_minutes} min</span>
                          <span className={`ml-2 ${scenario.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                            {scenario.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedScenarioForTemplates(scenario);
                              setShowTemplateManagement(true);
                            }}
                            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                          >
                            Manage Templates
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteScenario(scenario.id, scenario.name);
                            }}
                            className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            title="Delete scenario template"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Patients Tab */}
          {activeTab === 'patients' && (
            <div className="space-y-4">
              {!selectedScenario ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p>Select a scenario template first</p>
                  <p className="text-sm">Choose a scenario from the Scenarios tab to manage patient templates</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Patient Templates</h3>
                    <button
                      onClick={() => setShowCreatePatient(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Patient
                    </button>
                  </div>

                  {patientTemplates.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p>No patient templates found</p>
                      <p className="text-sm">Add patient templates to this scenario</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {patientTemplates.map((patient) => (
                        <div
                          key={patient.id}
                          className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                            selectedPatient === patient.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedPatient(patient.id)}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900">{patient.patient_name}</h4>
                            <span className="text-xs text-gray-500">{patient.age}y {patient.gender}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-1">{patient.diagnosis}</p>
                          <p className="text-xs text-gray-500">Room {patient.room_number}-{patient.bed_number}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Other tabs would show vitals, medications, and notes for the selected patient */}
          {activeTab === 'vitals' && (
            <div className="text-center py-8 text-gray-500">
              <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>Vitals Template Editor</p>
              <p className="text-sm">Select a patient to manage their vitals templates</p>
            </div>
          )}

          {activeTab === 'medications' && (
            <div className="text-center py-8 text-gray-500">
              <Pill className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>Medications Template Editor</p>
              <p className="text-sm">Select a patient to manage their medications templates</p>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>Notes Template Editor</p>
              <p className="text-sm">Select a patient to manage their notes templates</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Scenario Modal */}
      {showCreateScenario && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Create Scenario Template</h3>
                <button
                  onClick={() => setShowCreateScenario(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={newScenario.name || ''}
                    onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Enter scenario name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newScenario.description || ''}
                    onChange={(e) => setNewScenario({ ...newScenario, description: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 h-20"
                    placeholder="Enter scenario description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                    <select
                      value={newScenario.difficulty_level || 'beginner'}
                      onChange={(e) => setNewScenario({ ...newScenario, difficulty_level: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      value={newScenario.estimated_duration_minutes || 30}
                      onChange={(e) => setNewScenario({ ...newScenario, estimated_duration_minutes: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      min="1"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowCreateScenario(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateScenario}
                    disabled={!newScenario.name || loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Create Scenario
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Patient Modal */}
      {showCreatePatient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Add Patient Template</h3>
                <button
                  onClick={() => setShowCreatePatient(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
                    <input
                      type="text"
                      value={newPatient.patient_name || ''}
                      onChange={(e) => setNewPatient({ ...newPatient, patient_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Enter patient name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                    <input
                      type="number"
                      value={newPatient.age || 65}
                      onChange={(e) => setNewPatient({ ...newPatient, age: Number(e.target.value) })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      min="1"
                      max="120"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      value={newPatient.gender || 'Male'}
                      onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                    <input
                      type="text"
                      value={newPatient.room_number || ''}
                      onChange={(e) => setNewPatient({ ...newPatient, room_number: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="101"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bed Number</label>
                    <input
                      type="text"
                      value={newPatient.bed_number || ''}
                      onChange={(e) => setNewPatient({ ...newPatient, bed_number: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="A"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
                  <input
                    type="text"
                    value={newPatient.diagnosis || ''}
                    onChange={(e) => setNewPatient({ ...newPatient, diagnosis: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Enter primary diagnosis"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setShowCreatePatient(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePatient}
                    disabled={!newPatient.patient_name || loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                  >
                    <Save className="h-4 w-4" />
                    Add Patient
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Management Modal */}
      {showTemplateManagement && selectedScenarioForTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-7xl max-h-[95vh] overflow-hidden">
            <TemplateManagement
              currentTenantId={currentTenantId}
              scenarioId={selectedScenarioForTemplates.id}
              scenarioName={selectedScenarioForTemplates.name}
              onClose={() => {
                setShowTemplateManagement(false);
                setSelectedScenarioForTemplates(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}