import React, { useState } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useAllAssessmentScores, useSaveAssessmentScore } from '../../hooks/useAssessmentScores';
import { LCMTable } from '../shared/LCMTable';
import { IALBScorePanel } from '../shared/IALBScorePanel';
import { CopyrightedToolNotice } from '../shared/CopyrightedToolNotice';
import { PreFilledBadge } from '../shared/PreFilledBadge';
import type { Patient } from '../../../../types';
import type { LCMComponentData, SubscaleConfig, TRCurrentUser } from '../../types';

interface Props {
  patient: Patient;
  tenantId: string;
  currentUser: TRCurrentUser;
  isBaseline: boolean;
}

const LIM_SUBSCALES: SubscaleConfig[] = [
  { key: 'physical', label: 'Physical' },
  { key: 'outdoor', label: 'Outdoor' },
  { key: 'mechanical', label: 'Mechanical' },
  { key: 'artistic', label: 'Artistic' },
  { key: 'service', label: 'Service' },
  { key: 'social', label: 'Social' },
  { key: 'cultural', label: 'Cultural' },
  { key: 'reading', label: 'Reading/Education' },
];

const LAM_SUBSCALES: SubscaleConfig[] = [
  { key: 'physical', label: 'Physical' },
  { key: 'social', label: 'Social' },
  { key: 'cognitive', label: 'Cognitive' },
  { key: 'creative', label: 'Creative' },
  { key: 'spiritual', label: 'Spiritual/Emotional' },
];

const LSM_SUBSCALES: SubscaleConfig[] = [
  { key: 'meaning', label: 'Meaning' },
  { key: 'enjoyment', label: 'Enjoyment' },
  { key: 'absorption', label: 'Absorption' },
  { key: 'competence', label: 'Competence' },
  { key: 'autonomy', label: 'Autonomy' },
];

const FTB_SUBSCALES: SubscaleConfig[] = [
  { key: 'physical', label: 'Physical' },
  { key: 'mental', label: 'Mental' },
  { key: 'meaningfulness', label: 'Meaningfulness' },
  { key: 'speed_of_time', label: 'Speed of Time' },
  { key: 'total', label: 'Total Score' },
];

type Tab = 'lcm' | 'lim' | 'lam' | 'lsm' | 'ftb';

const TABS: { id: Tab; label: string }[] = [
  { id: 'lcm', label: 'LCM' },
  { id: 'lim', label: 'LIM' },
  { id: 'lam', label: 'LAM' },
  { id: 'lsm', label: 'LSM' },
  { id: 'ftb', label: 'Frisbee' },
];

