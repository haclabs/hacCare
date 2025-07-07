import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Heart, Thermometer, Activity, Droplets, Clock, User, Calendar, MapPin, Phone, AlertTriangle, FileText, Pill, Stethoscope, Clipboard, Shield, Ban as Bandage } from 'lucide-react';
import { Patient, PatientVitals, PatientMedication, PatientNote } from '../../types';
import { fetchPatientById, fetchPatientVitals, fetchPatientNotes } from '../../lib/patientService';
import { fetchPatientMedications } from '../../lib/medicationService';
import { VitalSignsEditor } from './VitalSignsEditor';
import { PatientNoteForm } from './PatientNoteForm';
import { MedicationAdministration } from './MedicationAdministration';
import { WoundAssessment } from './WoundAssessment';
import { AssessmentDetail } from './AssessmentDetail';
import { AdmissionRecordsForm } from './AdmissionRecordsForm';
import { AdvancedDirectivesForm } from './AdvancedDirectivesForm';
import { HospitalBracelet } from './HospitalBracelet';

export const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vitals, setVitals] = useState<PatientVitals[]>([]);
  const [medications, setMedications] = useState<PatientMedication[]>([]);
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showVitalsEditor, setShowVitalsEditor] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);

  useEffect(() => {
    const loadPatientData = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        const [patientData, vitalsData, medicationsData, notesData] = await Promise.all([
          fetchPatientById(id),
          fetchPatientVitals(id),
          fetchPatientMedications(id),
          fetchPatientNotes(id)
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

  const handleVitalsUpdate = async () => {
    if (!id) return;
    try {
      const vitalsData = await fetchPatientVitals(id);
      setVitals(vitalsData);
      setShowVitalsEditor(false);
    } catch (error) {
      console.error('Error updating vitals:', error);
    }
  };

  const handleNoteAdded = async () => {
    if (!id) return;
    try {
      const notesData = await fetchPatientNotes(id);
      setNotes(notesData);
      setShowNoteForm(false);
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Patient not found</p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'vitals', label: 'Vital Signs', icon: Activity },
    { id: 'medications', label: 'Medications', icon: Pill },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'assessments', label: 'Assessments', icon: Stethoscope },
    { id: 'wounds', label: 'Wound Care', icon: Bandage },
    { id: 'admission', label: 'Admission', icon: Clipboard },
    { id: 'directives', label: 'Directives', icon: Shield },
    { id: 'bracelet', label: 'ID Bracelet', icon: User }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 text-blue-600 mr-2" />
                Patient Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Patient ID:</span>
                  <span className="text-sm text-gray-900">{patient.patient_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Date of Birth:</span>
                  <span className="text-sm text-gray-900">{new Date(patient.date_of_birth).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Gender:</span>
                  <span className="text-sm text-gray-900">{patient.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Blood Type:</span>
                  <span className="text-sm text-gray-900">{patient.blood_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Room:</span>
                  <span className="text-sm text-gray-900">{patient.room_number} - {patient.bed_number}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Phone className="h-5 w-5 text-green-600 mr-2" />
                Emergency Contact
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Name:</span>
                  <span className="text-sm text-gray-900">{patient.emergency_contact_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Relationship:</span>
                  <span className="text-sm text-gray-900">{patient.emergency_contact_relationship}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Phone:</span>
                  <span className="text-sm text-gray-900">{patient.emergency_contact_phone}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 text-purple-600 mr-2" />
                Admission Details
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Admission Date:</span>
                  <span className="text-sm text-gray-900">{new Date(patient.admission_date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Condition:</span>
                  <span className="text-sm text-gray-900">{patient.condition}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Diagnosis:</span>
                  <span className="text-sm text-gray-900">{patient.diagnosis}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-500">Assigned Nurse:</span>
                  <span className="text-sm text-gray-900">{patient.assigned_nurse}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                Allergies
              </h3>
              <div className="space-y-2">
                {patient.allergies && patient.allergies.length > 0 ? (
                  patient.allergies.map((allergy, index) => (
                    <span key={index} className="inline-block bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full mr-2">
                      {allergy}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No known allergies</span>
                )}
              </div>
            </div>
          </div>
        );

      case 'vitals':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Vital Signs</h3>
              <button
                onClick={() => setShowVitalsEditor(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Record Vitals
              </button>
            </div>

            {showVitalsEditor && (
              <VitalSignsEditor
                patientId={id!}
                onSave={handleVitalsUpdate}
                onCancel={() => setShowVitalsEditor(false)}
              />
            )}

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
                  <p className="text-2xl font-bold text-gray-900 mt-2">120/80 mmHg</p>
                  <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Heart className="h-5 w-5 text-red-500 mr-2" />
                      <span className="text-sm font-medium text-gray-600">Heart Rate</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 mt-2">72 bpm</p>
                  <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
                </div>
              </>
            )}
          </div>
        );

      case 'medications':
        return (
          <MedicationAdministration
            patientId={id!}
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
                onClick={() => setShowNoteForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Add Note
              </button>
            </div>

            {showNoteForm && (
              <PatientNoteForm
                patientId={id!}
                onSave={handleNoteAdded}
                onCancel={() => setShowNoteForm(false)}
              />
            )}

            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">{note.nurse_name}</span>
                      <span className="mx-2 text-gray-300">•</span>
                      <span className="text-sm text-gray-500">{note.type}</span>
                      <span className="mx-2 text-gray-300">•</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        note.priority === 'high' ? 'bg-red-100 text-red-800' :
                        note.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {note.priority}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(note.created_at!).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'assessments':
        return <AssessmentDetail patientId={id!} />;

      case 'wounds':
        return <WoundAssessment patientId={id!} />;

      case 'admission':
        return <AdmissionRecordsForm patientId={id!} />;

      case 'directives':
        return <AdvancedDirectivesForm patientId={id!} />;

      case 'bracelet':
        return <HospitalBracelet patient={patient} />;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/patients')}
            className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {patient.first_name} {patient.last_name}
            </h1>
            <p className="text-gray-600">Patient ID: {patient.patient_id}</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/patients/${id}/edit`)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Edit className="h-4 w-4 mr-2" />
          Edit Patient
        </button>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-6">
        {renderTabContent()}
      </div>
    </div>
  );
};