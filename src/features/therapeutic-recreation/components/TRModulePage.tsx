import React, { useState, useCallback, useRef } from 'react';
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
  const headerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = useCallback(() => {
    let node: Element | null = headerRef.current?.parentElement ?? null;
    while (node) {
      const { overflow, overflowY } = window.getComputedStyle(node);
      if (/auto|scroll/.test(overflow + overflowY)) {
        node.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      node = node.parentElement;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    scrollToTop();
  };

  const tenantId = currentTenant?.id ?? '';
  const isBaseline = currentTenant?.tenant_type === 'simulation_template';

  const trUser: TRCurrentUser = currentUser
    ? { id: currentUser.id, name: currentUser.name, role: currentUser.role }
    : FALLBACK_USER;

  const cardProps = { patient, tenantId, currentUser: trUser, isBaseline };

  const activeTabMeta = TABS.find((t) => t.id === activeTab)!;
  const ActiveIcon = activeTabMeta.icon;

  return (
    <div className="min-h-full bg-gray-50">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div ref={headerRef} className="bg-white border-b border-gray-200 px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 p-3 bg-emerald-100 rounded-xl">
            <Leaf className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">Therapeutic Recreation</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {patient.first_name} {patient.last_name}
              {patient.patient_id && (
                <>
                  <span className="mx-2 text-gray-300">·</span>
                  <span className="font-mono text-gray-400">{patient.patient_id}</span>
                </>
              )}
              {isBaseline && (
                <>
                  <span className="mx-2 text-gray-300">·</span>
                  <span className="text-amber-600 font-medium">Template Mode</span>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Sticky tab navigation ────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-0.5 px-4 py-1.5 overflow-x-auto scrollbar-none">
          {/* Back to flowsheets */}
          <button
            onClick={onNavigateToFlowsheets}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors text-xs font-medium whitespace-nowrap flex-shrink-0 group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Flowsheets</span>
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-200 mx-1.5 flex-shrink-0" />

          {/* Section tabs */}
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors whitespace-nowrap flex-shrink-0 text-xs font-medium group ${
                  active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${active ? 'text-emerald-600' : 'text-gray-400 group-hover:text-gray-600'} group-hover:scale-110 transition-transform`} />
                <span>{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Breadcrumb + content ─────────────────────────────────────────── */}
      <div className="px-8 pt-6 pb-2">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="hover:text-emerald-600 cursor-pointer transition-colors" onClick={onNavigateToFlowsheets}>Flowsheets</span>
          <span className="text-gray-300">›</span>
          <span className="hover:text-emerald-600 cursor-pointer transition-colors" onClick={() => handleTabChange('screening')}>Therapeutic Recreation</span>
          <span className="text-gray-300">›</span>
          <span className="text-gray-900 font-medium">{activeTabMeta.label}</span>
        </div>
      </div>

      <div className="px-8 py-4">
        {/* Section header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-emerald-100 rounded-xl">
            <ActiveIcon className="h-5 w-5 text-emerald-700" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{activeTabMeta.label}</h2>
            <p className="text-xs text-gray-500">
              {patient.first_name} {patient.last_name}
              {patient.patient_id ? ` · ${patient.patient_id}` : ''}
            </p>
          </div>
        </div>

        {/* Card */}
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
