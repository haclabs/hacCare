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
import { format, differenceInDays } from 'date-fns';
import { VitalSignsEditor } from './VitalSignsEditor';
import { VitalsTrends } from './VitalsTrends';
import { PatientBracelet } from './PatientBracelet';
import { HospitalBracelet } from './HospitalBracelet';
import { MedicationBarcode } from './MedicationBarcode';
import { MedicationForm } from './MedicationForm';
import { WoundAssessment } from './WoundAssessment';
import { usePatients } from '../../contexts/PatientContext';

interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [showVitalsEditor, setShowVitalsEditor] = useState(false);
  const [showBracelet, setShowBracelet] = useState(false);
  const [showWristband, setShowWristband] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<any>(null);
  const [showMedicationBarcode, setShowMedicationBarcode] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  
  const { getPatient, updatePatient } = usePatients();

  // Get the most current patient data from context
  const currentPatient = getPatient(patient.id) || patient;

  const age = new Date().getFullYear() - new Date(currentPatient.dateOfBirth).getFullYear();
  const daysAdmitted = differenceInDays(new Date(), new Date(currentPatient.admissionDate));

  const handleSaveVitals = (newVitals: any) => {
    // The VitalSignsEditor now handles saving to database
    // and refreshes the patient data automatically
    setShowVitalsEditor(false);
  };

  const handleSaveMedication = async (medicationData: any) => {
    try {
      // Update patient with new/updated medication
      const updatedMedications = selectedMedication 
        ? currentPatient.medications.map(med => 
            med.id === selectedMedication.id ? medicationData : med
          )
        : [...currentPatient.medications, medicationData];

      const updatedPatient = {
        ...currentPatient,
        medications: updatedMedications
      };

      await updatePatient(updatedPatient);
      setShowMedicationForm(false);
      setSelectedMedication(null);
    } catch (error) {
      console.error('Error saving medication:', error);
      alert('Failed to save medication. Please try again.');
    }
  };

  const getConditionColor = (condition: Patient['condition']) => {
    switch (condition) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'Stable': return 'bg-green-100 text-green-800 border-green-200';
      case 'Improving': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Discharged': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Check if patient has any vitals recorded (not default zeros)
  const hasVitalsRecorded = currentPatient.vitals.temperature > 0 && 
                           currentPatient.vitals.heartRate > 0 && 
                           currentPatient.vitals.lastUpdated !== '';

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-6">
            {/* Patient Summary Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-3 rounded-full">
                    <User className="h-8 w-8 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {currentPatient.firstName} {currentPatient.lastName}
                    </h2>
                    <p className="text-gray-600">{age} years old • {currentPatient.gender}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-sm text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded">
                        {currentPatient.patientId}
                      </span>
                      <button
                        onClick={() => setShowBracelet(true)}
                        className="text-sm text-gray-600 hover:text-blue-600 flex items-center space-x-1"
                      >
                        <QrCode className="h-4 w-4" />
                        <span>Patient Labels</span>
                      </button>
                      <button
                        onClick={() => setShowWristband(true)}
                        className="text-sm text-gray-600 hover:text-blue-600 flex items-center space-x-1"
                      >
                        <Printer className="h-4 w-4" />
                        <span>Generate Patient Wristband</span>
                      </button>
                    </div>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getConditionColor(currentPatient.condition)}`}>
                  {currentPatient.condition}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>Room {currentPatient.roomNumber}{currentPatient.bedNumber}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Admitted {format(new Date(currentPatient.admissionDate), 'MMM dd, yyyy')} ({daysAdmitted} days)</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Stethoscope className="h-4 w-4" />
                    <span>Dr. Wilson (Attending)</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <User className="h-4 w-4" />
                    <span>Nurse: {currentPatient.assignedNurse}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Activity className="h-4 w-4" />
                    <span>Blood Type: {currentPatient.bloodType}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>Emergency: {currentPatient.emergencyContact.name}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {currentPatient.allergies.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-red-800 font-medium text-sm">Allergies</span>
                      </div>
                      <div className="space-y-1">
                        {currentPatient.allergies.map((allergy, index) => (
                          <span key={index} className="block text-red-700 text-sm">{allergy}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Diagnosis */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                Primary Diagnosis
              </h3>
              <p className="text-gray-700">{currentPatient.diagnosis}</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => setShowVitalsEditor(true)}
                className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Edit className="h-5 w-5" />
                <span>Update Vitals</span>
              </button>
              
              <button
                onClick={() => setActiveTab('medications')}
                className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Pill className="h-5 w-5" />
                <span>View Medications</span>
              </button>
              
              <button
                onClick={() => setActiveTab('notes')}
                className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
              >
                <FileText className="h-5 w-5" />
                <span>Add Note</span>
              </button>
            </div>
          </div>
        );

      case 'vitals':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Vital Signs</h3>
              <button
                onClick={() => setShowVitalsEditor(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Edit className="h-4 w-4" />
                <span>Update Vitals</span>
              </button>
            </div>

            {!hasVitalsRecorded ? (
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
                  <Edit className="h-4 w-4" />
                  <span>Record First Vitals</span>
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <Thermometer className="h-8 w-8 text-blue-600" />
                      <span className="text-2xl font-bold text-blue-900">{currentPatient.vitals.temperature}°F</span>
                    </div>
                    <p className="text-blue-700 font-medium">Temperature</p>
                    <p className="text-blue-600 text-sm">Normal range: 97.8-99.1°F</p>
                  </div>

                  <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                    <div className="flex items-center justify-between mb-3">
                      <Heart className="h-8 w-8 text-red-600" />
                      <span className="text-2xl font-bold text-red-900">{currentPatient.vitals.heartRate}</span>
                    </div>
                    <p className="text-red-700 font-medium">Heart Rate (BPM)</p>
                    <p className="text-red-600 text-sm">Normal range: 60-100 BPM</p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                    <div className="flex items-center justify-between mb-3">
                      <Activity className="h-8 w-8 text-purple-600" />
                      <span className="text-2xl font-bold text-purple-900">
                        {currentPatient.vitals.bloodPressure.systolic}/{currentPatient.vitals.bloodPressure.diastolic}
                      </span>
                    </div>
                    <p className="text-purple-700 font-medium">Blood Pressure</p>
                    <p className="text-purple-600 text-sm">Normal: <120/80 mmHg</p>
                  </div>

                  <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-3">
                      <Activity className="h-8 w-8 text-green-600" />
                      <span className="text-2xl font-bold text-green-900">{currentPatient.vitals.oxygenSaturation}%</span>
                    </div>
                    <p className="text-green-700 font-medium">O2 Saturation</p>
                    <p className="text-green-600 text-sm">Normal range: 95-100%</p>
                  </div>

                  <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-200">
                    <div className="flex items-center justify-between mb-3">
                      <Activity className="h-8 w-8 text-indigo-600" />
                      <span className="text-2xl font-bold text-indigo-900">{currentPatient.vitals.respiratoryRate}</span>
                    </div>
                    <p className="text-indigo-700 font-medium">Respiratory Rate</p>
                    <p className="text-indigo-600 text-sm">Normal range: 12-20/min</p>
                  </div>

                  <VitalsTrends currentVitals={currentPatient.vitals} patientId={currentPatient.id} />
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">
                    <strong>Last Updated:</strong> {format(new Date(currentPatient.vitals.lastUpdated), 'MMM dd, yyyy HH:mm')}
                  </p>
                </div>
              </>
            )}
          </div>
        );

      case 'medications':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Medication Administration Record (MAR)</h3>
              <button 
                onClick={() => {
                  setSelectedMedication(null);
                  setShowMedicationForm(true);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Medication</span>
              </button>
            </div>

            {currentPatient.medications.filter(med => med.status === 'Active').length === 0 ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Medications</h3>
                <p className="text-gray-600 mb-4">
                  No medications have been prescribed for this patient yet.
                </p>
                <button
                  onClick={() => {
                    setSelectedMedication(null);
                    setShowMedicationForm(true);
                  }}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add First Medication</span>
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {currentPatient.medications.filter(med => med.status === 'Active').map((medication) => (
                  <div key={medication.id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <Pill className="h-6 w-6 text-green-600" />
                          <h4 className="text-lg font-semibold text-gray-900">{medication.name}</h4>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-sm font-medium">
                            {medication.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600">Dosage</p>
                            <p className="font-medium text-red-600">{medication.dosage}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Frequency</p>
                            <p className="font-medium">{medication.frequency}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Route</p>
                            <p className="font-medium">{medication.route}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Prescribed by</p>
                            <p className="font-medium">{medication.prescribedBy}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 text-sm">
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4 text-blue-600" />
                            <span className="text-gray-600">Next due: </span>
                            <span className="font-medium text-blue-600">
                              {format(new Date(medication.nextDue), 'MMM dd, HH:mm')}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-600">Started: </span>
                            <span className="font-medium">
                              {format(new Date(medication.startDate), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => {
                            setSelectedMedication(medication);
                            setShowMedicationBarcode(true);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Generate Medication Labels"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedMedication(medication);
                            setShowMedicationForm(true);
                          }}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Edit Medication"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'notes':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Patient Notes</h3>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Note</span>
              </button>
            </div>

            <div className="space-y-4">
              {currentPatient.notes.map((note) => (
                <div key={note.id} className="bg-white border border-gray-200 rounded-lg p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-blue-600" />
                      <div>
                        <h4 className="font-medium text-gray-900">{note.type}</h4>
                        <p className="text-sm text-gray-600">by {note.nurseName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {format(new Date(note.timestamp), 'MMM dd, yyyy HH:mm')}
                      </p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        note.priority === 'High' ? 'bg-red-100 text-red-800' :
                        note.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {note.priority} Priority
                      </span>
                    </div>
                  </div>
                  <p className="text-gray-700">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 'admission':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Admission Records</h3>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                <Edit className="h-4 w-4" />
                <span>Update Records</span>
              </button>
            </div>

            {/* Current Admission Details */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                Current Admission Details
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Admission Date</p>
                    <p className="text-gray-900">{format(new Date(currentPatient.admissionDate), 'MMMM dd, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Length of Stay</p>
                    <p className="text-gray-900">{daysAdmitted} days</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Admission Type</p>
                    <p className="text-gray-900">Emergency</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Attending Physician</p>
                    <p className="text-gray-900">Dr. Sarah Wilson, MD</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Insurance</p>
                    <p className="text-gray-900">Blue Cross Blue Shield</p>
                    <p className="text-sm text-gray-600">Policy: BC123456789</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Admission Source</p>
                    <p className="text-gray-900">Emergency Department</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Chief Complaint</p>
                    <p className="text-gray-900">Chest pain and shortness of breath</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Admission Vital Signs */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Activity className="h-5 w-5 mr-2 text-red-600" />
                Admission Vital Signs
              </h4>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Temperature</p>
                  <p className="text-lg font-bold text-blue-900">99.2°F</p>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">Heart Rate</p>
                  <p className="text-lg font-bold text-red-900">88 BPM</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Blood Pressure</p>
                  <p className="text-lg font-bold text-purple-900">142/90</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">O2 Saturation</p>
                  <p className="text-lg font-bold text-green-900">96%</p>
                </div>
                <div className="text-center p-3 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-indigo-600 font-medium">Respiratory</p>
                  <p className="text-lg font-bold text-indigo-900">20/min</p>
                </div>
              </div>
              
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Height</p>
                  <p className="text-gray-900">5'10" (178 cm)</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Weight</p>
                  <p className="text-gray-900">185 lbs (84 kg)</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">BMI</p>
                  <p className="text-gray-900">26.5 (Overweight)</p>
                </div>
              </div>
            </div>

            {/* Social and Family History */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Users className="h-5 w-5 mr-2 text-green-600" />
                Social & Family History
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Smoking Status</p>
                    <p className="text-gray-900">Former smoker (quit 5 years ago)</p>
                    <p className="text-sm text-gray-600">20 pack-year history</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Alcohol Use</p>
                    <p className="text-gray-900">Social drinker (1-2 drinks per week)</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Family History</p>
                    <p className="text-gray-900">Father: Hypertension, Diabetes</p>
                    <p className="text-gray-900">Mother: Breast cancer (age 65)</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Occupation</p>
                    <p className="text-gray-900">Software Engineer</p>
                  </div>
                </div>
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
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {currentPatient.firstName} {currentPatient.lastName}
              </h1>
              <p className="text-gray-600">Patient ID: {currentPatient.patientId}</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getConditionColor(currentPatient.condition)}`}>
              {currentPatient.condition}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: User },
            { id: 'vitals', label: 'Vital Signs', icon: Activity },
            { id: 'medications', label: 'Medications', icon: Pill },
            { id: 'notes', label: 'Notes', icon: FileText },
            { id: 'admission', label: 'Admission', icon: Calendar },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {renderTabContent()}
      </div>

      {/* Modals */}
      {showVitalsEditor && (
        <VitalSignsEditor
          patient={currentPatient}
          onSave={handleSaveVitals}
          onCancel={() => setShowVitalsEditor(false)}
        />
      )}

      {showBracelet && (
        <PatientBracelet
          patient={currentPatient}
          onClose={() => setShowBracelet(false)}
        />
      )}

      {showWristband && (
        <HospitalBracelet
          patient={currentPatient}
          onClose={() => setShowWristband(false)}
        />
      )}

      {showMedicationBarcode && selectedMedication && (
        <MedicationBarcode
          medication={selectedMedication}
          patient={currentPatient}
          onClose={() => setShowMedicationBarcode(false)}
        />
      )}

      {showMedicationForm && (
        <MedicationForm
          patient={currentPatient}
          medication={selectedMedication}
          onSave={handleSaveMedication}
          onCancel={() => {
            setShowMedicationForm(false);
            setSelectedMedication(null);
          }}
        />
      )}
    </div>
  );
};