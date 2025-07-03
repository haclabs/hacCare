import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  User, 
  Calendar, 
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
  Trash2
} from 'lucide-react';
import { Patient } from '../../types';
import { VitalSignsEditor } from './VitalSignsEditor';
import { MedicationForm } from './MedicationForm';
import { PatientNoteForm } from './PatientNoteForm';
import { AssessmentForm } from './AssessmentForm';
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

interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
}

interface PatientVitals {
  id: string;
  temperature: number;
  blood_pressure_systolic: number;
  blood_pressure_diastolic: number;
  heart_rate: number;
  respiratory_rate: number;
  oxygen_saturation: number;
  recorded_at: string;
}

interface PatientMedication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route: string;
  start_date: string;
  end_date?: string;
  prescribed_by: string;
  last_administered?: string;
  next_due: string;
  status: string;
}

interface PatientNote {
  id: string;
  nurse_name: string;
  type: string;
  content: string;
  priority: string;
  created_at: string;
}

interface AdmissionRecord {
  id: string;
  admission_type: string;
  attending_physician: string;
  insurance_provider: string;
  insurance_policy: string;
  admission_source: string;
  chief_complaint: string;
  height: string;
  weight: string;
  bmi: string;
  smoking_status: string;
  alcohol_use: string;
  exercise: string;
  occupation: string;
  family_history: string;
  marital_status: string;
  secondary_contact_name: string;
  secondary_contact_relationship: string;
  secondary_contact_phone: string;
  secondary_contact_address: string;
}

