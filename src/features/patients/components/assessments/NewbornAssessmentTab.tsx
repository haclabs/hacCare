import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Save, Baby, User } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '../../../../contexts/TenantContext';
import {
  getNewbornAssessment,
  saveNewbornAssessment,
} from '../../../../services/patient/multiTenantPatientService';
import type { NewbornAssessment, NewbornAssessmentInput, PhysicalObservations } from '../../types/newbornAssessment';
import { NewbornBirthDetailsSection } from './newborn/NewbornBirthDetailsSection';
import { NewbornMedicationsSection } from './newborn/NewbornMedicationsSection';
import { NewbornPhysicalObservationsSection } from './newborn/NewbornPhysicalObservationsSection';

interface NewbornAssessmentTabProps {
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    patient_id: string;
    tenant_id?: string;
    date_of_birth?: string;
  };
  currentUser?: { id: string; name: string; role: string };
}

// ─── Empty form state ─────────────────────────────────────────────────────────
function emptyForm(): Omit<NewbornAssessmentInput, never> {
  return {
    time_of_birth: '',
    weight_grams: undefined,
    length_cm: undefined,
    head_circumference_cm: undefined,
    head_circumference_1hr_cm: undefined,
    head_circumference_2hr_cm: undefined,
    apgar_1min: undefined,
    apgar_5min: undefined,
    apgar_10min: undefined,
    vitamin_k_given: false,
    vitamin_k_declined: false,
    vitamin_k_dose: null,
    vitamin_k_site: '',
    vitamin_k_date: '',
    vitamin_k_time: '',
    vitamin_k_signature: '',
    erythromycin_given: false,
    erythromycin_date: '',
    erythromycin_time: '',
    erythromycin_signature: '',
    physical_observations: {},
    completed_by: '',
    completed_initials: '',
    student_name: '',
    recorded_at: new Date().toISOString(),
  };
}

// ─── Map loaded record to flat form state ─────────────────────────────────────
function fromRecord(record: NewbornAssessment): Omit<NewbornAssessmentInput, never> {
  return {
    time_of_birth: record.time_of_birth ?? '',
    weight_grams: record.weight_grams ?? undefined,
    length_cm: record.length_cm ?? undefined,
    head_circumference_cm: record.head_circumference_cm ?? undefined,
    head_circumference_1hr_cm: record.head_circumference_1hr_cm ?? undefined,
    head_circumference_2hr_cm: record.head_circumference_2hr_cm ?? undefined,
    apgar_1min: record.apgar_1min ?? undefined,
    apgar_5min: record.apgar_5min ?? undefined,
    apgar_10min: record.apgar_10min ?? undefined,
    vitamin_k_given: record.vitamin_k_given ?? false,
    vitamin_k_declined: record.vitamin_k_declined ?? false,
    vitamin_k_dose: record.vitamin_k_dose ?? null,
    vitamin_k_site: record.vitamin_k_site ?? '',
    vitamin_k_date: record.vitamin_k_date ?? '',
    vitamin_k_time: record.vitamin_k_time ?? '',
    vitamin_k_signature: record.vitamin_k_signature ?? '',
    erythromycin_given: record.erythromycin_given ?? false,
    erythromycin_date: record.erythromycin_date ?? '',
    erythromycin_time: record.erythromycin_time ?? '',
    erythromycin_signature: record.erythromycin_signature ?? '',
    physical_observations: (record.physical_observations as PhysicalObservations) ?? {},
    completed_by: record.completed_by ?? '',
    completed_initials: record.completed_initials ?? '',
    student_name: '',
    recorded_at: record.recorded_at,
  };
}

export const NewbornAssessmentTab: React.FC<NewbornAssessmentTabProps> = ({ patient, currentUser }) => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  const tenantId = patient.tenant_id ?? currentTenant?.id ?? '';

  const [form, setForm] = useState<Omit<NewbornAssessmentInput, never>>(emptyForm);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(false);
  const [pendingName, setPendingName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Load existing record ────────────────────────────────────────────────────
  const { data: existing, isLoading } = useQuery({
    queryKey: ['newborn_assessment', patient.id, tenantId],
    queryFn: () => getNewbornAssessment(patient.id, tenantId),
    enabled: !!tenantId && !!patient.id,
  });

  // Populate form on first load
  useEffect(() => {
    if (existing) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(fromRecord(existing));
    } else if (currentUser) {
      setForm(prev => ({
        ...prev,
        completed_by: currentUser.name,
      }));
    }
  }, [existing, currentUser]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const saveFn = (formOverride?: Omit<NewbornAssessmentInput, never>) => {
    const formToSave = formOverride ?? form;
    return saveNewbornAssessment(patient.id, tenantId, {
      ...formToSave,
      recorded_at: formToSave.recorded_at || new Date().toISOString(),
    } as NewbornAssessmentInput);
  };

  const { mutate: save, isPending: isSaving, isError, error: saveError } = useMutation({
    mutationFn: saveFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newborn_assessment', patient.id, tenantId] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  // Silent auto-save for physical observations — no loading state or success banner
  const { mutate: autoSave } = useMutation({ mutationFn: saveFn });

  // ── Generic field change handler ────────────────────────────────────────────
  const handleChange = (field: string, value: string | boolean | number | undefined) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // ── Physical observations change — debounced auto-save ────────────────────
  const handleObservationsChange = useCallback((updated: PhysicalObservations) => {
    const updatedForm = { ...form, physical_observations: updated };
    setForm(updatedForm);
    // Debounce: wait 800ms after last checkbox click before saving
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      autoSave(updatedForm);
    }, 800);
  }, [form, autoSave]);

  // ── Save with name confirmation ─────────────────────────────────────────────
  const handleSaveClick = () => {
    if (!form.student_name?.trim()) {
      setPendingName('');
      setShowNamePrompt(true);
      setTimeout(() => nameInputRef.current?.focus(), 50);
    } else {
      save(undefined);
    }
  };

  const handleNameConfirm = () => {
    const name = pendingName.trim();
    if (!name) return;
    const updatedForm = { ...form, student_name: name, completed_by: form.completed_by || name };
    setForm(updatedForm);
    setShowNamePrompt(false);
    save(updatedForm);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-gray-500">
        <Baby className="h-5 w-5 mr-2 animate-pulse" />
        Loading newborn assessment…
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Baby className="h-5 w-5 text-cyan-600" />
            Initial Newborn Assessment
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {patient.first_name} {patient.last_name} · ID: {patient.patient_id}
          </p>
        </div>
        {existing && (
          <span className="text-xs text-gray-400">
            Last saved: {existing.recorded_at ? new Date(existing.recorded_at).toLocaleString() : 'Unknown'}
          </span>
        )}
      </div>

      {/* ── Section 1: Birth Details ─────────────────────────────────────── */}
      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Birth Details</h4>
        <NewbornBirthDetailsSection
          dateOfBirth={patient.date_of_birth}
          timeOfBirth={form.time_of_birth ?? ''}
          weightGrams={form.weight_grams !== undefined ? String(form.weight_grams) : ''}
          lengthCm={form.length_cm !== undefined ? String(form.length_cm) : ''}
          headCircumferenceCm={form.head_circumference_cm !== undefined ? String(form.head_circumference_cm) : ''}
          headCircumference1hrCm={form.head_circumference_1hr_cm !== undefined ? String(form.head_circumference_1hr_cm) : ''}
          headCircumference2hrCm={form.head_circumference_2hr_cm !== undefined ? String(form.head_circumference_2hr_cm) : ''}
          apgar1min={form.apgar_1min !== undefined ? String(form.apgar_1min) : ''}
          apgar5min={form.apgar_5min !== undefined ? String(form.apgar_5min) : ''}
          apgar10min={form.apgar_10min !== undefined ? String(form.apgar_10min) : ''}
          onChange={(field, value) => {
            const numericFields = [
              'weight_grams', 'length_cm',
              'head_circumference_cm', 'head_circumference_1hr_cm', 'head_circumference_2hr_cm',
              'apgar_1min', 'apgar_5min', 'apgar_10min',
            ];
            if (numericFields.includes(field)) {
              handleChange(field, value === '' ? undefined : Number(value));
            } else {
              handleChange(field, value);
            }
          }}
        />
      </section>

      {/* ── Section 2: Medications ───────────────────────────────────────── */}
      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Medications</h4>
        <NewbornMedicationsSection
          vitaminKGiven={form.vitamin_k_given ?? false}
          vitaminKDeclined={form.vitamin_k_declined ?? false}
          vitaminKDose={form.vitamin_k_dose ?? ''}
          vitaminKSite={form.vitamin_k_site ?? ''}
          vitaminKDate={form.vitamin_k_date ?? ''}
          vitaminKTime={form.vitamin_k_time ?? ''}
          vitaminKSignature={form.vitamin_k_signature ?? ''}
          erythromycinGiven={form.erythromycin_given ?? false}
          erythromycinDate={form.erythromycin_date ?? ''}
          erythromycinTime={form.erythromycin_time ?? ''}
          erythromycinSignature={form.erythromycin_signature ?? ''}
          onChange={(field, value) => handleChange(field, value)}
        />
      </section>

      {/* ── Section 3: Physical Observations ────────────────────────────── */}
      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Physical Assessment</h4>
        <NewbornPhysicalObservationsSection
          observations={(form.physical_observations as PhysicalObservations) ?? {}}
          onChange={handleObservationsChange}
        />
      </section>

      {/* ── Section 4: Signature ─────────────────────────────────────────── */}
      <section className="bg-white rounded-lg border border-gray-200 p-5">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Completed By</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nurse / Assessor Name</label>
            <input
              type="text"
              value={form.completed_by ?? ''}
              onChange={e => handleChange('completed_by', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Full name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Initials</label>
            <input
              type="text"
              value={form.completed_initials ?? ''}
              onChange={e => handleChange('completed_initials', e.target.value)}
              maxLength={4}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 uppercase"
              placeholder="RN"
            />
          </div>
        </div>
        {/* Student name - highlighted verification field */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-yellow-900 mb-2">
            Student Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.student_name ?? ''}
            onChange={e => handleChange('student_name', e.target.value)}
            className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
            placeholder="e.g. Jane Smith"
          />
          <p className="text-xs text-yellow-700 mt-2">
            By entering your name, you verify that all information above is correct and you recorded this assessment.
          </p>
        </div>
      </section>

      {/* ── Save bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex flex-col gap-0.5">
          {saveSuccess ? (
            <span className="text-sm text-green-600 font-medium">Assessment saved successfully.</span>
          ) : isError ? (
            <span className="text-sm text-red-600 font-medium">
              Save failed: {(saveError as any)?.message ?? 'Unknown error'}
            </span>
          ) : (
            <span className="text-sm text-gray-400">All changes are saved manually.</span>
          )}
          {import.meta.env.DEV && (() => {
            const obs = (form.physical_observations ?? {}) as Record<string, Record<string, unknown>>;
            const counts = Object.entries(obs).map(([sys, fields]) => {
              const items = Object.values(fields).flatMap(v => Array.isArray(v) ? v : (v ? [v] : []));
              return items.length > 0 ? `${sys}:${items.length}` : null;
            }).filter(Boolean);
            const total = Object.values(obs).flatMap(fields =>
              Object.values(fields).flatMap(v => Array.isArray(v) ? v : (v ? [v] : []))
            ).length;
            return total > 0 ? (
              <span className="text-xs text-violet-500 font-mono">
                [DEV] physical_obs: {total} item{total !== 1 ? 's' : ''} — {counts.join(', ')}
              </span>
            ) : (
              <span className="text-xs text-gray-300 font-mono">[DEV] physical_obs: empty</span>
            );
          })()}
        </div>
        <button
          onClick={handleSaveClick}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-60 transition-colors"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving…' : 'Save Assessment'}
        </button>
      </div>

      {/* ── Student name prompt modal ─────────────────────────────────────── */}
      {showNamePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-cyan-100 rounded-lg">
                <User className="h-5 w-5 text-cyan-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Enter Your Name</h3>
                <p className="text-xs text-gray-500">Required to save this assessment</p>
              </div>
            </div>
            <input
              ref={nameInputRef}
              type="text"
              value={pendingName}
              onChange={e => setPendingName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleNameConfirm(); if (e.key === 'Escape') setShowNamePrompt(false); }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 mb-4"
              placeholder="Full name"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowNamePrompt(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNameConfirm}
                disabled={!pendingName.trim()}
                className="px-4 py-2 text-sm font-medium bg-cyan-600 text-white rounded-md hover:bg-cyan-700 disabled:opacity-50 transition-colors"
              >
                Save Assessment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
