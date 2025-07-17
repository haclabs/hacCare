import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Edit, Heart, Thermometer, Activity, Droplets, Clock, User, Calendar, MapPin, Phone, AlertTriangle, FileText, Pill, Stethoscope, Clipboard, Shield, Ban as Bandage, TrendingUp, Plus, Wind, RefreshCw, UserCircle, Contact, Building, Sparkles, QrCode } from 'lucide-react';
import { Patient, VitalSigns, Medication, PatientNote } from '../../../types';
import { fetchPatientById, fetchPatientVitals, fetchPatientNotes } from '../../../lib/patientService';
import { fetchPatientMedications } from '../../../lib/medicationService';
import { RecentActivity } from './RecentActivity';
import { MedicationAdministration } from './MedicationAdministration';
import { WoundAssessment } from '../forms/WoundAssessment';
// import { ImageAnnotation } from '../visuals/ImageAnnotation';
import { PatientAssessmentsTab } from './PatientAssessmentsTab';
import { AdmissionRecordsForm } from '../forms/AdmissionRecordsForm';
import { AdvancedDirectivesForm } from '../forms/AdvancedDirectivesForm';
import { VitalsContent } from '../vitals/VitalsContent';
import { NotesContent } from './NotesContent';

interface PatientDetailProps {
  onShowBracelet?: (patient: Patient) => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ onShowBracelet }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [patient, setPatient] = useState<Patient | null>(null); 
  const [vitals, setVitals] = useState<VitalSigns[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [loading, setLoading] = useState(true);
  // Check if we have an initial tab from location state (e.g., from barcode scan)
  const [activeTab, setActiveTab] = useState(
    location.state?.activeTab || 'overview'
  );
  // Get medication category from location state if available
  const initialMedicationCategory = location.state?.medicationCategory || 'scheduled';
  const [showActivity, setShowActivity] = useState(false);
  // State for active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<string>('vitals');
  
  // Count medications by category
  const getMedicationCounts = () => {
    return {
      scheduled: medications.filter(med => med.category === 'scheduled' && med.status === 'Active').length,
      prn: medications.filter(med => med.category === 'prn' && med.status === 'Active').length,
      continuous: medications.filter(med => med.category === 'continuous' && med.status === 'Active').length
    };
  };
  
  const medicationCounts = getMedicationCounts();
  const totalMedications = medications.filter(med => med.status === 'Active').length;

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

  /**
   * Get CSS classes for patient condition styling with enhanced gradients
   * @param {Patient['condition']} condition - Patient's current condition
   * @returns {string} CSS classes for condition badge
   */
  const getConditionColor = (condition: Patient['condition']) => {
    switch (condition) {
      case 'Critical': return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300 shadow-red-100';
      case 'Stable': return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300 shadow-green-100';
      case 'Improving': return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300 shadow-blue-100';
      case 'Discharged': return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300 shadow-gray-100';
      default: return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300 shadow-gray-100';
    }
  };

  /**
   * Get condition-specific accent colors for the header
   */
  const getHeaderAccent = (condition: Patient['condition']) => {
    switch (condition) {
      case 'Critical': return 'bg-gradient-to-r from-red-50 to-red-100 border-red-200';
      case 'Stable': return 'bg-gradient-to-r from-green-50 to-green-100 border-green-200';
      case 'Improving': return 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200';
      case 'Discharged': return 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200';
      default: return 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200';
    }
  };

  /**
   * Get avatar background color based on condition
   */
  const getAvatarColor = (condition: Patient['condition']) => {
    switch (condition) {
      case 'Critical': return 'bg-gradient-to-br from-red-100 to-red-200 text-red-600';
      case 'Stable': return 'bg-gradient-to-br from-green-100 to-green-200 text-green-600';
      case 'Improving': return 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600';
      case 'Discharged': return 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600';
      default: return 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600';
    }
  };

  // Calculate patient age with date validation
  const birthDate = new Date(patient?.date_of_birth || '');
  const age = patient && birthDate ? new Date().getFullYear() - birthDate.getFullYear() : 'N/A';

  // Calculate days in hospital
  const admissionDate = new Date(patient?.admission_date || '');
  const daysInHospital = patient && admissionDate ? Math.ceil((Date.now() - admissionDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  const tabs = [ 
    { id: 'overview', label: 'Overview', icon: UserCircle, color: 'text-blue-600' },
    { id: 'medications', label: 'MAR', icon: Pill, count: totalMedications > 0 ? totalMedications : undefined, color: 'text-purple-600' },
    { id: 'assessments', label: 'Assessments', icon: Stethoscope, color: 'text-green-600', subTabs: [
      { id: 'vitals', label: 'Vital Signs', icon: Activity },
      { id: 'notes', label: 'Notes', icon: FileText },
      { id: 'wounds', label: 'Wound Care', icon: Bandage }
    ]},
    { id: 'admission', label: 'Admission', icon: Clipboard, color: 'text-orange-600' },
    { id: 'directives', label: 'Directives', icon: Shield, color: 'text-indigo-600' }
  ];

  const renderTabContent = () => { 
    switch (activeTab) {
      case 'overview':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Enhanced Patient Information Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-50 to-transparent rounded-bl-full opacity-50"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <div className={`p-4 rounded-full shadow-lg ${getAvatarColor(patient.condition)}`}>
                      <UserCircle className="h-8 w-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                        Patient Information
                        <Sparkles className="h-5 w-5 text-blue-500 ml-2" />
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Demographics & Basic Info</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onShowBracelet?.(patient)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors border border-blue-200 dark:border-blue-700"
                  >
                    <QrCode className="h-4 w-4" />
                    <span className="text-sm font-medium">ID Bracelet</span>
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Patient ID:</span>
                    <span className="text-sm font-mono bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-md">{patient.patient_id}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Date of Birth:</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">{new Date(patient.date_of_birth).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Age:</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100 font-semibold">{age} years old</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Gender:</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">{patient.gender}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <span className="text-sm font-semibold text-red-700 dark:text-red-300">Blood Type:</span>
                    <span className="text-sm font-bold text-red-800 dark:text-red-200 bg-red-100 dark:bg-red-900/50 px-3 py-1 rounded-md">{patient.blood_type}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Room Location:
                    </span>
                    <span className="text-sm font-bold text-blue-800 dark:text-blue-200">{patient.room_number} - {patient.bed_number}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Emergency Contact Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-l-green-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-50 to-transparent rounded-bl-full opacity-50"></div>
              <div className="relative">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="p-4 bg-gradient-to-br from-green-100 to-green-200 text-green-600 rounded-full shadow-lg">
                    <Contact className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                      Emergency Contact
                      <Phone className="h-5 w-5 text-green-500 ml-2" />
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Primary emergency contact</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Name:</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{patient.emergency_contact_name}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Relationship:</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 px-3 py-1 rounded-md">{patient.emergency_contact_relationship}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <span className="text-sm font-semibold text-green-700 dark:text-green-300 flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      Phone:
                    </span>
                    <span className="text-sm font-mono font-bold text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900/50 px-3 py-1 rounded-md">{patient.emergency_contact_phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Admission Details Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-l-purple-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-50 to-transparent rounded-bl-full opacity-50"></div>
              <div className="relative">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="p-4 bg-gradient-to-br from-purple-100 to-purple-200 text-purple-600 rounded-full shadow-lg">
                    <Building className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                      Admission Details
                      <Calendar className="h-5 w-5 text-purple-500 ml-2" />
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Hospital stay information</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Admission Date:</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100">{new Date(patient.admission_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Days in Hospital:</span>
                    <span className="text-sm font-bold text-purple-800 dark:text-purple-200 bg-purple-100 dark:bg-purple-900/50 px-3 py-1 rounded-md">Day {daysInHospital}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Condition:</span>
                    <span className={`text-sm font-semibold px-4 py-2 rounded-full border shadow-lg ${getConditionColor(patient.condition)}`}>
                      {patient.condition}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Diagnosis:</span>
                    <span className="text-sm text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-600 px-3 py-1 rounded-md">{patient.diagnosis}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center">
                      <Stethoscope className="h-4 w-4 mr-2" />
                      Assigned Nurse:
                    </span>
                    <span className="text-sm font-bold text-blue-800 dark:text-blue-200">{patient.assigned_nurse}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Allergies Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg hover:shadow-xl transition-all duration-300 border-l-4 border-l-amber-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-50 to-transparent rounded-bl-full opacity-50"></div>
              <div className="relative">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="p-4 bg-gradient-to-br from-amber-100 to-amber-200 text-amber-600 rounded-full shadow-lg">
                    <AlertTriangle className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
                      Allergies & Alerts
                      <AlertTriangle className="h-5 w-5 text-amber-500 ml-2" />
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Critical allergy information</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {patient.allergies && patient.allergies.length > 0 ? (
                    <div className="grid gap-3">
                      {patient.allergies.map((allergy, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <span className="text-sm font-semibold text-amber-800 dark:text-amber-200">{allergy}</span>
                          </div>
                          <span className="text-xs bg-amber-200 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 px-2 py-1 rounded-full font-medium">ALLERGY</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                      <div className="text-center">
                        <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full inline-block mb-3">
                          <Sparkles className="h-6 w-6 text-green-600" />
                        </div>
                        <span className="text-sm font-semibold text-green-700 dark:text-green-300">No Known Allergies</span>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">Patient is cleared for standard treatments</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'assessments':
        // Render sub-tabs navigation
        return (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
              <nav className="flex space-x-0 overflow-x-auto">
                {tabs.find(tab => tab.id === 'assessments')?.subTabs?.map((subTab, index) => {
                  const Icon = subTab.icon;
                  const isActive = activeSubTab === subTab.id;
                  return (
                    <button
                      key={subTab.id}
                      onClick={() => setActiveSubTab(subTab.id)}
                      className={`flex-1 min-w-0 px-6 py-4 font-medium text-sm whitespace-nowrap flex items-center justify-center space-x-3 transition-all duration-200 relative ${
                        isActive
                          ? 'bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/50 dark:to-green-800/30 text-green-700 dark:text-green-300 border-b-2 border-green-500' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50' 
                      }`}
                    >
                      <Icon className={`h-5 w-5 ${isActive ? 'text-green-600' : ''}`} />
                      <span className="font-semibold">{subTab.label}</span>
                      {index < (tabs.find(tab => tab.id === 'assessments')?.subTabs?.length || 0) - 1 && (
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-px h-6 bg-gray-200 dark:bg-gray-600"></div>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Render content based on active sub-tab */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg">
              {activeSubTab === 'vitals' && (
                <VitalsContent 
                  patientId={id!} 
                  patientName={`${patient.first_name} ${patient.last_name}`}
                  vitals={vitals}
                  onVitalsUpdated={(updatedVitals) => setVitals(updatedVitals)}
                />
              )}
              {activeSubTab === 'notes' && (
                <NotesContent
                  patientId={id!}
                  patientName={`${patient.first_name} ${patient.last_name}`}
                  notes={notes}
                  onNotesUpdated={(updatedNotes) => setNotes(updatedNotes)}
                />
              )}
              {activeSubTab === 'wounds' && <WoundAssessment patientId={id!} />}
            </div>
          </div>
        );

      case 'medications': 
        return (
          <MedicationAdministration
            patientId={id!}
            patientName={`${patient.first_name || ''} ${patient.last_name || ''}`.trim()}
            medications={medications}
            initialCategory={initialMedicationCategory}
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

      case 'admission':
        return (
          <AdmissionRecordsForm 
            patientId={id!}
            patientName={`${patient.first_name || ''} ${patient.last_name || ''}`.trim()}
            onClose={() => setActiveTab('overview')}
            onSave={() => setActiveTab('overview')}
          />
        );

      case 'directives':
        return (
          <AdvancedDirectivesForm 
            patientId={id!} 
            patientName={`${patient.first_name || ''} ${patient.last_name || ''}`.trim()}
            onClose={() => setActiveTab('overview')}
            onSave={() => setActiveTab('overview')}
          />
        );

      default:
        return null;
    }
  };

  return ( 
    <div className="space-y-8 pb-12">
      {/* Enhanced Patient Header */}
      <div className={`rounded-xl border p-8 shadow-lg ${getHeaderAccent(patient.condition)} border-l-4 relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-white/30 to-transparent rounded-bl-full"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button
              onClick={() => navigate('/')}
              className="p-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-4">
              <div className={`p-4 rounded-full shadow-lg ${getAvatarColor(patient.condition)}`}>
                <UserCircle className="h-10 w-10" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {patient.first_name} {patient.last_name}
                </h1>
                <div className="flex items-center space-x-4 mt-2">
                  <p className="text-gray-600 dark:text-gray-100 font-mono bg-white/50 dark:bg-gray-700/50 px-3 py-1 rounded-lg">
                    ID: {patient.patient_id}
                  </p>
                  <span className={`px-4 py-2 rounded-full text-sm font-semibold border shadow-lg ${getConditionColor(patient.condition)}`}>
                    {patient.condition}
                  </span>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">Room {patient.room_number}{patient.bed_number}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <Calendar className="h-4 w-4" />
                    <span>Day {daysInHospital}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowActivity(true)}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center space-x-3 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <Clock className="h-5 w-5" />
            <span className="font-medium">Recent Activity</span>
          </button>
        </div>
      </div>

      {/* Enhanced Navigation Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden">
        <nav className="flex space-x-0 overflow-x-auto">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-0 px-6 py-4 font-medium text-sm whitespace-nowrap flex items-center justify-center space-x-3 transition-all duration-200 relative ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/50 dark:to-blue-800/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50' 
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? tab.color || 'text-blue-600' : ''}`} />
                <span className="font-semibold">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-md">
                    {tab.count}
                  </span>
                )}
                {index < tabs.length - 1 && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-px h-6 bg-gray-200 dark:bg-gray-600"></div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-6">
        {renderTabContent()}
      </div>
      
      {/* Recent Activity Modal */}
      {showActivity && (
        <RecentActivity
          patientId={id!}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onClose={() => setShowActivity(false)}
        />
      )}
    </div>
  );
};