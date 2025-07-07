import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Activity, Pill, FileText, Calendar, ArrowLeft, Edit, Printer, AlertTriangle, Stethoscope, FileText as FileText2, Heart, Thermometer, Droplets, Wind } from 'lucide-react';
import { usePatients } from '../../contexts/PatientContext';
import { useAuth } from '../../contexts/AuthContext';
import { VitalSignsEditor } from './VitalSignsEditor';
import { MedicationAdministration } from './MedicationAdministration';
import PatientNoteForm from './PatientNoteForm';
import { AssessmentForm } from './AssessmentForm';
import WoundAssessment from './WoundAssessment';
import { AdmissionRecordsForm } from './AdmissionRecordsForm';
import { AdvancedDirectivesForm } from './AdvancedDirectivesForm';
import PatientBracelet from './PatientBracelet';
import VitalsTrends from './VitalsTrends';

const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { patients, vitals, medications, notes, assessments, wounds, admissionRecords, directives } = usePatients();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [showPatientBracelet, setShowPatientBracelet] = useState(false);

  const patient = patients.find(p => p.id === id);
  const patientVitals = vitals.filter(v => v.patient_id === id);
  const patientMedications = medications.filter(m => m.patient_id === id);
  const patientNotes = notes.filter(n => n.patient_id === id);
  const patientAssessments = assessments.filter(a => a.patient_id === id);
  const patientWounds = wounds.filter(w => w.patient_id === id);
  const patientAdmission = admissionRecords.find(a => a.patient_id === id);
  const patientDirectives = directives.find(d => d.patient_id === id);

  useEffect(() => {
    if (!patient) {
      navigate('/patients');
    }
  }, [patient, navigate]);

  if (!patient) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Patient not found</h3>
          <p className="text-gray-500 dark:text-gray-400">The requested patient could not be found.</p>
        </div>
      </div>
    );
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const getLatestVitals = () => {
    if (patientVitals.length === 0) return null;
    return patientVitals.sort((a, b) => 
      new Date(b.recorded_at || '').getTime() - new Date(a.recorded_at || '').getTime()
    )[0];
  };

  const latestVitals = getLatestVitals();

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Patient Information */}
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Patient Information</h3>
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
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Latest Vital Signs</h3>
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
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Allergies</h3>
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
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Emergency Contact</h3>
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
            <VitalSignsEditor patientId={id!} />
            <VitalsTrends patientId={id!} />
          </div>
        );

      case 'medications':
        return <MedicationAdministration patientId={id!} />;

      case 'notes':
        return <PatientNoteForm patientId={id!} />;

      case 'assessments':
        return <AssessmentForm patientId={id!} />;

      case 'wounds':
        return <WoundAssessment patientId={id!} />;

      case 'admission':
        return <AdmissionRecordsForm patientId={id!} />;

      case 'directives':
        return <AdvancedDirectivesForm patientId={id!} />;

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Patient Bracelet Modal */}
      {showPatientBracelet && (
        <PatientBracelet
          patient={patient}
          onClose={() => setShowPatientBracelet(false)}
        />
      )}
    </div>
  );
};

export default PatientDetail;