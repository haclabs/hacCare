import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Calendar, MapPin, Phone, User, Heart, Thermometer, Activity, Droplets, Clock, Pill, FileText, AlertTriangle, Plus, Stethoscope, TrendingUp, FileText as FileText2, Trash2, QrCode } from 'lucide-react';
import { Patient, VitalSigns, Medication, PatientNote } from '../../types';
import { VitalSignsEditor } from './VitalSignsEditor';
import { PatientNoteForm } from './PatientNoteForm';
import { MedicationForm } from './MedicationForm';
import { PatientBracelet } from './PatientBracelet';
import { AssessmentForm } from './AssessmentForm'; 
import { AdmissionRecordsForm } from './AdmissionRecordsForm';
import { AdvancedDirectivesForm } from './AdvancedDirectivesForm';
import { MedicationAdministration } from './MedicationAdministration';
import { WoundAssessment } from './WoundAssessment';
import { VitalsTrends } from './VitalsTrends';
import { HospitalBracelet } from './HospitalBracelet';
import { fetchPatientMedications } from '../../lib/medicationService';

interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // When changing tabs, ensure the VitalsTrends modal is closed
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    // Close the vitals trends modal when switching to any tab
    if (showVitalsTrends) {
      setShowVitalsTrends(false);
    }
  };
  const [showVitalForm, setShowVitalForm] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [showAdvancedDirectivesForm, setShowAdvancedDirectivesForm] = useState(false);
  const [showMedicationAdmin, setShowMedicationAdmin] = useState(false);
  const [showVitalsTrends, setShowVitalsTrends] = useState(false);
  const [showPatientBracelet, setShowPatientBracelet] = useState(false);
  const [vitals, setVitals] = useState<VitalSigns[]>([]);
  const [medications, setMedications] = useState<Medication[]>(patient.medications || []);
  const [notes, setNotes] = useState<PatientNote[]>(patient.notes || []);
  const [selectedNote, setSelectedNote] = useState<PatientNote | null>(null);

  // Load medications when component mounts or patient changes
  useEffect(() => {
    const loadMedications = async () => {
      try {
        const meds = await fetchPatientMedications(patient.id);
        setMedications(meds);
      } catch (error) {
        console.error('Error loading medications:', error);
      }
    };
    
    loadMedications();
    
    // Initialize notes from patient data
    if (patient.notes && patient.notes.length > 0) {
      setNotes(patient.notes);
    }
  }, [patient.id]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Patient Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Patient Information
                </h3>
                <button className="text-blue-600 hover:text-blue-700">
                  <Edit className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Patient ID:</span>
                  <span className="font-medium">{patient.patient_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date of Birth:</span>
                  <span className="font-medium">{patient.date_of_birth}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Gender:</span>
                  <span className="font-medium">{patient.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Blood Type:</span>
                  <span className="font-medium">{patient.blood_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Room:</span>
                  <span className="font-medium">{patient.room_number}-{patient.bed_number}</span>
                </div>
              </div>
            </div>

            {/* Current Condition */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Stethoscope className="h-5 w-5 mr-2 text-green-600" />
                Current Condition
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-600">Condition:</span>
                  <p className="font-medium mt-1">{patient.condition}</p>
                </div>
                <div>
                  <span className="text-gray-600">Diagnosis:</span>
                  <p className="font-medium mt-1">{patient.diagnosis}</p>
                </div>
                <div>
                  <span className="text-gray-600">Assigned Nurse:</span>
                  <p className="font-medium mt-1">{patient.assigned_nurse}</p>
                </div>
                <div>
                  <span className="text-gray-600">Admission Date:</span>
                  <p className="font-medium mt-1">{patient.admission_date}</p>
                </div>
              </div>
            </div>

            {/* Allergies */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-red-600" />
                Allergies
              </h3>
              {patient.allergies && patient.allergies.length > 0 ? (
                <div className="space-y-2">
                  {patient.allergies.map((allergy, index) => (
                    <span
                      key={index}
                      className="inline-block bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-medium mr-2 mb-2"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No known allergies</p>
              )}
            </div>

            {/* Emergency Contact */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Phone className="h-5 w-5 mr-2 text-purple-600" />
                Emergency Contact
              </h3>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-600">Name:</span>
                  <p className="font-medium mt-1">{patient.emergency_contact_name}</p>
                </div>
                <div>
                  <span className="text-gray-600">Relationship:</span>
                  <p className="font-medium mt-1">{patient.emergency_contact_relationship}</p>
                </div>
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <p className="font-medium mt-1">{patient.emergency_contact_phone}</p>
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Thermometer className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Temperature</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">98.6°F</p>
                <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Heart className="h-5 w-5 text-red-500 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Blood Pressure</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">120/80</p>
                <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Activity className="h-5 w-5 text-green-500 mr-2" />
                    <span className="text-sm font-medium text-gray-600">Heart Rate</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">72 bpm</p>
                <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Droplets className="h-5 w-5 text-blue-500 mr-2" />
                    <span className="text-sm font-medium text-gray-600">O2 Saturation</span>
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900 mt-2">98%</p>
                <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
              </div>
            </div>

            {/* Vitals History */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="text-lg font-medium text-gray-900">Recent Measurements</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Temperature
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Blood Pressure
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Heart Rate
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        O2 Sat
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        2 hours ago
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        98.6°F
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        120/80
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        72 bpm
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        98%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case 'medications':
        return (
          <MedicationAdministration
            patientId={patient.id}
            patientName={`${patient.first_name} ${patient.last_name}`}
            medications={medications}
            onRefresh={async () => {
              try {
                const meds = await fetchPatientMedications(patient.id);
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
                              <button
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this note?')) {
                                    // Delete note from state
                                    setNotes(notes.filter(n => n.id !== note.id));
                                  }
                                }}
                                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="h-4 w-4" />
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
        
      case 'wounds':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Wound Assessment</h3>
            </div>
            
            <WoundAssessment patientId={patient.id} />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Admission Details</h4>
                  <p className="text-gray-500 text-sm">No admission details recorded yet.</p>
                </div>
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Medical History</h4>
                  <p className="text-gray-500 text-sm">No medical history recorded yet.</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-4">
              <p className="text-gray-500 text-center py-8">Admission records will be displayed here.</p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Legal Documents</h4>
                  <p className="text-gray-500 text-sm">No legal documents recorded yet.</p>
                </div>
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">Healthcare Preferences</h4>
                  <p className="text-gray-500 text-sm">No healthcare preferences recorded yet.</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-4">
              <p className="text-gray-500 text-center py-8">Advanced directives will be displayed here.</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

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
          <div>
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                {patient.first_name} {patient.last_name} 
              </h1>
            </div>
            <div className="flex items-center">
              <p className="text-gray-600">Patient ID: {patient.patient_id}</p>
              <button 
                onClick={() => setShowPatientBracelet(true)}
                className="ml-2 px-2 py-1 text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-md text-xs flex items-center space-x-1 transition-colors"
              >
                <QrCode className="h-3 w-3" />
                <span>Hospital Bracelet</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
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
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
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
          patientId={patient.id}
          vitals={vitals[0]}
          onClose={() => setShowVitalForm(false)}
          onSave={(newVitals) => {
            setShowVitalForm(false);
            setVitals([newVitals, ...vitals]);
          }}
          onCancel={() => setShowVitalForm(false)}
        />
      )}

      {showMedicationForm && (
        <MedicationForm
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onClose={() => setShowMedicationForm(false)}
          onSuccess={(newMedication) => {
            setShowMedicationForm(false);
            setMedications([newMedication, ...medications]);
          }}
          onCancel={() => setShowMedicationForm(false)}
        />
      )}

      {showNoteForm && (
        <PatientNoteForm
          patientId={patient.id}
          note={selectedNote}
          patientName={`${patient.first_name} ${patient.last_name}`}
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
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onClose={() => setShowAssessmentForm(false)}
          onSave={(newAssessment) => {
            setShowAssessmentForm(false);
          }}
        />
      )}

      {showAdmissionForm && (
        <AdmissionRecordsForm
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onClose={() => setShowAdmissionForm(false)}
          onSave={() => {
            setShowAdmissionForm(false);
          }}
        />
      )}

      {showAdvancedDirectivesForm && (
        <AdvancedDirectivesForm
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onClose={() => setShowAdvancedDirectivesForm(false)}
          onSave={() => {
            setShowAdvancedDirectivesForm(false);
          }}
        />
      )}

      {showVitalsTrends && (
        <VitalsTrends
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onClose={() => setShowVitalsTrends(false)}
          onRecordVitals={() => {
            setShowVitalsTrends(false);
            setShowVitalForm(true);
          }}
        />
      )}
      
      {showPatientBracelet && (
        <HospitalBracelet
          patient={patient}
          onClose={() => setShowPatientBracelet(false)}
        />
      )}
      
    </div>
  );
};