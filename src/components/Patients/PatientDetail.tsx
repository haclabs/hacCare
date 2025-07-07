import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Activity, Pill, FileText, Calendar, ArrowLeft, Edit, Printer, AlertTriangle, Stethoscope, FileText as FileText2, Heart, Thermometer, Droplets, Clock, Plus, TrendingUp } from 'lucide-react';
import { usePatients } from '../../contexts/PatientContext';
import { useAuth } from '../../contexts/AuthContext';
import { VitalSignsEditor } from './VitalSignsEditor';
import { MedicationAdministration } from './MedicationAdministration';
import { PatientNoteForm } from './PatientNoteForm';
import { AssessmentForm } from './AssessmentForm';
import { WoundAssessment } from './WoundAssessment';
import { AdmissionRecordsForm } from './AdmissionRecordsForm';
import { AdvancedDirectivesForm } from './AdvancedDirectivesForm';
import { PatientBracelet } from './PatientBracelet';
import { VitalsTrends } from './VitalsTrends';
import { HospitalBracelet } from './HospitalBracelet';
import { fetchPatientMedications } from '../../lib/medicationService'; 
import { fetchPatientVitals } from '../../lib/patientService';
import { format } from 'date-fns';
import { fetchPatientById } from '../../lib/patientService';

export const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { patients } = usePatients();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showPatientBracelet, setShowPatientBracelet] = useState(false);
  const [showVitalForm, setShowVitalForm] = useState(false);
  const [showVitalsTrends, setShowVitalsTrends] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [showAdvancedDirectivesForm, setShowAdvancedDirectivesForm] = useState(false);
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  
  // Local state for patient-specific data
  const [vitals, setVitals] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [wounds, setWounds] = useState<any[]>([]);
  const [admissionRecords, setAdmissionRecords] = useState<any>(null);
  const [directives, setDirectives] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const patient = patients.find(p => p.id === id);

  useEffect(() => {
    // Initialize with empty arrays/objects to prevent filter errors
    setVitals([]);
    setMedications([]);
    setNotes([]);
    setAssessments([]);
    setWounds([]);
    setAdmissionRecords(null);
    setDirectives(null);

    // Fetch patient-specific data using service functions
    if (id) {
      fetchPatientMedications(id).then(setMedications).catch(console.error);
      fetchPatientVitals(id).then(setVitals).catch(console.error);
      setLoading(false);
    }
  }, [patient, id, navigate]);

  if (!patient && !loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Patient not found</h3>
          <p className="text-gray-500 dark:text-gray-400">The requested patient could not be found.</p>
        </div>
      </div>
    );
  }

  if (loading || !patient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Loading patient data...</h3>
        </div>
      </div>
    );
  }

  const handleTabChange = (tab: string) => {
    // Close any open modals when changing tabs
    if (showVitalsTrends) {
      setShowVitalsTrends(false);
    }
    setActiveTab(tab);
  };

  const getLatestVitals = () => {
    if (vitals.length === 0) return null;
    return vitals.sort((a, b) => 
      new Date(b.recorded_at || '').getTime() - new Date(a.recorded_at || '').getTime()
    )[0];
  };

  const latestVitals = getLatestVitals();
  
  const patientName = `${patient.first_name} ${patient.last_name}`;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Patient Information */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center"><User className="h-5 w-5 mr-2 text-blue-600" />Patient Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Patient ID</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{patient.patient_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Date of Birth</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{patient.date_of_birth}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Gender</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{patient.gender}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Blood Type</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{patient.blood_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Room</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{patient.room_number}-{patient.bed_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Assigned Nurse</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{patient.assigned_nurse}</p>
                </div>
              </div>
            </div>

            {/* Latest Vitals */}
            {latestVitals && (
              <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center"><Activity className="h-5 w-5 mr-2 text-blue-600" />Latest Vital Signs</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Thermometer className="h-8 w-8 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Temperature</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{latestVitals.temperature}°F</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Heart className="h-8 w-8 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Heart Rate</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{latestVitals.heart_rate} bpm</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Droplets className="h-8 w-8 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Blood Pressure</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {latestVitals.blood_pressure_systolic}/{latestVitals.blood_pressure_diastolic}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <Wind className="h-8 w-8 text-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">O2 Saturation</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{latestVitals.oxygen_saturation}%</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Allergies */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center"><AlertTriangle className="h-5 w-5 mr-2 text-red-600" />Allergies</h3>
              {patient.allergies && patient.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((allergy, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">No known allergies</p>
              )}
            </div>

            {/* Emergency Contact */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center"><FileText className="h-5 w-5 mr-2 text-purple-600" />Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{patient.emergency_contact_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Relationship</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{patient.emergency_contact_relationship}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">Phone</label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">{patient.emergency_contact_phone}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'vitals':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Vital Signs</h3>
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowVitalsTrends(true); 
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  title="View vital signs trends"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>View Trends</span>
                </button>
                <button
                  onClick={() => setShowVitalForm(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Vitals</span>
                </button>
              </div>
            </div>
            
            {/* Latest Vitals Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {vitals.length > 0 ? (
                <>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Thermometer className="h-5 w-5 text-red-500 mr-2" />
                        <span className="text-sm font-medium text-gray-600">Temperature</span>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{vitals[0].temperature}°C</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(vitals[0].recorded_at || vitals[0].lastUpdated || new Date()), 'MMM dd, HH:mm')}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Heart className="h-5 w-5 text-red-500 mr-2" />
                        <span className="text-sm font-medium text-gray-600">Blood Pressure</span>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {vitals[0].bloodPressure?.systolic}/{vitals[0].bloodPressure?.diastolic}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(vitals[0].recorded_at || vitals[0].lastUpdated || new Date()), 'MMM dd, HH:mm')}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Activity className="h-5 w-5 text-green-500 mr-2" />
                        <span className="text-sm font-medium text-gray-600">Heart Rate</span>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{vitals[0].heartRate} bpm</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(vitals[0].recorded_at || vitals[0].lastUpdated || new Date()), 'MMM dd, HH:mm')}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Droplets className="h-5 w-5 text-blue-500 mr-2" />
                        <span className="text-sm font-medium text-gray-600">O2 Saturation</span>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{vitals[0].oxygenSaturation}%</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(vitals[0].recorded_at || vitals[0].lastUpdated || new Date()), 'MMM dd, HH:mm')}
                    </p>
                  </div>
                </>
              ) : (
                <div className="col-span-4 bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
                  <Activity className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No vital signs recorded yet</p>
                  <button
                    onClick={() => setShowVitalForm(true)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span>Record First Vitals</span>
                  </button>
                </div>
              )}
            </div>
            
            {/* Vitals History */}
            {vitals.length > 0 && (
              <>
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Thermometer className="h-5 w-5 text-red-500 mr-2" />
                      <span className="text-sm font-medium text-gray-600">Temperature</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-2">37.0°C</p>
                  <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Heart className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Blood Pressure</span>
                  </div>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">37.0°C</p>
                <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Heart className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Blood Pressure</span>
                </div>
                </div>
              </>
            medications={medications}
            onRefresh={async () => {
              try {
                const meds = await fetchPatientMedications(id!);
                setMedications(meds);
              } catch (error) {
                console.error('Error refreshing medications:', error);
              }
            }}
          />
        );
      case 'notes':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Patient Notes</h3>
              <button
                onClick={() => {
                  setSelectedNote(null);
                  setShowNoteForm(true);
                }}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Note</span>
              </button>
            </div>

            <div className="space-y-4">
              {notes.length > 0 ? (
                notes.map((note) => (
                  <div key={note.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <FileText className="h-5 w-5 text-blue-600 mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between w-full">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900">{note.type} Note</h4>
                              <p className="text-sm text-gray-600">by {note.nurse_name} • {new Date(note.created_at).toLocaleString()}</p>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  setSelectedNote(note);
                                  setShowNoteForm(true);
                                }}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-gray-700 mt-2">{note.content}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        note.priority === 'High' ? 'bg-red-100 text-red-800' :
                        note.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {note.priority}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <p className="text-gray-500 text-center py-8">No notes recorded yet.</p>
                </div>
              )}
            </div>
          </div>
        );
      case 'assessments':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Assessments</h3>
              <button
                onClick={() => setShowAssessmentForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>New Assessment</span>
              </button>
            </div>

            {/* Empty state for assessments */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-500 text-center py-8">No assessments recorded yet.</p>
            </div>
          </div>
        );
      case 'wounds':
        return <WoundAssessment patientId={id!} />;

      case 'admission':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Admission Records</h3>
              <button
                onClick={() => setShowAdmissionForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Records</span>
              </button>
            </div>

            {/* Empty state for admission records */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-500 text-center py-8">No admission records found.</p>
            </div>
          </div>
        );
      case 'directives':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Advanced Directives</h3>
              <button
                onClick={() => setShowAdvancedDirectivesForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add New Directives</span>
              </button>
            </div>

            {/* Empty state for advanced directives */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-500 text-center py-8">No advanced directives found.</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/patients')}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Patients
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {patient.first_name} {patient.last_name}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {patient.condition} • Room {patient.room_number}-{patient.bed_number}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowPatientBracelet(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Bracelet
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'vitals', label: 'Vital Signs', icon: Activity },
            { id: 'medications', label: 'MAR', icon: Pill },
            { id: 'notes', label: 'Notes', icon: FileText },
            { id: 'assessments', label: 'Assessments', icon: Stethoscope },
            { id: 'wounds', label: 'Wound Assessment', icon: AlertTriangle },
            { id: 'admission', label: 'Admission', icon: Calendar },
            { id: 'directives', label: 'Directives', icon: FileText2 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-300'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon className={`h-4 w-4 ${activeTab === tab.id ? 'text-blue-500 dark:text-blue-300' : 'text-gray-500 dark:text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Modals */}
      {showVitalForm && (
        <VitalSignsEditor
          patientId={id!}
          vitals={vitals[0]}
          onClose={() => setShowVitalForm(false)}
          onSave={(newVitals) => {
            setShowVitalForm(false);
            setVitals([newVitals, ...vitals]);
          }}
          onCancel={() => setShowVitalForm(false)}
        />
      )}

      {showNoteForm && (
        <PatientNoteForm
          patientId={id!}
          note={selectedNote}
          patientName={patientName}
          onCancel={() => {
            setShowNoteForm(false);
            setSelectedNote(null);
          }}
          onSave={(newNote) => {
            if (selectedNote) {
              // Update existing note
              setNotes(notes.map(note => note.id === selectedNote.id ? newNote : note));
              setSelectedNote(null);
            } else {
              // Add new note
              setNotes([newNote, ...notes]);
            }
            setShowNoteForm(false);
          }}
        />
      )}

      {showAssessmentForm && (
        <AssessmentForm
          patientId={id!}
          patientName={patientName}
          onClose={() => setShowAssessmentForm(false)}
          onSave={(newAssessment) => {
            setShowAssessmentForm(false);
          }}
        />
      )}

      {showAdmissionForm && (
        <AdmissionRecordsForm
          patientId={id!}
          patientName={patientName}
          onClose={() => setShowAdmissionForm(false)}
          onSave={() => {
            setShowAdmissionForm(false);
          }}
        />
      )}

      {showAdvancedDirectivesForm && (
        <AdvancedDirectivesForm
          patientId={id!}
          patientName={patientName}
          onClose={() => setShowAdvancedDirectivesForm(false)}
          onSave={() => {
            setShowAdvancedDirectivesForm(false);
          }}
        />
      )}

      {showVitalsTrends && (
        <VitalsTrends
          patientId={id!}
          patientName={patientName}
          onClose={() => setShowVitalsTrends(false)}
          onRecordVitals={() => {
            setShowVitalsTrends(false);
            setShowVitalForm(true);
          }}
        />
      )}

      {/* Patient Bracelet Modal */}
      {showPatientBracelet && (
        <PatientBracelet
          patient={patient}
          onClose={() => setShowPatientBracelet(false)}
        />
      )}
      
      {/* Hospital Bracelet Modal */}
      {showPatientBracelet && (
        <HospitalBracelet
          patient={patient}
          onClose={() => setShowPatientBracelet(false)}
        />
      )}
    </div>
  );
};