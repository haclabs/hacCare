/**
 * PatientOverview
 *
 * Patient header card: avatar, demographics, age-band badge, floating action bar,
 * and bottom action buttons (ID Bracelet, Quick Intro).
 *
 * Extracted from ModularPatientDashboard.tsx to keep that file under 350 lines.
 */

import React from 'react';
import {
  Activity,
  Pill,
  FileText,
  User,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  Badge,
  FileCheck,
  MessageSquare,
  FlaskConical,
  MapPin,
  Droplets,
  BookOpen,
  ClipboardList,
} from 'lucide-react';
import { getAvatarById } from '../../../data/patientAvatars';
import { calculatePreciseAge } from '../../../utils/vitalRanges';
import type { Patient } from '../../../types';

type ActiveModule =
  | 'vitals'
  | 'medications'
  | 'forms'
  | 'overview'
  | 'handover'
  | 'advanced-directives'
  | 'hacmap'
  | 'intake-output';

interface PatientOverviewProps {
  patient: Patient;
  lastUpdated: Date;
  unacknowledgedLabsCount: number;
  unacknowledgedCount: number;
  unacknowledgedHandoverCount: number;
  onModuleChange: (module: ActiveModule) => void;
  onShowLabs: () => void;
  onShowDoctorsOrders: () => void;
  onPrintRecord: () => void;
  onShowBracelet?: (patient: Patient) => void;
  onShowQuickIntro: () => void;
}

const AGE_BAND_LABELS: Record<string, string> = {
  NEWBORN: 'Newborn (0-28 days)',
  INFANT: 'Infant (1-12 months)',
  TODDLER: 'Toddler (1-3 years)',
  PRESCHOOL: 'Preschool (3-5 years)',
  SCHOOL_AGE: 'School Age (6-12 years)',
  ADOLESCENT: 'Adolescent (13-18 years)',
  ADULT: 'Adult (18+ years)',
};

