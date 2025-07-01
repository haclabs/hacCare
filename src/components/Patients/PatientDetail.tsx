import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  MapPin, 
  Phone, 
  User, 
  Heart, 
  Thermometer,
  Activity,
  Droplets,
  Clock,
  AlertTriangle,
  FileText,
  Pill
} from 'lucide-react';
import { Patient, VitalSigns, Medication, PatientNote } from '../../types';
import { patientService } from '../../lib/patientService';
import LoadingSpinner from '../UI/LoadingSpinner';
import VitalSignsEditor from './VitalSignsEditor';
import MedicationForm from './MedicationForm';
import PatientNoteForm from './PatientNoteForm';

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vitals, setVitals] = useState<VitalSigns[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);

  useEffect(() => {
    const loadPatientData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const [patientData, vitalsData, medicationsData, notesData] = await Promise.all([
          patientService.getPatient(id),
          patientService.getPatientVitals(id),
          patientService.getPatientMedications(id),
          patientService.getPatientNotes(id)
        ]);
        
        setPatient(patientData);
        setVitals(vitalsData);
        setMedications(medicationsData);
        setNotes(notesData);
      } catch (error) {
        console.error('Error loading patient data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPatientData();
  }, [id]);

  const handleVitalsSubmit = async (newVitals: Omit<VitalSigns, 'id' | 'recordedAt'>) => {
    if (!patient) return;
    
    try {
      const savedVitals = await patientService.addVitalSigns(patient.id, newVitals);
      setVitals(prev => [savedVitals, ...prev]);
      setShowVitalsForm(false);
    } catch (error) {
      console.error('Error saving vitals:', error);
    }
  };

  const handleMedicationSubmit = async (medication: Omit<Medication, 'id' | 'createdAt'>) => {
    if (!patient) return;
    
    try {
      const savedMedication = await patientService.addMedication(patient.id, medication);
      setMedications(prev => [savedMedication, ...prev]);
      setShowMedicationForm(false);
    } catch (error) {
      console.error('Error saving medication:', error);
    }
  };

  const handleNoteSubmit = async (note: Omit<PatientNote, 'id' | 'createdAt'>) => {
    if (!patient) return;
    
    try {
      const savedNote = await patientService.addNote(patient.id, note);
      setNotes(prev => [savedNote, ...prev]);
      setShowNoteForm(false);
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Patient Not Found</h3>
          <p className="text-gray-500 mb-4">The requested patient could not be found.</p>
          <button
            onClick={() => navigate('/patients')}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
          >
            Back to Patients
          </button>
        </div>
      </div>
    );
  }

  const latestVitals = vitals[0];
  const activeMedications = medications.filter(med => med.status === 'Active');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/patients')}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {patient.firstName} {patient.lastName}
              </h1>
              <p className="text-gray-500">Patient ID: {patient.patientId}</p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/patients/${patient.id}/edit`)}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center space-x-2"
          >
            <Edit className="h-4 w-4" />
            <span>Edit Patient</span>
          </button>
        </div>
      </div>

      {/* Patient Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <User className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Age:</span> {new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()} years</p>
            <p><span className="font-medium">Gender:</span> {patient.gender}</p>
            <p><span className="font-medium">Blood Type:</span> {patient.bloodType}</p>
            <p><span className="font-medium">Room:</span> {patient.roomNumber}-{patient.bedNumber}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <MapPin className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-medium text-gray-900">Medical Information</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Condition:</span> {patient.condition}</p>
            <p><span className="font-medium">Diagnosis:</span> {patient.diagnosis}</p>
            <p><span className="font-medium">Assigned Nurse:</span> {patient.assignedNurse}</p>
            <p><span className="font-medium">Admission:</span> {new Date(patient.admissionDate).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Phone className="h-5 w-5 text-purple-600" />
            <h3 className="text-lg font-medium text-gray-900">Emergency Contact</h3>
          </div>
          <div className="space-y-2 text-sm">
            <p><span className="font-medium">Name:</span> {patient.emergencyContactName}</p>
            <p><span className="font-medium">Relationship:</span> {patient.emergencyContactRelationship}</p>
            <p><span className="font-medium">Phone:</span> {patient.emergencyContactPhone}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: FileText },
            { id: 'vitals', name: 'Vital Signs', icon: Heart },
            { id: 'medications', name: 'Medications', icon: Pill },
            { id: 'notes', name: 'Notes', icon: FileText }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Latest Vitals */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Latest Vital Signs</h3>
              <button
                onClick={() => setShowVitalsForm(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Add New
              </button>
            </div>
            {latestVitals ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Thermometer className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Temp: {latestVitals.temperature}°F</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Heart className="h-4 w-4 text-pink-500" />
                  <span className="text-sm">HR: {latestVitals.heartRate} bpm</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">BP: {latestVitals.bloodPressureSystolic}/{latestVitals.bloodPressureDiastolic}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Droplets className="h-4 w-4 text-cyan-500" />
                  <span className="text-sm">O2: {latestVitals.oxygenSaturation}%</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No vital signs recorded</p>
            )}
          </div>

          {/* Active Medications */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Active Medications</h3>
              <button
                onClick={() => setShowMedicationForm(true)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                Add New
              </button>
            </div>
            {activeMedications.length > 0 ? (
              <div className="space-y-3">
                {activeMedications.slice(0, 3).map((medication) => (
                  <div key={medication.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                    <div>
                      <p className="font-medium text-sm">{medication.name}</p>
                      <p className="text-xs text-gray-500">{medication.dosage} - {medication.frequency}</p>
                    </div>
                    <div className="text-xs text-gray-500">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {new Date(medication.nextDue).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No active medications</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'vitals' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Vital Signs History</h3>
              <button
                onClick={() => setShowVitalsForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Add Vital Signs
              </button>
            </div>
          </div>
          <div className="p-6">
            {vitals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date/Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Temperature</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blood Pressure</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Heart Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">O2 Sat</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {vitals.map((vital) => (
                      <tr key={vital.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(vital.recordedAt).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vital.temperature}°F</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {vital.bloodPressureSystolic}/{vital.bloodPressureDiastolic}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vital.heartRate} bpm</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{vital.oxygenSaturation}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No vital signs recorded</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'medications' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Medications</h3>
              <button
                onClick={() => setShowMedicationForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Add Medication
              </button>
            </div>
          </div>
          <div className="p-6">
            {medications.length > 0 ? (
              <div className="space-y-4">
                {medications.map((medication) => (
                  <div key={medication.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{medication.name}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        medication.status === 'Active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {medication.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Dosage:</span> {medication.dosage}
                      </div>
                      <div>
                        <span className="font-medium">Frequency:</span> {medication.frequency}
                      </div>
                      <div>
                        <span className="font-medium">Route:</span> {medication.route}
                      </div>
                      <div>
                        <span className="font-medium">Next Due:</span> {new Date(medication.nextDue).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No medications recorded</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'notes' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Patient Notes</h3>
              <button
                onClick={() => setShowNoteForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Add Note
              </button>
            </div>
          </div>
          <div className="p-6">
            {notes.length > 0 ? (
              <div className="space-y-4">
                {notes.map((note) => (
                  <div key={note.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{note.nurseName}</span>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm text-gray-500">{note.type}</span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          note.priority === 'High' 
                            ? 'bg-red-100 text-red-800'
                            : note.priority === 'Medium'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {note.priority}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(note.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700">{note.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No notes recorded</p>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showVitalsForm && (
        <VitalSignsEditor
          onSubmit={handleVitalsSubmit}
          onCancel={() => setShowVitalsForm(false)}
        />
      )}

      {showMedicationForm && (
        <MedicationForm
          onSubmit={handleMedicationSubmit}
          onCancel={() => setShowMedicationForm(false)}
        />
      )}

      {showNoteForm && (
        <PatientNoteForm
          onSubmit={handleNoteSubmit}
          onCancel={() => setShowNoteForm(false)}
        />
      )}
    </div>
  );
};

export default PatientDetail;