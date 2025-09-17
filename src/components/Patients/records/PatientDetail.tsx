import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Activity, Clock, User, Calendar, Phone, AlertTriangle, FileText, Pill, Stethoscope, Clipboard, Shield, Heart, Sparkles } from 'lucide-react';
import { Patient, VitalSigns, Medication, PatientNote } from '../../../types';
import { fetchPatientById, fetchPatientVitals, fetchPatientNotes } from '../../../lib/patientService';
import { fetchPatientMedications } from '../../../lib/medicationService';
import { RecentActivity } from './RecentActivity';
import { MARModule } from '../../../modules/mar/MARModule';
import { WoundAssessment } from '../forms/WoundAssessment';
// import { ImageAnnotation } from '../visuals/ImageAnnotation';
import { AdmissionRecordsForm } from '../forms/AdmissionRecordsForm';
import { AdvancedDirectivesForm } from '../forms/AdvancedDirectivesForm';
import { VitalsContent } from '../vitals/VitalsContent';
import { NotesContent } from './NotesContent';
import { ModernPatientManagement } from '../../ModernPatientManagement';

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
  const [showActivity, setShowActivity] = useState(false);
  // State for active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<string>('vitals');
  
  // Helper functions for styling (matching PatientCard)
  const getConditionColor = (condition: Patient['condition']) => {
    switch (condition) {
      case 'Critical': return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300 shadow-red-100';
      case 'Stable': return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300 shadow-green-100';
      case 'Improving': return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300 shadow-blue-100';
      case 'Discharged': return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300 shadow-gray-100';
      default: return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300 shadow-gray-100';
    }
  };

  const getCardAccent = (condition: Patient['condition']) => {
    switch (condition) {
      case 'Critical': return 'border-l-4 border-l-red-500';
      case 'Stable': return 'border-l-4 border-l-green-500';
      case 'Improving': return 'border-l-4 border-l-blue-500';
      case 'Discharged': return 'border-l-4 border-l-gray-400';
      default: return 'border-l-4 border-l-gray-400';
    }
  };

  const getAvatarColor = (condition: Patient['condition']) => {
    switch (condition) {
      case 'Critical': return 'bg-gradient-to-br from-red-100 to-red-200 text-red-600';
      case 'Stable': return 'bg-gradient-to-br from-green-100 to-green-200 text-green-600';
      case 'Improving': return 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600';
      case 'Discharged': return 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600';
      default: return 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600';
    }
  };

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

  const tabs = [ 
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'medications', label: 'MAR', icon: Pill, count: totalMedications > 0 ? totalMedications : undefined },
    { id: 'assessments', label: 'Assessments', icon: Stethoscope, subTabs: [
      { id: 'vitals', label: 'Vital Signs', icon: Activity },
      { id: 'notes', label: 'Notes', icon: FileText },
      { id: 'wounds', label: 'Wound Care', icon: Heart }
    ]},
    { id: 'admission', label: 'Admission', icon: Clipboard },
    { id: 'directives', label: 'Directives', icon: Shield },
    { id: 'modular', label: 'Modern System', icon: Sparkles }
  ];

  const renderTabContent = () => { 
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Patient Header Section - Enhanced like PatientCard */}
            <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg hover:shadow-xl transition-all duration-300 ${getCardAccent(patient.condition)}`}>
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full shadow-lg ${getAvatarColor(patient.condition)}`}>
                    <User className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      {patient.first_name} {patient.last_name}
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-gray-400 flex items-center space-x-2 mt-1">
                      <span>{new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} years old</span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      <span>{patient.gender}</span>
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-md mt-2 inline-block">
                      {patient.patient_id}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-3">
                  <span className={`px-6 py-3 rounded-full text-lg font-semibold border shadow-lg ${getConditionColor(patient.condition)}`}>
                    {patient.condition}
                  </span>
                  {onShowBracelet && (
                    <button
                      onClick={() => onShowBracelet(patient)}
                      className="flex items-center text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors border border-blue-200 hover:border-blue-300"
                    >
                      <User className="h-4 w-4 mr-2" />
                      ID Bracelet
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Enhanced Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Patient Information Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg mr-3">
                    <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  Patient Information
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Patient ID:</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{patient.patient_id}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Date of Birth:</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{new Date(patient.date_of_birth).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Gender:</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{patient.gender}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Blood Type:</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{patient.blood_type}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Room:</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{patient.room_number} - {patient.bed_number}</span>
                  </div>
                </div>
              </div>

              {/* Emergency Contact Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                  <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg mr-3">
                    <Phone className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  Emergency Contact
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Name:</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{patient.emergency_contact_name}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Relationship:</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{patient.emergency_contact_relationship}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Phone:</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{patient.emergency_contact_phone}</span>
                  </div>
                </div>
              </div>

              {/* Admission Details Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg mr-3">
                    <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  Admission Details
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Admission Date:</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{new Date(patient.admission_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Condition:</span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getConditionColor(patient.condition)}`}>
                      {patient.condition}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Diagnosis:</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{patient.diagnosis}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Assigned Nurse:</span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{patient.assigned_nurse}</span>
                  </div>
                </div>
              </div>

              {/* Allergies Card */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
                  <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg mr-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  Allergies
                </h3>
                <div className="space-y-3">
                  {patient.allergies && patient.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {patient.allergies.map((allergy, index) => (
                        <span key={index} className="inline-flex items-center px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm font-medium rounded-lg border border-red-200 dark:border-red-800">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          {allergy}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <span className="text-sm text-green-800 dark:text-green-200 font-medium">No known allergies</span>
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
            <div className="border-b border-gray-200 dark:border-gray-700">
              <nav className="-mb-px flex space-x-8 overflow-x-auto">
                {tabs.find(tab => tab.id === 'assessments')?.subTabs?.map(subTab => {
                  const Icon = subTab.icon;
                  return (
                    <button
                      key={subTab.id}
                      onClick={() => setActiveSubTab(subTab.id)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center ${
                        activeSubTab === subTab.id
                          ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600' 
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2" /> 
                      <span>{subTab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Render content based on active sub-tab */}
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
        );

      case 'medications': 
        return (
          <MARModule
            patient={patient}
            medications={medications}
            onMedicationUpdate={async (updatedMedications) => {
              // Update local state immediately for responsive UI
              setMedications(updatedMedications);
              
              // Also refresh from database to ensure consistency
              try {
                const freshMedications = await fetchPatientMedications(id!);
                setMedications(freshMedications);
                console.log('Medications refreshed from database after update');
              } catch (error) {
                console.error('Error refreshing medications after update:', error);
                // Keep the local update if database refresh fails
              }
            }}
            currentUser={{
              id: 'current-user', // TODO: Get from auth context
              name: 'Current User',
              role: 'nurse'
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

      case 'modular':
        return (
          <ModernPatientManagement
            patient={patient}
            onPatientUpdate={(updatedData) => {
              // Update local patient state with new data
              setPatient(prev => prev ? { ...prev, ...updatedData } : null);
            }}
            mode="tab"
            currentUser={{
              id: 'current-user',
              name: 'Current User',
              role: 'nurse',
              department: 'nursing'
            }}
          />
        );

      default:
        return null;
    }
  };

  // Generate comprehensive hospital-style patient record
  const handlePrintRecord = async () => {
    try {
      // Get all patient data for comprehensive record
      const [vitalsData, medicationsData, notesData] = await Promise.all([
        fetchPatientVitals(id!),
        fetchPatientMedications(id!),
        fetchPatientNotes(id!)
      ]);

      // Create a new window for the hospital record
      const reportWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
      
      if (!reportWindow) {
        alert('Please allow popups to generate the patient record.');
        return;
      }

      reportWindow.document.write(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Patient Medical Record - ${patient.first_name} ${patient.last_name}</title>
            <style>
              * { box-sizing: border-box; margin: 0; padding: 0; }
              
              body { 
                font-family: 'Times New Roman', serif;
                font-size: 12px;
                line-height: 1.4;
                color: #000;
                background: #fff;
                padding: 0;
                margin: 0;
              }
              
              .record-container {
                max-width: 8.5in;
                margin: 0 auto;
                padding: 0.75in;
                background: white;
                min-height: 11in;
                box-shadow: 0 0 20px rgba(0,0,0,0.1);
              }
              
              .hospital-header {
                text-align: center;
                border-bottom: 3px double #000;
                padding-bottom: 15px;
                margin-bottom: 20px;
              }
              
              .hospital-logo {
                font-size: 24px;
                font-weight: bold;
                color: #000;
                margin-bottom: 3px;
                letter-spacing: 1px;
              }
              
              .hospital-address {
                font-size: 10px;
                color: #333;
                margin-bottom: 8px;
              }
              
              .record-type {
                font-size: 16px;
                font-weight: bold;
                color: #000;
                text-transform: uppercase;
                letter-spacing: 2px;
                margin-top: 8px;
              }
              
              .patient-id-bar {
                background: #f0f0f0;
                border: 2px solid #000;
                padding: 10px;
                margin: 15px 0;
                text-align: center;
                font-weight: bold;
                font-size: 14px;
              }
              
              .form-section {
                margin-bottom: 25px;
                border: 1px solid #000;
                page-break-inside: avoid;
              }
              
              .section-header {
                background: #000;
                color: #fff;
                padding: 8px 12px;
                font-weight: bold;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              
              .section-content {
                padding: 15px;
              }
              
              .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 15px;
              }
              
              .info-row {
                display: flex;
                margin-bottom: 8px;
                align-items: baseline;
              }
              
              .info-label {
                font-weight: bold;
                min-width: 120px;
                margin-right: 10px;
                text-transform: uppercase;
                font-size: 11px;
              }
              
              .info-value {
                flex: 1;
                border-bottom: 1px solid #ccc;
                padding-bottom: 2px;
                font-size: 12px;
              }
              
              .alert-box {
                background: #fff3cd;
                border: 3px solid #dc3545;
                padding: 12px;
                margin: 15px 0;
                font-weight: bold;
                text-align: center;
                font-size: 14px;
              }
              
              .alert-box.no-alerts {
                background: #d4edda;
                border-color: #28a745;
                color: #155724;
              }
              
              .medication-table, .vitals-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
              }
              
              .medication-table th, .medication-table td,
              .vitals-table th, .vitals-table td {
                border: 1px solid #000;
                padding: 8px;
                text-align: left;
                font-size: 11px;
              }
              
              .medication-table th, .vitals-table th {
                background: #f5f5f5;
                font-weight: bold;
                text-transform: uppercase;
              }
              
              .notes-section {
                margin-top: 15px;
              }
              
              .note-entry {
                border: 1px solid #ccc;
                margin-bottom: 10px;
                padding: 10px;
                background: #fafafa;
              }
              
              .note-header {
                font-weight: bold;
                font-size: 11px;
                color: #333;
                margin-bottom: 5px;
                text-transform: uppercase;
              }
              
              .note-content {
                font-size: 11px;
                line-height: 1.5;
                margin-bottom: 5px;
              }
              
              .note-meta {
                font-size: 9px;
                color: #666;
                font-style: italic;
              }
              
              .signature-section {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #000;
              }
              
              .signature-line {
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
              }
              
              .sig-field {
                flex: 1;
                margin-right: 30px;
              }
              
              .sig-field:last-child {
                margin-right: 0;
              }
              
              .sig-line {
                border-bottom: 1px solid #000;
                height: 30px;
                margin-bottom: 5px;
              }
              
              .sig-label {
                font-size: 10px;
                font-weight: bold;
                text-transform: uppercase;
              }
              
              .record-footer {
                margin-top: 30px;
                padding-top: 15px;
                border-top: 1px solid #ccc;
                font-size: 9px;
                color: #666;
                text-align: center;
              }
              
              .confidentiality-notice {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                padding: 10px;
                margin-top: 15px;
                font-size: 9px;
                text-align: justify;
              }
              
              .action-buttons {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
                display: flex;
                gap: 10px;
              }
              
              .btn {
                padding: 10px 15px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                font-size: 12px;
                font-weight: bold;
                text-transform: uppercase;
              }
              
              .btn-print {
                background: #007bff;
                color: white;
              }
              
              .btn-close {
                background: #6c757d;
                color: white;
              }
              
              .btn:hover {
                opacity: 0.8;
              }
              
              @media print {
                .action-buttons { display: none; }
                .record-container { 
                  box-shadow: none; 
                  padding: 0.5in;
                  max-width: none;
                }
                @page { 
                  margin: 0.5in;
                  size: letter;
                }
              }
              
              @media screen and (max-width: 768px) {
                .record-container {
                  padding: 20px;
                  max-width: 100%;
                }
                .info-grid {
                  grid-template-columns: 1fr;
                }
              }
            </style>
          </head>
          <body>
            <div class="action-buttons">
              <button class="btn btn-print" onclick="window.print()">Print Record</button>
              <button class="btn btn-close" onclick="window.close()">Close</button>
            </div>
            
            <div class="record-container">
              <div class="hospital-header">
                <div class="hospital-logo">HACCARE MEDICAL CENTER</div>
                <div class="hospital-address">
                  1234 Healthcare Drive • Medical City, MC 12345<br>
                  Phone: (555) 123-4567 • Fax: (555) 123-4568
                </div>
                <div class="record-type">Official Medical Record</div>
              </div>

              <div class="patient-id-bar">
                PATIENT: ${patient.first_name?.toUpperCase()} ${patient.last_name?.toUpperCase()} | ID: ${patient.patient_id} | DOB: ${new Date(patient.date_of_birth).toLocaleDateString()}
              </div>

              <div class="form-section">
                <div class="section-header">Patient Demographics</div>
                <div class="section-content">
                  <div class="info-grid">
                    <div>
                      <div class="info-row">
                        <span class="info-label">Last Name:</span>
                        <span class="info-value">${patient.last_name}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">First Name:</span>
                        <span class="info-value">${patient.first_name}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Date of Birth:</span>
                        <span class="info-value">${new Date(patient.date_of_birth).toLocaleDateString()}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Age:</span>
                        <span class="info-value">${new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear()} years</span>
                      </div>
                    </div>
                    <div>
                      <div class="info-row">
                        <span class="info-label">Gender:</span>
                        <span class="info-value">${patient.gender}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Blood Type:</span>
                        <span class="info-value">${patient.blood_type}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Room Number:</span>
                        <span class="info-value">${patient.room_number}</span>
                      </div>
                      <div class="info-row">
                        <span class="info-label">Bed Number:</span>
                        <span class="info-value">${patient.bed_number}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="form-section">
                <div class="section-header">Admission Information</div>
                <div class="section-content">
                  <div class="info-row">
                    <span class="info-label">Admission Date:</span>
                    <span class="info-value">${new Date(patient.admission_date).toLocaleDateString()}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Current Condition:</span>
                    <span class="info-value">${patient.condition}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Primary Diagnosis:</span>
                    <span class="info-value">${patient.diagnosis}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Assigned Nurse:</span>
                    <span class="info-value">${patient.assigned_nurse}</span>
                  </div>
                </div>
              </div>

              <div class="form-section">
                <div class="section-header">Emergency Contact Information</div>
                <div class="section-content">
                  <div class="info-row">
                    <span class="info-label">Contact Name:</span>
                    <span class="info-value">${patient.emergency_contact_name}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Relationship:</span>
                    <span class="info-value">${patient.emergency_contact_relationship}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">Phone Number:</span>
                    <span class="info-value">${patient.emergency_contact_phone}</span>
                  </div>
                </div>
              </div>

              <div class="form-section">
                <div class="section-header">Allergies and Medical Alerts</div>
                <div class="section-content">
                  ${patient.allergies && patient.allergies.length > 0 
                    ? `<div class="alert-box">
                        ⚠️ CRITICAL ALLERGIES: ${patient.allergies.join(' • ')}
                      </div>`
                    : `<div class="alert-box no-alerts">✓ NO KNOWN ALLERGIES</div>`
                  }
                </div>
              </div>

              <div class="form-section">
                <div class="section-header">Current Medications</div>
                <div class="section-content">
                  <table class="medication-table">
                    <thead>
                      <tr>
                        <th>Medication Name</th>
                        <th>Dosage</th>
                        <th>Frequency</th>
                        <th>Route</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${medicationsData.filter(med => med.status === 'Active').length > 0 
                        ? medicationsData.filter(med => med.status === 'Active').map(med => `
                          <tr>
                            <td>${med.name}</td>
                            <td>${med.dosage}</td>
                            <td>${med.frequency}</td>
                            <td>${med.route}</td>
                            <td>${med.status}</td>
                          </tr>
                        `).join('')
                        : '<tr><td colspan="5" style="text-align: center; font-style: italic;">No active medications recorded</td></tr>'
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              <div class="form-section">
                <div class="section-header">Latest Vital Signs</div>
                <div class="section-content">
                  ${vitalsData.length > 0 ? `
                    <table class="vitals-table">
                      <thead>
                        <tr>
                          <th>Temperature</th>
                          <th>Heart Rate</th>
                          <th>Blood Pressure</th>
                          <th>Respiratory Rate</th>
                          <th>O2 Saturation</th>
                          <th>Recorded</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>${vitalsData[0].temperature}°F</td>
                          <td>${vitalsData[0].heartRate} bpm</td>
                          <td>${vitalsData[0].bloodPressure}</td>
                          <td>${vitalsData[0].respiratoryRate}/min</td>
                          <td>${vitalsData[0].oxygenSaturation}%</td>
                          <td>${vitalsData[0].recorded_at ? new Date(vitalsData[0].recorded_at).toLocaleString() : 'Not recorded'}</td>
                        </tr>
                      </tbody>
                    </table>
                  ` : '<p style="text-align: center; font-style: italic; margin: 20px 0;">No vital signs recorded</p>'}
                </div>
              </div>

              <div class="form-section">
                <div class="section-header">Clinical Notes and Assessments</div>
                <div class="section-content">
                  <div class="notes-section">
                    ${notesData.length > 0 ? notesData.slice(0, 8).map(note => `
                      <div class="note-entry">
                        <div class="note-header">${note.type || 'Clinical Note'}</div>
                        <div class="note-content">${note.content}</div>
                        <div class="note-meta">Recorded: ${new Date(note.created_at || new Date()).toLocaleString()}</div>
                      </div>
                    `).join('') : '<p style="text-align: center; font-style: italic; margin: 20px 0;">No clinical notes recorded</p>'}
                  </div>
                </div>
              </div>

              <div class="signature-section">
                <div class="signature-line">
                  <div class="sig-field">
                    <div class="sig-line"></div>
                    <div class="sig-label">Attending Physician Signature</div>
                  </div>
                  <div class="sig-field">
                    <div class="sig-line"></div>
                    <div class="sig-label">Date</div>
                  </div>
                </div>
                <div class="signature-line">
                  <div class="sig-field">
                    <div class="sig-line"></div>
                    <div class="sig-label">Nurse Signature</div>
                  </div>
                  <div class="sig-field">
                    <div class="sig-line"></div>
                    <div class="sig-label">Date</div>
                  </div>
                </div>
              </div>

              <div class="record-footer">
                <div><strong>Record Generated:</strong> ${new Date().toLocaleString()}</div>
                <div><strong>Generated By:</strong> hacCare Medical Records System</div>
                
                <div class="confidentiality-notice">
                  <strong>CONFIDENTIALITY NOTICE:</strong> This medical record contains confidential patient health information protected by federal and state privacy laws including HIPAA. This information is intended solely for the use of authorized healthcare providers and personnel involved in the patient's care. Any unauthorized review, disclosure, copying, distribution, or use of this information is strictly prohibited and may be subject to legal penalties. If you have received this record in error, please notify the sender immediately and destroy all copies.
                </div>
              </div>
            </div>
          </body>
        </html>
      `);
      
      reportWindow.document.close();
      reportWindow.focus();
      
    } catch (error) {
      console.error('Error generating patient record:', error);
      alert('Error generating patient record. Please try again.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/')}
            className="mr-4 p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center space-x-4">
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {patient.first_name} {patient.last_name}
                </h1>
              </div>
              <p className="text-gray-600 dark:text-gray-100">Patient ID: {patient.patient_id}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrintRecord}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <FileText className="h-4 w-4" />
            <span>View Patient Record</span>
          </button>
          <button
            onClick={() => setShowActivity(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Clock className="h-4 w-4" />
            <span>Recent Activity</span>
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
        <nav className="flex space-x-0 overflow-x-auto scrollbar-hide">
          {tabs.map((tab, index) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const isFirst = index === 0;
            const isLast = index === tabs.length - 1;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-6 py-4 font-medium text-sm whitespace-nowrap flex items-center transition-all duration-300 transform hover:scale-105 ${
                  isFirst ? 'rounded-tl-lg' : ''
                } ${
                  isLast ? 'rounded-tr-lg' : ''
                } ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg border-b-4 border-blue-700' 
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-gray-200 border-b-4 border-transparent hover:border-gray-300 dark:hover:border-gray-500' 
                }`}
              >
                <Icon className={`h-5 w-5 mr-3 ${isActive ? 'text-white' : 'text-current'}`} /> 
                <span className="font-semibold">{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`ml-3 text-xs font-bold px-2.5 py-1 rounded-full flex items-center justify-center min-w-[1.5rem] h-6 ${
                    isActive 
                      ? 'bg-white/20 text-white border border-white/30' 
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {/* Active indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"></div>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-6" id="patient-record-printable">
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