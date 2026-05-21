import React, { useCallback, useState } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useSaveSystemAssessment } from '../hooks/useSystemAssessment';
import { AssessmentHistoryStrip } from '../components/AssessmentHistoryStrip';
import type { AssessmentSummary } from '../components/AssessmentHistoryStrip';
import { FlowsheetFormSection } from '../components/FlowsheetFormSection';
import type { FlowsheetFormProps, SaveSystemAssessmentInput } from '../types';

const SYSTEM_TYPE = 'integumentary' as const;

interface IntegumentaryFormData {
  studentName: string;
  skinColour: 'normal' | 'pale' | 'flushed' | 'jaundiced' | 'cyanotic' | 'mottled' | '';
  skinTemperature: 'warm' | 'cool' | 'cold' | 'hot' | 'diaphoretic' | '';
  skinTurgor: 'normal' | 'reduced' | 'tenting' | '';
  skinMoisture: 'normal' | 'dry' | 'moist' | 'diaphoretic' | '';
  skinIntegrity: 'intact' | 'impaired' | '';
  wounds: WoundEntry[];
  notes: string;
}

interface WoundEntry {
  id: string;
  location: string;
  type: 'pressure-injury' | 'surgical-incision' | 'laceration' | 'abrasion' | 'burn' | 'ulcer' | 'rash' | 'other' | '';
  stage: string;
  size: string;
  appearance: string;
  drainage: 'none' | 'serous' | 'sanguineous' | 'serosanguineous' | 'purulent' | '';
  dressing: string;
}

const DEFAULT_FORM: IntegumentaryFormData = {
  studentName: '', skinColour: '', skinTemperature: '', skinTurgor: '',
  skinMoisture: '', skinIntegrity: 'intact', wounds: [], notes: '',
};

function newWound(): WoundEntry {
  return { id: crypto.randomUUID(), location: '', type: '', stage: '', size: '', appearance: '', drainage: '', dressing: '' };
}

function validate(form: IntegumentaryFormData): string | null {
  if (!form.studentName.trim()) return 'Enter your name before saving.';
  if (!form.skinIntegrity) return 'Document skin integrity.';
  for (const w of form.wounds) {
    if (!w.location.trim()) return 'Enter a location for each wound/skin finding.';
    if (!w.type) return 'Select wound type for each wound/skin finding.';
  }
  return null;
}

export function formatIntegumentarySummary(data: Record<string, unknown>): AssessmentSummary {
  const integrity = data.skinIntegrity as string;
  const wounds = data.wounds as WoundEntry[] | undefined;
  if (integrity === 'impaired' && wounds && wounds.length > 0) {
    return { label: `${wounds.length} wound${wounds.length > 1 ? 's' : ''} documented`, color: 'red' };
  }
  if (integrity === 'impaired') return { label: 'Skin impaired', color: 'amber' };
  return { label: 'Skin intact', color: 'green' };
}

export const IntegumentaryAssessmentForm: React.FC<FlowsheetFormProps> = ({
  patient, tenantId, currentUser, isBaseline = false, onSaved, onCancel,
}) => {
  const [form, setForm] = useState<IntegumentaryFormData>(DEFAULT_FORM);
  const [validationError, setValidationError] = useState<string | null>(null);
  const { save, isSaving, error: saveError } = useSaveSystemAssessment(patient.id, tenantId, SYSTEM_TYPE);

  const set = useCallback(<K extends keyof IntegumentaryFormData>(key: K, value: IntegumentaryFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setValidationError(null);
  }, []);

  const addWound = useCallback(() => {
    setForm(prev => ({ ...prev, wounds: [...prev.wounds, newWound()] }));
  }, []);

  const removeWound = useCallback((id: string) => {
    setForm(prev => ({ ...prev, wounds: prev.wounds.filter(w => w.id !== id) }));
  }, []);

  const updateWound = useCallback((id: string, field: keyof WoundEntry, value: string) => {
    setForm(prev => ({ ...prev, wounds: prev.wounds.map(w => w.id === id ? { ...w, [field]: value } : w) }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(form);
    if (err) { setValidationError(err); return; }
    const { studentName, ...clinicalFields } = form;
    const payload: SaveSystemAssessmentInput = {
      patient_id: patient.id, tenant_id: tenantId, system_type: SYSTEM_TYPE,
      assessment_data: clinicalFields as Record<string, unknown>,
      nurse_id: currentUser?.id ?? null, nurse_name: studentName.trim(), is_baseline: isBaseline,
    };
    await save(payload);
    onSaved();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <AssessmentHistoryStrip patientId={patient.id} tenantId={tenantId} systemType={SYSTEM_TYPE} formatSummary={formatIntegumentarySummary} />

      <FlowsheetFormSection title="Skin Assessment">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Colour</label>
            <div className="flex gap-2 flex-wrap">
              {['normal', 'pale', 'flushed', 'jaundiced', 'cyanotic', 'mottled'].map(v => (
                <button key={v} type="button" onClick={() => set('skinColour', v as IntegumentaryFormData['skinColour'])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all capitalize ${form.skinColour === v ? v === 'normal' ? 'bg-green-100 border-green-400 text-green-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Temperature</label>
            <div className="flex gap-2 flex-wrap">
              {['warm', 'cool', 'cold', 'hot', 'diaphoretic'].map(v => (
                <button key={v} type="button" onClick={() => set('skinTemperature', v as IntegumentaryFormData['skinTemperature'])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all capitalize ${form.skinTemperature === v ? v === 'warm' ? 'bg-green-100 border-green-400 text-green-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Turgor</label>
            <div className="flex gap-2 flex-wrap">
              {[{ v: 'normal', l: 'Normal' }, { v: 'reduced', l: 'Reduced' }, { v: 'tenting', l: 'Tenting' }].map(({ v, l }) => (
                <button key={v} type="button" onClick={() => set('skinTurgor', v as IntegumentaryFormData['skinTurgor'])}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${form.skinTurgor === v ? v === 'normal' ? 'bg-green-100 border-green-400 text-green-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Moisture</label>
            <div className="flex gap-2 flex-wrap">
              {['normal', 'dry', 'moist', 'diaphoretic'].map(v => (
                <button key={v} type="button" onClick={() => set('skinMoisture', v as IntegumentaryFormData['skinMoisture'])}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all capitalize ${form.skinMoisture === v ? v === 'normal' ? 'bg-green-100 border-green-400 text-green-800' : 'bg-amber-100 border-amber-400 text-amber-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Skin Integrity <span class='text-red-500'>*</span>">
        <div className="flex gap-3">
          {([{ v: 'intact', l: 'Intact — no breakdown' }, { v: 'impaired', l: 'Impaired — breakdown present' }] as const).map(({ v, l }) => (
            <button key={v} type="button" onClick={() => set('skinIntegrity', v)}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition-all ${form.skinIntegrity === v ? v === 'intact' ? 'bg-green-50 border-green-400 text-green-700 ring-2 ring-green-200' : 'bg-red-50 border-red-400 text-red-700 ring-2 ring-red-200' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {l}
            </button>
          ))}
        </div>
      </FlowsheetFormSection>

      {/* Wounds / Skin Breakdown */}
      <FlowsheetFormSection title="Wounds / Skin Breakdown">
        {form.wounds.length === 0 && (
          <p className="text-sm text-gray-400 mb-3">No wounds documented. Add one if skin integrity is impaired.</p>
        )}
        {form.wounds.map((wound, index) => (
          <div key={wound.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4 mb-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Wound / Finding #{index + 1}</span>
              <button type="button" onClick={() => removeWound(wound.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Location <span className="text-red-500">*</span></label>
                <input type="text" value={wound.location} onChange={e => updateWound(wound.id, 'location', e.target.value)}
                  placeholder="e.g. sacrum, left heel"
                  className="w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type <span className="text-red-500">*</span></label>
                <select value={wound.type} onChange={e => updateWound(wound.id, 'type', e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                  <option value="">Select…</option>
                  <option value="pressure-injury">Pressure injury</option>
                  <option value="surgical-incision">Surgical incision</option>
                  <option value="laceration">Laceration</option>
                  <option value="abrasion">Abrasion</option>
                  <option value="burn">Burn</option>
                  <option value="ulcer">Venous / arterial ulcer</option>
                  <option value="rash">Rash / dermatitis</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {wound.type === 'pressure-injury' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Stage (NPUAP/EPUAP)</label>
                  <select value={wound.stage} onChange={e => updateWound(wound.id, 'stage', e.target.value)}
                    className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                    <option value="">Select…</option>
                    <option value="stage-1">Stage 1 — Non-blanchable redness</option>
                    <option value="stage-2">Stage 2 — Partial thickness</option>
                    <option value="stage-3">Stage 3 — Full thickness</option>
                    <option value="stage-4">Stage 4 — Full thickness + tissue loss</option>
                    <option value="unstageable">Unstageable</option>
                    <option value="dti">Deep tissue injury (DTI)</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Size (cm × cm)</label>
                <input type="text" value={wound.size} onChange={e => updateWound(wound.id, 'size', e.target.value)}
                  placeholder="e.g. 3 × 2 cm"
                  className="w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Appearance</label>
                <input type="text" value={wound.appearance} onChange={e => updateWound(wound.id, 'appearance', e.target.value)}
                  placeholder="e.g. clean, granulating, sloughy, necrotic edges"
                  className="w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Drainage</label>
                <select value={wound.drainage} onChange={e => updateWound(wound.id, 'drainage', e.target.value)}
                  className="w-full rounded-md border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                  <option value="">Select…</option>
                  <option value="none">None</option>
                  <option value="serous">Serous</option>
                  <option value="sanguineous">Sanguineous</option>
                  <option value="serosanguineous">Serosanguineous</option>
                  <option value="purulent">Purulent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Dressing applied</label>
                <input type="text" value={wound.dressing} onChange={e => updateWound(wound.id, 'dressing', e.target.value)}
                  placeholder="e.g. hydrocolloid, saline-moistened gauze"
                  className="w-full rounded-md border border-gray-300 px-2.5 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          </div>
        ))}
        <button type="button" onClick={addWound}
          className="w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-sm font-medium text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
          + Add Wound / Skin Finding
        </button>
      </FlowsheetFormSection>

      <FlowsheetFormSection title="Additional Notes">
        <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
          placeholder="Any additional integumentary observations…"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none" />
      </FlowsheetFormSection>

      <div className="rounded-xl border-2 border-yellow-300 bg-yellow-50 px-5 py-4 space-y-2">
        <label className="block text-sm font-medium text-gray-700">Student Name <span className="text-red-500 ml-1">*</span></label>
        <input type="text" value={form.studentName} onChange={e => set('studentName', e.target.value)}
          placeholder="e.g. Jane Smith" autoComplete="off"
          className="w-full rounded-lg border border-yellow-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-400 outline-none" />
        <p className="text-xs text-gray-500">By entering your name, you verify that you assessed this patient and recorded these findings.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {(validationError ?? saveError) && (
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{validationError ?? 'Save failed — please try again.'}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button type="button" onClick={onCancel} disabled={isSaving}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">Cancel</button>
          <button type="submit" disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 transition-colors">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving…' : 'Save Assessment'}
          </button>
        </div>
      </div>
    </form>
  );
};
