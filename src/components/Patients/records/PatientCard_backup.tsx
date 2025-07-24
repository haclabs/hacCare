import React from 'react';
import { Patient } from '../../../types';
import { User, MapPin, Calendar, AlertTriangle, QrCode } from 'lucide-react';
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

const PatientCard: React.FC<PatientCardProps> = ({ patient, onClick, onShowBracelet }) => {
  /**
   * Get CSS classes for patient condition styling with enhanced gradients
   * @param {Patient['condition']} condition - Patient's current condition
   * @returns {string} CSS classes for condition badge
   */
  const getConditionColor = (condition: Patient['condition']) => {
    switch (condition) {
      case 'Critical': return 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300 shadow-red-100';
      case 'Stable': return 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300 shadow-green-100';
      case 'Improving': return 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300 shadow-blue-100';
      case 'Discharged': return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300 shadow-gray-100';
      default: return 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300 shadow-gray-100';
    }
  };

  /**
   * Get condition-specific accent colors for the card border
   */
  const getCardAccent = (condition: Patient['condition']) => {
    switch (condition) {
      case 'Critical': return 'border-l-4 border-l-red-500';
      case 'Stable': return 'border-l-4 border-l-green-500';
      case 'Improving': return 'border-l-4 border-l-blue-500';
      case 'Discharged': return 'border-l-4 border-l-gray-400';
      default: return 'border-l-4 border-l-gray-400';
    }
  };

  /**
   * Get avatar background color based on condition
   */
  const getAvatarColor = (condition: Patient['condition']) => {
    switch (condition) {
      case 'Critical': return 'bg-gradient-to-br from-red-100 to-red-200 text-red-600';
      case 'Stable': return 'bg-gradient-to-br from-green-100 to-green-200 text-green-600';
      case 'Improving': return 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600';
      case 'Discharged': return 'bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600';
      default: return 'bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600';
    }
  };

  // Calculate patient age with date validation
  const birthDate = new Date(patient.date_of_birth);
  const age = isValid(birthDate) ? new Date().getFullYear() - birthDate.getFullYear() : 'N/A';

  // Format admission date with validation
  const admissionDate = new Date(patient.admission_date);
  const formattedAdmissionDate = isValid(admissionDate) ? format(admissionDate, 'MMM dd') : 'N/A';

  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl hover:shadow-blue-100/50 transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${getCardAccent(patient.condition)} h-80 flex flex-col`}
     onClick={onClick}
    >
      {/* Patient Header with Enhanced Avatar - Fixed Height */}
      <div className="flex items-start justify-between mb-4 h-20">
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <div className={`p-3 rounded-full shadow-lg flex-shrink-0 ${getAvatarColor(patient.condition)}`}>
            <User className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 
              className="text-xl font-bold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate" 
              title={`${patient.first_name} ${patient.last_name}`}
            >
              {patient.first_name} {patient.last_name}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center space-x-2">
              <span>{age} years old</span>
              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
              <span>{patient.gender}</span>
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md mt-1 w-fit">
              {patient.patient_id}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-2 flex-shrink-0">
          <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border shadow-lg whitespace-nowrap ${getConditionColor(patient.condition)}`}>
            {patient.condition}
          </span>
          {onShowBracelet && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowBracelet();
              }}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Generate Patient Bracelet"
            >
              <QrCode className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Location and Admission Info - Fixed Height */}
      <div className="grid grid-cols-2 gap-4 mb-4 h-16">
        <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex-shrink-0">
            <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Location</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              Room {patient.room_number}{patient.bed_number}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg flex-shrink-0">
            <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Admitted</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formattedAdmissionDate}</p>
          </div>
        </div>
      </div>

      {/* Enhanced Footer with Alerts and Medications - Fixed at Bottom */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 mt-auto">
        {/* Allergy Indicator */}
        <div className="flex items-center space-x-2">
          {patient.allergies && patient.allergies.length > 0 && (
            <div className="flex items-center space-x-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold">
                {patient.allergies.length} Allergies
              </span>
            </div>
          )}
        </div>

        {/* Active Medications Count - Note: medications are loaded separately */}
        <div className="flex items-center space-x-2 text-right">
          {/* Removed medications display as it should be handled by separate medication service */}
          
          {/* Days in hospital */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Day {Math.ceil((Date.now() - new Date(patient.admission_date).getTime()) / (1000 * 60 * 60 * 24))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientCard;