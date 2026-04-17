import React from 'react';
import { ActivityItem } from './DebriefActivityItem';

// Activity Section Component
xport const ActivitySection: React.FC<{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  section: any;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ section, isExpanded, onToggle }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    pink: 'bg-pink-50 border-pink-200 text-pink-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    teal: 'bg-teal-50 border-teal-200 text-teal-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    fuchsia: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-700'
  };

  return (
    <div>
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors print:cursor-default print:hover:bg-transparent"
      >
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{section.icon}</span>
          <span className="font-semibold text-gray-900">{section.title}</span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${colorClasses[section.color as keyof typeof colorClasses]}`}>
            {section.items.length} {section.items.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform print:hidden ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="px-6 pb-6">
          <div className="space-y-3 mt-2">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {section.items.map((item: any, idx: number) => (
              <ActivityItem key={idx} item={item} sectionKey={section.key} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

