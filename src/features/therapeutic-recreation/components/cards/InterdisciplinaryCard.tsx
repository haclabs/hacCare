import React, { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useAllAssessmentScores } from '../../hooks/useAssessmentScores';
import { useTRInterpretations, useSaveTRInterpretation } from '../../hooks/useTRInterpretations';
import { ReadOnlyField } from '../shared/ReadOnlyField';
import { PreFilledBadge } from '../shared/PreFilledBadge';
import type { Patient } from '../../../../types';
import type { TRCurrentUser } from '../../types';

interface Props {
  patient: Patient;
  tenantId: string;
  currentUser: TRCurrentUser;
  isBaseline: boolean;
}

type ScoreGroup = 'berg' | 'rai_mds' | 'fitness';

interface ScoreSection {
  id: ScoreGroup;
  label: string;
  toolFullName: string;
  placeholder: string;
}

const SECTIONS: ScoreSection[] = [
  {
    id: 'berg',
    label: 'Berg Balance Scale',
    toolFullName: 'Berg Balance Scale (BBS)',
    placeholder: 'Describe the clinical significance of the Berg Balance Score for this client and implications for TR participation…',
  },
  {
    id: 'rai_mds',
    label: 'RAI-MDS Cognitive Performance',
    toolFullName: 'RAI Minimum Data Set (RAI-MDS)',
    placeholder: 'Interpret the cognitive performance scale and what it means for TR goal setting and programme planning…',
  },
  {
    id: 'fitness',
    label: 'Fitness / Functional Assessment',
    toolFullName: 'Functional Fitness Assessment',
    placeholder: 'Discuss the fitness/functional assessment findings and how they inform TR interventions…',
  },
];

function ScoreDisplay({ scores }: { scores: Record<string, unknown> | null | undefined }) {
  if (!scores) return <span className="text-gray-400 italic text-sm">No score data available</span>;

  const entries = Object.entries(scores);
  if (!entries.length) return <span className="text-gray-400 italic text-sm">—</span>;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {entries.map(([key, val]) => (
        <ReadOnlyField
          key={key}
          label={key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          value={typeof val === 'string' || typeof val === 'number' ? val : JSON.stringify(val)}
        />
      ))}
    </div>
  );
}

export const InterdisciplinaryCard: React.FC<Props> = ({
  patient,
  tenantId,
  currentUser,
  isBaseline,
}) => {
  const allScores = useAllAssessmentScores(patient.id, tenantId);
  const scoresLoading = allScores.isLoading;
  const { getInterp, isLoading: interpsLoading } = useTRInterpretations(patient.id, tenantId);
  const { save, isSaving, error } = useSaveTRInterpretation(patient.id, tenantId);

  const [interpValues, setInterpValues] = useState<Record<ScoreGroup, string>>({
    berg: '',
    rai_mds: '',
    fitness: '',
  });

  const [studentName, setStudentName] = useState('');

  const [savedState, setSavedState] = useState<Record<ScoreGroup, boolean>>({
    berg: false,
    rai_mds: false,
    fitness: false,
  });

  useEffect(() => {
    if (interpsLoading) return;
    setInterpValues({
      berg: getInterp('berg'),
      rai_mds: getInterp('rai_mds'),
      fitness: getInterp('fitness'),
    });
  }, [interpsLoading, getInterp]);

  const handleSave = async (group: ScoreGroup) => {
    await save({
      patient_id: patient.id,
      tenant_id: tenantId,
      is_baseline: isBaseline,
      score_group: group,
      interpretation: interpValues[group],
      recorded_by: studentName.trim() || currentUser.name,
      recorded_by_user_id: currentUser.id,
    });
    setSavedState((prev) => ({ ...prev, [group]: true }));
    setTimeout(() => setSavedState((prev) => ({ ...prev, [group]: false })), 2000);
  };

  const isLoading = scoresLoading || interpsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          By entering your name, you confirm you wrote these interdisciplinary interpretations.
        </p>
      </div>

      {SECTIONS.map((section) => {
        const baseline = allScores.getBaseline(section.id);
        const scores = baseline?.subscale_scores as Record<string, unknown> | null | undefined;
        const totalScore = baseline?.total_score;

        return (
          <div key={section.id} className="border border-gray-200 rounded-xl p-5 space-y-4">
            {/* Section header */}
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-800 flex-1">{section.label}</h3>
              {baseline && <PreFilledBadge />}
            </div>

            {/* Score data */}
            {baseline ? (
              <div className="space-y-3">
                {totalScore != null && (
                  <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                    <span className="text-xs text-blue-600 font-medium uppercase tracking-wide">Total Score</span>
                    <span className="text-base font-bold text-blue-800">{totalScore}</span>
                  </div>
                )}
                <ScoreDisplay scores={scores} />
                {baseline.interpretation && (
                  <ReadOnlyField label="Clinical Notes" value={baseline.interpretation ?? ''} />
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">
                No {section.toolFullName} data entered for this patient.
              </p>
            )}

            {/* Student interpretation */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Your TR Interpretation
              </label>
              <textarea
                rows={4}
                value={interpValues[section.id]}
                onChange={(e) =>
                  setInterpValues((prev) => ({ ...prev, [section.id]: e.target.value }))
                }
                placeholder={section.placeholder}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>

            <div className="flex items-center justify-between">
              {error && (
                <p className="text-xs text-red-600">{(error as Error).message}</p>
              )}
              <span />
              <button
                type="button"
                onClick={() => handleSave(section.id)}
                disabled={isSaving}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  savedState[section.id]
                    ? 'bg-green-100 text-green-700 border border-green-300'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                } disabled:opacity-60`}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {savedState[section.id] ? 'Saved!' : 'Save Interpretation'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
