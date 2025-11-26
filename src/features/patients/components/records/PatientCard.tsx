import React from 'react';
import { Patient } from '../../../../types';
import { User, MapPin, Calendar, AlertTriangle, QrCode } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { PATIENT_AVATARS, getAvatarById } from '../../../../data/patientAvatars';

/**
 * Patient Card Component
 * 
 * Displays a summary card for each patient with key information and quick actions.
 * Provides an overview of patient status and allows navigation to detailed view.
 * 
 * @param {Patient} patient - Patient data object
 * @param {Function} onClick - Callback function when card is clicked
 * @param {Function} onShowBracelet - Optional callback to show patient bracelet
 * @returns {JSX.Element} Patient card component
 */
interface PatientCardProps {
  patient: Patient;
  onClick: () => void;
  onShowBracelet?: () => void;
}

const PatientCard: React.FC<PatientCardProps> = ({ patient, onClick, onShowBracelet }) => {
  /**
   * Get CSS classes for patient condition styling - clean readable theme
   * @param {Patient['condition']} condition - Patient's current condition
   * @returns {string} CSS classes for condition badge
   */
  const getConditionColor = (condition: Patient['condition']) => {
    switch (condition) {
      case 'Critical': return 'bg-red-100 text-red-800 border border-red-300 font-semibold';
      case 'Stable': return 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold';
      case 'Improving': return 'bg-blue-100 text-blue-800 border border-blue-300 font-semibold';
      case 'Discharged': return 'bg-gray-100 text-gray-800 border border-gray-300 font-semibold';
      default: return 'bg-gray-100 text-gray-800 border border-gray-300 font-semibold';
    }
  };

  /**
   * Get avatar ring color based on condition - clean rings
   */
  const getAvatarRingColor = (condition: Patient['condition']) => {
    switch (condition) {
      case 'Critical': return 'ring-4 ring-red-300 shadow-lg shadow-red-200/60';
      case 'Stable': return 'ring-4 ring-emerald-400 shadow-lg shadow-emerald-300/60';
      case 'Improving': return 'ring-4 ring-blue-300 shadow-lg shadow-blue-200/60';
      case 'Discharged': return 'ring-4 ring-gray-300 shadow-lg shadow-gray-200/60';
      default: return 'ring-4 ring-gray-300 shadow-lg shadow-gray-200/60';
    }
  };

  /**
   * Get card background - clean white
   */
  const getCardGradient = (condition: Patient['condition']) => {
    return 'bg-white';
  };

  /**
   * Get condition-specific left border accent
   */
  const getCardBorder = (condition: Patient['condition']) => {
    switch (condition) {
      case 'Critical': return 'border-l-4 border-l-red-400 border border-gray-200 shadow-lg hover:shadow-xl';
      case 'Stable': return 'border-l-4 border-l-emerald-400 border border-gray-200 shadow-lg hover:shadow-xl';
      case 'Improving': return 'border-l-4 border-l-blue-400 border border-gray-200 shadow-lg hover:shadow-xl';
      case 'Discharged': return 'border-l-4 border-l-gray-400 border border-gray-200 shadow-lg hover:shadow-xl';
      default: return 'border-l-4 border-l-gray-400 border border-gray-200 shadow-lg hover:shadow-xl';
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
      className={`${getCardGradient(patient.condition)} ${getCardBorder(patient.condition)} rounded-2xl p-6 hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:scale-[1.02] backdrop-blur-xl relative overflow-hidden group`}
      onClick={onClick}
    >
      {/* Subtle hover overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-blue-50/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      {/* Patient Header with Premium Avatar */}
      <div className="flex items-start justify-between mb-6 relative">
        <div className="flex items-center space-x-4">
          {/* Avatar with glowing ring effect */}
          <div className={`rounded-full overflow-hidden ${getAvatarRingColor(patient.condition)} transition-all duration-300 group-hover:scale-105`} style={{ width: '72px', height: '72px', flexShrink: 0 }}>
            {patient.avatar_id ? (
              <div 
                className="w-full h-full bg-white"
                dangerouslySetInnerHTML={{ __html: getAvatarById(patient.avatar_id)?.svg || '' }} 
                title={`Avatar: ${patient.avatar_id}`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <User className="h-8 w-8 text-gray-500" />
              </div>
            )}
          </div>
          
          {/* Patient Info */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-1 tracking-tight">
              {patient.first_name} {patient.last_name}
            </h3>
            <p className="text-sm text-gray-600 flex items-center space-x-2 mb-2">
              <span>{age} years</span>
              <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
              <span>{patient.gender}</span>
            </p>
            <p className="text-xs text-gray-500 font-mono tracking-wider">
              Patient ID <span className="text-gray-400">•</span> <span className="text-gray-700">{patient.patient_id}</span>
            </p>
          </div>
        </div>
        
        {/* Status Badge */}
        <div className="flex flex-col items-end space-y-2">
          <span className={`px-4 py-2 rounded-lg text-sm font-semibold ${getConditionColor(patient.condition)} transition-all duration-300`}>
            {patient.condition}
          </span>
          {onShowBracelet && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShowBracelet();
              }}
              className="p-2 text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all duration-200"
              title="Generate Patient Bracelet"
            >
              <QrCode className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Clean Info Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5 relative">
        {/* Location Card */}
        <div className="flex items-center space-x-3 p-3.5 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
          <div className="p-2 bg-blue-500 rounded-lg">
            <MapPin className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Location</p>
            <p className="text-sm font-bold text-gray-900">
              Room {patient.room_number}{patient.bed_number}
            </p>
          </div>
        </div>

        {/* Admission Card */}
        <div className="flex items-center space-x-3 p-3.5 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
          <div className="p-2 bg-purple-500 rounded-lg">
            <Calendar className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Admitted</p>
            <p className="text-sm font-bold text-gray-900">{formattedAdmissionDate}</p>
          </div>
        </div>
      </div>

      {/* Clean Footer */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between">
          {/* Left: Allergy & Status */}
          <div className="flex items-center space-x-2">
            {/* Allergy Warning */}
            {patient.allergies && patient.allergies.length > 0 && (
              <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-amber-100 rounded-md border border-amber-300">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
                <span className="text-xs text-amber-800 font-semibold">
                  {patient.allergies.length} {patient.allergies.length === 1 ? 'allergy' : 'allergies'}
                </span>
              </div>
            )}
            
            {/* Status Indicator */}
            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-gray-100 rounded-md border border-gray-300">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-gray-800 font-medium">
                {patient.condition}
              </span>
            </div>
          </div>

          {/* Right: Days Counter */}
          <div className="text-right">
            <div className="text-xs text-gray-500 font-medium">Day</div>
            <div className="text-2xl font-bold text-gray-900 leading-none">
              {Math.ceil((Date.now() - new Date(patient.admission_date).getTime()) / (1000 * 60 * 60 * 24))}
            </div>
          </div>
        </div>

        {/* Tap to open indicator */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-center text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
          <span>Tap to open full chart</span>
          <svg className="w-3.5 h-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default PatientCard;
