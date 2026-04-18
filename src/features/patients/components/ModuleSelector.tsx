/**
 * ModuleSelector
 *
 * Grid of clickable module and action cards shown on the patient overview page.
 * Contains all color config, module definitions, and card rendering logic.
 *
 * Extracted from ModularPatientDashboard.tsx to keep that file under 350 lines.
 */

import React from 'react';
import {
  Activity,
  Pill,
  FileText,
  FileCheck,
  MessageSquare,
  FlaskConical,
  MapPin,
  Droplets,
} from 'lucide-react';
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

interface ModuleSelectorProps {
  patient: Patient;
  activeModule: ActiveModule;
  onModuleChange: (module: ActiveModule) => void;
  onShowDoctorsOrders: () => void;
  onShowLabs: () => void;
  onPrintRecord: () => void;
  unacknowledgedCount: number;
  unacknowledgedLabsCount: number;
  unacknowledgedHandoverCount: number;
}

type ColorKey =
  | 'blue'
  | 'green'
  | 'orange'
  | 'purple'
  | 'indigo'
  | 'teal'
  | 'rose'
  | 'cyan'
  | 'emerald'
  | 'amber'
  | 'sky'
  | 'violet';

interface ColorClasses {
  bg: string;
  border: string;
  text: string;
  icon: string;
  badge: string;
  accent: string;
  gradient: string;
}

function getModuleColorClasses(color: string, isActive = false): ColorClasses {
  const map: Record<ColorKey, ColorClasses> = {
    blue: {
      bg: isActive ? 'bg-gradient-to-br from-blue-50 to-blue-100' : 'bg-white',
      border: isActive ? 'border-blue-400 shadow-blue-100' : 'border-gray-200',
      text: isActive ? 'text-blue-900' : 'text-gray-900',
      icon: isActive ? 'text-blue-600' : 'text-gray-500',
      badge: 'bg-blue-500 text-white',
      accent: 'bg-blue-500',
      gradient: 'from-blue-500 to-blue-600',
    },
    green: {
      bg: isActive ? 'bg-gradient-to-br from-green-50 to-green-100' : 'bg-white',
      border: isActive ? 'border-green-400 shadow-green-100' : 'border-gray-200',
      text: isActive ? 'text-green-900' : 'text-gray-900',
      icon: isActive ? 'text-green-600' : 'text-gray-500',
      badge: 'bg-green-500 text-white',
      accent: 'bg-green-500',
      gradient: 'from-green-500 to-green-600',
    },
    orange: {
      bg: isActive ? 'bg-gradient-to-br from-orange-50 to-orange-100' : 'bg-white',
      border: isActive ? 'border-orange-400 shadow-orange-100' : 'border-gray-200',
      text: isActive ? 'text-orange-900' : 'text-gray-900',
      icon: isActive ? 'text-orange-600' : 'text-gray-500',
      badge: 'bg-orange-500 text-white',
      accent: 'bg-orange-500',
      gradient: 'from-orange-500 to-orange-600',
    },
    purple: {
      bg: isActive ? 'bg-gradient-to-br from-purple-50 to-purple-100' : 'bg-white',
      border: isActive ? 'border-purple-400 shadow-purple-100' : 'border-gray-200',
      text: isActive ? 'text-purple-900' : 'text-gray-900',
      icon: isActive ? 'text-purple-600' : 'text-gray-500',
      badge: 'bg-purple-500 text-white',
      accent: 'bg-purple-500',
      gradient: 'from-purple-500 to-purple-600',
    },
    indigo: {
      bg: isActive ? 'bg-gradient-to-br from-indigo-50 to-indigo-100' : 'bg-white',
      border: isActive ? 'border-indigo-400 shadow-indigo-100' : 'border-gray-200',
      text: isActive ? 'text-indigo-900' : 'text-gray-900',
      icon: isActive ? 'text-indigo-600' : 'text-gray-500',
      badge: 'bg-indigo-500 text-white',
      accent: 'bg-indigo-500',
      gradient: 'from-indigo-500 to-indigo-600',
    },
    teal: {
      bg: isActive ? 'bg-gradient-to-br from-teal-50 to-teal-100' : 'bg-white',
      border: isActive ? 'border-teal-400 shadow-teal-100' : 'border-gray-200',
      text: isActive ? 'text-teal-900' : 'text-gray-900',
      icon: isActive ? 'text-teal-600' : 'text-gray-500',
      badge: 'bg-teal-500 text-white',
      accent: 'bg-teal-500',
      gradient: 'from-teal-500 to-teal-600',
    },
    rose: {
      bg: isActive ? 'bg-gradient-to-br from-rose-50 to-rose-100' : 'bg-white',
      border: isActive ? 'border-rose-400 shadow-rose-100' : 'border-gray-200',
      text: isActive ? 'text-rose-900' : 'text-gray-900',
      icon: isActive ? 'text-rose-600' : 'text-gray-500',
      badge: 'bg-rose-500 text-white',
      accent: 'bg-rose-500',
      gradient: 'from-rose-500 to-rose-600',
    },
    cyan: {
      bg: isActive ? 'bg-gradient-to-br from-cyan-50 to-cyan-100' : 'bg-white',
      border: isActive ? 'border-cyan-400 shadow-cyan-100' : 'border-gray-200',
      text: isActive ? 'text-cyan-900' : 'text-gray-900',
      icon: isActive ? 'text-cyan-600' : 'text-gray-500',
      badge: 'bg-cyan-500 text-white',
      accent: 'bg-cyan-500',
      gradient: 'from-cyan-500 to-cyan-600',
    },
    emerald: {
      bg: isActive ? 'bg-gradient-to-br from-emerald-50 to-emerald-100' : 'bg-white',
      border: isActive ? 'border-emerald-400 shadow-emerald-100' : 'border-gray-200',
      text: isActive ? 'text-emerald-900' : 'text-gray-900',
      icon: isActive ? 'text-emerald-600' : 'text-gray-500',
      badge: 'bg-emerald-500 text-white',
      accent: 'bg-emerald-500',
      gradient: 'from-emerald-500 to-emerald-600',
    },
    amber: {
      bg: isActive ? 'bg-gradient-to-br from-amber-50 to-amber-100' : 'bg-white',
      border: isActive ? 'border-amber-400 shadow-amber-100' : 'border-gray-200',
      text: isActive ? 'text-amber-900' : 'text-gray-900',
      icon: isActive ? 'text-amber-600' : 'text-gray-500',
      badge: 'bg-amber-500 text-white',
      accent: 'bg-amber-500',
      gradient: 'from-amber-500 to-amber-600',
    },
    sky: {
      bg: isActive ? 'bg-gradient-to-br from-sky-50 to-sky-100' : 'bg-white',
      border: isActive ? 'border-sky-400 shadow-sky-100' : 'border-gray-200',
      text: isActive ? 'text-sky-900' : 'text-gray-900',
      icon: isActive ? 'text-sky-600' : 'text-gray-500',
      badge: 'bg-sky-500 text-white',
      accent: 'bg-sky-500',
      gradient: 'from-sky-500 to-sky-600',
    },
    violet: {
      bg: isActive ? 'bg-gradient-to-br from-violet-50 to-violet-100' : 'bg-white',
      border: isActive ? 'border-violet-400 shadow-violet-100' : 'border-gray-200',
      text: isActive ? 'text-violet-900' : 'text-gray-900',
      icon: isActive ? 'text-violet-600' : 'text-gray-500',
      badge: 'bg-violet-500 text-white',
      accent: 'bg-violet-500',
      gradient: 'from-violet-500 to-violet-600',
    },
  };
  return map[color as ColorKey] ?? map.blue;
}

