import React, { useState } from 'react';
import { Patient } from '../../types';
import { 
  ArrowLeft, Edit, Thermometer, Heart, Activity, 
  Pill, FileText, User, Phone, Calendar, MapPin, 
  AlertTriangle, Clock, Stethoscope, QrCode, Printer,
  TrendingUp, Plus, Save, X, Target, Shield, Users,
  Clipboard, BookOpen, FileCheck, UserCheck, Settings,
  Zap, Award, CheckCircle, AlertCircle, Info, Star
} from 'lucide-react';
import { format, differenceInDays, isValid } from 'date-fns';
import { VitalSignsEditor } from './VitalSignsEditor';
import { VitalsTrends } from './VitalsTrends';
import { PatientBracelet } from './PatientBracelet';
import { HospitalBracelet } from './HospitalBracelet';
import { MedicationBarcode } from './MedicationBarcode';
import { MedicationForm } from './MedicationForm';
import { PatientNoteForm } from './PatientNoteForm';
import { AssessmentForm } from './AssessmentForm';
import { WoundAssessment } from './WoundAssessment';
import { usePatients } from '../../contexts/PatientContext';

interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
}

// Helper function to safely format dates
const safeFormatDate = (dateValue: string | Date | null | undefined, formatString: string): string => {
  if (!dateValue) return 'N/A';
  
  const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
  
  if (!isValid(date)) return 'N/A';
  
  try {
    return format(date, formatString);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return 'Invalid Date';
  }
};

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [showVitalsEditor, setShowVitalsEditor] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [showWoundAssessment, setShowWoundAssessment] = useState(false);
  const [showBracelet, setShowBracelet] = useState(false);
  const [showHospitalBracelet, setShowHospitalBracelet] = useState(false);
  const [showMedicationBarcode, setShowMedicationBarcode] = useState(false);
  
  const { updatePatient } = usePatients();
  
  // Initialize empty arrays if data doesn't exist
  const patientVitals = patient.vitals || [];
  const patientMedications = patient.medications || [];
  const patientNotes = patient.notes || [];
  
  const latestVitals = Array.isArray(patientVitals) && patientVitals.length > 0 
    ? patientVitals.sort((a, b) => {
        const dateA = new Date(a.recorded_at || a.lastUpdated || 0);
        const dateB = new Date(b.recorded_at || b.lastUpdated || 0);
        return dateB.getTime() - dateA.getTime();
      })[0]
    : null;

  const activeMedications = patientMedications.filter(m => m.status === 'Active');
  const dueMedications = activeMedications.filter(m => 
    new Date(m.next_due) <= new Date()
  );

  const recentNotes = patientNotes
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5);

  const admissionDays = differenceInDays(new Date(), new Date(patient.admission_date));

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    { id: 'vitals', label: 'Vital Signs', icon: Heart },
    { id: 'medications', label: 'Medications', icon: Pill },
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'assessments', label: 'Assessments', icon: Clipboard },
    { id: 'tools', label: 'Tools', icon: Settings }
  ];

  const handleSave = async (updatedPatient: Partial<Patient>) => {
    await updatePatient(patient.id, updatedPatient);
    setIsEditing(false);
  };

  const handleVitalsSave = () => {
    setShowVitalsEditor(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Patient Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <User className="w-5 h-5 mr-2 text-blue-600" />
                  Patient Information
                </h3>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  {isEditing ? 'Cancel' : 'Edit'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Patient ID</label>
                    <p className="text-sm text-gray-900 font-mono bg-gray-50 px-2 py-1 rounded">
                      {patient.patient_id}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Full Name</label>
                    <p className="text-sm text-gray-900">{patient.first_name} {patient.last_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                    <p className="text-sm text-gray-900">
                      {safeFormatDate(patient.date_of_birth, 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Gender</label>
                    <p className="text-sm text-gray-900">{patient.gender}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Room & Bed</label>
                    <p className="text-sm text-gray-900 flex items-center">
                      <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                      Room {patient.room_number}, Bed {patient.bed_number}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Admission Date</label>
                    <p className="text-sm text-gray-900 flex items-center">
                      <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                      {safeFormatDate(patient.admission_date, 'MMM dd, yyyy')} 
                      <span className="ml-2 text-xs text-gray-500">({admissionDays} days)</span>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Blood Type</label>
                    <p className="text-sm text-gray-900 font-semibold text-red-600">{patient.blood_type}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Assigned Nurse</label>
                    <p className="text-sm text-gray-900 flex items-center">
                      <UserCheck className="w-4 h-4 mr-1 text-gray-400" />
                      {patient.assigned_nurse}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Primary Diagnosis</label>
                    <p className="text-sm text-gray-900">{patient.diagnosis}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Current Condition</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      patient.condition === 'Stable' ? 'bg-green-100 text-green-800' :
                      patient.condition === 'Critical' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {patient.condition}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Allergies</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {patient.allergies && patient.allergies.length > 0 ? (
                        patient.allergies.map((allergy, index) => (
                          <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {allergy}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">No known allergies</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                  Emergency Contact
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500">Name</label>
                    <p className="text-sm text-gray-900">{patient.emergency_contact_name}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Relationship</label>
                    <p className="text-sm text-gray-900">{patient.emergency_contact_relationship}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">Phone</label>
                    <p className="text-sm text-gray-900 font-mono">{patient.emergency_contact_phone}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Heart className="w-8 h-8 text-red-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Latest Vitals</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {latestVitals ? safeFormatDate(latestVitals.recorded_at || latestVitals.lastUpdated, 'HH:mm') : 'No data'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Pill className="w-8 h-8 text-blue-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Active Medications</p>
                    <p className="text-lg font-semibold text-gray-900">{activeMedications.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Clock className="w-8 h-8 text-orange-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Due Medications</p>
                    <p className="text-lg font-semibold text-gray-900">{dueMedications.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FileText className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Recent Notes</p>
                    <p className="text-lg font-semibold text-gray-900">{recentNotes.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Latest Vitals */}
            {latestVitals && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Thermometer className="w-5 h-5 mr-2 text-red-600" />
                  Latest Vital Signs
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Temperature</p>
                    <p className="text-lg font-semibold text-gray-900">{latestVitals.temperature}°F</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Blood Pressure</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {latestVitals.blood_pressure_systolic}/{latestVitals.blood_pressure_diastolic}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Heart Rate</p>
                    <p className="text-lg font-semibold text-gray-900">{latestVitals.heart_rate} bpm</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Respiratory Rate</p>
                    <p className="text-lg font-semibold text-gray-900">{latestVitals.respiratory_rate} /min</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">O2 Saturation</p>
                    <p className="text-lg font-semibold text-gray-900">{latestVitals.oxygen_saturation}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Recorded</p>
                    <p className="text-sm text-gray-600">
                      {safeFormatDate(latestVitals.recorded_at || latestVitals.lastUpdated, 'MMM dd, HH:mm')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Due Medications */}
            {dueMedications.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-orange-600" />
                  Medications Due Now
                </h3>
                <div className="space-y-3">
                  {dueMedications.map((medication) => (
                    <div key={medication.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <div>
                        <p className="font-medium text-gray-900">{medication.name}</p>
                        <p className="text-sm text-gray-600">{medication.dosage} - {medication.route}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-orange-600">
                          Due: {safeFormatDate(medication.next_due, 'HH:mm')}
                        </p>
                        <p className="text-xs text-gray-500">{medication.frequency}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Notes */}
            {recentNotes.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-green-600" />
                  Recent Notes
                </h3>
                <div className="space-y-3">
                  {recentNotes.map((note) => (
                    <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          note.priority === 'High' ? 'bg-red-100 text-red-800' :
                          note.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {note.priority}
                        </span>
                        <span className="text-xs text-gray-500">
                          {safeFormatDate(note.created_at, 'MMM dd, HH:mm')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mb-1">{note.content}</p>
                      <p className="text-xs text-gray-500">by {note.nurse_name} • {note.type}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'vitals':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Vital Signs</h3>
              <button
                onClick={() => setShowVitalsEditor(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Record Vitals
              </button>
            </div>
            <VitalsTrends vitals={patientVitals} />
          </div>
        );

      case 'medications':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Medications</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowMedicationBarcode(true)}
                  className="flex items-center px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Barcode
                </button>
                <button
                  onClick={() => setShowMedicationForm(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Medication
                </button>
              </div>
            </div>

            <div className="grid gap-4">
              {patientMedications.map((medication) => (
                <div key={medication.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{medication.name}</h4>
                      <p className="text-sm text-gray-600">{medication.dosage} - {medication.route}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      medication.status === 'Active' ? 'bg-green-100 text-green-800' :
                      medication.status === 'Discontinued' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {medication.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <label className="font-medium text-gray-500">Frequency</label>
                      <p className="text-gray-900">{medication.frequency}</p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-500">Prescribed By</label>
                      <p className="text-gray-900">{medication.prescribed_by}</p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-500">Start Date</label>
                      <p className="text-gray-900">{safeFormatDate(medication.start_date, 'MMM dd, yyyy')}</p>
                    </div>
                    <div>
                      <label className="font-medium text-gray-500">Next Due</label>
                      <p className={`font-medium ${
                        new Date(medication.next_due) <= new Date() ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {safeFormatDate(medication.next_due, 'MMM dd, HH:mm')}
                      </p>
                    </div>
                  </div>

                  {medication.last_administered && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        Last administered: {safeFormatDate(medication.last_administered, 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
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
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Note
              </button>
            </div>

            <div className="space-y-4">
              {patientNotes.map((note) => (
                <div key={note.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        note.priority === 'High' ? 'bg-red-100 text-red-800' :
                        note.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {note.priority}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{note.type}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {safeFormatDate(note.created_at, 'MMM dd, yyyy HH:mm')}
                    </span>
                  </div>
                  <p className="text-gray-900 mb-3">{note.content}</p>
                  <p className="text-sm text-gray-500">by {note.nurse_name}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'assessments':
        return (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Patient Assessments</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowWoundAssessment(true)}
                  className="flex items-center px-3 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <Target className="w-4 h-4 mr-2" />
                  Wound Assessment
                </button>
                <button
                  onClick={() => setShowAssessmentForm(true)}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Assessment
                </button>
              </div>
            </div>

            <div className="grid gap-6">
              {/* Assessment Categories */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <Heart className="w-6 h-6 text-red-500 mr-3" />
                    <h4 className="text-lg font-semibold text-gray-900">Cardiovascular</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Heart Rate:</span>
                      <span className="font-medium">{latestVitals?.heart_rate || 'N/A'} bpm</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Blood Pressure:</span>
                      <span className="font-medium">
                        {latestVitals ? `${latestVitals.blood_pressure_systolic}/${latestVitals.blood_pressure_diastolic}` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rhythm:</span>
                      <span className="font-medium text-green-600">Regular</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <Activity className="w-6 h-6 text-blue-500 mr-3" />
                    <h4 className="text-lg font-semibold text-gray-900">Respiratory</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rate:</span>
                      <span className="font-medium">{latestVitals?.respiratory_rate || 'N/A'} /min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">O2 Saturation:</span>
                      <span className="font-medium">{latestVitals?.oxygen_saturation || 'N/A'}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Effort:</span>
                      <span className="font-medium text-green-600">Normal</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <Users className="w-6 h-6 text-purple-500 mr-3" />
                    <h4 className="text-lg font-semibold text-gray-900">Neurological</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Consciousness:</span>
                      <span className="font-medium text-green-600">Alert</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Orientation:</span>
                      <span className="font-medium text-green-600">x3</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Pupils:</span>
                      <span className="font-medium text-green-600">PERRL</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pain Assessment */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 text-orange-500 mr-2" />
                  Pain Assessment
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Pain Scale (0-10)</label>
                    <div className="flex items-center mt-1">
                      <span className="text-2xl font-bold text-orange-600">3</span>
                      <span className="ml-2 text-sm text-gray-600">/10</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Location</label>
                    <p className="text-sm text-gray-900 mt-1">Lower back</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Quality</label>
                    <p className="text-sm text-gray-900 mt-1">Dull, aching</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Last Assessment</label>
                    <p className="text-sm text-gray-600 mt-1">2 hours ago</p>
                  </div>
                </div>
              </div>

              {/* Mobility Assessment */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Zap className="w-5 h-5 text-green-500 mr-2" />
                  Mobility & Safety
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Fall Risk</label>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                      Moderate
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Mobility Level</label>
                    <p className="text-sm text-gray-900 mt-1">Ambulatory with assistance</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Assistive Devices</label>
                    <p className="text-sm text-gray-900 mt-1">Walker</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'tools':
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Patient Care Tools</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Patient Bracelet */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <QrCode className="w-6 h-6 text-blue-500 mr-3" />
                  <h4 className="text-lg font-semibold text-gray-900">Patient Bracelet</h4>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Generate and print patient identification bracelet with QR code
                </p>
                <button
                  onClick={() => setShowBracelet(true)}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Generate Bracelet
                </button>
              </div>

              {/* Hospital Bracelet */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <Shield className="w-6 h-6 text-green-500 mr-3" />
                  <h4 className="text-lg font-semibold text-gray-900">Hospital Bracelet</h4>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Official hospital identification bracelet with security features
                </p>
                <button
                  onClick={() => setShowHospitalBracelet(true)}
                  className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  Generate Hospital Bracelet
                </button>
              </div>

              {/* Medication Barcode */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <Pill className="w-6 h-6 text-purple-500 mr-3" />
                  <h4 className="text-lg font-semibold text-gray-900">Medication Barcode</h4>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Generate barcodes for medication administration tracking
                </p>
                <button
                  onClick={() => setShowMedicationBarcode(true)}
                  className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <QrCode className="w-4 h-4 mr-2" />
                  Generate Barcode
                </button>
              </div>

              {/* Vital Signs Trends */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <TrendingUp className="w-6 h-6 text-orange-500 mr-3" />
                  <h4 className="text-lg font-semibold text-gray-900">Vitals Trends</h4>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  View detailed trends and analytics for vital signs
                </p>
                <button
                  onClick={() => setActiveTab('vitals')}
                  className="w-full flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View Trends
                </button>
              </div>

              {/* Assessment Tools */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <Clipboard className="w-6 h-6 text-red-500 mr-3" />
                  <h4 className="text-lg font-semibold text-gray-900">Assessment Tools</h4>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Access specialized assessment forms and checklists
                </p>
                <button
                  onClick={() => setActiveTab('assessments')}
                  className="w-full flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Clipboard className="w-4 h-4 mr-2" />
                  Open Assessments
                </button>
              </div>

              {/* Documentation */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center mb-4">
                  <BookOpen className="w-6 h-6 text-indigo-500 mr-3" />
                  <h4 className="text-lg font-semibold text-gray-900">Documentation</h4>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Access care plans, protocols, and documentation templates
                </p>
                <button className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  <BookOpen className="w-4 h-4 mr-2" />
                  View Documentation
                </button>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={onBack}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Patients
              </button>
              <div className="ml-6">
                <h1 className="text-xl font-semibold text-gray-900">
                  {patient.first_name} {patient.last_name}
                </h1>
                <p className="text-sm text-gray-500">
                  Patient ID: {patient.patient_id} • Room {patient.room_number}, Bed {patient.bed_number}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                patient.condition === 'Stable' ? 'bg-green-100 text-green-800' :
                patient.condition === 'Critical' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {patient.condition}
              </span>
              
              {patient.allergies && patient.allergies.length > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  Allergies
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
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
                  <Icon className="w-5 h-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderTabContent()}
      </div>

      {/* Modals */}
      {showVitalsEditor && (
        <VitalSignsEditor
          patientId={patient.id}
          vitals={latestVitals || undefined}
          onClose={() => setShowVitalsEditor(false)}
          onSave={handleVitalsSave}
        />
      )}

      {showMedicationForm && (
        <MedicationForm
          patientId={patient.id}
          onClose={() => setShowMedicationForm(false)}
        />
      )}

      {showNoteForm && (
        <PatientNoteForm
          patientId={patient.id}
          onClose={() => setShowNoteForm(false)}
        />
      )}

      {showAssessmentForm && (
        <AssessmentForm
          patientId={patient.id}
          onClose={() => setShowAssessmentForm(false)}
        />
      )}

      {showWoundAssessment && (
        <WoundAssessment
          patientId={patient.id}
          onClose={() => setShowWoundAssessment(false)}
        />
      )}

      {showBracelet && (
        <PatientBracelet
          patient={patient}
          onClose={() => setShowBracelet(false)}
        />
      )}

      {showHospitalBracelet && (
        <HospitalBracelet
          patient={patient}
          onClose={() => setShowHospitalBracelet(false)}
        />
      )}

      {showMedicationBarcode && (
        <MedicationBarcode
          medications={activeMedications}
          patient={patient}
          onClose={() => setShowMedicationBarcode(false)}
        />
      )}
    </div>
  );
};