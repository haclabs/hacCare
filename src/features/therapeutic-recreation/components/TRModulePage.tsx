import React, { useState } from 'react';
import {
  ArrowLeft,
  ClipboardCheck,
  BookOpen,
  BarChart3,
  Stethoscope,
  FileText,
  PenLine,
  Leaf,
} from 'lucide-react';
import { useTenant } from '../../../contexts/TenantContext';
import { TRScreeningCard } from './cards/TRScreeningCard';
import { LifeHistoryCard } from './cards/LifeHistoryCard';
import { AssessmentBatteryCard } from './cards/AssessmentBatteryCard';
import { InterdisciplinaryCard } from './cards/InterdisciplinaryCard';
import { LASCard } from './cards/LASCard';
import { ProgressNotesCard } from './cards/ProgressNotesCard';
import type { Patient } from '../../../types';
import type { TRCurrentUser } from '../types';

interface TRModulePageProps {
  patient: Patient;
  currentUser?: {
    id: string;
    name: string;
    role: string;
    department?: string;
  };
  onNavigateToOverview: () => void;
  onNavigateToFlowsheets: () => void;
}

type TabId = 'screening' | 'life-history' | 'assessment' | 'interdisciplinary' | 'las' | 'notes';

interface Tab {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: React.FC<{ className?: string }>;
}

const TABS: Tab[] = [
  { id: 'screening', label: 'TR Screening', shortLabel: 'Screening', icon: ClipboardCheck },
  { id: 'life-history', label: 'Life History & Leisure Profile', shortLabel: 'Life History', icon: BookOpen },
  { id: 'assessment', label: 'Assessment Battery', shortLabel: 'Assessment', icon: BarChart3 },
  { id: 'interdisciplinary', label: 'Interdisciplinary Assessments', shortLabel: 'Interdisc.', icon: Stethoscope },
  { id: 'las', label: 'Leisure Assessment Summary', shortLabel: 'LAS', icon: FileText },
  { id: 'notes', label: 'Progress Notes', shortLabel: 'Notes', icon: PenLine },
];

const FALLBACK_USER: TRCurrentUser = { id: '', name: 'Unknown User', role: 'student' };

export const TRModulePage: React.FC<TRModulePageProps> = ({
  patient,
  currentUser,
  onNavigateToFlowsheets,
}) => {
  const { currentTenant } = useTenant();
  const [activeTab, setActiveTab] = useState<TabId>('screening');

  const tenantId = currentTenant?.id ?? '';
  const isBaseline = currentTenant?.tenant_type === 'simulation_template';

  const trUser: TRCurrentUser = currentUser
    ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    : FALLBACK_USER;

  const cardProps = { patient, tenantId, currentUser: trUser, isBaseline };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToFlowsheets}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Flowsheets
            </button>
            <span className="text-gray-300">›</span>
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-emerald-100 rounded-lg">
                <Leaf className="h-4 w-4 text-emerald-700" />
              </div>
              <span className="font-semibold text-gray-900">Therapeutic Recreation</span>
              {isBaseline && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                  Template Mode
                </span>
              )}
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500 ml-[4.75rem]">
            {patient.first_name} {patient.last_name}
            {patient.patient_id ? ` · ${patient.patient_id}` : ''}
          </p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <nav className="flex overflow-x-auto gap-0 -mb-px scrollbar-none">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors shrink-0 ${
                    active
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.shortLabel}</span>
                  <span className="sm:hidden">{tab.shortLabel}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Card content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          {activeTab === 'screening' && <TRScreeningCard {...cardProps} />}
          {activeTab === 'life-history' && <LifeHistoryCard {...cardProps} />}
          {activeTab === 'assessment' && <AssessmentBatteryCard {...cardProps} />}
          {activeTab === 'interdisciplinary' && <InterdisciplinaryCard {...cardProps} />}
          {activeTab === 'las' && <LASCard {...cardProps} />}
          {activeTab === 'notes' && (
            <ProgressNotesCard patient={patient} tenantId={tenantId} currentUser={trUser} />
          )}
        </div>
      </div>
    </div>
  );
};
