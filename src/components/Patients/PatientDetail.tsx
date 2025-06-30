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
import { WoundAssessment } from './WoundAssessment';

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

  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
  const daysAdmitted = differenceInDays(new Date(), new Date(patient.admissionDate));

  const handleSaveVitals = (newVitals: any) => {
    // In a real app, this would update the patient data
    console.log('Saving vitals:', newVitals);
    setShowVitalsEditor(false);
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
                      {patient.firstName} {patient.lastName}
                    </h2>
                    <p className="text-gray-600">{age} years old • {patient.gender}</p>
                    <div className="flex items-center space-x-4 mt-2">
                      <span className="text-sm text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded">
                        {patient.patientId}
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
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getConditionColor(patient.condition)}`}>
                  {patient.condition}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>Room {patient.roomNumber}{patient.bedNumber}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>Admitted {format(new Date(patient.admissionDate), 'MMM dd, yyyy')} ({daysAdmitted} days)</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Stethoscope className="h-4 w-4" />
                    <span>Dr. Wilson (Attending)</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <User className="h-4 w-4" />
                    <span>Nurse: {patient.assignedNurse}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Activity className="h-4 w-4" />
                    <span>Blood Type: {patient.bloodType}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <Phone className="h-4 w-4" />
                    <span>Emergency: {patient.emergencyContact.name}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  {patient.allergies.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                        <span className="text-red-800 font-medium text-sm">Allergies</span>
                      </div>
                      <div className="space-y-1">
                        {patient.allergies.map((allergy, index) => (
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
              <p className="text-gray-700">{patient.diagnosis}</p>
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <Thermometer className="h-8 w-8 text-blue-600" />
                  <span className="text-2xl font-bold text-blue-900">{patient.vitals.temperature}°F</span>
                </div>
                <p className="text-blue-700 font-medium">Temperature</p>
                <p className="text-blue-600 text-sm">Normal range: 97.8-99.1°F</p>
              </div>

              <div className="bg-red-50 rounded-lg p-6 border border-red-200">
                <div className="flex items-center justify-between mb-3">
                  <Heart className="h-8 w-8 text-red-600" />
                  <span className="text-2xl font-bold text-red-900">{patient.vitals.heartRate}</span>
                </div>
                <p className="text-red-700 font-medium">Heart Rate (BPM)</p>
                <p className="text-red-600 text-sm">Normal range: 60-100 BPM</p>
              </div>

              <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <Activity className="h-8 w-8 text-purple-600" />
                  <span className="text-2xl font-bold text-purple-900">
                    {patient.vitals.bloodPressure.systolic}/{patient.vitals.bloodPressure.diastolic}
                  </span>
                </div>
                <p className="text-purple-700 font-medium">Blood Pressure</p>
                <p className="text-purple-600 text-sm">Normal: <120/80 mmHg</p>
              </div>

              <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                <div className="flex items-center justify-between mb-3">
                  <Activity className="h-8 w-8 text-green-600" />
                  <span className="text-2xl font-bold text-green-900">{patient.vitals.oxygenSaturation}%</span>
                </div>
                <p className="text-green-700 font-medium">O2 Saturation</p>
                <p className="text-green-600 text-sm">Normal range: 95-100%</p>
              </div>

              <div className="bg-indigo-50 rounded-lg p-6 border border-indigo-200">
                <div className="flex items-center justify-between mb-3">
                  <Activity className="h-8 w-8 text-indigo-600" />
                  <span className="text-2xl font-bold text-indigo-900">{patient.vitals.respiratoryRate}</span>
                </div>
                <p className="text-indigo-700 font-medium">Respiratory Rate</p>
                <p className="text-indigo-600 text-sm">Normal range: 12-20/min</p>
              </div>

              <VitalsTrends currentVitals={patient.vitals} />
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                <strong>Last Updated:</strong> {format(new Date(patient.vitals.lastUpdated), 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          </div>
        );

      case 'medications':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Active Medications</h3>
              <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Add Medication</span>
              </button>
            </div>

            <div className="grid gap-4">
              {patient.medications.filter(med => med.status === 'Active').map((medication) => (
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
                      <button className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
              {patient.notes.map((note) => (
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
                    <p className="text-gray-900">{format(new Date(patient.admissionDate), 'MMMM dd, yyyy')}</p>
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
                    <p className="text-gray-900">Social drinker (2-3 drinks/week)</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Exercise</p>
                    <p className="text-gray-900">Sedentary lifestyle</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Occupation</p>
                    <p className="text-gray-900">Office manager (desk job)</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Family History</p>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-900">• Father: Myocardial infarction at age 58</p>
                      <p className="text-gray-900">• Mother: Type 2 diabetes, hypertension</p>
                      <p className="text-gray-900">• Brother: Hyperlipidemia</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Marital Status</p>
                    <p className="text-gray-900">Married, 2 children</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contacts */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Phone className="h-5 w-5 mr-2 text-orange-600" />
                Emergency Contacts
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="font-medium text-gray-900 mb-2">Primary Contact</p>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {patient.emergencyContact.name}</p>
                    <p><span className="font-medium">Relationship:</span> {patient.emergencyContact.relationship}</p>
                    <p><span className="font-medium">Phone:</span> {patient.emergencyContact.phone}</p>
                    <p><span className="font-medium">Address:</span> 123 Main St, Anytown, ST 12345</p>
                  </div>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="font-medium text-gray-900 mb-2">Secondary Contact</p>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> Robert Smith Jr.</p>
                    <p><span className="font-medium">Relationship:</span> Son</p>
                    <p><span className="font-medium">Phone:</span> (555) 234-5678</p>
                    <p><span className="font-medium">Address:</span> 456 Oak Ave, Nearby City, ST 12346</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Initial Nursing Assessment */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Stethoscope className="h-5 w-5 mr-2 text-purple-600" />
                Initial Nursing Assessment
              </h4>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">General Appearance</p>
                  <p className="text-gray-900">Alert and oriented x3. Appears anxious but cooperative. No acute distress at rest.</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Cardiovascular</p>
                  <p className="text-gray-900">Regular rate and rhythm. No murmurs, rubs, or gallops. Peripheral pulses palpable. No peripheral edema.</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Respiratory</p>
                  <p className="text-gray-900">Clear to auscultation bilaterally. No wheezes, rales, or rhonchi. Respiratory effort unlabored.</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Neurological</p>
                  <p className="text-gray-900">Alert and oriented to person, place, and time. Speech clear. Follows commands appropriately.</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Skin</p>
                  <p className="text-gray-900">Warm, dry, and intact. Good skin turgor. No lesions or pressure areas noted.</p>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Pain Assessment</p>
                  <p className="text-gray-900">Reports chest discomfort 3/10 on numeric scale. Describes as "pressure-like" sensation.</p>
                </div>
              </div>
            </div>

            {/* Previous Admissions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-gray-600" />
                Previous Admissions
              </h4>
              
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-gray-900">Admission #2</p>
                    <span className="text-sm text-gray-600">March 15, 2023</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2"><strong>Diagnosis:</strong> Acute bronchitis</p>
                  <p className="text-sm text-gray-700 mb-2"><strong>Length of Stay:</strong> 2 days</p>
                  <p className="text-sm text-gray-700"><strong>Outcome:</strong> Discharged home in stable condition</p>
                </div>
                
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium text-gray-900">Admission #1</p>
                    <span className="text-sm text-gray-600">August 22, 2022</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-2"><strong>Diagnosis:</strong> Appendectomy</p>
                  <p className="text-sm text-gray-700 mb-2"><strong>Length of Stay:</strong> 3 days</p>
                  <p className="text-sm text-gray-700"><strong>Outcome:</strong> Uncomplicated recovery, discharged home</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'advance-directives':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Advance Directives</h3>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                <Edit className="h-4 w-4" />
                <span>Update Directives</span>
              </button>
            </div>

            {/* Advance Directives */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <FileCheck className="h-5 w-5 mr-2 text-blue-600" />
                Advance Directives & Preferences
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900">Living Will</p>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                        On File
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">Dated: January 10, 2024</p>
                    <p className="text-sm text-gray-600">Specifies wishes for end-of-life care</p>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900">Healthcare Proxy</p>
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                        Designated
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">Mary Smith (Spouse)</p>
                    <p className="text-sm text-gray-600">Phone: (555) 987-6543</p>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900">DNR Status</p>
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                        Full Code
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">Patient wishes full resuscitation efforts</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="font-medium text-gray-900 mb-2">Organ Donation</p>
                    <p className="text-sm text-gray-700">Registered organ donor</p>
                    <p className="text-sm text-gray-600">All organs and tissues</p>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="font-medium text-gray-900 mb-2">Religious Preferences</p>
                    <p className="text-sm text-gray-700">Catholic</p>
                    <p className="text-sm text-gray-600">Requests chaplain visit if condition worsens</p>
                  </div>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    <p className="font-medium text-gray-900 mb-2">Special Instructions</p>
                    <p className="text-sm text-gray-700">Prefers family present for major decisions</p>
                    <p className="text-sm text-gray-600">Comfortable with medical students observing</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <p className="text-yellow-800 font-medium text-sm">Important Notes</p>
                </div>
                <ul className="text-yellow-700 text-sm space-y-1">
                  <li>• All advance directives have been reviewed and are current</li>
                  <li>• Healthcare proxy has been contacted and is aware of admission</li>
                  <li>• Patient is competent to make own medical decisions at this time</li>
                  <li>• Copies of all documents are in the medical record</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 'orders':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Physician Orders</h3>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>New Order</span>
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-center py-8">
                <Clipboard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Physician orders management coming soon...</p>
              </div>
            </div>
          </div>
        );

      case 'consults':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Consults</h3>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Request Consult</span>
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-center py-8">
                <UserCheck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Consultation management coming soon...</p>
              </div>
            </div>
          </div>
        );

      case 'labs':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Labs & Reports</h3>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>Order Lab</span>
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Laboratory results and reports coming soon...</p>
              </div>
            </div>
          </div>
        );

      case 'care-plan':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Care Plan</h3>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                <Edit className="h-4 w-4" />
                <span>Update Plan</span>
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Care plan management coming soon...</p>
              </div>
            </div>
          </div>
        );

      case 'assessments':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Assessments</h3>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
                <Plus className="h-4 w-4" />
                <span>New Assessment</span>
              </button>
            </div>

            {/* Assessment Navigation */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <div className="flex items-center space-x-3 mb-2">
                    <Stethoscope className="h-6 w-6 text-blue-600" />
                    <h4 className="font-medium text-gray-900">Physical Assessment</h4>
                  </div>
                  <p className="text-sm text-gray-600">Head-to-toe physical examination</p>
                </button>

                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <div className="flex items-center space-x-3 mb-2">
                    <Activity className="h-6 w-6 text-green-600" />
                    <h4 className="font-medium text-gray-900">Neurological</h4>
                  </div>
                  <p className="text-sm text-gray-600">Cognitive and neurological function</p>
                </button>

                <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <div className="flex items-center space-x-3 mb-2">
                    <Heart className="h-6 w-6 text-red-600" />
                    <h4 className="font-medium text-gray-900">Pain Assessment</h4>
                  </div>
                  <p className="text-sm text-gray-600">Pain scale and management</p>
                </button>
              </div>

              {/* Wound Assessment Component */}
              <WoundAssessment patientId={patient.patientId} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Patients</span>
          </button>
          
          <div className="text-center">
            <h1 className="text-xl font-semibold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h1>
            <p className="text-sm text-gray-600">Patient ID: {patient.patientId}</p>
          </div>
          
          <div className="w-24"></div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 px-6">
        {/* First Row of Tabs */}
        <div className="flex space-x-8 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: User, color: 'blue' },
            { id: 'vitals', label: 'Vital Signs', icon: Activity, color: 'red' },
            { id: 'medications', label: 'MAR', icon: Pill, color: 'green' },
            { id: 'notes', label: 'Notes', icon: FileText, color: 'purple' },
            { id: 'admission', label: 'Admission Records', icon: Calendar, color: 'indigo' },
            { id: 'advance-directives', label: 'Advanced Directives', icon: FileCheck, color: 'teal' }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? `border-${tab.color}-500 text-${tab.color}-600`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        
        {/* Second Row of Tabs */}
        <div className="flex space-x-8 overflow-x-auto border-t border-gray-100 pt-2">
          {[
            { id: 'orders', label: 'Physicians Orders', icon: Clipboard, color: 'orange' },
            { id: 'consults', label: 'Consults', icon: UserCheck, color: 'cyan' },
            { id: 'labs', label: 'Labs & Reports', icon: Target, color: 'pink' },
            { id: 'care-plan', label: 'Care Plan', icon: BookOpen, color: 'emerald' },
            { id: 'assessments', label: 'Assessments', icon: Stethoscope, color: 'violet' }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? `border-${tab.color}-500 text-${tab.color}-600`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {renderTabContent()}
      </div>

      {/* Modals */}
      {showVitalsEditor && (
        <VitalSignsEditor
          vitals={patient.vitals}
          onSave={handleSaveVitals}
          onCancel={() => setShowVitalsEditor(false)}
        />
      )}

      {showBracelet && (
        <PatientBracelet
          patient={patient}
          onClose={() => setShowBracelet(false)}
        />
      )}

      {showWristband && (
        <HospitalBracelet
          patient={patient}
          onClose={() => setShowWristband(false)}
        />
      )}

      {showMedicationBarcode && selectedMedication && (
        <MedicationBarcode
          medication={selectedMedication}
          patientName={`${patient.firstName} ${patient.lastName}`}
          patientId={patient.patientId}
          onClose={() => {
            setShowMedicationBarcode(false);
            setSelectedMedication(null);
          }}
        />
      )}
    </div>
  );
};