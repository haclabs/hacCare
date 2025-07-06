import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Calendar, MapPin, Phone, User, Heart, Thermometer, Activity, Droplets, Clock, Pill, FileText, AlertTriangle, Plus, Stethoscope, TrendingUp, FileText as FileText2 } from 'lucide-react';
import { Patient, VitalSigns, PatientNote, Medication } from '../../types';
import { VitalSignsEditor } from './VitalSignsEditor';
import { PatientNoteForm } from './PatientNoteForm';
import { MedicationForm } from './MedicationForm';
import { VitalsTrends } from './VitalsTrends';
import { MedicationAdministration } from './MedicationAdministration';
import { PatientBracelet } from './PatientBracelet';
import { MedicationBarcode } from './MedicationBarcode';
import { AdmissionRecordsForm } from './AdmissionRecordsForm';
import { AdvancedDirectivesForm } from './AdvancedDirectivesForm';
import { WoundAssessment } from './WoundAssessment';
import { AssessmentForm } from './AssessmentForm';
import { AssessmentDetail } from './AssessmentDetail';
import { getPatientVitals, getPatientNotes, fetchPatientVitalsHistory } from '../../lib/patientService';
import { fetchPatientMedications } from '../../lib/medicationService';
import { formatTime, calculateAge } from '../../utils/patientUtils';
import { fetchPatientAssessments } from '../../lib/assessmentService';

interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack }) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [vitals, setVitals] = useState<VitalSigns | null>(null);
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [showVitalsEditor, setShowVitalsEditor] = useState(false);
  const [showVitalsTrends, setShowVitalsTrends] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showPatientBracelet, setShowPatientBracelet] = useState(false);
  const [showMedicationBarcode, setShowMedicationBarcode] = useState(false);
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [showDirectivesForm, setShowDirectivesForm] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);

  useEffect(() => {
    loadPatientData();
  }, [patient.id]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      const [vitalsData, notesData, medicationsData, assessmentsData] = await Promise.all([
        getPatientVitals(patient.id),
        getPatientNotes(patient.id),
        fetchPatientMedications(patient.id),
        fetchPatientAssessments(patient.id)
      ]);
      
      setVitals(vitalsData);
      setNotes(notesData);
      setMedications(medicationsData);
      setAssessments(assessmentsData);
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

  const handleAssessmentAdd = () => {
    setShowAssessmentForm(false);
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
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowPatientBracelet(true)}
            className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm flex items-center space-x-1"
          >
            <User className="h-4 w-4" />
            <span>Patient Labels</span>
          </button>
          <button
            onClick={() => setShowMedicationBarcode(true)}
            className="px-3 py-1 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm flex items-center space-x-1"
          >
            <Pill className="h-4 w-4" />
            <span>Medication Labels</span>
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
                {patient.first_name} {patient.last_name}
              </h1>
              <p className="text-gray-600">Patient ID: {patient.patient_id}</p>
              <p className="text-sm text-gray-500">
                {calculateAge(patient.date_of_birth)} years old • {patient.gender}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
              <MapPin className="h-4 w-4" />
              <span>Room {patient.room_number}, Bed {patient.bed_number}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Admitted {new Date(patient.admission_date).toLocaleDateString('en-US', { 
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
              <div><span className="text-gray-600">Blood Type:</span> {patient.blood_type}</div>
              <div><span className="text-gray-600">Assigned Nurse:</span> {patient.assigned_nurse}</div>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 mb-2">Emergency Contact</h3>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-600">Name:</span> {patient.emergency_contact_name}</div>
              <div><span className="text-gray-600">Relationship:</span> {patient.emergency_contact_relationship}</div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{patient.emergency_contact_phone}</span>
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

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Overview</span>
          </button>
          
          <button
            onClick={() => setActiveTab('vitals')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
              activeTab === 'vitals'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Vital Signs</span>
          </button>
          
          <button
            onClick={() => setActiveTab('medications')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
              activeTab === 'medications'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>MAR</span>
          </button>
          
          <button
            onClick={() => setActiveTab('notes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
              activeTab === 'notes'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Notes</span>
          </button>
          
          <button
            onClick={() => setActiveTab('admission')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
              activeTab === 'admission'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Admission Records</span>
          </button>
          
          <button
            onClick={() => setActiveTab('directives')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
              activeTab === 'directives'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText2 className="w-4 h-4" />
            <span>Advanced Directives</span>
          </button>
        </nav>
      </div>
      
      {/* Second row of tabs for assessments */}
      <div className="border-b border-gray-200 -mt-6">
        <nav className="flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('assessments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
              activeTab === 'assessments'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span>Assessments</span>
          </button>
          
          <button
            onClick={() => setActiveTab('wounds')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
              activeTab === 'wounds'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Wound Assessment</span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <>
            {/* Vital Signs Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                  <Stethoscope className="h-5 w-5" />
                  <span>Vital Signs</span>
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowVitalsEditor(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Update Vitals</span>
                  </button>
                  <button
                    onClick={() => setShowVitalsTrends(true)}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <TrendingUp className="h-4 w-4" />
                    <span>View Trends</span>
                  </button>
                </div>
              </div>

              {vitals ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className={`p-4 rounded-lg ${getVitalStatus('temperature', vitals.temperature)}`}>
                    <div className="flex items-center space-x-2 mb-2">
                      <Thermometer className="h-5 w-5" />
                      <span className="text-sm font-medium">Temperature (°C)</span>
                    </div>
                    <div className="text-2xl font-bold">{vitals.temperature.toFixed(1)}°C</div>
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
                    <div className="text-sm">{formatTime(vitals.lastUpdated || vitals.recorded_at)}</div>
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
                  {medications.filter(med => med.status === 'Active').slice(0, 3).map((medication) => (
                    <div key={medication.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{medication.name}</h3>
                          <p className="text-sm text-gray-600">
                            {medication.dosage} • {medication.frequency} • {medication.route}
                          </p>
                          <p className="text-sm text-gray-500">
                            Prescribed by: {medication.prescribed_by}
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
                          {medication.next_due && (
                            <p className="text-sm text-gray-500 mt-1">
                              Next due: {formatTime(medication.next_due)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {medications.filter(med => med.status === 'Active').length > 3 && (
                    <button
                      onClick={() => setActiveTab('medications')}
                      className="w-full text-blue-600 hover:text-blue-800 text-sm py-2"
                    >
                      View all {medications.filter(med => med.status === 'Active').length} medications
                    </button>
                  )}
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
                  <span>Recent Notes</span>
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
                  {notes.slice(0, 3).map((note) => (
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
                          <div>{note.nurse_name}</div>
                          <div>{formatTime(note.created_at)}</div>
                        </div>
                      </div>
                      <p className="text-gray-700">{note.content}</p>
                    </div>
                  ))}
                  {notes.length > 3 && (
                    <button
                      onClick={() => setActiveTab('notes')}
                      className="w-full text-blue-600 hover:text-blue-800 text-sm py-2"
                    >
                      View all {notes.length} notes
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No notes recorded yet</p>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'vitals' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Vital Signs</span>
              </h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowVitalsEditor(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Edit className="h-4 w-4" />
                  <span>Update Vitals</span>
                </button>
                <button
                  onClick={() => setActiveTab('vitals')}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  title="View vital signs trends"
                  title="View vital signs trends"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Go to Vital Records</span>
                </button>
              </div>
            </div>

            {showVitalsTrends ? (
              <VitalsTrends 
                patientId={patient.id}
                patientName={`${patient.first_name} ${patient.last_name}`}
                onClose={() => setShowVitalsTrends(false)}
                onRecordVitals={() => setShowVitalsEditor(true)}
              />
            ) : vitals ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className={`p-4 rounded-lg ${getVitalStatus('temperature', vitals.temperature)}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    <Thermometer className="h-5 w-5" />
                    <span className="text-sm font-medium">Temperature</span>
                  </div>
                  <div className="text-2xl font-bold">{vitals.temperature.toFixed(1)}°C</div>
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
                  <div className="text-sm">{formatTime(vitals.lastUpdated || vitals.recorded_at)}</div>
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
        )}

        {activeTab === 'medications' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <Pill className="h-5 w-5" />
                <span>MAR (Medication Administration Record)</span>
              </h2>
              <button
                onClick={() => setShowMedicationForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Medication</span>
              </button>
            </div>

            <MedicationAdministration
              patientId={patient.id}
              patientName={`${patient.first_name} ${patient.last_name}`}
              medications={medications}
              onRefresh={loadPatientData}
            />
          </div>
        )}

        {activeTab === 'notes' && (
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
                        <div>{note.nurse_name}</div>
                        <div>{formatTime(note.created_at)}</div>
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
        )}

        {activeTab === 'admission' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Admission Records</span>
              </h2>
              <button
                onClick={() => setShowAdmissionForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>Update Records</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3 border-b pb-2">Current Admission</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-600 font-medium">Admission Date:</span> {new Date(patient.admission_date).toLocaleDateString()}</div>
                  <div><span className="text-gray-600 font-medium">Admission Type:</span> Emergency</div>
                  <div><span className="text-gray-600 font-medium">Attending Physician:</span> Dr. Sarah Wilson, MD</div>
                  <div><span className="text-gray-600 font-medium">Insurance Provider:</span> Blue Cross Blue Shield</div>
                  <div><span className="text-gray-600 font-medium">Insurance Policy:</span> BC123456789</div>
                  <div><span className="text-gray-600 font-medium">Chief Complaint:</span> Chest pain and shortness of breath</div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-3 border-b pb-2">Measurements</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-600 font-medium">Height:</span> 5'10" (178 cm)</div>
                  <div><span className="text-gray-600 font-medium">Weight:</span> 185 lbs (84 kg)</div>
                  <div><span className="text-gray-600 font-medium">BMI:</span> 26.5 (Overweight)</div>
                  <div><span className="text-gray-600 font-medium">Smoking Status:</span> Former smoker (quit 5 years ago)</div>
                  <div><span className="text-gray-600 font-medium">Alcohol Use:</span> Social drinker (2-3 drinks/week)</div>
                  <div><span className="text-gray-600 font-medium">Exercise:</span> Sedentary lifestyle</div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-3 border-b pb-2">Social & Family History</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-600 font-medium">Occupation:</span> Office manager (desk job)</div>
                  <div><span className="text-gray-600 font-medium">Marital Status:</span> Married, 2 children</div>
                  <div><span className="text-gray-600 font-medium">Family History:</span> Father: Myocardial infarction at age 58; Mother: Type 2 diabetes, hypertension; Brother: Hyperlipidemia</div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-3 border-b pb-2">Secondary Contact</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-600 font-medium">Name:</span> Robert Smith Jr.</div>
                  <div><span className="text-gray-600 font-medium">Relationship:</span> Son</div>
                  <div><span className="text-gray-600 font-medium">Phone:</span> (555) 234-5678</div>
                  <div><span className="text-gray-600 font-medium">Address:</span> 456 Oak Ave, Nearby City, ST 12346</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'directives' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <FileText2 className="h-5 w-5" />
                <span>Advanced Directives</span>
              </h2>
              <button
                onClick={() => setShowDirectivesForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>Update Directives</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-3 border-b pb-2">Legal Documents</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-600 font-medium">Living Will Status:</span> On File</div>
                  <div><span className="text-gray-600 font-medium">Living Will Date:</span> January 10, 2024</div>
                  <div><span className="text-gray-600 font-medium">Healthcare Proxy:</span> Mary Smith (Spouse)</div>
                  <div><span className="text-gray-600 font-medium">Healthcare Proxy Phone:</span> (555) 987-6543</div>
                  <div><span className="text-gray-600 font-medium">DNR Status:</span> <span className="text-red-600 font-bold">Full Code</span></div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium text-gray-900 mb-3 border-b pb-2">Organ Donation & Preferences</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-600 font-medium">Organ Donation Status:</span> Registered organ donor</div>
                  <div><span className="text-gray-600 font-medium">Donation Details:</span> All organs and tissues</div>
                  <div><span className="text-gray-600 font-medium">Religious Preference:</span> Catholic</div>
                  <div><span className="text-gray-600 font-medium">Special Instructions:</span> Prefers family present for major decisions; Comfortable with medical students observing</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assessments' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <Stethoscope className="h-5 w-5" />
                <span>Patient Assessments</span>
              </h2>
              <button
                onClick={() => setShowAssessmentForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>New Assessment</span>
              </button>
            </div>

            {assessments.length > 0 ? (
              <div className="space-y-4">
                {assessments.map((assessment) => {
                  const assessmentDate = new Date(assessment.assessment_date);
                  const isValid = !isNaN(assessmentDate.getTime());
                  
                  return (
                    <div 
                      key={assessment.id} 
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedAssessment(assessment)}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                              assessment.priority_level === 'critical' 
                                ? 'bg-red-100 text-red-800'
                                : assessment.priority_level === 'urgent'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {assessment.priority_level.charAt(0).toUpperCase() + assessment.priority_level.slice(1)}
                            </span>
                            <span className="text-sm font-medium text-gray-900">
                              {assessment.assessment_type.charAt(0).toUpperCase() + assessment.assessment_type.slice(1)} Assessment
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 line-clamp-2">{assessment.assessment_notes}</p>
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          <div>{assessment.nurse_name}</div>
                          <div>{isValid ? assessmentDate.toLocaleDateString() : 'Invalid date'}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Stethoscope className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No assessments recorded yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'wounds' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5" />
                <span>Wound Assessment</span>
              </h2>
            </div>

            <WoundAssessment patientId={patient.id} />
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

      {showVitalsTrends && (
        <VitalsTrends
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onClose={() => setShowVitalsTrends(false)}
          onRecordVitals={() => {
            setShowVitalsTrends(false);
            setShowVitalsEditor(true);
          }}
        />
      )}

      {showNoteForm && (
        <PatientNoteForm
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onSave={handleNoteAdd}
          onCancel={() => setShowNoteForm(false)}
        />
      )}

      {showMedicationForm && (
        <MedicationForm
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onSave={handleMedicationAdd}
          onCancel={() => setShowMedicationForm(false)}
        />
      )}

      {showPatientBracelet && (
        <PatientBracelet
          patient={patient}
          onClose={() => setShowPatientBracelet(false)}
        />
      )}

      {showMedicationBarcode && (
        <MedicationBarcode
          patient={patient}
          medications={medications}
          onClose={() => setShowMedicationBarcode(false)}
        />
      )}

      {showAdmissionForm && (
        <AdmissionRecordsForm
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onClose={() => setShowAdmissionForm(false)}
          onSave={() => {
            setShowAdmissionForm(false);
            loadPatientData();
          }}
        />
      )}

      {showDirectivesForm && (
        <AdvancedDirectivesForm
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onClose={() => setShowDirectivesForm(false)}
          onSave={() => {
            setShowDirectivesForm(false);
            loadPatientData();
          }}
        />
      )}

      {showAssessmentForm && (
        <AssessmentForm
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onClose={() => setShowAssessmentForm(false)}
          onSave={handleAssessmentAdd}
        />
      )}

      {selectedAssessment && (
        <AssessmentDetail
          assessment={selectedAssessment}
          onClose={() => setSelectedAssessment(null)}
        />
      )}
    </div>
  );
};