function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export const PatientOverview: React.FC<PatientOverviewProps> = ({
  patient,
  lastUpdated,
  unacknowledgedLabsCount,
  unacknowledgedCount,
  unacknowledgedHandoverCount,
  onModuleChange,
  onShowLabs,
  onShowDoctorsOrders,
  onPrintRecord,
  onShowBracelet,
  onShowQuickIntro,
}) => {
  const getPatientStatus = () => {
    if (!patient.vitals || patient.vitals.length === 0) {
      return { status: 'pending', label: 'Assessment Needed', color: 'yellow' };
    }
    return { status: 'stable', label: 'Stable', color: 'green' };
  };

  const patientStatus = getPatientStatus();
  const age = calculateAge(patient.date_of_birth);
  const ageInfo = calculatePreciseAge(patient.date_of_birth);

  return (
    <div className="bg-white border-l-4 border-l-emerald-400 border border-gray-200 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
      {/* Top Row: Avatar, Name, Status */}
      <div className="flex items-start justify-between mb-6">
        {/* Left: Avatar & Patient Info */}
        <div className="flex items-center space-x-5">
          {/* Premium Avatar with Status Ring */}
          <div className="relative">
            <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-emerald-400 shadow-lg shadow-emerald-200/60">
              {patient.avatar_id ? (
                <div
                  className="w-full h-full bg-white"
                  dangerouslySetInnerHTML={{ __html: getAvatarById(patient.avatar_id)?.svg || '' }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                  <User className="h-10 w-10 text-white" />
                </div>
              )}
            </div>
            {/* Status Indicator Badge */}
            <div
              className={`absolute -bottom-1 -right-1 w-7 h-7 ${
                patientStatus.color === 'green'
                  ? 'bg-emerald-500'
                  : patientStatus.color === 'yellow'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              } rounded-full border-3 border-white shadow-lg flex items-center justify-center`}
            >
              {patientStatus.color === 'green' ? (
                <CheckCircle className="h-4 w-4 text-white" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-white" />
              )}
            </div>
          </div>

          {/* Patient Details */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1.5 tracking-tight">
              {patient.first_name} {patient.last_name}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
              <span className="flex items-center space-x-1.5">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{age} years</span>
                <span className="text-gray-400">•</span>
                <span>{patient.gender}</span>
              </span>
              <span className="flex items-center space-x-1.5">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="font-medium">Room {patient.room_number || 'Unassigned'}</span>
              </span>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800 border border-blue-300">
                {AGE_BAND_LABELS[ageInfo.ageBand]}
              </span>
            </div>
            <div className="flex items-center space-x-1.5 text-xs text-gray-500 font-mono">
              <Badge className="h-3.5 w-3.5" />
              <span>Patient ID:</span>
              <span className="text-gray-700 font-semibold">{patient.patient_id}</span>
            </div>
          </div>
        </div>

        {/* Right: Status Badge */}
        <div className="flex flex-col items-end space-y-2">
          <div
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-semibold border shadow-sm ${
              patientStatus.color === 'green'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : patientStatus.color === 'yellow'
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-red-100 text-red-800 border-red-300'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full mr-2 animate-pulse ${
                patientStatus.color === 'green'
                  ? 'bg-emerald-500'
                  : patientStatus.color === 'yellow'
                  ? 'bg-amber-500'
                  : 'bg-red-500'
              }`}
            />
            {patientStatus.label}
          </div>
          <div className="text-xs text-gray-500">
            <Clock className="h-3 w-3 inline mr-1" />
            Updated {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Floating Action Bar */}
      <div className="mt-6 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            {/* Chart Review */}
            <button
              onClick={onPrintRecord}
              className="flex flex-col items-center gap-2 px-4 py-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 group"
            >
              <FileText className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600">
                Chart
              </span>
            </button>

            {/* Vitals & Assessments */}
            <button
              onClick={() => onModuleChange('vitals')}
              className="flex flex-col items-center gap-2 px-4 py-3 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 group relative"
            >
              <div className="relative">
                <Activity className="h-5 w-5 text-purple-600 group-hover:scale-110 transition-transform" />
                <ClipboardList className="h-3 w-3 text-purple-500 absolute -bottom-1 -right-2" />
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-purple-600 whitespace-nowrap">
                Vitals & Assess.
              </span>
              {patient.vitals && patient.vitals.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-purple-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {patient.vitals.length}
                </span>
              )}
            </button>

            {/* Medications */}
            <button
              onClick={() => onModuleChange('medications')}
              className="flex flex-col items-center gap-2 px-4 py-3 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-200 group relative"
            >
              <Pill className="h-5 w-5 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-emerald-600">
                Meds
              </span>
              {patient.medications && patient.medications.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {patient.medications.length}
                </span>
              )}
            </button>

            {/* Labs */}
            <button
              onClick={onShowLabs}
              className="flex flex-col items-center gap-2 px-4 py-3 rounded-lg hover:bg-cyan-50 dark:hover:bg-cyan-900/20 transition-all duration-200 group relative"
            >
              <FlaskConical className="h-5 w-5 text-cyan-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-cyan-600">
                Labs
              </span>
              {unacknowledgedLabsCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full shadow-sm animate-pulse">
                  NEW
                </span>
              )}
            </button>

            {/* Orders */}
            <button
              onClick={onShowDoctorsOrders}
              className="flex flex-col items-center gap-2 px-4 py-3 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-200 group relative"
            >
              <FileCheck className="h-5 w-5 text-orange-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-orange-600">
                Orders
              </span>
              {unacknowledgedCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full shadow-sm animate-pulse">
                  NEW
                </span>
              )}
            </button>

            {/* HacMap */}
            <button
              onClick={() => onModuleChange('hacmap')}
              className="flex flex-col items-center gap-2 px-4 py-3 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all duration-200 group"
            >
              <MapPin className="h-5 w-5 text-rose-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-rose-600">
                HacMap
              </span>
            </button>

            {/* I&O */}
            <button
              onClick={() => onModuleChange('intake-output')}
              className="flex flex-col items-center gap-2 px-4 py-3 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all duration-200 group"
            >
              <Droplets className="h-5 w-5 text-indigo-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-indigo-600">
                I&O
              </span>
            </button>

            {/* Notes/Handover */}
            <button
              onClick={() => onModuleChange('handover')}
              className="flex flex-col items-center gap-2 px-4 py-3 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all duration-200 group relative"
            >
              <MessageSquare className="h-5 w-5 text-amber-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 group-hover:text-amber-600">
                Notes
              </span>
              {unacknowledgedHandoverCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-[9px] font-bold rounded-full shadow-sm animate-pulse">
                  NEW
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2">
          {onShowBracelet && (
            <button
              onClick={() => onShowBracelet(patient)}
              className="flex items-center text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-lg transition-all duration-200 border border-blue-200 hover:border-blue-300 text-sm font-medium"
              title="Show ID Bracelet"
            >
              <Badge className="h-4 w-4 mr-1.5" />
              ID Bracelet
            </button>
          )}
          <button
            onClick={onShowQuickIntro}
            className="flex items-center text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3.5 py-2 rounded-lg transition-all duration-200 border border-emerald-200 hover:border-emerald-300 text-sm font-medium"
            title="Student Quick Introduction Guide"
          >
            <BookOpen className="h-4 w-4 mr-1.5" />
            Quick Intro
          </button>
        </div>

        {/* Quick Stats Summary */}
        <div className="flex items-center space-x-4 text-xs text-gray-600">
          <span className="flex items-center space-x-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium">Status: Active</span>
          </span>
          <span className="text-gray-400">•</span>
          <span className="flex items-center space-x-1">
            <Clock className="h-3.5 w-3.5" />
            <span>Last updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
