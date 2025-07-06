import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Calendar, MapPin, Phone, User, Heart, Thermometer, Activity, Droplets, Clock, Pill, FileText, AlertTriangle, Plus, Stethoscope, TrendingUp, FileText as FileText2 } from 'lucide-react';
import { Patient, VitalSigns, Medication, PatientNote } from '../../types';
import { VitalSignsEditor } from './VitalSignsEditor';
import { MedicationForm } from './MedicationForm';
import { PatientNoteForm } from './PatientNoteForm';
import { AssessmentForm } from './AssessmentForm';
import { AdmissionRecordsForm } from './AdmissionRecordsForm';
import { AdvancedDirectivesForm } from './AdvancedDirectivesForm';
import { MedicationAdministration } from './MedicationAdministration';
import { VitalsTrends } from './VitalsTrends';

interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showVitalForm, setShowVitalForm] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [showAdvancedDirectivesForm, setShowAdvancedDirectivesForm] = useState(false);
  const [showMedicationAdmin, setShowMedicationAdmin] = useState(false);
  const [showVitalsTrends, setShowVitalsTrends] = useState(false);
  const [vitals, setVitals] = useState<VitalSigns[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [notes, setNotes] = useState<PatientNote[]>([]);

  const handleTabChange = (tab: string) => {
    // Close the vitals trends modal when switching tabs
    if (tab !== 'vitals' && showVitalsTrends) {
      setShowVitalsTrends(false);
    }
    setActiveTab(tab);
  };

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
                    handleTabChange('vitals');
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
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Medications</h3>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowMedicationAdmin(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Pill className="h-4 w-4" />
                  <span>Administer</span>
                </button>
                <button
                  onClick={() => setShowMedicationForm(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Medication</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h4 className="text-lg font-medium text-gray-900">Current Medications</h4>
              </div>
              <div className="divide-y divide-gray-200">
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-lg font-medium text-gray-900">Lisinopril</h5>
                      <p className="text-sm text-gray-600">10mg, Once daily, Oral</p>
                      <p className="text-sm text-gray-500">Prescribed by Dr. Smith</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">Next due: 8:00 AM</p>
                      <p className="text-sm text-gray-500">Last given: Yesterday 8:00 AM</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'notes':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Patient Notes</h3>
              <button
                onClick={() => setShowNoteForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Add Note</span>
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <FileText className="h-5 w-5 text-blue-600 mt-1" />
                    <div>
                      <h4 className="text-lg font-medium text-gray-900">Assessment Note</h4>
                      <p className="text-sm text-gray-600">by Nurse Johnson • 2 hours ago</p>
                      <p className="text-gray-700 mt-2">
                        Patient is alert and oriented. Vital signs stable. No complaints of pain or discomfort.
                        Ambulating independently. Diet tolerated well.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Normal
                  </span>
                </div>
              </div>
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

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-500 text-center py-8">No assessments recorded yet.</p>
            </div>
          </div>
        );

      case 'admission':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Admission Records</h3>
              <button
                onClick={() => setShowAdmissionForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Records</span>
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-500 text-center py-8">Admission records will be displayed here.</p>
            </div>
          </div>
        );

      case 'directives':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Advanced Directives</h3>
              <button
                onClick={() => setShowAdvancedDirectivesForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>Edit Directives</span>
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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
            <h1 className="text-2xl font-bold text-gray-900">
              {patient.first_name} {patient.last_name}
            </h1>
            <p className="text-gray-600">Patient ID: {patient.patient_id}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'vitals', label: 'Vital Signs', icon: Activity },
            { id: 'medications', label: 'Medications', icon: Pill },
            { id: 'notes', label: 'Notes', icon: FileText },
            { id: 'assessments', label: 'Assessments', icon: Stethoscope },
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
          onSave={(newMedication) => {
            setShowMedicationForm(false);
            setMedications([newMedication, ...medications]);
          }}
          onCancel={() => setShowMedicationForm(false)}
        />
      )}

      {showNoteForm && (
        <PatientNoteForm
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onClose={() => setShowNoteForm(false)}
          onSave={(newNote) => {
            setShowNoteForm(false);
            setNotes([newNote, ...notes]);
          }}
          onCancel={() => setShowNoteForm(false)}
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

      {showMedicationAdmin && (
        <MedicationAdministration
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          medications={medications}
          onRefresh={() => {
            // Refresh medications data
          }}
          onClose={() => setShowMedicationAdmin(false)}
        />
      )}

      {showVitalsTrends && (
        <VitalsTrends
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onRecordVitals={() => setShowVitalForm(true)}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onClose={() => setShowVitalsTrends(false)}
          onRecordVitals={() => {
            setShowVitalsTrends(false);
            setShowVitalForm(true);
          }}
        />
      )}
    </div>
  );
};