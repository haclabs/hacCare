import React from 'react';
import { Patient } from '../../types';
import { User, MapPin, Calendar, AlertTriangle, Heart, QrCode } from 'lucide-react';
import { format, isValid } from 'date-fns';

/**
 * Patient Card Component
 * 
 * Displays a summary card for each patient with key information and quick actions.
 * Provides an overview of patient status, vital signs, and allows navigation to
 * detailed views and bracelet generation.
 * 
 * Features:
 * - Patient demographics and basic info
 * - Current condition status with color coding
 * - Vital signs summary
 * - Allergy indicators
 * - Quick access to patient bracelet
 * - Click to view detailed patient information
 * 
 * @param {Object} props - Component props
 * @param {Patient} props.patient - Patient data to display
 * @param {Function} props.onClick - Callback when card is clicked
 * @param {Function} props.onShowBracelet - Callback to show patient bracelet
 */
interface PatientCardProps {
  patient: Patient;
  onClick: () => void;
  onShowBracelet?: () => void;
}

export const PatientCard: React.FC<PatientCardProps> = ({ patient, onClick, onShowBracelet }) => {
  /**
   * Get CSS classes for patient condition styling
   * @param {Patient['condition']} condition - Patient's current condition
   * @returns {string} CSS classes for condition badge
   */
  const getConditionColor = (condition: Patient['condition']) => {
    switch (condition) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'Stable': return 'bg-green-100 text-green-800 border-green-200';
      case 'Improving': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Discharged': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Calculate patient age with date validation
  const birthDate = new Date(patient.date_of_birth);
  const age = isValid(birthDate) ? new Date().getFullYear() - birthDate.getFullYear() : 'N/A';

  // Format admission date with validation
  const admissionDate = new Date(patient.admission_date);
  const formattedAdmissionDate = isValid(admissionDate) ? format(admissionDate, 'MMM dd') : 'N/A';

  // Get latest vitals from the vitals array
  const latestVitals = patient.vitals && patient.vitals.length > 0 
    ? patient.vitals.sort((a, b) => {
        const dateA = new Date(a.recorded_at || a.lastUpdated || 0);
        const dateB = new Date(b.recorded_at || b.lastUpdated || 0);
        return dateB.getTime() - dateA.getTime();
      })[0]
    : null;

  /**
   * Handle bracelet button click
   * Prevents event bubbling to avoid triggering card click
   * @param {React.MouseEvent} e - Mouse event
   */
  const handleBraceletClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onShowBracelet?.();
  }; 

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Patient Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 p-2 rounded-full">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {patient.first_name} {patient.last_name}
            </h3>
            <p className="text-sm text-gray-500">{age} years old • {patient.gender}</p>
            <p className="text-xs text-blue-600 font-mono">{patient.patient_id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getConditionColor(patient.condition)}`}>
            {patient.condition}
          </span> 
          {onShowBracelet && (
            <button 
              onClick={handleBraceletClick}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center space-x-1"
              title="View Hospital Bracelet"
            >
              <QrCode className="h-4 w-4" />
              <span className="text-xs">Bracelet</span>
            </button>
          )}
        </div>
      </div>

      {/* Patient Location and Admission Info */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4" />
          <span>Room {patient.room_number}{patient.bed_number}</span>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>Admitted {formattedAdmissionDate}</span>
        </div>
      </div>

      {/* Vital Signs Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Heart className="h-4 w-4 text-red-500" />
          <span className="text-sm text-gray-600">
            {latestVitals?.heartRate || 'N/A'} BPM • {latestVitals?.bloodPressure?.systolic || 'N/A'}/{latestVitals?.bloodPressure?.diastolic || 'N/A'}
          </span>
        </div>
        
        {/* Allergy Indicator */}
        {patient.allergies && patient.allergies.length > 0 && (
          <div className="flex items-center space-x-1">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-xs text-amber-600 font-medium">Allergies</span>
          </div>
        )}
      </div>

      {/* Active Medications Count */}
      {patient.medications && patient.medications.filter(med => med.status === 'Active').length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            {patient.medications.filter(med => med.status === 'Active').length} active medications
          </p>
        </div>
      )}
    </div>
  );
};

export default PatientCard;