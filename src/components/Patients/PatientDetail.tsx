import React from 'react';
import { ArrowLeft, User, Calendar, MapPin, Phone, Heart, Pill, FileText, AlertTriangle } from 'lucide-react';

interface Patient {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  room_number: string;
  bed_number: string;
  admission_date: string;
  condition: string;
  diagnosis: string;
  allergies: string[];
  blood_type: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
  emergency_contact_phone: string;
  assigned_nurse: string;
}

interface PatientDetailProps {
  patient: Patient;
  onBack: () => void;
}

export const PatientDetail: React.FC<PatientDetailProps> = ({ patient, onBack }) => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Patients
          </button>
        </div>

        {/* Patient Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {patient.first_name} {patient.last_name}
                </h1>
                <p className="text-gray-600">Patient ID: {patient.patient_id}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    DOB: {new Date(patient.date_of_birth).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Room {patient.room_number}, Bed {patient.bed_number}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                {patient.condition}
              </div>
            </div>
          </div>
        </div>

        {/* Patient Information Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Gender:</span>
                <span className="font-medium">{patient.gender}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Blood Type:</span>
                <span className="font-medium">{patient.blood_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Admission Date:</span>
                <span className="font-medium">{new Date(patient.admission_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Assigned Nurse:</span>
                <span className="font-medium">{patient.assigned_nurse}</span>
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Medical Information</h2>
            <div className="space-y-3">
              <div>
                <span className="text-gray-600">Diagnosis:</span>
                <p className="font-medium mt-1">{patient.diagnosis}</p>
              </div>
              <div>
                <span className="text-gray-600">Allergies:</span>
                <div className="mt-1">
                  {patient.allergies && patient.allergies.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {patient.allergies.map((allergy, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {allergy}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-500">No known allergies</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h2>
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
                <span className="font-medium flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {patient.emergency_contact_phone}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <button className="flex items-center justify-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Heart className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium">Vitals</span>
              </button>
              <button className="flex items-center justify-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <Pill className="w-5 h-5 text-blue-500" />
                <span className="text-sm font-medium">Medications</span>
              </button>
              <button className="flex items-center justify-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <FileText className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">Notes</span>
              </button>
              <button className="flex items-center justify-center gap-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <User className="w-5 h-5 text-purple-500" />
                <span className="text-sm font-medium">Assessment</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};