import React from 'react';
import { ArrowUpRight, Clock } from 'lucide-react';
import { CompactActionCard } from '../../../components/UI/CompactActionCard';
import type { FlowsheetDefinition, FlowsheetCategoryMeta } from '../types';

const MODULE_LABELS: Record<string, string> = {
  vitals: 'Vitals & Assess.',
  medications: 'Medications',
  forms: 'Assessments',
  handover: 'Handover',
  'advanced-directives': 'Adv. Directives',
  hacmap: 'hacMap',
  'intake-output': 'I&O',
};

interface FlowsheetCardProps {
  sheet: FlowsheetDefinition;
  meta: FlowsheetCategoryMeta;
  /** Hub calls this when a card is clicked; hub decides what to do based on linkType. */
  onOpen: (sheet: FlowsheetDefinition) => void;
}

export const FlowsheetCard: React.FC<FlowsheetCardProps> = ({
  sheet,
  meta,
  onOpen,
}) => {
  const isComingSoon = sheet.linkType === 'native' && sheet.status === 'coming-soon';
  const isModuleShortcut = sheet.linkType === 'module-shortcut';

  return (
    <CompactActionCard
      icon={sheet.icon}
      title={sheet.title}
      description={
        isModuleShortcut
          ? `Opens in ${MODULE_LABELS[sheet.moduleTarget] ?? sheet.moduleTarget}`
          : sheet.description
      }
      iconBg={meta.iconBg}
      iconColor={meta.iconColor}
      disabled={isComingSoon}
      fullWidth={false}
      onClick={() => onOpen(sheet)}
      rightSlot={
        isComingSoon ? (
          <span className="flex-shrink-0 flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 text-[9px] font-semibold rounded bg-gray-100 text-gray-500 uppercase tracking-wide">
            <Clock className="h-2 w-2" />
            SOON
          </span>
        ) : isModuleShortcut ? (
          <ArrowUpRight
            className={`flex-shrink-0 mt-0.5 h-3 w-3 ${meta.iconColor} opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5`}
          />
        ) : undefined
      }
    />
  );
};
