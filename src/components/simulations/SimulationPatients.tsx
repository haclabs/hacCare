import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Thermometer, 
  Activity, 
  Droplets, 
  User, 
  Calendar, 
  MapPin, 
  AlertTriangle,
  Clock,
  Pill,
  FileText,
  RotateCcw,
  Stethoscope,
  Monitor
} from 'lucide-react';
import { SimulationSubTenantService } from '../../lib/simulationSubTenantService';

interface SimulationPatient {
  id: string;
  patient_id: string;
  patient_name: string;
  age: number;
  gender: string;
  date_of_birth?: string;
  room_number?: string;
  bed_number?: string;
  diagnosis: string;
  condition: string;
  allergies?: string[];
  blood_type?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  emergency_contact_phone?: string;
  assigned_nurse?: string;
  template_id?: string;
  created_at: string;
}

interface PatientVital {
  id: string;
  vital_type: string;
  value_systolic?: number;
  value_diastolic?: number;
  value_numeric?: number;
  value_text?: string;
  unit: string;
  recorded_at: string;
  recorded_by: string;
}

interface PatientMedication {
  id: string;
  medication_name: string;
  dosage: string;
  route: string;
  frequency: string;
  start_date?: string;
  end_date?: string;
  indication?: string;
  special_instructions?: string;
  is_prn: boolean;
  is_active: boolean;
  prescribed_by: string;
  prescribed_at: string;
}

interface PatientNote {
  id: string;
  note_type: string;
  note_content: string;
  created_by_name: string;
  created_at: string;
}

interface SimulationPatientsProps {
  simulationId: string;
  simulationStatus: string;
  onPatientDataChange?: () => void;
}

