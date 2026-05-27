import React, { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useAllAssessmentScores } from '../../hooks/useAssessmentScores';
import { useActiveLivingProfile, useSaveActiveLivingProfile } from '../../hooks/useActiveLivingProfile';
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

export const LifeHistoryCard: React.FC<Props> = ({
  patient,
  tenantId,
  currentUser,
  isBaseline,
}) => {
  const allScores = useAllAssessmentScores(patient.id, tenantId);
  const scoresLoading = allScores.isLoading;
  const { data: alp, isLoading: alpLoading } = useActiveLivingProfile(patient.id, tenantId);
  const { save, isSaving, error } = useSaveActiveLivingProfile(patient.id, tenantId);

  const [narrative, setNarrative] = useState('');
  const [studentName, setStudentName] = useState('');
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!alp) return;
    setNarrative(alp.narrative ?? '');
    setStudentName(alp.recorded_by ?? '');
    setSavedAt(alp.updated_at ?? alp.created_at ?? null);
  }, [alp]);

  // Get baseline data from instructor-seeded life_history and rii tools
  const lifeHistoryBaseline = allScores.getBaseline('life_history');
  const riiBaseline = allScores.getBaseline('rii');

  const lhData = lifeHistoryBaseline?.subscale_scores as Record<string, unknown> | null | undefined;
  const riiData = riiBaseline?.subscale_scores as Record<string, unknown> | null | undefined;

  const handleSave = async () => {
    await save({
      patient_id: patient.id,
      tenant_id: tenantId,
      is_baseline: isBaseline,
      recorded_by: studentName.trim() || currentUser.name,
      recorded_by_user_id: currentUser.id,
      narrative,
    });
    setSavedAt(new Date().toISOString());
  };

  const isLoading = scoresLoading || alpLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Life History — pre-filled from baseline */}
      {lifeHistoryBaseline ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700">Life History Data</h3>
            <PreFilledBadge />
          </div>
          <p className="text-xs text-gray-500">
            This information was gathered from the case study materials by your instructor.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {lhData && Object.entries(lhData).map(([key, val]) => (
              <ReadOnlyField
                key={key}
                label={key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                value={typeof val === 'string' || typeof val === 'number' ? val : JSON.stringify(val)}
              />
            ))}
          </div>
          {lifeHistoryBaseline.interpretation && (
            <ReadOnlyField label="Additional Notes" value={lifeHistoryBaseline.interpretation} />
          )}
        </div>
      ) : (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 italic">
          No life history data has been pre-filled for this patient yet.
        </div>
      )}

      {/* RII — pre-filled */}
      {riiBaseline ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-700">Recreation Interest Inventory (RII)</h3>
            <PreFilledBadge />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {riiData && Object.entries(riiData).map(([key, val]) => (
              <ReadOnlyField
                key={key}
                label={key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                value={typeof val === 'string' || typeof val === 'number' ? val : JSON.stringify(val)}
              />
            ))}
          </div>
          {riiBaseline.interpretation && (
            <ReadOnlyField label="Notes" value={riiBaseline.interpretation} />
          )}
        </div>
      ) : (
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500 italic">
          No RII data has been pre-filled for this patient yet.
        </div>
      )}

      <hr className="border-gray-200" />

      {/* Active Living Profile — student-authored */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Active Living Profile — Student Narrative</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Synthesise the information above into a holistic leisure profile for this client.
            </p>
          </div>
          {alp && <PreFilledBadge label="Previously saved" />}
        </div>
        <textarea
          rows={8}
          value={narrative}
          onChange={(e) => setNarrative(e.target.value)}
          placeholder={`Describe ${patient.first_name}'s leisure history, current participation barriers and enablers, personal interests, and motivations for TR engagement…`}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {(error as Error).message}
        </p>
      )}

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
          By entering your name, you confirm you authored this profile narrative.
        </p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        {savedAt ? (
          <p className="text-xs text-gray-400">
            Last saved{' '}
            {new Date(savedAt).toLocaleString([], {
              dateStyle: 'short',
              timeStyle: 'short',
            })}
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save Profile
        </button>
      </div>
    </div>
  );
};