interface AdvancedDirective {
  id: string;
  living_will_status: string;
  living_will_date?: string;
  healthcare_proxy_name?: string;
  healthcare_proxy_phone?: string;
  dnr_status: string;
  organ_donation_status: string;
  organ_donation_details?: string;
  religious_preference?: string;
  special_instructions?: string;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [vitals, setVitals] = useState<PatientVitals[]>([]);
  const [medications, setMedications] = useState<PatientMedication[]>([]);
  const [notes, setNotes] = useState<PatientNote[]>([]);
  const [assessments, setAssessments] = useState<PatientAssessment[]>([]);
  const [admissionRecord, setAdmissionRecord] = useState<AdmissionRecord | null>(null);
  const [advancedDirective, setAdvancedDirective] = useState<AdvancedDirective | null>(null);
  const [showVitalsEditor, setShowVitalsEditor] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [showAdvancedDirectivesForm, setShowAdvancedDirectivesForm] = useState(false);
  const [showHospitalBracelet, setShowHospitalBracelet] = useState(false);
  const [showPatientBracelet, setShowPatientBracelet] = useState(false);
  const [showMedicationBarcode, setShowMedicationBarcode] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<PatientMedication | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearingVitals, setClearingVitals] = useState(false);
  const { hasRole } = useAuth();

  useEffect(() => {
    fetchPatientData();
  }, [patient.id]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      
      // Fetch vitals
      const { data: vitalsData } = await supabase
        .from('patient_vitals')
        .select('*')
        .eq('patient_id', patient.id)
        .order('recorded_at', { ascending: false });
      
      if (vitalsData) setVitals(vitalsData);

      // Fetch medications
      const { data: medicationsData } = await supabase
        .from('patient_medications')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });
      
      if (medicationsData) setMedications(medicationsData);

      // Fetch notes
      const { data: notesData } = await supabase
        .from('patient_notes')
        .select('*')
        .eq('patient_id', patient.id)
        .order('created_at', { ascending: false });
      
      if (notesData) setNotes(notesData);

      // Fetch assessments
      try {
        const assessmentsData = await fetchPatientAssessments(patient.id);
        setAssessments(assessmentsData);
      } catch (error) {
        console.error('Error fetching assessments:', error);
        setAssessments([]);
      }

      // Fetch admission record - use maybeSingle() to handle cases where no record exists
      const { data: admissionData } = await supabase
        .from('patient_admission_records')
        .select('*')
        .eq('patient_id', patient.id)
        .maybeSingle();
      
      if (admissionData) setAdmissionRecord(admissionData);

      // Fetch advanced directives - use maybeSingle() to handle cases where no record exists
      const { data: directivesData } = await supabase
        .from('patient_advanced_directives')
        .select('*')
        .eq('patient_id', patient.id)
        .maybeSingle();
      
      if (directivesData) setAdvancedDirective(directivesData);

    } catch (error) {
      console.error('Error fetching patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVitalsSubmit = async (vitalsData: any) => {
    try {
      await updatePatientVitals(patient.id, vitalsData);
      setShowVitalsEditor(false);
      fetchPatientData();
    } catch (error) {
      console.error('Error saving vitals:', error);
    }
  };

  const handleClearVitals = async () => {
    if (!hasRole('super_admin')) {
      alert('Only super administrators can clear vital records.');
      return;
    }

    if (!confirm('Are you sure you want to clear ALL vital records for this patient? This action cannot be undone.')) {
      return;
    }

    try {
      setClearingVitals(true);
      await clearPatientVitals(patient.id);
      setVitals([]);
      alert('All vital records have been cleared successfully.');
    } catch (error) {
      console.error('Error clearing vitals:', error);
      alert('Failed to clear vital records. Please try again.');
    } finally {
      setClearingVitals(false);
    }
  };

  const handleMedicationSubmit = async (medicationData: any) => {
    try {
      const { error } = await supabase
        .from('patient_medications')
        .insert({
          patient_id: patient.id,
          ...medicationData
        });

      if (error) throw error;
      
      setShowMedicationForm(false);
      fetchPatientData();
    } catch (error) {
      console.error('Error saving medication:', error);
    }
  };

  const handleNoteSubmit = async (noteData: any) => {
    try {
      const { error } = await supabase
        .from('patient_notes')
        .insert({
          patient_id: patient.id,
          ...noteData
        });

      if (error) throw error;
      
      setShowNoteForm(false);
      fetchPatientData();
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleAssessmentSubmit = async (assessmentData: PatientAssessment) => {
    try {
      console.log('Assessment submitted successfully:', assessmentData);
      setShowAssessmentForm(false);
      fetchPatientData(); // Refresh to show the new assessment
    } catch (error) {
      console.error('Error handling assessment submission:', error);
    }
  };

  const handleAdmissionSubmit = async (admissionData: any) => {
    try {
      if (admissionRecord) {
        const { error } = await supabase
          .from('patient_admission_records')
          .update(admissionData)
          .eq('patient_id', patient.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('patient_admission_records')
          .insert({
            patient_id: patient.id,
            ...admissionData
          });
        
        if (error) throw error;
      }
      
      setShowAdmissionForm(false);
      fetchPatientData();
    } catch (error) {
      console.error('Error saving admission record:', error);
    }
  };

  const handleAdvancedDirectivesSubmit = async (directivesData: any) => {
    try {
      if (advancedDirective) {
        const { error } = await supabase
          .from('patient_advanced_directives')
          .update(directivesData)
          .eq('patient_id', patient.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('patient_advanced_directives')
          .insert({
            patient_id: patient.id,
            ...directivesData
          });
        
        if (error) throw error;
      }
      
      setShowAdvancedDirectivesForm(false);
      fetchPatientData();
    } catch (error) {
      console.error('Error saving advanced directives:', error);
    }
  };

  const latestVitals = vitals[0];
  const activeMedications = medications.filter(med => med.status === 'Active');
  const recentNotes = notes.slice(0, 5);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'vitals', label: 'Vital Trends', icon: TrendingUp },
    { id: 'medications', label: 'Medications', icon: Pill },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'assessments', label: 'Assessments', icon: ClipboardList },
    { id: 'tools', label: 'Tools', icon: Settings }
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="mr-4 p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {patient.first_name} {patient.last_name}
                </h1>
                <p className="text-sm text-gray-500">Patient ID: {patient.patient_id}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Active
              </span>
              <span className="text-sm text-gray-500">
                Room {patient.room_number}, Bed {patient.bed_number}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
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
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Patient Information */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Patient Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {patient.first_name} {patient.last_name}
                      </p>
                      <p className="text-sm text-gray-500">Patient</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {new Date(patient.date_of_birth).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Room {patient.room_number}, Bed {patient.bed_number}
                      </p>
                      <p className="text-sm text-gray-500">Location</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {patient.emergency_contact_phone}
                      </p>
                      <p className="text-sm text-gray-500">Emergency Contact</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Latest Vitals with Colored Boxes */}
              {latestVitals && (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-gray-900">Latest Vital Signs</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setShowVitalsEditor(true)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Record Vitals
                      </button>
                      
                      {hasRole('super_admin') && (
                        <button
                          onClick={handleClearVitals}
                          disabled={clearingVitals || vitals.length === 0}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {clearingVitals ? 'Clearing...' : 'Clear Vitals'}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Temperature */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <Thermometer className="h-5 w-5 text-blue-600" />
                        <span className="text-xs text-blue-600 font-medium">TEMP</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-900">{latestVitals.temperature}°C</div>
                      <div className="text-xs text-blue-700">Temperature</div>
                    </div>

                    {/* Blood Pressure */}
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <div className="flex items-center justify-between mb-2">
                        <Heart className="h-5 w-5 text-red-600" />
                        <span className="text-xs text-red-600 font-medium">BP</span>
                      </div>
                      <div className="text-2xl font-bold text-red-900">
                        {latestVitals.blood_pressure_systolic}/{latestVitals.blood_pressure_diastolic}
                      </div>
                      <div className="text-xs text-red-700">Blood Pressure</div>
                    </div>

                    {/* Heart Rate */}
                    <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <Activity className="h-5 w-5 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">HR</span>
                      </div>
                      <div className="text-2xl font-bold text-green-900">{latestVitals.heart_rate}</div>
                      <div className="text-xs text-green-700">Heart Rate (BPM)</div>
                    </div>

                    {/* Respiratory Rate */}
                    <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <Activity className="h-5 w-5 text-purple-600" />
                        <span className="text-xs text-purple-600 font-medium">RR</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-900">{latestVitals.respiratory_rate}</div>
                      <div className="text-xs text-purple-700">Respiratory Rate</div>
                    </div>

                    {/* Oxygen Saturation */}
                    <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                      <div className="flex items-center justify-between mb-2">
                        <Droplets className="h-5 w-5 text-indigo-600" />
                        <span className="text-xs text-indigo-600 font-medium">O2</span>
                      </div>
                      <div className="text-2xl font-bold text-indigo-900">{latestVitals.oxygen_saturation}%</div>
                      <div className="text-xs text-indigo-700">O2 Saturation</div>
                    </div>

                    {/* Recorded Time */}
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <Clock className="h-5 w-5 text-gray-600" />
                        <span className="text-xs text-gray-600 font-medium">TIME</span>
                      </div>
                      <div className="text-lg font-bold text-gray-900">
                        {new Date(latestVitals.recorded_at).toLocaleTimeString()}
                      </div>
                      <div className="text-xs text-gray-700">Last Recorded</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Notes */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Recent Notes</h3>
                  <button
                    onClick={() => setShowNoteForm(true)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Note
                  </button>
                </div>
                <div className="space-y-4">
                  {recentNotes.map((note) => (
                    <div key={note.id} className="border-l-4 border-blue-400 pl-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{note.type}</p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          note.priority === 'High' ? 'bg-red-100 text-red-800' :
                          note.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {note.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{note.content}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        By {note.nurse_name} • {new Date(note.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {recentNotes.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No notes available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Active Medications */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Active Medications</h3>
                  <button
                    onClick={() => setShowMedicationForm(true)}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </button>
                </div>
                <div className="space-y-3">
                  {activeMedications.map((medication) => (
                    <div key={medication.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{medication.name}</p>
                        <Pill className="h-4 w-4 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-600">{medication.dosage} - {medication.frequency}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Next due: {new Date(medication.next_due).toLocaleString()}
                      </p>
                    </div>
                  ))}
                  {activeMedications.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">No active medications</p>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setShowAssessmentForm(true)}
                    className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <ClipboardList className="h-4 w-4 mr-3" />
                    New Assessment
                  </button>
                  <button
                    onClick={() => setShowAdmissionForm(true)}
                    className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <Building className="h-4 w-4 mr-3" />
                    {admissionRecord ? 'Edit' : 'Add'} Admission Record
                  </button>
                  <button
                    onClick={() => setShowAdvancedDirectivesForm(true)}
                    className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <Shield className="h-4 w-4 mr-3" />
                    {advancedDirective ? 'Edit' : 'Add'} Advanced Directives
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vitals' && (
          <VitalsTrends 
            vitals={vitals}
          />
        )}

        {activeTab === 'medications' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Medications</h3>
                <button
                  onClick={() => setShowMedicationForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Medication
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {medications.map((medication) => (
                  <div key={medication.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{medication.name}</h4>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          medication.status === 'Active' ? 'bg-green-100 text-green-800' :
                          medication.status === 'Discontinued' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {medication.status}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedMedication(medication);
                            setShowMedicationBarcode(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded"
                          title="Generate Barcode"
                        >
                          <QrCode className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Dosage</p>
                        <p className="font-medium">{medication.dosage}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Frequency</p>
                        <p className="font-medium">{medication.frequency}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Route</p>
                        <p className="font-medium">{medication.route}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Prescribed By</p>
                        <p className="font-medium">{medication.prescribed_by}</p>
                      </div>
                    </div>
                    {medication.next_due && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-md">
                        <p className="text-sm text-blue-800">
                          <Clock className="h-4 w-4 inline mr-1" />
                          Next due: {new Date(medication.next_due).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                {medications.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No medications recorded</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Patient Notes</h3>
                <button
                  onClick={() => setShowNoteForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {notes.map((note) => (
                  <div key={note.id} className="border-l-4 border-blue-400 pl-6 py-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-lg font-medium text-gray-900">{note.type}</h4>
                        
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          note.priority === 'High' ? 'bg-red-100 text-red-800' :
                          note.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {note.priority}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {new Date(note.created_at).toLocaleString()}
                      </p>
                    </div>
                    <p className="text-gray-700 mb-3">{note.content}</p>
                    <p className="text-sm text-gray-500">
                      <UserCheck className="h-4 w-4 inline mr-1" />
                      {note.nurse_name}
                    </p>
                  </div>
                ))}
                {notes.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No notes recorded</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assessments' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Patient Assessments</h3>
                <button
                  onClick={() => setShowAssessmentForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Assessment
                </button>
              </div>
            </div>
            <div className="p-6">
              {assessments.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No assessments recorded</p>
                  <p className="text-sm text-gray-400 mt-2">Click "New Assessment" to begin</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {assessments.map((assessment) => (
                    <div key={assessment.id} className="border rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg ${
                            assessment.assessment_type === 'physical' ? 'bg-blue-100' :
                            assessment.assessment_type === 'pain' ? 'bg-red-100' :
                            'bg-purple-100'
                          }`}>
                            {assessment.assessment_type === 'physical' && <Stethoscope className="h-5 w-5 text-blue-600" />}
                            {assessment.assessment_type === 'pain' && <Heart className="h-5 w-5 text-red-600" />}
                            {assessment.assessment_type === 'neurological' && <Brain className="h-5 w-5 text-purple-600" />}
                          </div>
                          <div>
                            <h4 className="text-lg font-medium text-gray-900 capitalize">
                              {assessment.assessment_type} Assessment
                            </h4>
                            <p className="text-sm text-gray-500">
                              By {assessment.nurse_name} • {new Date(assessment.assessment_date).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          assessment.priority_level === 'critical' ? 'bg-red-100 text-red-800' :
                          assessment.priority_level === 'urgent' ? 'bg-orange-100 text-orange-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {assessment.priority_level}
                        </span>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <h5 className="text-sm font-medium text-gray-900 mb-1">Assessment Notes</h5>
                          <p className="text-sm text-gray-700">{assessment.assessment_notes}</p>
                        </div>
                        
                        {assessment.recommendations && (
                          <div>
                            <h5 className="text-sm font-medium text-gray-900 mb-1">Recommendations</h5>
                            <p className="text-sm text-gray-700">{assessment.recommendations}</p>
                          </div>
                        )}
                        
                        {assessment.follow_up_required && (
                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-sm text-yellow-800 font-medium">
                              <AlertTriangle className="h-4 w-4 inline mr-1" />
                              Follow-up assessment required
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Patient Care Tools</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Patient Bracelet */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <QrCode className="h-8 w-8 text-blue-600 mr-3" />
                  <h3 className="text-lg font-medium text-gray-900">Patient Bracelet</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Generate and print patient identification bracelet with QR code
                </p>
                <button
                  onClick={() => setShowPatientBracelet(true)}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <QrCode className="h-4 w-4" />
                  <span>Generate Bracelet</span>
                </button>
              </div>

              {/* Hospital Bracelet */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <Heart className="h-8 w-8 text-green-600 mr-3" />
                  <h3 className="text-lg font-medium text-gray-900">Hospital Bracelet</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Official hospital identification bracelet with security features
                </p>
                <button
                  onClick={() => setShowHospitalBracelet(true)}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Heart className="h-4 w-4" />
                  <span>Generate Hospital Bracelet</span>
                </button>
              </div>

              {/* Medication Barcode */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <Pill className="h-8 w-8 text-purple-600 mr-3" />
                  <h3 className="text-lg font-medium text-gray-900">Medication Barcode</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Generate barcodes for medication administration tracking
                </p>
                <button
                  onClick={() => {
                    if (activeMedications.length > 0) {
                      setSelectedMedication(activeMedications[0]);
                      setShowMedicationBarcode(true);
                    }
                  }}
                  disabled={activeMedications.length === 0}
                  className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Pill className="h-4 w-4" />
                  <span>Generate Barcode</span>
                </button>
              </div>

              {/* Vitals Trends */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <TrendingUp className="h-8 w-8 text-orange-600 mr-3" />
                  <h3 className="text-lg font-medium text-gray-900">Vitals Trends</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  View detailed trends and analytics for vital signs
                </p>
                <button
                  onClick={() => setActiveTab('vitals')}
                  className="w-full bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <TrendingUp className="h-4 w-4" />
                  <span>View Trends</span>
                </button>
              </div>

              {/* Assessment Tools */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <ClipboardList className="h-8 w-8 text-red-600 mr-3" />
                  <h3 className="text-lg font-medium text-gray-900">Assessment Tools</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Access specialized assessment forms and checklists
                </p>
                <button
                  onClick={() => setActiveTab('assessments')}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>Open Assessments</span>
                </button>
              </div>

              {/* Documentation */}
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center mb-4">
                  <BookOpen className="h-8 w-8 text-blue-600 mr-3" />
                  <h3 className="text-lg font-medium text-gray-900">Documentation</h3>
                </div>
                <p className="text-gray-600 mb-4">
                  Access care plans, protocols, and documentation templates
                </p>
                <button
                  onClick={() => window.open('/documentation', '_blank')}
                  className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <BookOpen className="h-4 w-4" />
                  <span>View Documentation</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showVitalsEditor && (
        <VitalSignsEditor
          patientId={patient.id}
          onSave={handleVitalsSubmit}
          onCancel={() => setShowVitalsEditor(false)}
        />
      )}

      {showMedicationForm && (
        <MedicationForm
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onSave={handleMedicationSubmit}
          onClose={() => setShowMedicationForm(false)}
        />
      )}

      {showNoteForm && (
        <PatientNoteForm
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onSave={handleNoteSubmit}
          onClose={() => setShowNoteForm(false)}
        />
      )}

      {showAssessmentForm && (
        <AssessmentForm
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onSave={handleAssessmentSubmit}
          onClose={() => setShowAssessmentForm(false)}
        />
      )}

      {showAdmissionForm && (
        <AdmissionRecordsForm
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onSave={() => {
            setShowAdmissionForm(false);
            fetchPatientData();
          }}
          onClose={() => setShowAdmissionForm(false)}
        />
      )}

      {showAdvancedDirectivesForm && (
        <AdvancedDirectivesForm
          patientId={patient.id}
          patientName={`${patient.first_name} ${patient.last_name}`}
          onSave={() => {
            setShowAdvancedDirectivesForm(false);
            fetchPatientData();
          }}
          onClose={() => setShowAdvancedDirectivesForm(false)}
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

      {showMedicationBarcode && selectedMedication && (
        <MedicationBarcode
          medication={selectedMedication}
          patientName={`${patient.first_name} ${patient.last_name}`}
          patientId={patient.patient_id}
          onClose={() => {
            setShowMedicationBarcode(false);
            setSelectedMedication(null);
          }}
        />
      )}
    </div>
  );
};