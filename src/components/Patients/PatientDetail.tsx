import React, { useState, useEffect } from 'react';
import { format, isValid } from 'date-fns';
import { 
  ArrowLeft, 
  User, 
  Calendar,
  CalendarDays,
  MapPin, 
  Phone, 
  Heart, 
  Thermometer, 
  Activity, 
  Droplets,
  Clock,
  Plus,
  Edit,
  FileText,
  AlertTriangle,
  Pill,
  Stethoscope,
  ClipboardList,
  UserCheck,
  Shield,
  Building,
  Settings,
  QrCode,
  TrendingUp,
  BookOpen,
  Brain,
  Trash2,
  CheckSquare,
  Clipboard,
  CheckCircle,
  X
} from 'lucide-react';
import { Patient } from '../../types';
import { VitalSignsEditor } from './VitalSignsEditor';
import { MedicationForm } from './MedicationForm';
import { MedicationAdministration } from './MedicationAdministration';
import { PatientNoteForm } from './PatientNoteForm';
import { AssessmentForm } from './AssessmentForm';
import { AssessmentDetail } from './AssessmentDetail';
import { AdmissionRecordsForm } from './AdmissionRecordsForm';
import { AdvancedDirectivesForm } from './AdvancedDirectivesForm';
import { VitalsTrends } from './VitalsTrends';
import { HospitalBracelet } from './HospitalBracelet';
import { PatientBracelet } from './PatientBracelet';
import { MedicationBarcode } from './MedicationBarcode';
import { supabase } from '../../lib/supabase';
import { updatePatientVitals, clearPatientVitals } from '../../lib/patientService';
import { fetchPatientAssessments, PatientAssessment } from '../../lib/assessmentService';
import { useAuth } from '../../contexts/AuthContext';
import { usePatients } from '../../contexts/PatientContext';

// Helper function to safely format dates
const safeFormatDate = (dateValue: string | Date | null | undefined, formatString: string): string => {
  if (!dateValue) return 'N/A';
  
  try {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    if (!isValid(date)) return 'N/A';
    
    return format(date, formatString);
  } catch (error) {
    console.error('Date formatting error:', error, 'for value:', dateValue);
    return 'N/A';
  }
};

interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
  onEdit: (patient: Patient) => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack, onEdit }) => {
  const { user } = useAuth();
  const { updatePatient } = usePatients();
  const [activeTab, setActiveTab] = useState('overview');
  const [showVitalsEditor, setShowVitalsEditor] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showMedicationAdministration, setShowMedicationAdministration] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [showAdvancedDirectivesForm, setShowAdvancedDirectivesForm] = useState(false);
  const [showVitalsTrends, setShowVitalsTrends] = useState(false);
  const [showHospitalBracelet, setShowHospitalBracelet] = useState(false);
  const [showPatientBracelet, setShowPatientBracelet] = useState(false);
  const [showMedicationBarcode, setShowMedicationBarcode] = useState(false);
  const [vitals, setVitals] = useState(patient.vitals || []);
  const [medications, setMedications] = useState(patient.medications || []);
  const [notes, setNotes] = useState(patient.notes || []);
  const [assessments, setAssessments] = useState<PatientAssessment[]>([]);
  const [selectedAssessment, setSelectedAssessment] = useState<PatientAssessment | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchPatientData();
  }, [patient.id]);

  const fetchPatientData = async () => {
    try {
      await loadAssessments();
      // Fetch updated medications
      const { data: medicationsData } = await supabase
        .from('patient_medications')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });
      
      if (medicationsData) {
        setMedications(medicationsData);
      }
    } catch (error) {
      console.error('Error fetching patient data:', error);
    }
  };

  const loadAssessments = async () => {
    try {
      const patientAssessments = await fetchPatientAssessments(patient.id);
      setAssessments(patientAssessments);
    } catch (error) {
      console.error('Error loading assessments:', error);
    }
  };

  const handleVitalsUpdate = async (newVitals: any) => {
    try {
      setLoading(true);
      await updatePatientVitals(patient.id, newVitals);
      setVitals(prev => [newVitals, ...prev]);
      setShowVitalsEditor(false);
    } catch (error) {
      console.error('Error updating vitals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearVitals = async () => {
    try {
      setLoading(true);
      await clearPatientVitals(patient.id);
      setVitals([]);
    } catch (error) {
      console.error('Error clearing vitals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMedicationAdd = (medication: any) => {
    setMedications(prev => [medication, ...prev]);
    setShowMedicationForm(false);
  };

  const handleNoteAdd = (note: any) => {
    setNotes(prev => [note, ...prev]);
    setShowNoteForm(false);
  };

  const handleAssessmentAdd = () => {
    loadAssessments();
    setShowAssessmentForm(false);
  };

  const getLatestVitals = () => {
    return vitals.length > 0 ? vitals[0] : null;
  };

  const getVitalStatus = (value: number, normal: { min: number; max: number }) => {
    if (value < normal.min || value > normal.max) {
      return 'text-red-600 bg-red-50';
    }
    return 'text-green-600 bg-green-50';
  };

  const latestVitals = getLatestVitals();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'vitals', label: 'Vital Signs', icon: Heart },
    { id: 'mar', label: 'MAR', icon: CheckSquare },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'assessments', label: 'Assessments', icon: ClipboardList },
    { id: 'admission', label: 'Admission', icon: Building },
    { id: 'directives', label: 'Directives', icon: Shield },
    { id: 'tools', label: 'Tools', icon: Settings }
  ];

  if (selectedAssessment) {
    return (
      <AssessmentDetail
        assessment={selectedAssessment}
        onBack={() => setSelectedAssessment(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {patient.first_name} {patient.last_name}
              </h1>
              <p className="text-sm text-gray-500">
                Patient ID: {patient.patient_id} • Room {patient.room_number}-{patient.bed_number}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onEdit(patient)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Patient</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'overview' && (
          <div className="p-6 space-y-6">
            {/* Patient Info Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Basic Info */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-600" />
                  Basic Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date of Birth:</span>
                    <span className="font-medium">{safeFormatDate(patient.date_of_birth, 'MMM dd, yyyy')}</span>
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
                    <span className="text-gray-600">Assigned Nurse:</span>
                    <span className="font-medium">{patient.assigned_nurse}</span>
                  </div>
                </div>
              </div>

              {/* Admission Info */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-green-600" />
                  Admission Details
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Admission Date:</span>
                    <span className="font-medium">{safeFormatDate(patient.admission_date, 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Condition:</span>
                    <span className="font-medium">{patient.condition}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Diagnosis:</span>
                    <span className="font-medium">{patient.diagnosis}</span>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Phone className="w-5 h-5 mr-2 text-purple-600" />
                  Emergency Contact
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Name:</span>
                    <span className="font-medium">{patient.emergency_contact_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Relationship:</span>
                    <span className="font-medium">{patient.emergency_contact_relationship}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone:</span>
                    <span className="font-medium">{patient.emergency_contact_phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Latest Vitals */}
            {latestVitals && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Heart className="w-5 h-5 mr-2 text-red-600" />
                  Latest Vital Signs
                  <span className="ml-2 text-sm text-gray-500">
                    ({safeFormatDate(latestVitals.recordedAt || latestVitals.recorded_at, 'MMM dd, yyyy HH:mm')})
                  </span>
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className={`p-3 rounded-lg ${getVitalStatus(latestVitals.temperature, { min: 97, max: 99 })}`}>
                    <div className="flex items-center space-x-2">
                      <Thermometer className="w-4 h-4" />
                      <span className="text-sm font-medium">Temperature (°F)</span>
                    </div>
                    <p className="text-lg font-bold">{latestVitals.temperature}°F</p>
                  </div>
                  <div className={`p-3 rounded-lg ${getVitalStatus(latestVitals.bloodPressure.systolic, { min: 90, max: 140 })}`}>
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4" />
                      <span className="text-sm font-medium">Blood Pressure</span>
                    </div>
                    <p className="text-lg font-bold">{latestVitals.bloodPressure.systolic}/{latestVitals.bloodPressure.diastolic}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${getVitalStatus(latestVitals.heartRate, { min: 60, max: 100 })}`}>
                    <div className="flex items-center space-x-2">
                      <Heart className="w-4 h-4" />
                      <span className="text-sm font-medium">Heart Rate</span>
                    </div>
                    <p className="text-lg font-bold">{latestVitals.heartRate} bpm</p>
                  </div>
                  <div className={`p-3 rounded-lg ${getVitalStatus(latestVitals.respiratoryRate, { min: 12, max: 20 })}`}>
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4" />
                      <span className="text-sm font-medium">Respiratory Rate</span>
                    </div>
                    <p className="text-lg font-bold">{latestVitals.respiratoryRate} /min</p>
                  </div>
                  <div className={`p-3 rounded-lg ${getVitalStatus(latestVitals.oxygenSaturation, { min: 95, max: 100 })}`}>
                    <div className="flex items-center space-x-2">
                      <Droplets className="w-4 h-4" />
                      <span className="text-sm font-medium">O2 Saturation</span>
                    </div>
                    <p className="text-lg font-bold">{latestVitals.oxygenSaturation}%</p>
                  </div>
                </div>
              </div>
            )}

            {/* Allergies */}
            {patient.allergies && patient.allergies.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-900 mb-3 flex items-center">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Allergies
                </h3>
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((allergy, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium"
                    >
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'vitals' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Vital Signs</h2>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowVitalsTrends(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>View Trends</span>
                </button>
                <button
                  onClick={() => setShowVitalsEditor(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Vitals</span>
                </button>
                {vitals.length > 0 && (
                  <button
                    onClick={handleClearVitals}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear All</span>
                  </button>
                )}
              </div>
            </div>

            {vitals.length === 0 ? (
              <div className="text-center py-12">
                <Stethoscope className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No vital signs recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {vitals.map((vital, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-semibold text-gray-900">
                        {safeFormatDate(vital.recordedAt || vital.recorded_at, 'MMM dd, yyyy HH:mm')}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {index === 0 ? 'Latest' : `${index + 1} reading${index > 0 ? 's' : ''} ago`}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      <div className={`p-3 rounded-lg ${getVitalStatus(vital.temperature, { min: 97, max: 99 })}`}>
                        <div className="flex items-center space-x-2">
                          <Thermometer className="w-4 h-4" />
                          <span className="text-sm font-medium">Temperature (°F)</span>
                        </div>
                        <p className="text-lg font-bold">{vital.temperature}°F</p>
                      </div>
                      <div className={`p-3 rounded-lg ${getVitalStatus(vital.bloodPressure.systolic, { min: 90, max: 140 })}`}>
                        <div className="flex items-center space-x-2">
                          <Activity className="w-4 h-4" />
                          <span className="text-sm font-medium">Blood Pressure</span>
                        </div>
                        <p className="text-lg font-bold">{vital.bloodPressure.systolic}/{vital.bloodPressure.diastolic}</p>
                      </div>
                      <div className={`p-3 rounded-lg ${getVitalStatus(vital.heartRate, { min: 60, max: 100 })}`}>
                        <div className="flex items-center space-x-2">
                          <Heart className="w-4 h-4" />
                          <span className="text-sm font-medium">Heart Rate</span>
                        </div>
                        <p className="text-lg font-bold">{vital.heartRate} bpm</p>
                      </div>
                      <div className={`p-3 rounded-lg ${getVitalStatus(vital.respiratoryRate, { min: 12, max: 20 })}`}>
                        <div className="flex items-center space-x-2">
                          <Activity className="w-4 h-4" />
                          <span className="text-sm font-medium">Respiratory Rate</span>
                        </div>
                        <p className="text-lg font-bold">{vital.respiratoryRate} /min</p>
                      </div>
                      <div className={`p-3 rounded-lg ${getVitalStatus(vital.oxygenSaturation, { min: 95, max: 100 })}`}>
                        <div className="flex items-center space-x-2">
                          <Droplets className="w-4 h-4" />
                          <span className="text-sm font-medium">O2 Saturation</span>
                        </div>
                        <p className="text-lg font-bold">{vital.oxygenSaturation}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'mar' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Medication Administration Record</h2>
              <button
                onClick={() => setShowMedicationForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Medication</span>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Medication Overview */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Medication Schedule Overview</h3>
                
                {medications.length === 0 ? (
                  <div className="text-center py-8">
                    <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No medications prescribed yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Time slots */}
                    <div className="grid grid-cols-1 gap-4">
                      {['Morning (6am-12pm)', 'Afternoon (12pm-6pm)', 'Evening (6pm-12am)', 'Night (12am-6am)'].map((timeSlot, index) => (
                        <div key={index} className="border rounded-lg p-4">
                          <h4 className="font-medium text-gray-900 mb-3">{timeSlot}</h4>
                          <div className="flex flex-wrap gap-2">
                            {medications
                              .filter(med => med.status === 'Active')
                              .map((med) => {
                                // Determine if medication belongs in this time slot
                                let belongsInSlot = false;
                                try {
                                  const nextDue = new Date(med.next_due);
                                  const hour = nextDue.getHours();
                                  
                                  // For "Once daily" medications, only show in their specific time slot
                                  if (med.frequency === 'Once daily') {
                                    if (index === 0 && hour >= 6 && hour < 12) belongsInSlot = true;
                                    else if (index === 1 && hour >= 12 && hour < 18) belongsInSlot = true;
                                    else if (index === 2 && hour >= 18 && hour < 24) belongsInSlot = true;
                                    else if (index === 3 && hour >= 0 && hour < 6) belongsInSlot = true;
                                  } else {
                                    // For other frequencies, check if they belong in this time slot
                                    if (index === 0 && hour >= 6 && hour < 12) belongsInSlot = true;
                                    if (index === 1 && hour >= 12 && hour < 18) belongsInSlot = true;
                                    if (index === 2 && hour >= 18 && hour < 24) belongsInSlot = true;
                                    if (index === 3 && hour >= 0 && hour < 6) belongsInSlot = true;
                                  }
                                  
                                  // For medications with multiple daily doses
                                  if (med.frequency.includes('daily') || 
                                      med.frequency.includes('BID') || 
                                      med.frequency.includes('TID') || 
                                      med.frequency.includes('QID')) {
                                    
                                    if (med.frequency.includes('morning') && index === 0) belongsInSlot = true;
                                    if (med.frequency.includes('afternoon') && index === 1) belongsInSlot = true;
                                    if (med.frequency.includes('evening') && index === 2) belongsInSlot = true;
                                    if (med.frequency.includes('night') || med.frequency.includes('bedtime') && index === 3) belongsInSlot = true;
                                  }
                                  
                                  // PRN medications show in all slots
                                  if (med.category === 'prn') belongsInSlot = true;
                                  
                                  // Continuous medications show in all slots
                                  if (med.category === 'continuous') belongsInSlot = true;
                                  
                                } catch (e) {
                                  // If date parsing fails, show in all slots
                                  belongsInSlot = true;
                                }
                                
                                if (!belongsInSlot) return null;
                                
                                // Determine color based on category
                                let bgColor = 'bg-blue-100 text-blue-800';
                                if (med.category === 'prn') bgColor = 'bg-green-100 text-green-800';
                                if (med.category === 'continuous') bgColor = 'bg-purple-100 text-purple-800';
                                
                                return (
                                  <div 
                                    key={med.id} 
                                    className={`px-3 py-2 ${bgColor} rounded-lg text-sm flex items-center space-x-2 cursor-pointer hover:opacity-80`}
                                    onClick={() => handleAdminister(med)}
                                  >
                                    <span>{med.name} {med.dosage}</span>
                                    <span className="text-xs opacity-75">
                                      {safeFormatDate(med.next_due, 'HH:mm')}
                                    </span>
                                  </div>
                                );
                              })
                              .filter(Boolean)}
                            
                            {medications.filter(med => {
                              try {
                                const nextDue = new Date(med.next_due);
                                // Skip if medication is not active
                                if (med.status !== 'Active') return false;
                                
                                const hour = nextDue.getHours();
                                
                                // For "Once daily" medications, only count them in their specific time slot
                                if (med.frequency === 'Once daily') {
                                  if (index === 0 && hour >= 6 && hour < 12) return true;
                                  else if (index === 1 && hour >= 12 && hour < 18) return true;
                                  else if (index === 2 && hour >= 18 && hour < 24) return true;
                                  else if (index === 3 && hour >= 0 && hour < 6) return true;
                                  return false;
                                } else {
                                  // For other frequencies, check if they belong in this time slot
                                  if (index === 0 && hour >= 6 && hour < 12) return true;
                                  if (index === 1 && hour >= 12 && hour < 18) return true;
                                  if (index === 2 && hour >= 18 && hour < 24) return true;
                                  if (index === 3 && hour >= 0 && hour < 6) return true;
                                }
                                return false;
                              } catch (e) {
                                return false;
                              }
                            }).length === 0 && (
                              <p className="text-sm text-gray-500">No medications scheduled for this time period</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-center space-x-6 pt-4 border-t border-gray-200">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-100 rounded-full"></div>
                        <span className="text-sm text-gray-600">Scheduled</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-100 rounded-full"></div>
                        <span className="text-sm text-gray-600">PRN</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-purple-100 rounded-full"></div>
                        <span className="text-sm text-gray-600">Continuous</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Medication Administration Record */}
              <MedicationAdministration 
                patientId={patient.id}
                patientName={`${patient.first_name} ${patient.last_name}`}
                medications={medications}
                onRefresh={fetchPatientData}
              />
            </div>
          </div>
        )}


        {activeTab === 'notes' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Patient Notes</h2>
              <button
                onClick={() => setShowNoteForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add Note</span>
              </button>
            </div>

            {notes.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No notes recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {notes.map((note, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          note.type === 'Assessment' ? 'bg-blue-100 text-blue-800' :
                          note.type === 'Treatment' ? 'bg-green-100 text-green-800' :
                          note.type === 'Observation' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {note.type}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          note.priority === 'High' ? 'bg-red-100 text-red-800' :
                          note.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {note.priority} Priority
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {safeFormatDate(note.createdAt || note.created_at, 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-gray-900 mb-3">{note.content}</p>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <UserCheck className="w-4 h-4" />
                      <span>By: {note.nurseName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'assessments' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Patient Assessments</h2>
              <button
                onClick={() => setShowAssessmentForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Assessment</span>
              </button>
            </div>

            {assessments.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No assessments completed yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assessments.map((assessment) => (
                  <div 
                    key={assessment.id} 
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => setSelectedAssessment(assessment)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{assessment.type}</h3>
                        <p className="text-gray-600 mt-1">{assessment.summary}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm text-gray-500">
                          {safeFormatDate(assessment.created_at, 'MMM dd, yyyy HH:mm')}
                        </span>
                        <p className="text-sm text-gray-600 mt-1">By: {assessment.nurse_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        assessment.priority === 'High' ? 'bg-red-100 text-red-800' :
                        assessment.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {assessment.priority} Priority
                      </span>
                      <span className="text-sm text-blue-600 hover:text-blue-800">
                        Click to view details →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'admission' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Admission Records</h2>
              <button
                onClick={() => setShowAdmissionForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Records</span>
              </button>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-500">Admission records will be displayed here.</p>
            </div>
          </div>
        )}

        {activeTab === 'directives' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Advanced Directives</h2>
              <button
                onClick={() => setShowAdvancedDirectivesForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Edit className="w-4 h-4" />
                <span>Edit Directives</span>
              </button>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-500">Advanced directives will be displayed here.</p>
            </div>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Patient Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <button
                onClick={() => setShowHospitalBracelet(true)}
                className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
              >
                <QrCode className="w-8 h-8 text-blue-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Hospital Bracelet</h3>
                <p className="text-gray-600 text-sm">Generate patient identification bracelet</p>
              </button>

              <button
                onClick={() => setShowPatientBracelet(true)}
                className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
              >
                <Clipboard className="w-8 h-8 text-green-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Patient Bracelet</h3>
                <p className="text-gray-600 text-sm">Print patient information bracelet</p>
              </button>

              <button
                onClick={() => setShowMedicationBarcode(true)}
                className="p-6 bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow text-left"
              >
                <QrCode className="w-8 h-8 text-purple-600 mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Medication Barcode</h3>
                <p className="text-gray-600 text-sm">Generate medication barcodes</p>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showVitalsEditor && (
        <VitalSignsEditor
          patientId={patient.id}
          onSave={handleVitalsUpdate}
          onCancel={() => setShowVitalsEditor(false)}
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

      {showMedicationAdministration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Medication Administration Record
              </h2>
              <button
                onClick={() => setShowMedicationAdministration(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <MedicationAdministration 
                patientId={patient.id}
                patientName={`${patient.first_name} ${patient.last_name}`}
                medications={medications}
                onRefresh={fetchPatientData}
              />
            </div>
          </div>
        </div>
      )}

      {showNoteForm && (
        <PatientNoteForm
          patientId={patient.id}
          onSave={handleNoteAdd}
          onCancel={() => setShowNoteForm(false)}
        />
      )}

      {showAssessmentForm && (
        <AssessmentForm
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onSave={handleAssessmentAdd}
          onCancel={() => setShowAssessmentForm(false)}
        />
      )}

      {showAdmissionForm && (
        <AdmissionRecordsForm
          patientId={patient.id}
          onSave={() => setShowAdmissionForm(false)}
          onCancel={() => setShowAdmissionForm(false)}
        />
      )}

      {showAdvancedDirectivesForm && (
        <AdvancedDirectivesForm
          patientId={patient.id}
          onSave={() => setShowAdvancedDirectivesForm(false)}
          onCancel={() => setShowAdvancedDirectivesForm(false)}
        />
      )}

      {showVitalsTrends && (
        <VitalsTrends
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onClose={() => setShowVitalsTrends(false)}
        />
      )}

      {showHospitalBracelet && (
        <HospitalBracelet
          patient={patient}
          onClose={() => setShowHospitalBracelet(false)}
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

    </div>
  );
};