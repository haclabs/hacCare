import React from 'react';
import { Patient } from '../../types';
import { User, MapPin, Calendar, AlertTriangle, Heart, QrCode } from 'lucide-react';
import { format } from 'date-fns';

interface PatientCardProps {
  patient: Patient;
  onClick: () => void;
  onShowBracelet?: () => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patient, onClick, onShowBracelet }) => {
  const getConditionColor = (condition: Patient['condition']) => {
    switch (condition) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'Stable': return 'bg-green-100 text-green-800 border-green-200';
      case 'Improving': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Discharged': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();

  const handleBraceletClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShowBracelet?.();
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 p-2 rounded-full">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {patient.firstName} {patient.lastName}
            </h3>
            <p className="text-sm text-gray-500">{age} years old • {patient.gender}</p>
            <p className="text-xs text-blue-600 font-mono">{patient.patientId}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getConditionColor(patient.condition)}`}>
            {patient.condition}
          </span>
          {onShowBracelet && (
            <button
              onClick={handleBraceletClick}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View ID Bracelet"
            >
              <QrCode className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4" />
          <span>Room {patient.roomNumber}{patient.bedNumber}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>Admitted {format(new Date(patient.admissionDate), 'MMM dd')}</span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Heart className="h-4 w-4 text-red-500" />
          <span className="text-sm text-gray-600">
            {patient.vitals.heartRate} BPM • {patient.vitals.bloodPressure.systolic}/{patient.vitals.bloodPressure.diastolic}
          </span>
        </div>
        
        {patient.allergies.length > 0 && (
          <div className="flex items-center space-x-1">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-amber-600 font-medium">Allergies</span>
          </div>
        )}
      </div>

      {patient.medications.filter(med => med.status === 'Active').length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {patient.medications.filter(med => med.status === 'Active').length} active medications
          </p>
        </div>
      )}
    </div>
  );
};