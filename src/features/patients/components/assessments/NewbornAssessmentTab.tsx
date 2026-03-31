import React, { useState, useEffect } from 'react';
import { Save, Baby } from 'lucide-react';
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
    student_name: record.student_name ?? '',
    recorded_at: record.recorded_at,
  };
}

export const NewbornAssessmentTab: React.FC<NewbornAssessmentTabProps> = ({ patient, currentUser }) => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  const tenantId = patient.tenant_id ?? currentTenant?.id ?? '';

  const [form, setForm] = useState<Omit<NewbornAssessmentInput, never>>(emptyForm);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ── Load existing record ────────────────────────────────────────────────────
  const { data: existing, isLoading } = useQuery({
    queryKey: ['newborn_assessment', patient.id, tenantId],
    queryFn: () => getNewbornAssessment(patient.id, tenantId),
    enabled: !!tenantId && !!patient.id,
  });

  // Populate form on first load
  useEffect(() => {
    if (existing) {
      setForm(fromRecord(existing));
    } else if (currentUser) {
      setForm(prev => ({
        ...prev,
        student_name: currentUser.name,
        completed_by: currentUser.name,
      }));
    }
  }, [existing, currentUser]);

  // ── Mutations ───────────────────────────────────────────────────────────────
  const { mutate: save, isPending: isSaving, isError, error: saveError } = useMutation({
    mutationFn: () =>
      saveNewbornAssessment(patient.id, tenantId, {
        ...form,
        recorded_at: form.recorded_at || new Date().toISOString(),
      } as NewbornAssessmentInput),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newborn_assessment', patient.id, tenantId] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  // ── Generic field change handler ────────────────────────────────────────────
  const handleChange = (field: string, value: string | boolean | number | undefined) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // ── Physical observations change ────────────────────────────────────────────
  const handleObservationsChange = (updated: PhysicalObservations) => {
    setForm(prev => ({ ...prev, physical_observations: updated }));
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Student Name</label>
            <input
              type="text"
              value={form.student_name ?? ''}
              onChange={e => handleChange('student_name', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Full name"
            />
          </div>
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
      </section>

      {/* ── Save bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        {saveSuccess ? (
          <span className="text-sm text-green-600 font-medium">Assessment saved successfully.</span>
        ) : isError ? (
          <span className="text-sm text-red-600 font-medium">
            Save failed: {(saveError as any)?.message ?? 'Unknown error'}
          </span>
        ) : (
          <span className="text-sm text-gray-400">All changes are saved manually.</span>
        )}
        <button
          onClick={() => save()}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium bg-cyan-600 text-white hover:bg-cyan-700 disabled:opacity-60 transition-colors"
        >
          <Save className="h-4 w-4" />
          {isSaving ? 'Saving…' : 'Save Assessment'}
        </button>
      </div>
    </div>
  );
};
