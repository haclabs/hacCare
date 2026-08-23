/**
 * ModuleSelector
 *
 * Grid of clickable module and action cards shown on the patient overview page.
 * Uses the same CompactActionCard shell as the Clinical Flowsheets Hub so every
 * module/flowsheet link across the app looks consistent.
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
  LayoutGrid,
  ArrowUpRight,
} from 'lucide-react';
import { CompactActionCard } from '../../../components/UI/CompactActionCard';
import type { Patient } from '../../../types';

type ActiveModule =
  | 'vitals'
  | 'medications'
  | 'forms'
  | 'overview'
  | 'handover'
  | 'advanced-directives'
  | 'hacmap'
  | 'intake-output'
  | 'flowsheets'
  | 'labs'
  | 'doctors-orders'
  | 'therapeutic-recreation';

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

/** Small badge shown top-right of a card. 'alert' pulses red; 'neutral' is a muted count chip. */
function renderBadge(badge: string, tone: 'alert' | 'neutral') {
  return (
    <span
      className={
        tone === 'alert'
          ? 'flex-shrink-0 mt-0.5 px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-100 text-red-700 uppercase tracking-wide animate-pulse'
          : 'flex-shrink-0 mt-0.5 px-1.5 py-0.5 text-[9px] font-semibold rounded bg-gray-100 text-gray-500'
      }
    >
      {badge}
    </span>
  );
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
      iconBg: 'bg-cyan-50',
      iconColor: 'text-cyan-600',
      badge: patient.vitals?.length?.toString() || '0',
      badgeTone: 'neutral' as const,
    },
    {
      id: 'medications' as ActiveModule,
      title: 'Medications',
      description: 'Complete medication administration and reconciliation system',
      icon: Pill,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      badge: patient.medications?.length?.toString() || '0',
      badgeTone: 'neutral' as const,
    },
    {
      id: 'forms' as ActiveModule,
      title: 'Assessments',
      description: 'Clinical assessment forms and comprehensive documentation',
      icon: FileText,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      id: 'handover' as ActiveModule,
      title: 'Handover Notes',
      description: 'SBAR communication framework for care transitions',
      icon: MessageSquare,
      iconBg: 'bg-sky-50',
      iconColor: 'text-sky-600',
      badge: unacknowledgedHandoverCount > 0 ? 'Pending' : undefined,
      badgeTone: 'alert' as const,
    },
    {
      id: 'advanced-directives' as ActiveModule,
      title: 'Advanced Directives',
      description: 'Legal care preferences and end-of-life planning documentation',
      icon: FileText,
      iconBg: 'bg-teal-50',
      iconColor: 'text-teal-600',
    },
    {
      id: 'hacmap' as ActiveModule,
      title: 'hacMap - Device & Wound Care',
      description: 'Visual mapping and care of medical devices and wound locations on body diagram',
      icon: MapPin,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
    },
    {
      id: 'intake-output' as ActiveModule,
      title: 'Intake & Output',
      description: 'Fluid balance tracking with intake and output monitoring',
      icon: Droplets,
      iconBg: 'bg-cyan-50',
      iconColor: 'text-cyan-600',
    },
    {
      id: 'flowsheets' as ActiveModule,
      title: 'Clinical Flowsheets',
      description: 'All assessments, system reviews, risk tools, and TRG documentation in one hub',
      icon: LayoutGrid,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
    },
  ];

  const actionCards = [
    {
      id: 'patient-record',
      title: 'View Patient Record',
      description: 'Generate comprehensive medical record',
      icon: FileText,
      action: onPrintRecord,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      id: 'discharge-summary',
      title: 'Discharge Summary',
      description: 'Create discharge documentation',
      icon: FileCheck,
      action: () => alert('Discharge Summary feature coming soon!'),
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      id: 'doctors-orders',
      title: 'Doctors Orders',
      description: 'View and manage physician orders',
      icon: FileText,
      action: onShowDoctorsOrders,
      iconBg: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
      badge: unacknowledgedCount > 0 ? 'New Order' : undefined,
      badgeTone: 'alert' as const,
    },
    {
      id: 'labs',
      title: 'Labs',
      description: 'View and manage laboratory results',
      icon: FlaskConical,
      action: onShowLabs,
      iconBg: 'bg-violet-50',
      iconColor: 'text-violet-600',
      badge: unacknowledgedLabsCount > 0 ? 'New Labs' : undefined,
      badgeTone: 'alert' as const,
    },
  ];

  const cardOrder = [
    'patient-record', 'advanced-directives', 'hacmap',
    'doctors-orders', 'labs', 'vitals',
    'handover', 'medications', 'forms',
    'intake-output', 'discharge-summary', 'flowsheets',
  ];

  const renderCard = (moduleId: string) => {
    const actionCard = actionCards.find((ac) => ac.id === moduleId);
    if (actionCard) {
      return (
        <CompactActionCard
          key={actionCard.id}
          icon={actionCard.icon}
          title={actionCard.title}
          description={actionCard.description}
          iconBg={actionCard.iconBg}
          iconColor={actionCard.iconColor}
          onClick={actionCard.action}
          rightSlot={
            actionCard.badge
              ? renderBadge(actionCard.badge, actionCard.badgeTone)
              : <ArrowUpRight className={`flex-shrink-0 mt-0.5 h-3 w-3 ${actionCard.iconColor} opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5`} />
          }
        />
      );
    }

    const module = moduleConfigs.find((m) => m.id === moduleId);
    if (!module) return null;

    return (
      <CompactActionCard
        key={module.id}
        icon={module.icon}
        title={module.title}
        description={module.description}
        iconBg={module.iconBg}
        iconColor={module.iconColor}
        active={activeModule === module.id}
        onClick={() => onModuleChange(module.id)}
        rightSlot={
          module.badge
            ? renderBadge(module.badge, module.badgeTone ?? 'neutral')
            : <ArrowUpRight className={`flex-shrink-0 mt-0.5 h-3 w-3 ${module.iconColor} opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5`} />
        }
      />
    );
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-8">
      {cardOrder.map((moduleId) => renderCard(moduleId))}
    </div>
  );
};

