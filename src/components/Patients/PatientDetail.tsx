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
  Building
} from 'lucide-react';
import { Patient } from '../../types';
import { VitalSignsEditor } from './VitalSignsEditor';
import { MedicationForm } from './MedicationForm';
import { PatientNoteForm } from './PatientNoteForm';
import { AssessmentForm } from './AssessmentForm';
import { AdmissionRecordsForm } from './AdmissionRecordsForm';
import { AdvancedDirectivesForm } from './AdvancedDirectivesForm';
import { VitalsTrends } from './VitalsTrends';
import { supabase } from '../../lib/supabase';

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
  const [admissionRecord, setAdmissionRecord] = useState<AdmissionRecord | null>(null);
  const [advancedDirective, setAdvancedDirective] = useState<AdvancedDirective | null>(null);
  const [showVitalsEditor, setShowVitalsEditor] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [showAdvancedDirectivesForm, setShowAdvancedDirectivesForm] = useState(false);
  const [loading, setLoading] = useState(true);

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

      // Fetch admission record
      const { data: admissionData } = await supabase
        .from('patient_admission_records')
        .select('*')
        .eq('patient_id', patient.id)
        .single();
      
      if (admissionData) setAdmissionRecord(admissionData);

      // Fetch advanced directives
      const { data: directivesData } = await supabase
        .from('patient_advanced_directives')
        .select('*')
        .eq('patient_id', patient.id)
        .single();
      
      if (directivesData) setAdvancedDirective(directivesData);

    } catch (error) {
      console.error('Error fetching patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVitalsSubmit = async (vitalsData: any) => {
    try {
      const { error } = await supabase
        .from('patient_vitals')
        .insert({
          patient_id: patient.id,
          ...vitalsData
        });

      if (error) throw error;
      
      setShowVitalsEditor(false);
      fetchPatientData();
    } catch (error) {
      console.error('Error saving vitals:', error);
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
    { id: 'vitals', label: 'Vital Signs', icon: Activity },
    { id: 'medications', label: 'Medications', icon: Pill },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'admission', label: 'Admission', icon: Building },
    { id: 'directives', label: 'Directives', icon: Shield }
  ];

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
                  onClick={() => setActiveTab(tab.id)}
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

              {/* Latest Vitals */}
              {latestVitals && (
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Latest Vital Signs</h3>
                    <button
                      onClick={() => setShowVitalsEditor(true)}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Vitals
                    </button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center">
                      <Thermometer className="h-5 w-5 text-red-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{latestVitals.temperature}°F</p>
                        <p className="text-sm text-gray-500">Temperature</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Heart className="h-5 w-5 text-red-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {latestVitals.blood_pressure_systolic}/{latestVitals.blood_pressure_diastolic}
                        </p>
                        <p className="text-sm text-gray-500">Blood Pressure</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Activity className="h-5 w-5 text-green-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{latestVitals.heart_rate} bpm</p>
                        <p className="text-sm text-gray-500">Heart Rate</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Activity className="h-5 w-5 text-blue-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{latestVitals.respiratory_rate} /min</p>
                        <p className="text-sm text-gray-500">Respiratory Rate</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Droplets className="h-5 w-5 text-blue-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{latestVitals.oxygen_saturation}%</p>
                        <p className="text-sm text-gray-500">O2 Saturation</p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(latestVitals.recorded_at).toLocaleTimeString()}
                        </p>
                        <p className="text-sm text-gray-500">Recorded</p>
                      </div>
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
            patientId={patient.id} 
            onAddVitals={() => setShowVitalsEditor(true)}
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        medication.status === 'Active' ? 'bg-green-100 text-green-800' :
                        medication.status === 'Discontinued' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {medication.status}
                      </span>
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

        {activeTab === 'admission' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Admission Record</h3>
                <button
                  onClick={() => setShowAdmissionForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {admissionRecord ? 'Edit' : 'Add'} Record
                </button>
              </div>
            </div>
            <div className="p-6">
              {admissionRecord ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Admission Details</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Admission Type</p>
                        <p className="font-medium">{admissionRecord.admission_type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Attending Physician</p>
                        <p className="font-medium">{admissionRecord.attending_physician}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Admission Source</p>
                        <p className="font-medium">{admissionRecord.admission_source}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Chief Complaint</p>
                        <p className="font-medium">{admissionRecord.chief_complaint}</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Insurance & Contact</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Insurance Provider</p>
                        <p className="font-medium">{admissionRecord.insurance_provider}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Policy Number</p>
                        <p className="font-medium">{admissionRecord.insurance_policy}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Secondary Contact</p>
                        <p className="font-medium">{admissionRecord.secondary_contact_name}</p>
                        <p className="text-sm text-gray-600">{admissionRecord.secondary_contact_phone}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No admission record found</p>
                  <button
                    onClick={() => setShowAdmissionForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Admission Record
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'directives' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Advanced Directives</h3>
                <button
                  onClick={() => setShowAdvancedDirectivesForm(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  {advancedDirective ? 'Edit' : 'Add'} Directives
                </button>
              </div>
            </div>
            <div className="p-6">
              {advancedDirective ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Legal Documents</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Living Will Status</p>
                        <p className="font-medium">{advancedDirective.living_will_status}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">DNR Status</p>
                        <p className="font-medium">{advancedDirective.dnr_status}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Healthcare Proxy</p>
                        <p className="font-medium">{advancedDirective.healthcare_proxy_name || 'Not specified'}</p>
                        {advancedDirective.healthcare_proxy_phone && (
                          <p className="text-sm text-gray-600">{advancedDirective.healthcare_proxy_phone}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 mb-4">Preferences</h4>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Organ Donation</p>
                        <p className="font-medium">{advancedDirective.organ_donation_status}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Religious Preference</p>
                        <p className="font-medium">{advancedDirective.religious_preference || 'Not specified'}</p>
                      </div>
                      {advancedDirective.special_instructions && (
                        <div>
                          <p className="text-sm text-gray-500">Special Instructions</p>
                          <p className="font-medium">{advancedDirective.special_instructions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No advanced directives found</p>
                  <button
                    onClick={() => setShowAdvancedDirectivesForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Advanced Directives
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showVitalsEditor && (
        <VitalSignsEditor
          onSubmit={handleVitalsSubmit}
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
          onSubmit={handleNoteSubmit}
          onCancel={() => setShowNoteForm(false)}
        />
      )}

      {showAssessmentForm && (
        <AssessmentForm
          patientId={patient.id}
          onSubmit={() => {
            setShowAssessmentForm(false);
            fetchPatientData();
          }}
          onCancel={() => setShowAssessmentForm(false)}
        />
      )}

      {showAdmissionForm && (
        <AdmissionRecordsForm
          patientId={patient.id}
          initialData={admissionRecord}
          onSubmit={handleAdmissionSubmit}
          onCancel={() => setShowAdmissionForm(false)}
        />
      )}

      {showAdvancedDirectivesForm && (
        <AdvancedDirectivesForm
          patientId={patient.id}
          initialData={advancedDirective}
          onSubmit={handleAdvancedDirectivesSubmit}
          onCancel={() => setShowAdvancedDirectivesForm(false)}
        />
      )}
    </div>
  );
};