export const AssessmentBatteryCard: React.FC<Props> = ({
  patient,
  tenantId,
  currentUser,
  isBaseline,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('lcm');
  const allScores = useAllAssessmentScores(patient.id, tenantId);
  const { isLoading } = allScores;
  const { save, isSaving, error } = useSaveAssessmentScore(patient.id, tenantId);
  const [studentName, setStudentName] = useState('');

  // LCM baseline (pre-filled by instructor)
  const lcmBaseline = allScores.getBaseline('lcm');
  const lcmComponents = (lcmBaseline?.subscale_scores as LCMComponentData[] | null | undefined) ?? [];
  const lcmTotal = typeof lcmBaseline?.total_score === 'number' ? lcmBaseline.total_score : 0;

  // LIM — student enters, load latest student entry
  const limStudent = allScores.getStudentEntry('lim');
  const [limScores, setLimScores] = useState<Record<string, string>>(
    (limStudent?.subscale_scores as Record<string, string> | null | undefined) ?? {},
  );
  const [limInterp, setLimInterp] = useState(limStudent?.interpretation ?? '');
  const [limDate, setLimDate] = useState(limStudent?.date_administered ?? '');

  // LAM / LSM — template only (shown muted)
  // FTB — student enters
  const ftbStudent = allScores.getStudentEntry('ftb');
  const [ftbScores, setFtbScores] = useState<Record<string, string>>(
    (ftbStudent?.subscale_scores as Record<string, string> | null | undefined) ?? {},
  );
  const [ftbInterp, setFtbInterp] = useState(ftbStudent?.interpretation ?? '');
  const [ftbDate, setFtbDate] = useState(ftbStudent?.date_administered ?? '');

  const handleSaveLIM = async () => {
    await save({
      patient_id: patient.id,
      tenant_id: tenantId,
      is_baseline: isBaseline,
      tool_name: 'lim',
      subscale_scores: limScores as Record<string, unknown>,
      total_score: null,
      interpretation: limInterp,
      date_administered: limDate || null,
      recorded_by: studentName.trim() || currentUser.name,
      recorded_by_user_id: currentUser.id,
      administered_by: null,
    });
  };

  const handleSaveFTB = async () => {
    await save({
      patient_id: patient.id,
      tenant_id: tenantId,
      is_baseline: isBaseline,
      tool_name: 'ftb',
      subscale_scores: ftbScores as Record<string, unknown>,
      total_score: ftbScores.total ? Number(ftbScores.total) : null,
      interpretation: ftbInterp,
      date_administered: ftbDate || null,
      recorded_by: studentName.trim() || currentUser.name,
      recorded_by_user_id: currentUser.id,
      administered_by: null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Student name — required for debrief report */}
      <div className="rounded-xl border-2 border-yellow-300 bg-yellow-50 px-5 py-4 space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Student Name <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="text"
          value={studentName}
          onChange={(e) => setStudentName(e.target.value)}
          placeholder="e.g. Jane Smith"
          autoComplete="off"
          className="w-full rounded-lg border border-yellow-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-400 outline-none"
        />
        <p className="text-xs text-gray-500">
          By entering your name, you confirm you conducted these assessments and recorded these findings.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-emerald-600 text-emerald-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* LCM tab */}
      {activeTab === 'lcm' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700">
              Leisure Competence Measure (LCM)
            </h3>
            {lcmBaseline && <PreFilledBadge />}
          </div>
          
          <p className="text-xs text-gray-500">
            8-domain functional assessment scored 1–7 (higher = more independent).
          </p>
          {lcmBaseline ? (
            <LCMTable
              components={lcmComponents}
              totalScore={lcmTotal}
              dateAdministered={lcmBaseline.date_administered ?? undefined}
            />
          ) : (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 italic">
              LCM data not yet entered for this patient.
            </div>
          )}
        </div>
      )}

      {/* LIM tab */}
      {activeTab === 'lim' && (
        <div className="space-y-4">
          <CopyrightedToolNotice
            toolName="LIM"
            toolFullName="Leisure Interest Measure"
          />
          <IALBScorePanel
            toolId="lim"
            toolLabel="Leisure Interest Measure (LIM)"
            subscales={LIM_SUBSCALES}
            scores={limScores}
            interpretation={limInterp}
            dateAdministered={limDate}
            onChange={(s, i, d) => {
              setLimScores(s);
              setLimInterp(i);
              setLimDate(d);
            }}
          />
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {(error as Error).message}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveLIM}
              disabled={isSaving}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save LIM
            </button>
          </div>
        </div>
      )}

      {/* LAM tab — template only */}
      {activeTab === 'lam' && (
        <div className="space-y-4">
          <CopyrightedToolNotice
            toolName="LAM"
            toolFullName="Leisure Attitude Measure"
          />
          <IALBScorePanel
            toolId="lam"
            toolLabel="Leisure Attitude Measure (LAM)"
            subscales={LAM_SUBSCALES}
            scores={{}}
            interpretation=""
            dateAdministered=""
            onChange={() => undefined}
            isTemplateOnly
          />
        </div>
      )}

      {/* LSM tab — template only */}
      {activeTab === 'lsm' && (
        <div className="space-y-4">
          <CopyrightedToolNotice
            toolName="LSM"
            toolFullName="Leisure Satisfaction Measure"
          />
          <IALBScorePanel
            toolId="lsm"
            toolLabel="Leisure Satisfaction Measure (LSM)"
            subscales={LSM_SUBSCALES}
            scores={{}}
            interpretation=""
            dateAdministered=""
            onChange={() => undefined}
            isTemplateOnly
          />
        </div>
      )}

      {/* FTB tab */}
      {activeTab === 'ftb' && (
        <div className="space-y-4">
          <CopyrightedToolNotice
            toolName="Frisbee Time Balance"
            toolFullName="Frisbee Time Balance (FTB)"
          />
          <IALBScorePanel
            toolId="ftb"
            toolLabel="Frisbee Time Balance"
            subscales={FTB_SUBSCALES}
            scores={ftbScores}
            interpretation={ftbInterp}
            dateAdministered={ftbDate}
            onChange={(s, i, d) => {
              setFtbScores(s);
              setFtbInterp(i);
              setFtbDate(d);
            }}
          />
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {(error as Error).message}
            </p>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveFTB}
              disabled={isSaving}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save FTB
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
