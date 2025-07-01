Here's the fixed version with all missing closing brackets added:

```typescript
import React, { useState } from 'react';
import { Patient, Medication } from '../../types';
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
  const [medicationForBarcode, setMedicationForBarcode] = useState<Medication | null>(null);
  
  const { updatePatient } = usePatients();
  
  // Initialize empty arrays if data doesn't exist
  const patientVitals = patient.vitals || [];
  const patientMedications = patient.medications || [];
  const patientNotes = patient.notes || [];
  
  // Get the latest vitals from the array
  const latestVitals = patientVitals.length > 0 
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

  const handleMedicationSave = async (medication: Medication) => {
    try {
      // Update the patient's medications array
      const updatedMedications = [...patientMedications];
      const existingIndex = updatedMedications.findIndex(m => m.id === medication.id);
      
      if (existingIndex >= 0) {
        // Update existing medication
        updatedMedications[existingIndex] = medication;
      } else {
        // Add new medication
        updatedMedications.push(medication);
      }

      // Update the patient with new medications
      await updatePatient(patient.id, { medications: updatedMedications });
      
      // Close the medication form
      setShowMedicationForm(false);
      
      // Set the medication for barcode generation and show barcode modal
      setMedicationForBarcode(medication);
      setShowMedicationBarcode(true);
    } catch (error) {
      console.error('Error saving medication:', error);
      throw error;
    }
  };

  const handleMedicationBarcodeClose = () => {
    setShowMedicationBarcode(false);
    setMedicationForBarcode(null);
  };

  const handleShowBarcodeForExisting = () => {
    if (activeMedications.length > 0) {
      setMedicationForBarcode(activeMedications[0]);
      setShowMedicationBarcode(true);
    }
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
                      {latestVitals.bloodPressure?.systolic || latestVitals.blood_pressure_systolic || 'N/A'}/
                      {latestVitals.bloodPressure?.diastolic || latestVitals.blood_pressure_diastolic || 'N/A'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Heart Rate</p>
                    <p className="text-lg font-semibold text-gray-900">{latestVitals.heartRate || latestVitals.heart_rate || 'N/A'} bpm</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">Respiratory Rate</p>
                    <p className="text-lg font-semibold text-gray-900">{latestVitals.respiratoryRate || latestVitals.respiratory_rate || 'N/A'} /min</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-gray-500">O2 Saturation</p>
                    <p className="text-lg font-semibold text-gray-900">{latestVitals.oxygenSaturation || latestVitals.oxygen_saturation || 'N/A'}%</p>
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

            {/* Vital Signs Display */}
            {latestVitals ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <div className="flex items-center justify-between mb-3">
                    <Thermometer className="h-8 w-8 text-blue-600" />
                    <span className="text-2xl font-bold text-blue-900">{latestVitals.temperature}°F</span>
                  </div>
                  <p className="text-blue-700 font-medium">Temperature</p>
                  <p className="text-blue-600 text-sm">Normal range: 97.8-99.1°F</p>
                </div>

                <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                  <div className="flex items-center justify-between mb-3">
                    <Heart className="h-8 w-8 text-red-600" />
                    <span className="text-2xl font-bold text-red-900">{latestVitals.heartRate || latestVitals.heart_rate}</span>
                  </div>
                  <p className="text-red-700 font-medium">Heart Rate (BPM)</p>
                  <p className="text-red-600 text-sm">Normal range: 60-100 BPM</p>
                </div>

                <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                  <div className="flex items-center justify-between mb-3">
                    <Activity className="h-8 w-8 text-purple-600" />
                    <span className="text-2xl font-bold text-purple-900">
                      {latestVitals.bloodPressure?.systolic || latestVitals.blood_pressure_systolic}/
                      {latestVitals.bloodPressure?.diastolic || latestVitals.blood_pressure_diastolic}
                    </span>
                  </div>
                  <p className="text-purple-700 font-medium">Blood Pressure</p>
                  <p className="text-purple-600 text-sm">Normal: <120/80 mmHg</p>
                </div>

                <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                  <div className="flex items-center justify-between mb-3">
                    <Activity className="h-8 w-8 text-green-600" />
                    <span className="text-2xl font-bold text-green-900">{latestVitals.oxygenSaturation || latestVitals.oxygen_saturation}%</span>
                  </div>
                  <p className="text-green-700 font-medium">O2 Saturation</p>
                  <p className="text-green-600 text-sm">Normal range: 95-100%</p>
                </div>

                <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-200">
                  <div className="flex items-center justify-between mb-3">
                    <Activity className="h-8 w-8 text-indigo-600" />
                    <span className="text-2xl font-bold text-indigo-900">{latestVitals.respiratoryRate || latestVitals.respiratory_rate}</span>
                  </div>
                  <p className="text-indigo-700 font-medium">Respiratory Rate</p>
                  <p className="text-indigo-600 text-sm">Normal range: 12-20/min</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <Clock className="h-8 w-8 text-gray-600" />
                    <span className="text-xl font-bold text-gray-900">
                      {safeFormatDate(latestVitals.recorded_at || latestVitals.lastUpdated, 'MMM dd, HH:mm')}
                    </span>
                  </div>
                  <p className="text-gray-700 font-medium">Last Updated</p>
                  <p className="text-gray-600 text-sm">
                    {latestVitals.recorded_at || latestVitals.lastUpdated ? 
                      `${Math.floor((Date.now() - new Date(latestVitals.recorded_at || latestVitals.lastUpdated).getTime()) / (1000 * 60))} minutes ago` : 
                      'Unknown'
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Thermometer className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Vital Signs Recorded</h3>
                <p className="text-gray-600 mb-4">
                  No vital signs have been recorded for this patient yet.
                </p>
                <button
                  onClick={() => setShowVitalsEditor(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Record First Vitals</span>
                </button>
              </div>
            )}

            {/* Vitals Trends */}
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
                  onClick={handleShowBarcodeForExisting}
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