import React, { useState, useEffect } from 'react';
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  User, 
  Heart, 
  Pill, 
  FileText, 
  Users,
  RotateCcw,
  AlertCircle,
  Check
} from 'lucide-react';
import {
  ScenarioTemplate,
  SimulationPatient,
  SimulationPatientVital,
  SimulationPatientMedication,
  SimulationPatientNote,
  CreateSimulationPatientRequest
} from '../../types';
import {
  getScenarioTemplateDetails,
  updateScenarioTemplate,
  getSimulationPatients,
  createSimulationPatient,
  updateSimulationPatient,
  deleteSimulationPatient,
  createSimulationPatientVital,
  updateSimulationPatientVital,
  deleteSimulationPatientVital,
  createSimulationPatientMedication,
  updateSimulationPatientMedication,
  deleteSimulationPatientMedication,
  createSimulationPatientNote,
  updateSimulationPatientNote,
  deleteSimulationPatientNote
} from '../../lib/simulationService';

interface SimulationEditorProps {
  scenarioId: string;
  onClose: () => void;
  onSave?: () => void;
}

const SimulationEditor: React.FC<SimulationEditorProps> = ({ scenarioId, onClose, onSave }) => {
  const [scenario, setScenario] = useState<ScenarioTemplate | null>(null);
  const [patients, setPatients] = useState<SimulationPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<SimulationPatient | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'patients' | 'assign-users'>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);

  useEffect(() => {
    loadData();
  }, [scenarioId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [scenarioData, patientsData] = await Promise.all([
        getScenarioTemplateDetails(scenarioId),
        getSimulationPatients(scenarioId, true) // true for template patients
      ]);
      setScenario(scenarioData);
      setPatients(patientsData);
      if (patientsData.length > 0 && !selectedPatient) {
        setSelectedPatient(patientsData[0]);
      }
    } catch (error) {
      console.error('Error loading simulation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScenario = async () => {
    if (!scenario) return;
    
    try {
      setSaving(true);
      await updateScenarioTemplate(scenario.id, {
        name: scenario.name,
        description: scenario.description,
        learning_objectives: scenario.learning_objectives,
        difficulty_level: scenario.difficulty_level,
        estimated_duration_minutes: scenario.estimated_duration_minutes,
        tags: scenario.tags
      });
      onSave?.();
    } catch (error) {
      console.error('Error saving scenario:', error);
      alert('Failed to save scenario');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPatient = async (patientData: CreateSimulationPatientRequest) => {
    try {
      const newPatient = await createSimulationPatient(scenarioId, patientData);
      setPatients([...patients, newPatient]);
      setSelectedPatient(newPatient);
      setShowAddPatient(false);
    } catch (error) {
      console.error('Error adding patient:', error);
      alert('Failed to add patient');
    }
  };

  const handleDeletePatient = async (patientId: string) => {
    if (!confirm('Are you sure you want to delete this patient?')) return;
    
    try {
      await deleteSimulationPatient(patientId);
      const updatedPatients = patients.filter(p => p.id !== patientId);
      setPatients(updatedPatients);
      if (selectedPatient?.id === patientId) {
        setSelectedPatient(updatedPatients.length > 0 ? updatedPatients[0] : null);
      }
    } catch (error) {
      console.error('Error deleting patient:', error);
      alert('Failed to delete patient');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center">Loading simulation editor...</div>
        </div>
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="text-center text-red-600">Failed to load scenario</div>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-600 text-white rounded">
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-7xl h-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h1 className="text-2xl font-semibold">Edit Simulation: {scenario.name}</h1>
            <p className="text-gray-600 mt-1">Create and manage your simulation scenario</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSaveScenario}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>Saving...</>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Close
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'overview'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Overview
          </button>
          <button
            onClick={() => setActiveTab('patients')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'patients'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-4 h-4 inline mr-2" />
            Patients ({patients.length})
          </button>
          <button
            onClick={() => setActiveTab('assign-users')}
            className={`px-6 py-3 font-medium ${
              activeTab === 'assign-users'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Assign Users
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'overview' && (
            <ScenarioOverviewTab scenario={scenario} setScenario={setScenario} />
          )}
          
          {activeTab === 'patients' && (
            <PatientsTab 
              patients={patients}
              selectedPatient={selectedPatient}
              setSelectedPatient={setSelectedPatient}
              onAddPatient={() => setShowAddPatient(true)}
              onDeletePatient={handleDeletePatient}
              onRefresh={loadData}
            />
          )}
          
          {activeTab === 'assign-users' && (
            <AssignUsersTab scenarioId={scenarioId} />
          )}
        </div>

        {/* Add Patient Modal */}
        {showAddPatient && (
          <AddPatientModal
            onClose={() => setShowAddPatient(false)}
            onSubmit={handleAddPatient}
          />
        )}
      </div>
    </div>
  );
};

// Overview Tab Component
const ScenarioOverviewTab: React.FC<{
  scenario: ScenarioTemplate;
  setScenario: (scenario: ScenarioTemplate) => void;
}> = ({ scenario, setScenario }) => {
  const addLearningObjective = () => {
    setScenario({
      ...scenario,
      learning_objectives: [...(scenario.learning_objectives || []), '']
    });
  };

  const updateLearningObjective = (index: number, value: string) => {
    const objectives = [...(scenario.learning_objectives || [])];
    objectives[index] = value;
    setScenario({ ...scenario, learning_objectives: objectives });
  };

  const removeLearningObjective = (index: number) => {
    const objectives = [...(scenario.learning_objectives || [])];
    objectives.splice(index, 1);
    setScenario({ ...scenario, learning_objectives: objectives });
  };

  const addTag = () => {
    setScenario({
      ...scenario,
      tags: [...(scenario.tags || []), '']
    });
  };

  const updateTag = (index: number, value: string) => {
    const tags = [...(scenario.tags || [])];
    tags[index] = value;
    setScenario({ ...scenario, tags });
  };

  const removeTag = (index: number) => {
    const tags = [...(scenario.tags || [])];
    tags.splice(index, 1);
    setScenario({ ...scenario, tags });
  };

  return (
    <div className="p-6 overflow-y-auto">
      <div className="max-w-4xl space-y-6">
        {/* Basic Information */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scenario Name
              </label>
              <input
                type="text"
                value={scenario.name}
                onChange={(e) => setScenario({ ...scenario, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Difficulty Level
              </label>
              <select
                value={scenario.difficulty_level}
                onChange={(e) => setScenario({ 
                  ...scenario, 
                  difficulty_level: e.target.value as 'beginner' | 'intermediate' | 'advanced'
                })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={scenario.description || ''}
                onChange={(e) => setScenario({ ...scenario, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Estimated Duration (minutes)
              </label>
              <input
                type="number"
                value={scenario.estimated_duration_minutes || ''}
                onChange={(e) => setScenario({ 
                  ...scenario, 
                  estimated_duration_minutes: e.target.value ? parseInt(e.target.value) : undefined
                })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Learning Objectives */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Learning Objectives</h3>
            <button
              onClick={addLearningObjective}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add Objective
            </button>
          </div>
          <div className="space-y-2">
            {(scenario.learning_objectives || []).map((objective, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={objective}
                  onChange={(e) => updateLearningObjective(index, e.target.value)}
                  placeholder="Enter learning objective..."
                  className="flex-1 border border-gray-300 rounded px-3 py-2"
                />
                <button
                  onClick={() => removeLearningObjective(index)}
                  className="text-red-600 hover:text-red-800 p-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Tags</h3>
            <button
              onClick={addTag}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add Tag
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {(scenario.tags || []).map((tag, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => updateTag(index, e.target.value)}
                  placeholder="Tag..."
                  className="flex-1 border border-gray-300 rounded px-3 py-1 text-sm"
                />
                <button
                  onClick={() => removeTag(index)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Patients Tab Component
const PatientsTab: React.FC<{
  patients: SimulationPatient[];
  selectedPatient: SimulationPatient | null;
  setSelectedPatient: (patient: SimulationPatient | null) => void;
  onAddPatient: () => void;
  onDeletePatient: (patientId: string) => void;
  onRefresh: () => void;
}> = ({ patients, selectedPatient, setSelectedPatient, onAddPatient, onDeletePatient, onRefresh }) => {
  return (
    <div className="flex h-full">
      {/* Patient List */}
      <div className="w-1/3 border-r p-4 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Patients</h3>
          <button
            onClick={onAddPatient}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add Patient
          </button>
        </div>
        
        <div className="space-y-2">
          {patients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => setSelectedPatient(patient)}
              className={`p-3 rounded-lg border cursor-pointer ${
                selectedPatient?.id === patient.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">{patient.patient_name}</div>
              <div className="text-sm text-gray-600">{patient.patient_id}</div>
              <div className="text-sm text-gray-500">{patient.diagnosis}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Patient Details */}
      <div className="flex-1 p-6 overflow-y-auto">
        {selectedPatient ? (
          <PatientDetailView 
            patient={selectedPatient} 
            onDelete={onDeletePatient}
            onRefresh={onRefresh}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a patient to view details
          </div>
        )}
      </div>
    </div>
  );
};

// Patient Detail View Component  
const PatientDetailView: React.FC<{
  patient: SimulationPatient;
  onDelete: (patientId: string) => void;
  onRefresh: () => void;
}> = ({ patient, onDelete, onRefresh }) => {
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'vitals' | 'medications' | 'notes'>('info');

  return (
    <div className="space-y-4">
      {/* Patient Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold">{patient.patient_name}</h2>
          <p className="text-gray-600">{patient.patient_id} • {patient.diagnosis}</p>
        </div>
        <button
          onClick={() => onDelete(patient.id)}
          className="text-red-600 hover:text-red-800 p-2"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Sub-tabs for patient data */}
      <div className="flex space-x-4 border-b">
        {[
          { id: 'info', label: 'Patient Info', icon: User },
          { id: 'vitals', label: 'Vitals', icon: Heart },
          { id: 'medications', label: 'Medications', icon: Pill },
          { id: 'notes', label: 'Notes', icon: FileText }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveSubTab(id as any)}
            className={`px-4 py-2 font-medium flex items-center gap-2 ${
              activeSubTab === id
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Sub-tab content */}
      <div className="mt-4">
        {activeSubTab === 'info' && (
          <PatientInfoEditor patient={patient} onRefresh={onRefresh} />
        )}
        {activeSubTab === 'vitals' && (
          <PatientVitalsEditor patient={patient} onRefresh={onRefresh} />
        )}
        {activeSubTab === 'medications' && (
          <PatientMedicationsEditor patient={patient} onRefresh={onRefresh} />
        )}
        {activeSubTab === 'notes' && (
          <PatientNotesEditor patient={patient} onRefresh={onRefresh} />
        )}
      </div>
    </div>
  );
};

// Patient Info Editor Component
const PatientInfoEditor: React.FC<{
  patient: SimulationPatient;
  onRefresh: () => void;
}> = ({ patient, onRefresh }) => {
  const [formData, setFormData] = useState({
    patient_name: patient.patient_name,
    patient_id: patient.patient_id,
    date_of_birth: patient.date_of_birth,
    gender: patient.gender || '',
    room_number: patient.room_number || '',
    bed_number: patient.bed_number || '',
    diagnosis: patient.diagnosis || '',
    medical_history: patient.medical_history || '',
    allergies: patient.allergies || [],
    blood_type: patient.blood_type || '',
    emergency_contact_name: patient.emergency_contact_name || '',
    emergency_contact_relationship: patient.emergency_contact_relationship || '',
    emergency_contact_phone: patient.emergency_contact_phone || '',
    assigned_nurse: patient.assigned_nurse || '',
    chief_complaint: patient.chief_complaint || '',
    patient_scenario: patient.patient_scenario || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateSimulationPatient(patient.id, formData);
      onRefresh();
    } catch (error) {
      console.error('Error updating patient:', error);
      alert('Failed to update patient');
    } finally {
      setSaving(false);
    }
  };

  const addAllergy = () => {
    setFormData({
      ...formData,
      allergies: [...formData.allergies, '']
    });
  };

  const updateAllergy = (index: number, value: string) => {
    const allergies = [...formData.allergies];
    allergies[index] = value;
    setFormData({ ...formData, allergies });
  };

  const removeAllergy = (index: number) => {
    const allergies = [...formData.allergies];
    allergies.splice(index, 1);
    setFormData({ ...formData, allergies });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? 'Saving...' : (
            <>
              <Check className="w-4 h-4" />
              Save Changes
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Patient Name</label>
          <input
            type="text"
            value={formData.patient_name}
            onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Patient ID</label>
          <input
            type="text"
            value={formData.patient_id}
            onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
          <input
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
          <select
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Select...</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
          <input
            type="text"
            value={formData.room_number}
            onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bed Number</label>
          <input
            type="text"
            value={formData.bed_number}
            onChange={(e) => setFormData({ ...formData, bed_number: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type</label>
          <select
            value={formData.blood_type}
            onChange={(e) => setFormData({ ...formData, blood_type: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Select...</option>
            <option value="A+">A+</option>
            <option value="A-">A-</option>
            <option value="B+">B+</option>
            <option value="B-">B-</option>
            <option value="AB+">AB+</option>
            <option value="AB-">AB-</option>
            <option value="O+">O+</option>
            <option value="O-">O-</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Nurse</label>
          <input
            type="text"
            value={formData.assigned_nurse}
            onChange={(e) => setFormData({ ...formData, assigned_nurse: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Diagnosis</label>
          <textarea
            value={formData.diagnosis}
            onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2"
            rows={3}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Chief Complaint</label>
          <textarea
            value={formData.chief_complaint}
            onChange={(e) => setFormData({ ...formData, chief_complaint: e.target.value })}
            className="w-full border border-gray-300 rounded px-3 py-2"
            rows={3}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Medical History</label>
        <textarea
          value={formData.medical_history}
          onChange={(e) => setFormData({ ...formData, medical_history: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2"
          rows={4}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Patient Scenario Details</label>
        <textarea
          value={formData.patient_scenario}
          onChange={(e) => setFormData({ ...formData, patient_scenario: e.target.value })}
          className="w-full border border-gray-300 rounded px-3 py-2"
          rows={4}
          placeholder="Describe the specific scenario for this patient..."
        />
      </div>

      {/* Allergies */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">Allergies</label>
          <button
            onClick={addAllergy}
            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add Allergy
          </button>
        </div>
        <div className="space-y-2">
          {formData.allergies.map((allergy, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={allergy}
                onChange={(e) => updateAllergy(index, e.target.value)}
                placeholder="Allergy..."
                className="flex-1 border border-gray-300 rounded px-3 py-2"
              />
              <button
                onClick={() => removeAllergy(index)}
                className="text-red-600 hover:text-red-800 p-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium mb-3">Emergency Contact</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text"
              value={formData.emergency_contact_name}
              onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
            <input
              type="text"
              value={formData.emergency_contact_relationship}
              onChange={(e) => setFormData({ ...formData, emergency_contact_relationship: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              type="tel"
              value={formData.emergency_contact_phone}
              onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
              className="w-full border border-gray-300 rounded px-3 py-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Placeholder components for other patient editors
const PatientVitalsEditor: React.FC<{
  patient: SimulationPatient;
  onRefresh: () => void;
}> = ({ patient, onRefresh }) => {
  return (
    <div className="text-center p-8 text-gray-500">
      Vitals editor coming soon...
      <br />
      Patient: {patient.patient_name}
    </div>
  );
};

const PatientMedicationsEditor: React.FC<{
  patient: SimulationPatient;
  onRefresh: () => void;
}> = ({ patient, onRefresh }) => {
  return (
    <div className="text-center p-8 text-gray-500">
      Medications editor coming soon...
      <br />
      Patient: {patient.patient_name}
    </div>
  );
};

const PatientNotesEditor: React.FC<{
  patient: SimulationPatient;
  onRefresh: () => void;
}> = ({ patient, onRefresh }) => {
  return (
    <div className="text-center p-8 text-gray-500">
      Notes editor coming soon...
      <br />
      Patient: {patient.patient_name}
    </div>
  );
};

// Assign Users Tab Component
const AssignUsersTab: React.FC<{
  scenarioId: string;
}> = ({ scenarioId }) => {
  return (
    <div className="p-6">
      <div className="text-center text-gray-500">
        User assignment feature coming soon...
        <br />
        This will allow you to assign students and instructors to this simulation scenario.
      </div>
    </div>
  );
};

// Add Patient Modal Component
const AddPatientModal: React.FC<{
  onClose: () => void;
  onSubmit: (data: CreateSimulationPatientRequest) => Promise<void>;
}> = ({ onClose, onSubmit }) => {
  /**
   * Generate a unique patient ID in PTXXXXX format
   */
  const generatePatientId = (): string => {
    const randomNum = Math.floor(Math.random() * 90000) + 10000; // Ensures 5 digits
    return `PT${randomNum}`;
  };

  const [formData, setFormData] = useState<CreateSimulationPatientRequest>({
    patient_name: '',
    patient_id: generatePatientId(), // Auto-generate patient ID
    date_of_birth: '',
    gender: '',
    room_number: '',
    bed_number: '',
    diagnosis: '',
    medical_history: '',
    allergies: [],
    chief_complaint: '',
    patient_scenario: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.patient_name.trim() && formData.patient_id.trim() && formData.date_of_birth) {
      await onSubmit(formData);
    }
  };

  const regeneratePatientId = () => {
    setFormData({ ...formData, patient_id: generatePatientId() });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Add New Patient</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Patient Name *
            </label>
            <input
              type="text"
              value={formData.patient_name}
              onChange={(e) => setFormData({ ...formData, patient_name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Patient ID *
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={formData.patient_id}
                onChange={(e) => setFormData({ ...formData, patient_id: e.target.value })}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50"
                placeholder="PT001, PT002, etc."
                required
              />
              <button
                type="button"
                onClick={regeneratePatientId}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                title="Generate new ID"
              >
                New ID
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth *
            </label>
            <input
              type="date"
              value={formData.date_of_birth}
              onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Diagnosis
            </label>
            <textarea
              value={formData.diagnosis}
              onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows={2}
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
              Cancel
            </button>
            <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg">
              Add Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SimulationEditor;