export const ModuleSelector: React.FC<ModuleSelectorProps> = ({
  patient,
  activeModule,
  onModuleChange,
  onShowDoctorsOrders,
  onShowLabs,
  onPrintRecord,
  unacknowledgedCount,
  unacknowledgedLabsCount,
  unacknowledgedHandoverCount,
}) => {
  const moduleConfigs = [
    {
      id: 'vitals' as ActiveModule,
      title: 'Vitals & Assessments',
      description: 'Vital signs monitoring, neuro/newborn assessments, and clinical documentation forms',
      icon: Activity,
      color: 'cyan',
      badge: patient.vitals?.length?.toString() || '0',
    },
    {
      id: 'medications' as ActiveModule,
      title: 'Medications',
      description: 'Complete medication administration and reconciliation system',
      icon: Pill,
      color: 'emerald',
      badge: patient.medications?.length?.toString() || '0',
    },
    {
      id: 'forms' as ActiveModule,
      title: 'Assessments',
      description: 'Clinical assessment forms and comprehensive documentation',
      icon: FileText,
      color: 'purple',
    },
    {
      id: 'handover' as ActiveModule,
      title: 'Handover Notes',
      description: 'SBAR communication framework for care transitions',
      icon: MessageSquare,
      color: 'sky',
      badge: unacknowledgedHandoverCount > 0 ? 'Pending' : undefined,
    },
    {
      id: 'advanced-directives' as ActiveModule,
      title: 'Advanced Directives',
      description: 'Legal care preferences and end-of-life planning documentation',
      icon: FileText,
      color: 'teal',
    },
    {
      id: 'hacmap' as ActiveModule,
      title: 'hacMap - Device & Wound Care',
      description: 'Visual mapping and care of medical devices and wound locations on body diagram',
      icon: MapPin,
      color: 'rose',
    },
    {
      id: 'intake-output' as ActiveModule,
      title: 'Intake & Output',
      description: 'Fluid balance tracking with intake and output monitoring',
      icon: Droplets,
      color: 'cyan',
    },
  ];

  const actionCards = [
    {
      id: 'patient-record',
      title: 'View Patient Record',
      description: 'Generate comprehensive medical record',
      icon: FileText,
      action: onPrintRecord,
      color: 'blue',
    },
    {
      id: 'discharge-summary',
      title: 'Discharge Summary',
      description: 'Create discharge documentation',
      icon: FileCheck,
      action: () => alert('Discharge Summary feature coming soon!'),
      color: 'green',
    },
    {
      id: 'doctors-orders',
      title: 'Doctors Orders',
      description: 'View and manage physician orders',
      icon: FileText,
      action: onShowDoctorsOrders,
      color: 'indigo',
      badge: unacknowledgedCount > 0 ? 'New Order' : undefined,
    },
    {
      id: 'labs',
      title: 'Labs',
      description: 'View and manage laboratory results',
      icon: FlaskConical,
      action: onShowLabs,
      color: 'violet',
      badge: unacknowledgedLabsCount > 0 ? 'New Labs' : undefined,
    },
  ];

  const rowLayouts = [
    ['patient-record', 'advanced-directives', 'hacmap'],
    ['doctors-orders', 'labs', 'vitals'],
    ['handover', 'medications', 'forms'],
    ['intake-output', 'discharge-summary'],
  ];

  const renderCard = (moduleId: string) => {
    const actionCard = actionCards.find((ac) => ac.id === moduleId);
    if (actionCard) {
      const Icon = actionCard.icon;
      const colorClasses = getModuleColorClasses(actionCard.color, false);
      return (
        <button
          key={actionCard.id}
          onClick={actionCard.action}
          className={`group relative p-6 rounded-xl border-2 text-left transition-all duration-300 hover:shadow-xl hover:scale-105 ${colorClasses.bg} ${colorClasses.border} shadow-sm hover:shadow-md`}
        >
          <div className={`absolute top-0 left-0 w-full h-1 rounded-t-xl bg-gradient-to-r ${colorClasses.gradient}`} />
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses.gradient} shadow-md`}>
              <Icon className="h-6 w-6 text-white" />
            </div>
            {actionCard.badge && (
              <div className="px-3 py-1 text-xs font-bold rounded-full bg-red-100 text-red-800 border border-red-200 shadow-sm animate-pulse">
                {actionCard.badge}
              </div>
            )}
          </div>
          <div>
            <h3 className={`text-xl font-bold mb-2 ${colorClasses.text} group-hover:text-opacity-90`}>
              {actionCard.title}
            </h3>
            <p className="text-sm leading-relaxed text-gray-600 group-hover:text-gray-700">
              {actionCard.description}
            </p>
          </div>
          <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-gray-200 transition-colors duration-300" />
        </button>
      );
    }

    const module = moduleConfigs.find((m) => m.id === moduleId);
    if (!module) return null;
    const Icon = module.icon;
    const isActive = activeModule === module.id;
    const colorClasses = getModuleColorClasses(module.color, isActive);

    return (
      <button
        key={module.id}
        onClick={() => onModuleChange(module.id)}
        className={`group relative p-6 rounded-xl border-2 text-left transition-all duration-300 hover:shadow-xl hover:scale-105 ${colorClasses.bg} ${colorClasses.border} ${isActive ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}
      >
        <div className={`absolute top-0 left-0 w-full h-1 rounded-t-xl bg-gradient-to-r ${colorClasses.gradient}`} />
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses.gradient} shadow-md`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          {module.badge && (
            <div className={`px-3 py-1 text-xs font-bold rounded-full ${colorClasses.badge} shadow-sm`}>
              {module.badge}
            </div>
          )}
        </div>
        <div>
          <h3 className={`text-xl font-bold mb-2 ${colorClasses.text} group-hover:text-opacity-90`}>
            {module.title}
          </h3>
          <p className={`text-sm leading-relaxed ${isActive ? 'text-gray-700' : 'text-gray-600'} group-hover:text-gray-700`}>
            {module.description}
          </p>
        </div>
        <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-gray-200 transition-colors duration-300" />
      </button>
    );
  };

  return (
    <div className="space-y-6 mb-8">
      {rowLayouts.map((row, rowIndex) => (
        <div key={rowIndex} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {row.map((moduleId) => renderCard(moduleId))}
        </div>
      ))}
    </div>
  );
};