const SimulationPatients: React.FC<SimulationPatientsProps> = ({
  simulationId,
  simulationStatus,
  onPatientDataChange
}) => {
  const [patients, setPatients] = useState<SimulationPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<SimulationPatient | null>(null);
  const [patientVitals, setPatientVitals] = useState<PatientVital[]>([]);
  const [patientMedications, setPatientMedications] = useState<PatientMedication[]>([]);
  const [patientNotes, setPatientNotes] = useState<PatientNote[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'vitals' | 'medications' | 'notes'>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPatients();
  }, [simulationId]);

  useEffect(() => {
    if (selectedPatient) {
      loadPatientDetails(selectedPatient.id);
    }
  }, [selectedPatient]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const patientsData = await SimulationSubTenantService.getSimulationPatients(simulationId);
      setPatients(patientsData);
      
      // Auto-select first patient if available
      if (patientsData.length > 0 && !selectedPatient) {
        setSelectedPatient(patientsData[0]);
      }
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientDetails = async (patientId: string) => {
    try {
      // In a real implementation, you'd have separate endpoints for these
      // For now, we'll use mock data that would come from the service
      setPatientVitals([]);
      setPatientMedications([]);
      setPatientNotes([]);
    } catch (error) {
      console.error('Error loading patient details:', error);
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'stable': return 'bg-green-100 text-green-800 border-green-200';
      case 'improving': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'discharged': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const formatVitalValue = (vital: PatientVital) => {
    if (vital.vital_type === 'blood_pressure' && vital.value_systolic && vital.value_diastolic) {
      return `${vital.value_systolic}/${vital.value_diastolic} ${vital.unit}`;
    }
    if (vital.value_numeric) {
      return `${vital.value_numeric} ${vital.unit}`;
    }
    if (vital.value_text) {
      return `${vital.value_text} ${vital.unit}`;
    }
    return 'N/A';
  };

  const getVitalIcon = (vitalType: string) => {
    switch (vitalType) {
      case 'blood_pressure': return <Heart className="h-4 w-4" />;
      case 'heart_rate': return <Activity className="h-4 w-4" />;
      case 'temperature': return <Thermometer className="h-4 w-4" />;
      case 'oxygen_saturation': return <Droplets className="h-4 w-4" />;
      case 'respiratory_rate': return <Stethoscope className="h-4 w-4" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading patients...</div>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No patients</h3>
        <p className="mt-1 text-sm text-gray-500">
          This simulation doesn't have any patients assigned yet.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Patient List */}
      <div className="lg:col-span-1">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Patients ({patients.length})
        </h3>
        <div className="space-y-3">
          {patients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => setSelectedPatient(patient)}
              className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                selectedPatient?.id === patient.id
                  ? 'border-blue-300 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{patient.patient_name}</h4>
                  <p className="text-sm text-gray-600">
                    {patient.age} year old {patient.gender}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">{patient.diagnosis}</p>
                  {patient.room_number && patient.bed_number && (
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <MapPin className="h-3 w-3 mr-1" />
                      Room {patient.room_number}, Bed {patient.bed_number}
                    </div>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-md border ${getConditionColor(patient.condition)}`}>
                  {patient.condition}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Patient Details */}
      <div className="lg:col-span-2">
        {selectedPatient ? (
          <div>
            {/* Patient Header */}
            <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedPatient.patient_name}</h2>
                  <p className="text-gray-600">
                    {selectedPatient.age} year old {selectedPatient.gender}
                  </p>
                  <p className="text-gray-800 font-medium mt-2">{selectedPatient.diagnosis}</p>
                </div>
                <span className={`px-3 py-1 text-sm font-medium rounded-md border ${getConditionColor(selectedPatient.condition)}`}>
                  {selectedPatient.condition}
                </span>
              </div>
              
              {/* Quick Info Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                {selectedPatient.blood_type && (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <Droplets className="h-5 w-5 mx-auto text-red-500 mb-1" />
                    <p className="text-xs text-gray-600">Blood Type</p>
                    <p className="font-medium">{selectedPatient.blood_type}</p>
                  </div>
                )}
                {selectedPatient.room_number && selectedPatient.bed_number && (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <MapPin className="h-5 w-5 mx-auto text-blue-500 mb-1" />
                    <p className="text-xs text-gray-600">Location</p>
                    <p className="font-medium">Room {selectedPatient.room_number}, Bed {selectedPatient.bed_number}</p>
                  </div>
                )}
                {selectedPatient.assigned_nurse && (
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <User className="h-5 w-5 mx-auto text-green-500 mb-1" />
                    <p className="text-xs text-gray-600">Assigned Nurse</p>
                    <p className="font-medium">{selectedPatient.assigned_nurse}</p>
                  </div>
                )}
                {selectedPatient.allergies && selectedPatient.allergies.length > 0 && (
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 mx-auto text-red-500 mb-1" />
                    <p className="text-xs text-gray-600">Allergies</p>
                    <p className="font-medium text-red-700">
                      {selectedPatient.allergies.slice(0, 2).join(', ')}
                      {selectedPatient.allergies.length > 2 && '...'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6">
                  {[
                    { id: 'overview', name: 'Overview', icon: User },
                    { id: 'vitals', name: 'Vitals', icon: Activity },
                    { id: 'medications', name: 'Medications', icon: Pill },
                    { id: 'notes', name: 'Notes', icon: FileText }
                  ].map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.name}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-3">Patient Information</h3>
                      <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                          <dd className="text-sm text-gray-900">{selectedPatient.patient_name}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Age</dt>
                          <dd className="text-sm text-gray-900">{selectedPatient.age} years old</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Gender</dt>
                          <dd className="text-sm text-gray-900">{selectedPatient.gender}</dd>
                        </div>
                        {selectedPatient.date_of_birth && (
                          <div>
                            <dt className="text-sm font-medium text-gray-500">Date of Birth</dt>
                            <dd className="text-sm text-gray-900">{new Date(selectedPatient.date_of_birth).toLocaleDateString()}</dd>
                          </div>
                        )}
                        <div className="sm:col-span-2">
                          <dt className="text-sm font-medium text-gray-500">Diagnosis</dt>
                          <dd className="text-sm text-gray-900">{selectedPatient.diagnosis}</dd>
                        </div>
                        {selectedPatient.emergency_contact_name && (
                          <>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Emergency Contact</dt>
                              <dd className="text-sm text-gray-900">{selectedPatient.emergency_contact_name}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Relationship</dt>
                              <dd className="text-sm text-gray-900">{selectedPatient.emergency_contact_relationship}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-gray-500">Phone</dt>
                              <dd className="text-sm text-gray-900">{selectedPatient.emergency_contact_phone}</dd>
                            </div>
                          </>
                        )}
                      </dl>
                    </div>
                  </div>
                )}

                {activeTab === 'vitals' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Current Vitals</h3>
                    {patientVitals.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {patientVitals.map((vital) => (
                          <div key={vital.id} className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              {getVitalIcon(vital.vital_type)}
                              <h4 className="font-medium text-gray-900 capitalize">
                                {vital.vital_type.replace('_', ' ')}
                              </h4>
                            </div>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatVitalValue(vital)}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Recorded by {vital.recorded_by} at {new Date(vital.recorded_at).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Activity className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">No vitals recorded yet</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'medications' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Current Medications</h3>
                    {patientMedications.length > 0 ? (
                      <div className="space-y-4">
                        {patientMedications.map((med) => (
                          <div key={med.id} className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900">{med.medication_name}</h4>
                                <p className="text-sm text-gray-600">
                                  {med.dosage} • {med.route} • {med.frequency}
                                  {med.is_prn && ' (PRN)'}
                                </p>
                                {med.indication && (
                                  <p className="text-sm text-gray-500 mt-1">For: {med.indication}</p>
                                )}
                                {med.special_instructions && (
                                  <p className="text-sm text-yellow-700 mt-1">⚠️ {med.special_instructions}</p>
                                )}
                              </div>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                med.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {med.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              Prescribed by {med.prescribed_by} on {new Date(med.prescribed_at).toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Pill className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">No medications recorded yet</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'notes' && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">Clinical Notes</h3>
                    {patientNotes.length > 0 ? (
                      <div className="space-y-4">
                        {patientNotes.map((note) => (
                          <div key={note.id} className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-start justify-between mb-2">
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded capitalize">
                                {note.note_type}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(note.created_at).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{note.note_content}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              — {note.created_by_name}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="mx-auto h-8 w-8 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-500">No notes recorded yet</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Select a patient</h3>
            <p className="mt-1 text-sm text-gray-500">
              Choose a patient from the list to view their details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulationPatients;