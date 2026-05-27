import React, { useState, useEffect } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useTRScreening, useSaveTRScreening } from '../../hooks/useTRScreening';
import { PreFilledBadge } from '../shared/PreFilledBadge';
import type { Patient } from '../../../../types';
import type { TRCurrentUser } from '../../types';

interface Props {
  patient: Patient;
  tenantId: string;
  currentUser: TRCurrentUser;
  isBaseline: boolean;
}

const COMMUNITY_PATTERNS = [
  'Daily',
  'Several times/week',
  'Weekly',
  'Monthly',
  'Rarely',
  'Not at all',
];

export const TRScreeningCard: React.FC<Props> = ({
  patient,
  tenantId,
  currentUser,
  isBaseline,
}) => {
  const { data: existing, isLoading } = useTRScreening(patient.id, tenantId);
  const { save, isSaving, error } = useSaveTRScreening(patient.id, tenantId);

  // Part 1 — Leisure / Boredom
  const [experiencesBoredom, setExperiencesBoredom] = useState<boolean | null>(null);
  const [boredomFrequency, setBoredomFrequency] = useState('');
  const [takesInitiative, setTakesInitiative] = useState<boolean | null>(null);

  // Part 1 — Social
  const [socialContactFrequency, setSocialContactFrequency] = useState('');
  const [socialEngagementRating, setSocialEngagementRating] = useState('');
  const [socialComments, setSocialComments] = useState('');

  // Part 1 — Community
  const [communityFrequency, setCommunityFrequency] = useState('');
  const [balanceActivePassive, setBalanceActivePassive] = useState<boolean | null>(null);

  // Part 1 — Satisfaction
  const [leisureSatisfactionRating, setLeisureSatisfactionRating] = useState('');
  const [leisureParticipationNotes, setLeisureParticipationNotes] = useState('');

  // Part 2 — Barriers
  const [barriersDescription, setBarriersDescription] = useState('');
  const [readinessToParticipate, setReadinessToParticipate] = useState('');

  // LCM
  const [lcmLeisureAttitude, setLcmLeisureAttitude] = useState('');
  const [lcmSocialContact, setLcmSocialContact] = useState('');
  const [lcmCommunity, setLcmCommunity] = useState('');

  // Recommendation
  const [recommendation, setRecommendation] = useState<'treatment' | 'independent' | 'not_priority' | null>(null);
  const [clinicianSignature, setClinicianSignature] = useState('');
  const [studentName, setStudentName] = useState('');

  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    setExperiencesBoredom(existing.experiences_boredom);
    setBoredomFrequency(existing.boredom_frequency ?? '');
    setTakesInitiative(existing.takes_initiative);
    setSocialContactFrequency(existing.social_contact_frequency ?? '');
    setSocialEngagementRating(existing.social_engagement_rating != null ? String(existing.social_engagement_rating) : '');
    setSocialComments(existing.social_comments ?? '');
    setCommunityFrequency(existing.community_frequency ?? '');
    setBalanceActivePassive(existing.balance_active_passive);
    setLeisureSatisfactionRating(existing.leisure_satisfaction_rating != null ? String(existing.leisure_satisfaction_rating) : '');
    setLeisureParticipationNotes(existing.leisure_participation_notes ?? '');
    setBarriersDescription(existing.leisure_barriers_description ?? '');
    setReadinessToParticipate(existing.readiness_to_participate != null ? String(existing.readiness_to_participate) : '');
    setLcmLeisureAttitude(existing.lcm_leisure_attitude_score != null ? String(existing.lcm_leisure_attitude_score) : '');
    setLcmSocialContact(existing.lcm_social_contact_score != null ? String(existing.lcm_social_contact_score) : '');
    setLcmCommunity(existing.lcm_community_participation_score != null ? String(existing.lcm_community_participation_score) : '');
    setRecommendation(existing.tr_recommendation ?? null);
    setClinicianSignature(existing.clinician_signature ?? '');
    setStudentName(existing.recorded_by ?? currentUser.name);
    setSavedAt(existing.updated_at ?? existing.created_at ?? null);
  }, [existing]);

  const handleSave = async () => {
    await save({
      patient_id: patient.id,
      tenant_id: tenantId,
      is_baseline: isBaseline,
      recorded_by: studentName.trim() || currentUser.name,
      experiences_boredom: experiencesBoredom,
      boredom_frequency: boredomFrequency || null,
      takes_initiative: takesInitiative,
      social_contact_frequency: socialContactFrequency || null,
      social_support: null,
      social_contact_performance: null,
      social_engagement_rating: socialEngagementRating !== '' ? Number(socialEngagementRating) : null,
      social_comments: socialComments || null,
      community_frequency: communityFrequency || null,
      community_participation_pattern: null,
      balance_active_passive: balanceActivePassive,
      community_accessibility: null,
      leisure_satisfaction_rating: leisureSatisfactionRating !== '' ? Number(leisureSatisfactionRating) : null,
      leisure_participation_notes: leisureParticipationNotes || null,
      leisure_barriers_description: barriersDescription || null,
      personal_barriers: null,
      functional_barriers: null,
      social_barriers: null,
      environmental_barriers: null,
      readiness_to_participate: readinessToParticipate !== '' ? Number(readinessToParticipate) : null,
      lcm_leisure_attitude_score: lcmLeisureAttitude !== '' ? Number(lcmLeisureAttitude) : null,
      lcm_social_contact_score: lcmSocialContact !== '' ? Number(lcmSocialContact) : null,
      lcm_community_participation_score: lcmCommunity !== '' ? Number(lcmCommunity) : null,
      tr_recommendation: recommendation,
      clinician_signature: clinicianSignature || null,
      completed_at: null,
    });
    setSavedAt(new Date().toISOString());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Patient info row */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">Patient</p>
          <p className="text-sm font-semibold text-gray-800">
            {patient.first_name} {patient.last_name}
            {patient.patient_id && <span className="ml-2 font-normal text-gray-400 font-mono">{patient.patient_id}</span>}
          </p>
        </div>
        {existing && <PreFilledBadge />}
      </div>

      {/* Part 1 — Leisure Participation */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Part 1 — Leisure Participation</h3>
        <div className="space-y-4">
          {/* Boredom */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Does the client experience boredom?</label>
            <div className="flex gap-2">
              {([true, false, null] as const).map((v) => (
                <button key={String(v)} type="button"
                  onClick={() => setExperiencesBoredom(v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    experiencesBoredom === v
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}>
                  {v === null ? 'Unknown' : v ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
            {experiencesBoredom && (
              <input type="text" className="mt-2 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
                value={boredomFrequency} onChange={(e) => setBoredomFrequency(e.target.value)}
                placeholder="Frequency / description…" />
            )}
          </div>

          {/* Initiative */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Does the client take initiative in leisure?</label>
            <div className="flex gap-2">
              {([true, false, null] as const).map((v) => (
                <button key={String(v) + '-init'} type="button"
                  onClick={() => setTakesInitiative(v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    takesInitiative === v
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}>
                  {v === null ? 'Unknown' : v ? 'Yes' : 'No'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Social Contact */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Social Contact</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contact Frequency</label>
            <input type="text" value={socialContactFrequency}
              onChange={(e) => setSocialContactFrequency(e.target.value)}
              placeholder="e.g. Daily, Weekly…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Social Engagement Rating (1–7)</label>
            <input type="number" min={1} max={7}
              value={socialEngagementRating}
              onChange={(e) => setSocialEngagementRating(e.target.value)}
              placeholder="e.g. 5"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Social Comments</label>
            <textarea rows={2} value={socialComments}
              onChange={(e) => setSocialComments(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
        </div>
      </div>

      {/* Community Participation */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Community Participation</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Participation Frequency</label>
            <select value={communityFrequency} onChange={(e) => setCommunityFrequency(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-emerald-500">
              <option value="">Select…</option>
              {COMMUNITY_PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Active / Passive Balance</label>
            <div className="flex gap-2 mt-1">
              {([true, false, null] as const).map((v) => (
                <button key={String(v) + '-ap'} type="button"
                  onClick={() => setBalanceActivePassive(v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    balanceActivePassive === v
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                  }`}>
                  {v === null ? 'Unknown' : v ? 'Active' : 'Passive'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Leisure Satisfaction */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Leisure Satisfaction</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Satisfaction Rating (1–7)</label>
            <input type="number" min={1} max={7}
              value={leisureSatisfactionRating}
              onChange={(e) => setLeisureSatisfactionRating(e.target.value)}
              placeholder="e.g. 4"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">Participation Notes</label>
            <textarea rows={2} value={leisureParticipationNotes}
              onChange={(e) => setLeisureParticipationNotes(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
        </div>
      </div>

      {/* Part 2 — Barriers */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Part 2 — Leisure Barriers</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Barriers Description</label>
            <textarea rows={3} value={barriersDescription}
              onChange={(e) => setBarriersDescription(e.target.value)}
              placeholder="Describe barriers to leisure participation…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 resize-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Readiness to Participate (1–10)</label>
            <input type="number" min={1} max={10}
              value={readinessToParticipate}
              onChange={(e) => setReadinessToParticipate(e.target.value)}
              placeholder="e.g. 7"
              className="w-full sm:w-32 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
      </div>

      {/* LCM Screen Summary */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">LCM Screening Scores (1–7)</h3>
        <p className="text-xs text-gray-400 mb-3">Quick screen scores; full LCM in Assessment Battery</p>
        <div className="grid grid-cols-3 gap-3">
          {([
            ['Leisure Attitude', lcmLeisureAttitude, setLcmLeisureAttitude],
            ['Social Contact', lcmSocialContact, setLcmSocialContact],
            ['Community Participation', lcmCommunity, setLcmCommunity],
          ] as [string, string, React.Dispatch<React.SetStateAction<string>>][]).map(([label, val, setter]) => (
            <div key={label}>
              <label className="block text-xs text-gray-600 mb-1">{label}</label>
              <input type="number" min={1} max={7} value={val}
                onChange={(e) => setter(e.target.value)}
                placeholder="—"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500" />
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Screening Recommendation</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {([
            ['treatment', 'TR Treatment Indicated'],
            ['independent', 'Independent Leisure — Monitor'],
            ['not_priority', 'Not a Priority at This Time'],
          ] as ['treatment' | 'independent' | 'not_priority', string][]).map(([val, label]) => (
            <button key={val} type="button" onClick={() => setRecommendation(val)}
              className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors text-center ${
                recommendation === val
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:border-emerald-400'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

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
          By entering your name, you confirm you conducted this screening and recorded these findings.
        </p>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {(error as Error).message}
        </p>
      )}

      {/* Save bar */}
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
          Save Screening
        </button>
      </div>
    </div>
  );
};
