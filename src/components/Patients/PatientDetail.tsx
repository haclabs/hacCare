import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Save, X, Activity, Pill, FileText, Heart, AlertTriangle, User, Calendar, Phone, MapPin, Stethoscope, Clipboard, Shield, Ban as Bandage } from 'lucide-react';
import { Patient, PatientVitals, PatientMedication, PatientNote, PatientAlert, PatientAdmissionRecord, PatientAdvancedDirective, PatientWound } from '../../types';
import { fetchPatientById, fetchPatientVitals, fetchPatientMedications, fetchPatientNotes, fetchPatientAlerts, fetchPatientAdvancedDirective, fetchPatientWounds } from '../../lib/patientService';
import { fetchAdmissionRecord } from '../../lib/admissionService';
import { VitalSignsEditor } from './VitalSignsEditor';
import { MedicationAdministration } from './MedicationAdministration';
import { PatientNoteForm } from './PatientNoteForm';
import { AdmissionRecordsForm } from './AdmissionRecordsForm';
import { AdvancedDirectivesForm } from './AdvancedDirectivesForm';
import { WoundAssessment } from './WoundAssessment';
import { VitalsTrends } from './VitalsTrends';
import { HospitalBracelet } from './HospitalBracelet';

export function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vitals, setVitals] = useState<PatientVitals[]>([]);
  const [medications, setMedications] = useState<PatientMedication[]>([]);
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [alerts, setAlerts] = useState<PatientAlert[]>([]);
  const [admissionRecord, setAdmissionRecord] = useState<PatientAdmissionRecord | null>(null);
  const [advancedDirective, setAdvancedDirective] = useState<PatientAdvancedDirective | null>(null);
  const [wounds, setWounds] = useState<PatientWound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showVitalForm, setShowVitalForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [showDirectiveForm, setShowDirectiveForm] = useState(false);
  const [showWoundForm, setShowWoundForm] = useState(false);

  const patientName = patient ? `${patient.first_name} ${patient.last_name}` : '';

  useEffect(() => {
    if (id) {
      fetchPatientData();
    }
  }, [id]);

  const fetchPatientData = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      const [
        patientData,
        vitalsData,
        medicationsData,
        notesData,
        alertsData,
        admissionData,
        directiveData,
        woundsData
      ] = await Promise.all([
        fetchPatientById(id),
        fetchPatientVitals(id),
        fetchPatientMedications(id),
        fetchPatientNotes(id),
        fetchPatientAlerts(id),
        fetchAdmissionRecord(id),
        fetchPatientAdvancedDirective(id),
        fetchPatientWounds(id)
      ]);

      setPatient(patientData);
      setVitals(vitalsData);
      setMedications(medicationsData);
      setNotes(notesData);
      setAlerts(alertsData);
      setAdmissionRecord(admissionData);
      setAdvancedDirective(directiveData);
      setWounds(woundsData);
    } catch (err) {
      setError('Failed to fetch patient data');
      console.error('Error fetching patient data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatientVitalsData = async () => {
    if (!id) return;
    try {
      const vitalsData = await fetchPatientVitals(id);
      setVitals(vitalsData);
    } catch (error) {
      console.error('Error fetching vitals:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Patient Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'The requested patient could not be found.'}</p>
          <button
            onClick={() => navigate('/patients')}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Patients
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'vitals', label: 'Vital Signs', icon: Activity },
    { id: 'medications', label: 'Medications', icon: Pill },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
    { id: 'admission', label: 'Admission', icon: Clipboard },
    { id: 'directives', label: 'Directives', icon: Shield },
    { id: 'wounds', label: 'Wounds', icon: Bandage },
    { id: 'trends', label: 'Trends', icon: Heart },
    { id: 'bracelet', label: 'ID Bracelet', icon: User }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Patient Information Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Patient Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Patient ID</label>
                  <p className="mt-1 text-sm text-gray-900">{patient.patient_id}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <p className="mt-1 text-sm text-gray-900">{new Date(patient.date_of_birth).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Gender</label>
                  <p className="mt-1 text-sm text-gray-900">{patient.gender}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Blood Type</label>
                  <p className="mt-1 text-sm text-gray-900">{patient.blood_type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Room</label>
                  <p className="mt-1 text-sm text-gray-900">{patient.room_number} - {patient.bed_number}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assigned Nurse</label>
                  <p className="mt-1 text-sm text-gray-900">{patient.assigned_nurse}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Admission Date</label>
                  <p className="mt-1 text-sm text-gray-900">{new Date(patient.admission_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Condition</label>
                  <p className="mt-1 text-sm text-gray-900">{patient.condition}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Diagnosis</label>
                  <p className="mt-1 text-sm text-gray-900">{patient.diagnosis}</p>
                </div>
              </div>
            </div>

            {/* Emergency Contact Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">{patient.emergency_contact_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Relationship</label>
                  <p className="mt-1 text-sm text-gray-900">{patient.emergency_contact_relationship}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="mt-1 text-sm text-gray-900">{patient.emergency_contact_phone}</p>
                </div>
              </div>
            </div>

            {/* Allergies Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Allergies</h3>
              {patient.allergies && patient.allergies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((allergy, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No known allergies</p>
              )}
            </div>

            {/* Recent Vitals Card */}
            {vitals.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Latest Vital Signs</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">Temperature</p>
                    <p className="text-lg font-semibold text-gray-900">{vitals[0].temperature}°F</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">Blood Pressure</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {vitals[0].blood_pressure_systolic}/{vitals[0].blood_pressure_diastolic}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">Heart Rate</p>
                    <p className="text-lg font-semibold text-gray-900">{vitals[0].heart_rate} bpm</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">Respiratory Rate</p>
                    <p className="text-lg font-semibold text-gray-900">{vitals[0].respiratory_rate} /min</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">O2 Saturation</p>
                    <p className="text-lg font-semibold text-gray-900">{vitals[0].oxygen_saturation}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-700">Recorded</p>
                    <p className="text-sm text-gray-600">
                      {new Date(vitals[0].recorded_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'medications':
        return (
          <MedicationAdministration
            patientId={id!}
            patientName={patientName}
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

      case 'vitals':
        return (
          <VitalSignsEditor
            patientId={id!}
            vitals={vitals[0]}
            onClose={() => {
              setShowVitalForm(false);
            }}
            onSave={async (newVitals) => {
              // Refresh vitals data after saving
              await fetchPatientVitalsData();
            }}
          />
        );

      case 'notes':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Patient Notes</h3>
              <button
                onClick={() => setShowNoteForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Note
              </button>
            </div>
            
            {showNoteForm && (
              <PatientNoteForm
                patientId={id!}
                onClose={() => setShowNoteForm(false)}
                onSave={fetchPatientData}
              />
            )}

            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{note.type}</h4>
                      <p className="text-sm text-gray-600">By {note.nurse_name}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        note.priority === 'high' ? 'bg-red-100 text-red-800' :
                        note.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {note.priority}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(note.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-gray-700">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'alerts':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Patient Alerts</h3>
            {alerts.map((alert) => (
              <div key={alert.id} className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                alert.priority === 'critical' ? 'border-red-500' :
                alert.priority === 'high' ? 'border-orange-500' :
                alert.priority === 'medium' ? 'border-yellow-500' :
                'border-blue-500'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-gray-900">{alert.alert_type}</h4>
                    <p className="text-gray-700 mt-1">{alert.message}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      alert.priority === 'critical' ? 'bg-red-100 text-red-800' :
                      alert.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.priority}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(alert.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {alert.acknowledged && (
                  <div className="mt-2 text-sm text-green-600">
                    Acknowledged at {new Date(alert.acknowledged_at!).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        );

      case 'admission':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Admission Records</h3>
              <button
                onClick={() => setShowAdmissionForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {admissionRecord ? 'Edit Record' : 'Add Record'}
              </button>
            </div>
            
            {showAdmissionForm && (
              <AdmissionRecordsForm
                patientId={id!}
                admissionRecord={admissionRecord}
                onClose={() => setShowAdmissionForm(false)}
                onSave={fetchPatientData}
              />
            )}

            {admissionRecord && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Admission Type</label>
                    <p className="mt-1 text-sm text-gray-900">{admissionRecord.admission_type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Attending Physician</label>
                    <p className="mt-1 text-sm text-gray-900">{admissionRecord.attending_physician}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Insurance Provider</label>
                    <p className="mt-1 text-sm text-gray-900">{admissionRecord.insurance_provider}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Chief Complaint</label>
                    <p className="mt-1 text-sm text-gray-900">{admissionRecord.chief_complaint}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Height</label>
                    <p className="mt-1 text-sm text-gray-900">{admissionRecord.height}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Weight</label>
                    <p className="mt-1 text-sm text-gray-900">{admissionRecord.weight}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'directives':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Advanced Directives</h3>
              <button
                onClick={() => setShowDirectiveForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                {advancedDirective ? 'Edit Directives' : 'Add Directives'}
              </button>
            </div>
            
            {showDirectiveForm && (
              <AdvancedDirectivesForm
                patientId={id!}
                advancedDirective={advancedDirective}
                onClose={() => setShowDirectiveForm(false)}
                onSave={fetchPatientData}
              />
            )}

            {advancedDirective && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Living Will Status</label>
                    <p className="mt-1 text-sm text-gray-900">{advancedDirective.living_will_status}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">DNR Status</label>
                    <p className="mt-1 text-sm text-gray-900">{advancedDirective.dnr_status}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Healthcare Proxy</label>
                    <p className="mt-1 text-sm text-gray-900">{advancedDirective.healthcare_proxy_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Organ Donation</label>
                    <p className="mt-1 text-sm text-gray-900">{advancedDirective.organ_donation_status}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'wounds':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Wound Assessment</h3>
              <button
                onClick={() => setShowWoundForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Assessment
              </button>
            </div>
            
            {showWoundForm && (
              <WoundAssessment
                patientId={id!}
                onClose={() => setShowWoundForm(false)}
                onSave={fetchPatientData}
              />
            )}

            <div className="space-y-4">
              {wounds.map((wound) => (
                <div key={wound.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Location</label>
                      <p className="mt-1 text-sm text-gray-900">{wound.location}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <p className="mt-1 text-sm text-gray-900">{wound.type}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Stage</label>
                      <p className="mt-1 text-sm text-gray-900">{wound.stage}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Size</label>
                      <p className="mt-1 text-sm text-gray-900">
                        {wound.size_length} × {wound.size_width} cm
                        {wound.size_depth && ` × ${wound.size_depth} cm`}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Healing Progress</label>
                      <p className="mt-1 text-sm text-gray-900">{wound.healing_progress}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Assessed By</label>
                      <p className="mt-1 text-sm text-gray-900">{wound.assessed_by}</p>
                    </div>
                  </div>
                  {wound.description && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <p className="mt-1 text-sm text-gray-900">{wound.description}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'trends':
        return <VitalsTrends patientId={id!} vitals={vitals} />;

      case 'bracelet':
        return <HospitalBracelet patient={patient} />;

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/patients')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {patient.first_name} {patient.last_name}
                </h1>
                <p className="text-sm text-gray-500">
                  Patient ID: {patient.patient_id} • Room {patient.room_number}-{patient.bed_number}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
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
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>
    </div>
  );
}