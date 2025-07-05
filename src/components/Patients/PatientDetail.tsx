import React, { useState, useEffect } from 'react';
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
  Pill,
  FileText,
  AlertTriangle,
  Plus,
  Stethoscope
} from 'lucide-react';
import { Patient, VitalSigns, PatientNote, Medication } from '../../types';
import { VitalSignsEditor } from './VitalSignsEditor';
import { PatientNoteForm } from './PatientNoteForm';
import { MedicationForm } from './MedicationForm';
import { getPatientVitals, getPatientNotes, getPatientMedications } from '../../lib/patientService';
import { formatTime, calculateAge } from '../../utils/patientUtils';

interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack }) => {
  const [vitals, setVitals] = useState<VitalSigns | null>(null);
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showVitalsEditor, setShowVitalsEditor] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);

  useEffect(() => {
    loadPatientData();
  }, [patient.id]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      const [vitalsData, notesData, medicationsData] = await Promise.all([
        getPatientVitals(patient.id),
        getPatientNotes(patient.id),
        getPatientMedications(patient.id)
      ]);
      
      setVitals(vitalsData);
      setNotes(notesData);
      setMedications(medicationsData);
    } catch (err: any) {
      console.error('Error loading patient data:', err);
      setError(err.message || 'Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const handleVitalsSave = (newVitals: VitalSigns) => {
    setVitals(newVitals);
    setShowVitalsEditor(false);
  };

  const handleNoteAdd = () => {
    setShowNoteForm(false);
    loadPatientData(); // Refresh data
  };

  const handleMedicationAdd = () => {
    setShowMedicationForm(false);
    loadPatientData(); // Refresh data
  };

  const getVitalStatus = (vital: string, value: number) => {
    switch (vital) {
      case 'temperature':
        if (value < 97 || value > 100.4) return 'text-red-600 bg-red-50';
        return 'text-green-600 bg-green-50';
      case 'heartRate':
        if (value < 60 || value > 100) return 'text-yellow-600 bg-yellow-50';
        return 'text-green-600 bg-green-50';
      case 'systolic':
        if (value < 90 || value > 140) return 'text-red-600 bg-red-50';
        return 'text-green-600 bg-green-50';
      case 'diastolic':
        if (value < 60 || value > 90) return 'text-red-600 bg-red-50';
        return 'text-green-600 bg-green-50';
      case 'oxygenSaturation':
        if (value < 95) return 'text-red-600 bg-red-50';
        return 'text-green-600 bg-green-50';
      case 'respiratoryRate':
        if (value < 12 || value > 20) return 'text-yellow-600 bg-yellow-50';
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Patients</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Patient Information Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {patient.firstName} {patient.lastName}
              </h1>
              <p className="text-gray-600">Patient ID: {patient.patientId}</p>
              <p className="text-sm text-gray-500">
                {calculateAge(patient.dateOfBirth)} years old • {patient.gender}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
              <MapPin className="h-4 w-4" />
              <span>Room {patient.roomNumber}, Bed {patient.bedNumber}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Admitted {new Date(patient.admissionDate).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Medical Information</h3>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-600">Condition:</span> {patient.condition}</div>
              <div><span className="text-gray-600">Diagnosis:</span> {patient.diagnosis}</div>
              <div><span className="text-gray-600">Blood Type:</span> {patient.bloodType}</div>
              <div><span className="text-gray-600">Assigned Nurse:</span> {patient.assignedNurse}</div>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">Emergency Contact</h3>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-600">Name:</span> {patient.emergencyContactName}</div>
              <div><span className="text-gray-600">Relationship:</span> {patient.emergencyContactRelationship}</div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{patient.emergencyContactPhone}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">Allergies</h3>
            <div className="space-y-1">
              {patient.allergies && patient.allergies.length > 0 ? (
                patient.allergies.map((allergy, index) => (
                  <span
                    key={index}
                    className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full mr-1 mb-1"
                  >
                    {allergy}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 text-sm">No known allergies</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Vital Signs Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Stethoscope className="h-5 w-5" />
            <span>Vital Signs</span>
          </h2>
          <button
            onClick={() => setShowVitalsEditor(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Edit className="h-4 w-4" />
            <span>Update Vitals</span>
          </button>
        </div>

        {vitals ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className={`p-4 rounded-lg ${getVitalStatus('temperature', vitals.temperature)}`}>
              <div className="flex items-center space-x-2 mb-2">
                <Thermometer className="h-5 w-5" />
                <span className="text-sm font-medium">Temperature</span>
              </div>
              <div className="text-2xl font-bold">{vitals.temperature}°F</div>
            </div>

            <div className={`p-4 rounded-lg ${getVitalStatus('heartRate', vitals.heartRate)}`}>
              <div className="flex items-center space-x-2 mb-2">
                <Heart className="h-5 w-5" />
                <span className="text-sm font-medium">Heart Rate</span>
              </div>
              <div className="text-2xl font-bold">{vitals.heartRate} BPM</div>
            </div>

            <div className={`p-4 rounded-lg ${getVitalStatus('systolic', vitals.bloodPressure.systolic)}`}>
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="h-5 w-5" />
                <span className="text-sm font-medium">Blood Pressure</span>
              </div>
              <div className="text-2xl font-bold">
                {vitals.bloodPressure.systolic}/{vitals.bloodPressure.diastolic}
              </div>
            </div>

            <div className={`p-4 rounded-lg ${getVitalStatus('respiratoryRate', vitals.respiratoryRate)}`}>
              <div className="flex items-center space-x-2 mb-2">
                <Activity className="h-5 w-5" />
                <span className="text-sm font-medium">Respiratory Rate</span>
              </div>
              <div className="text-2xl font-bold">{vitals.respiratoryRate}/min</div>
            </div>

            <div className={`p-4 rounded-lg ${getVitalStatus('oxygenSaturation', vitals.oxygenSaturation)}`}>
              <div className="flex items-center space-x-2 mb-2">
                <Droplets className="h-5 w-5" />
                <span className="text-sm font-medium">O2 Saturation</span>
              </div>
              <div className="text-2xl font-bold">{vitals.oxygenSaturation}%</div>
            </div>

            <div className="p-4 rounded-lg bg-gray-50 text-gray-600">
              <div className="flex items-center space-x-2 mb-2">
                <Clock className="h-5 w-5" />
                <span className="text-sm font-medium">Last Updated</span>
              </div>
              <div className="text-sm">{formatTime(vitals.lastUpdated)}</div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No vital signs recorded yet</p>
            <button
              onClick={() => setShowVitalsEditor(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Record First Vitals
            </button>
          </div>
        )}
      </div>

      {/* Medications Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Pill className="h-5 w-5" />
            <span>Current Medications</span>
          </h2>
          <button
            onClick={() => setShowMedicationForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Medication</span>
          </button>
        </div>

        {medications.length > 0 ? (
          <div className="space-y-4">
            {medications.map((medication) => (
              <div key={medication.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">{medication.name}</h3>
                    <p className="text-sm text-gray-600">
                      {medication.dosage} • {medication.frequency} • {medication.route}
                    </p>
                    <p className="text-sm text-gray-500">
                      Prescribed by: {medication.prescribedBy}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                      medication.status === 'Active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {medication.status}
                    </span>
                    {medication.nextDue && (
                      <p className="text-sm text-gray-500 mt-1">
                        Next due: {formatTime(medication.nextDue)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No medications prescribed</p>
          </div>
        )}
      </div>

      {/* Notes Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Patient Notes</span>
          </h2>
          <button
            onClick={() => setShowNoteForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Note</span>
          </button>
        </div>

        {notes.length > 0 ? (
          <div className="space-y-4">
            {notes.map((note) => (
              <div key={note.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                      note.priority === 'High' 
                        ? 'bg-red-100 text-red-800'
                        : note.priority === 'Medium'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {note.priority}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{note.type}</span>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>{note.nurseName}</div>
                    <div>{formatTime(note.createdAt)}</div>
                  </div>
                </div>
                <p className="text-gray-700">{note.content}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No notes recorded yet</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showVitalsEditor && (
        <VitalSignsEditor
          patientId={patient.id}
          vitals={vitals || undefined}
          onSave={handleVitalsSave}
          onCancel={() => setShowVitalsEditor(false)}
        />
      )}

      {showNoteForm && (
        <PatientNoteForm
          patientId={patient.id}
          onSave={handleNoteAdd}
          onCancel={() => setShowNoteForm(false)}
        />
      )}

      {showMedicationForm && (
        <MedicationForm
          patientId={patient.id}
          onSave={handleMedicationAdd}
          onCancel={() => setShowMedicationForm(false)}
        />
      )}
    </div>
  );
};