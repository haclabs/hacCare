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
  Stethoscope,
  TrendingUp,
  FileCheck,
  Shield,
  Layers
} from 'lucide-react';
import { Patient } from '../../types';
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
import { fetchPatientAssessments } from '../../lib/assessmentService';
import { format, parseISO } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';

interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack }) => {
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSubTab, setActiveSubTab] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // UI state
  const [showVitalsEditor, setShowVitalsEditor] = useState(false);
  const [showVitalsTrends, setShowVitalsTrends] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showBracelet, setShowBracelet] = useState(false);
  const [showMedicationBarcode, setShowMedicationBarcode] = useState(false);
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [showDirectivesForm, setShowDirectivesForm] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  
  // Selected item state
  const [selectedAssessment, setSelectedAssessment] = useState<any>(null);
  
  // Data state
  const [assessments, setAssessments] = useState<any[]>([]);

  useEffect(() => {
    loadPatientData();
  }, [patient.id]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      
      // Load assessments
      const assessmentsData = await fetchPatientAssessments(patient.id);
      setAssessments(assessmentsData);
      
    } catch (err: any) {
      console.error('Error loading patient data:', err);
      setError(err.message || 'Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const handleVitalsSave = () => {
    setShowVitalsEditor(false);
    loadPatientData();
  };

  const handleNoteAdd = () => {
    setShowNoteForm(false);
    loadPatientData(); // Refresh data
  };

  const handleMedicationAdd = () => {
    setShowMedicationForm(false);
    loadPatientData(); // Refresh data
  };
  
  const handleAssessmentSave = () => {
    setShowAssessmentForm(false);
    loadPatientData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Calculate patient age
  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };
  
  // Format date/time for display
  const formatTime = (dateValue: string | Date | null | undefined): string => {
    if (!dateValue) return 'N/A';
    
    const date = typeof dateValue === 'string' ? parseISO(dateValue) : dateValue;
    
    if (!date || !isValid(date)) return 'N/A';
    
    return format(date, 'MMM dd, yyyy HH:mm');
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
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Patient Information Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {patient.first_name} {patient.last_name}
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                <span className="font-mono">{patient.patient_id}</span>
                <button 
                  onClick={() => setShowBracelet(true)}
                  className="ml-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                >
                  Patient Labels
                </button>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {calculateAge(patient.date_of_birth)} years old • {patient.gender}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <MapPin className="h-4 w-4" />
              <span>Room {patient.room_number}{patient.bed_number}</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <Calendar className="h-4 w-4" />
              <span>Admitted {format(new Date(patient.admission_date), 'MMM dd, yyyy')}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Medical Information</h3>
            <div className="space-y-2 text-sm dark:text-gray-300">
              <div><span className="text-gray-600 dark:text-gray-400">Condition:</span> {patient.condition}</div>
              <div><span className="text-gray-600 dark:text-gray-400">Diagnosis:</span> {patient.diagnosis}</div>
              <div><span className="text-gray-600 dark:text-gray-400">Blood Type:</span> {patient.blood_type}</div>
              <div><span className="text-gray-600 dark:text-gray-400">Assigned Nurse:</span> {patient.assigned_nurse}</div>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Emergency Contact</h3>
            <div className="space-y-2 text-sm dark:text-gray-300">
              <div><span className="text-gray-600 dark:text-gray-400">Name:</span> {patient.emergency_contact_name}</div>
              <div><span className="text-gray-600 dark:text-gray-400">Relationship:</span> {patient.emergency_contact_relationship}</div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                <span>{patient.emergency_contact_phone}</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">Allergies</h3>
            <div className="space-y-1">
              {patient.allergies && patient.allergies.length > 0 ? (
                patient.allergies.map((allergy, index) => (
                  <span
                    key={index}
                    className="inline-block bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs px-2 py-1 rounded-full mr-1 mb-1 border border-red-200 dark:border-red-800"
                  >
                    {allergy}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 dark:text-gray-400 text-sm">No known allergies</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex flex-wrap -mb-px">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Overview
          </button>
          
          <button
            onClick={() => setActiveTab('vitals')}
            className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'vitals'
                ? 'border-red-500 text-red-600 dark:text-red-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Vital Signs
          </button>
          
          <button
            onClick={() => setActiveTab('mar')}
            className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'mar'
                ? 'border-green-500 text-green-600 dark:text-green-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            MAR
          </button>
          
          <button
            onClick={() => setActiveTab('notes')}
            className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'notes'
                ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Notes
          </button>
          
          <button
            onClick={() => setActiveTab('admission')}
            className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'admission'
                ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Admission Records
          </button>
          
          <button
            onClick={() => setActiveTab('directives')}
            className={`py-4 px-6 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'directives'
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            Advanced Directives
          </button>
        </nav>
      </div>
      
      {/* Second Row of Tabs */}
      {activeTab === 'assessments' && (
        <div className="border-b border-gray-200 dark:border-gray-700 -mt-6 bg-gray-50 dark:bg-gray-800">
          <nav className="flex flex-wrap -mb-px">
            <button
              onClick={() => setActiveSubTab('physical')}
              className={`py-3 px-4 font-medium text-xs border-b-2 transition-colors ${
                activeSubTab === 'physical'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Physical
            </button>
            
            <button
              onClick={() => setActiveSubTab('pain')}
              className={`py-3 px-4 font-medium text-xs border-b-2 transition-colors ${
                activeSubTab === 'pain'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Pain
            </button>
            
            <button
              onClick={() => setActiveSubTab('neuro')}
              className={`py-3 px-4 font-medium text-xs border-b-2 transition-colors ${
                activeSubTab === 'neuro'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Neurological
            </button>
            
            <button
              onClick={() => setActiveSubTab('wound')}
              className={`py-3 px-4 font-medium text-xs border-b-2 transition-colors ${
                activeSubTab === 'wound'
                  ? 'border-green-500 text-green-600 dark:text-green-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              Wound
            </button>
          </nav>
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Patient Overview
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Latest Vitals Summary */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
                    <Heart className="h-4 w-4 text-red-500 dark:text-red-400 mr-2" />
                    Latest Vital Signs
                  </h3>
                  <button
                    onClick={() => setShowVitalsEditor(true)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Update
                  </button>
                </div>
                
                {patient.vitals && patient.vitals.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      <span className="text-gray-600 dark:text-gray-400">Temp:</span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {patient.vitals[0].temperature.toFixed(1)}°C
                      </span>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded">
                      <span className="text-gray-600 dark:text-gray-400">HR:</span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {patient.vitals[0].heartRate} BPM
                      </span>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                      <span className="text-gray-600 dark:text-gray-400">BP:</span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {patient.vitals[0].bloodPressure.systolic}/{patient.vitals[0].bloodPressure.diastolic}
                      </span>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-2 rounded">
                      <span className="text-gray-600 dark:text-gray-400">O2:</span>{' '}
                      <span className="font-medium text-gray-900 dark:text-white">
                        {patient.vitals[0].oxygenSaturation}%
                      </span>
                    </div>
                    <div className="col-span-2 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Last updated: {formatTime(patient.vitals[0].recorded_at || patient.vitals[0].lastUpdated)}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No vital signs recorded</p>
                    <button
                      onClick={() => setShowVitalsEditor(true)}
                      className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      Record First Vitals
                    </button>
                  </div>
                )}
              </div>
              
              {/* Medications Summary */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
                    <Pill className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
                    Active Medications
                  </h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setShowMedicationForm(true)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowMedicationBarcode(true)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      Med Labels
                    </button>
                  </div>
                </div>
                
                {patient.medications && patient.medications.filter(m => m.status === 'Active').length > 0 ? (
                  <div className="space-y-2">
                    {patient.medications
                      .filter(m => m.status === 'Active')
                      .slice(0, 3)
                      .map(med => (
                        <div key={med.id} className="border-l-4 border-green-500 dark:border-green-600 pl-3 py-1">
                          <div className="font-medium text-gray-900 dark:text-white text-sm">{med.name}</div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {med.dosage} - {med.route} - {med.frequency}
                          </div>
                        </div>
                      ))}
                    
                    {patient.medications.filter(m => m.status === 'Active').length > 3 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
                        +{patient.medications.filter(m => m.status === 'Active').length - 3} more medications
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No active medications</p>
                    <button
                      onClick={() => setShowMedicationForm(true)}
                      className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      Add Medication
                    </button>
                  </div>
                )}
              </div>
              
              {/* Recent Notes */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
                    <FileText className="h-4 w-4 text-purple-500 dark:text-purple-400 mr-2" />
                    Recent Notes
                  </h3>
                  <button
                    onClick={() => setShowNoteForm(true)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    Add Note
                  </button>
                </div>
                
                {patient.notes && patient.notes.length > 0 ? (
                  <div className="space-y-2">
                    {patient.notes.slice(0, 2).map(note => (
                      <div key={note.id} className="border border-gray-200 dark:border-gray-700 rounded p-2">
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            note.priority === 'High' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
                            note.priority === 'Medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                            'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          }`}>
                            {note.priority}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(note.created_at || note.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                          {note.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No notes recorded</p>
                    <button
                      onClick={() => setShowNoteForm(true)}
                      className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      Add First Note
                    </button>
                  </div>
                )}
              </div>
              
              {/* Assessments Summary */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium text-gray-900 dark:text-white flex items-center">
                    <Stethoscope className="h-4 w-4 text-blue-500 dark:text-blue-400 mr-2" />
                    Recent Assessments
                  </h3>
                  <button
                    onClick={() => setShowAssessmentForm(true)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                  >
                    New Assessment
                  </button>
                </div>
                
                {assessments && assessments.length > 0 ? (
                  <div className="space-y-2">
                    {assessments.slice(0, 2).map(assessment => (
                      <div 
                        key={assessment.id} 
                        className="border border-gray-200 dark:border-gray-700 rounded p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                        onClick={() => setSelectedAssessment(assessment)}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-medium text-gray-900 dark:text-white">
                            {assessment.assessment_type.charAt(0).toUpperCase() + assessment.assessment_type.slice(1)} Assessment
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTime(assessment.assessment_date)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          By: {assessment.nurse_name}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">No assessments recorded</p>
                    <button
                      onClick={() => setShowAssessmentForm(true)}
                      className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      Create Assessment
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Vital Signs Tab */}
        {activeTab === 'vitals' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <Heart className="h-5 w-5 text-red-500 dark:text-red-400" />
                <span>Vital Signs</span>
              </h2>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowVitalsTrends(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>Vitals Trends</span>
                </button>
                <button
                  onClick={() => setShowVitalsEditor(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Record Vitals</span>
                </button>
              </div>
            </div>
            
            {patient.vitals && patient.vitals.length > 0 ? (
              <div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Date/Time
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Temp (°C)
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          HR (BPM)
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          BP (mmHg)
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          RR (/min)
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          O2 (%)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {patient.vitals.map((vital, index) => (
                        <tr key={vital.id || index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatTime(vital.recorded_at || vital.lastUpdated)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-sm rounded bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300">
                              {vital.temperature.toFixed(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-sm rounded bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                              {vital.heartRate}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-sm rounded bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                              {vital.bloodPressure.systolic}/{vital.bloodPressure.diastolic}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-sm rounded bg-purple-50 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300">
                              {vital.respiratoryRate}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-sm rounded bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-300">
                              {vital.oxygenSaturation}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Heart className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">No vital signs recorded yet</p>
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
        
        {/* MAR Tab */}
        {activeTab === 'mar' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <Pill className="h-5 w-5 text-green-500 dark:text-green-400" />
                <span>Medication Administration Record</span>
              </h2>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowMedicationBarcode(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Layers className="h-4 w-4" />
                  <span>Med Labels</span>
                </button>
                <button
                  onClick={() => setShowMedicationForm(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Medication</span>
                </button>
              </div>
            </div>
            
            <MedicationAdministration
              patientId={patient.id}
              patientName={`${patient.first_name} ${patient.last_name}`}
              medications={patient.medications}
              onRefresh={loadPatientData}
            />
          </div>
        )}
        
        {/* Notes Tab */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <FileText className="h-5 w-5 text-purple-500 dark:text-purple-400" />
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
            
            {patient.notes && patient.notes.length > 0 ? (
              <div className="space-y-4">
                {patient.notes.map((note) => (
                  <div key={note.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                          note.priority === 'High' 
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                            : note.priority === 'Medium'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        }`}>
                          {note.priority}
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{note.type}</span>
                      </div>
                      <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                        <div>{note.nurse_name || note.nurseName}</div>
                        <div>{formatTime(note.created_at || note.createdAt)}</div>
                      </div>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{note.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-4">No notes recorded yet</p>
                <button
                  onClick={() => setShowNoteForm(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Add First Note
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Admission Records Tab */}
        {activeTab === 'admission' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <FileCheck className="h-5 w-5 text-orange-500 dark:text-orange-400" />
                <span>Admission Records</span>
              </h2>
              <button
                onClick={() => setShowAdmissionForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>Update Records</span>
              </button>
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-4">
              <p className="text-orange-800 dark:text-orange-300 text-sm">
                Admission records contain detailed information about the patient's current hospital stay, including insurance information, 
                physical measurements, social history, and emergency contacts.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                  Admission Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-600 dark:text-gray-400">Admission Date:</div>
                    <div className="text-gray-900 dark:text-white">{format(new Date(patient.admission_date), 'MMMM dd, yyyy')}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-600 dark:text-gray-400">Room/Bed:</div>
                    <div className="text-gray-900 dark:text-white">{patient.room_number}{patient.bed_number}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-600 dark:text-gray-400">Diagnosis:</div>
                    <div className="text-gray-900 dark:text-white">{patient.diagnosis}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-600 dark:text-gray-400">Condition:</div>
                    <div className="text-gray-900 dark:text-white">{patient.condition}</div>
                  </div>
                </div>
              </div>
              
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <User className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                  Patient Information
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-600 dark:text-gray-400">Name:</div>
                    <div className="text-gray-900 dark:text-white">{patient.first_name} {patient.last_name}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-600 dark:text-gray-400">Date of Birth:</div>
                    <div className="text-gray-900 dark:text-white">{format(new Date(patient.date_of_birth), 'MMMM dd, yyyy')}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-600 dark:text-gray-400">Gender:</div>
                    <div className="text-gray-900 dark:text-white">{patient.gender}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-600 dark:text-gray-400">Blood Type:</div>
                    <div className="text-gray-900 dark:text-white">{patient.blood_type}</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center mt-4">
              <button
                onClick={() => setShowAdmissionForm(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                View Complete Admission Records
              </button>
            </div>
          </div>
        )}
        
        {/* Advanced Directives Tab */}
        {activeTab === 'directives' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <Shield className="h-5 w-5 text-indigo-500 dark:text-indigo-400" />
                <span>Advanced Directives</span>
              </h2>
              <button
                onClick={() => setShowDirectivesForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Edit className="h-4 w-4" />
                <span>Update Directives</span>
              </button>
            </div>
            
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 mb-4">
              <p className="text-indigo-800 dark:text-indigo-300 text-sm">
                Advanced directives document the patient's wishes regarding medical care, including living will, 
                healthcare proxy, DNR status, and organ donation preferences.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <FileCheck className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                  Legal Documents
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-600 dark:text-gray-400">Living Will:</div>
                    <div className="text-gray-900 dark:text-white">On File</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-600 dark:text-gray-400">DNR Status:</div>
                    <div className="text-gray-900 dark:text-white">Full Code</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-600 dark:text-gray-400">Healthcare Proxy:</div>
                    <div className="text-gray-900 dark:text-white">{patient.emergency_contact_name}</div>
                  </div>
                </div>
              </div>
              
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                  <Heart className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-2" />
                  Organ Donation
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-600 dark:text-gray-400">Status:</div>
                    <div className="text-gray-900 dark:text-white">Registered organ donor</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-gray-600 dark:text-gray-400">Details:</div>
                    <div className="text-gray-900 dark:text-white">All organs and tissues</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="text-center mt-4">
              <button
                onClick={() => setShowDirectivesForm(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                View Complete Advanced Directives
              </button>
            </div>
          </div>
        )}
        
        {/* Assessments Tab - Wound Assessment */}
        {activeTab === 'assessments' && activeSubTab === 'wound' && (
          <WoundAssessment patientId={patient.id} />
        )}
      </div>

      {/* Modals */}
      {showVitalsEditor && (
        <VitalSignsEditor
          patientId={patient.id}
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
          onClose={() => setShowNoteForm(false)}
        />
      )}

      {showMedicationForm && (
        <MedicationForm
          medication={null}
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onCancel={() => setShowMedicationForm(false)}
          onSave={handleMedicationAdd}
        />
      )}
      
      {showBracelet && (
        <PatientBracelet
          patient={patient}
          onClose={() => setShowBracelet(false)}
        />
      )}
      
      {showMedicationBarcode && (
        <MedicationBarcode
          patient={patient}
          medications={patient.medications}
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
          onSave={handleAssessmentSave}
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