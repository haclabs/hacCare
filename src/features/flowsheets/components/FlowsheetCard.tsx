import React from 'react';
import { ArrowUpRight, Clock } from 'lucide-react';
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
  const Icon = sheet.icon;
  const isComingSoon = sheet.linkType === 'native' && sheet.status === 'coming-soon';
  const isModuleShortcut = sheet.linkType === 'module-shortcut';

  return (
    <button
      onClick={() => !isComingSoon && onOpen(sheet)}
      disabled={isComingSoon}
      className={[
        'group relative flex-shrink-0 w-52 text-left rounded-xl bg-white',
        'border border-gray-200 p-3.5 shadow-sm transition-all duration-150',
        isComingSoon
          ? 'opacity-55 cursor-not-allowed'
          : 'cursor-pointer hover:border-gray-300 hover:shadow-md hover:-translate-y-px',
      ].join(' ')}
    >
      {/* Top row: icon + title + badge */}
      <div className="flex items-start gap-2.5">
        {/* Icon */}
        <div className={`flex-shrink-0 p-1.5 rounded-lg ${meta.iconBg}`}>
          <Icon className={`h-4 w-4 ${meta.iconColor}`} />
        </div>

        {/* Title + last-recorded */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <h3 className="text-xs font-semibold text-gray-900 leading-snug line-clamp-2 flex-1">
              {sheet.title}
            </h3>
            {isComingSoon && (
              <span className="flex-shrink-0 flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 text-[9px] font-semibold rounded bg-gray-100 text-gray-500 uppercase tracking-wide">
                <Clock className="h-2 w-2" />
                SOON
              </span>
            )}
            {isModuleShortcut && (
              <ArrowUpRight
                className={`flex-shrink-0 mt-0.5 h-3 w-3 ${meta.iconColor} opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5`}
              />
            )}
          </div>

        </div>
      </div>

      {/* Description */}
      <p className="mt-2.5 text-[11px] text-gray-500 leading-relaxed line-clamp-2">
        {isModuleShortcut
          ? `Opens in ${MODULE_LABELS[sheet.moduleTarget] ?? sheet.moduleTarget}`
          : sheet.description}
      </p>
    </button>
  );
};
