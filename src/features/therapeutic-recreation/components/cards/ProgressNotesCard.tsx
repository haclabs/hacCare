import React, { useState } from 'react';
import { PenLine, Plus, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useProgressNotes, useSaveProgressNote } from '../../hooks/useProgressNotes';
import type { Patient } from '../../../../types';
import type { TRProgressNote, TRCurrentUser } from '../../types';

interface Props {
  patient: Patient;
  tenantId: string;
  currentUser: TRCurrentUser;
}

type NoteType = 'soap' | 'narrative';

interface NoteFormState {
  note_type: NoteType;
  note_date: string;
  note_time: string;
  clinician_name: string;
  // SOAP
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  // Narrative
  narrative: string;
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function nowTime(): string {
  return new Date().toTimeString().slice(0, 5);
}

function emptyForm(): NoteFormState {
  return {
    note_type: 'soap',
    note_date: todayDate(),
    note_time: nowTime(),
    clinician_name: '',
    subjective: '',
    objective: '',
    assessment: '',
    plan: '',
    narrative: '',
  };
}

function NoteCard({ note, idx }: { note: TRProgressNote; idx: number }) {
  const [open, setOpen] = useState(idx === 0);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            note.note_type === 'soap' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
          }`}>
            {note.note_type?.toUpperCase() ?? 'NOTE'}
          </span>
          <span className="text-sm font-medium text-gray-800">
            {note.note_date} {note.note_time ? `@ ${note.note_time}` : ''}
          </span>
          {note.clinician_name && (
            <span className="text-xs text-gray-500">— {note.clinician_name}</span>
          )}
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-gray-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-gray-400" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100">
          {note.note_type === 'soap' ? (
            <>
              {note.subjective && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Subjective</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.subjective}</p>
                </div>
              )}
              {note.objective && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Objective</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.objective}</p>
                </div>
              )}
              {note.assessment && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Assessment</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.assessment}</p>
                </div>
              )}
              {note.plan && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Plan</p>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.plan}</p>
                </div>
              )}
            </>
          ) : (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Narrative</p>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{note.narrative}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const ProgressNotesCard: React.FC<Props> = ({ patient, tenantId, currentUser }) => {
  const { data: notes = [], isLoading } = useProgressNotes(patient.id, tenantId);
  const { save, isSaving, error, reset } = useSaveProgressNote(patient.id, tenantId);

  const [showForm, setShowForm] = useState(false);
  const [studentName, setStudentName] = useState('');
  const [form, setForm] = useState<NoteFormState>(emptyForm());

  const handleField = (field: keyof NoteFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openForm = () => {
    setForm({ ...emptyForm(), clinician_name: studentName });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    await save({
      patient_id: patient.id,
      tenant_id: tenantId,
      note_type: form.note_type,
      note_date: form.note_date,
      note_time: form.note_time || null,
      clinician_name: form.clinician_name,
      subjective: form.note_type === 'soap' ? form.subjective : null,
      objective: form.note_type === 'soap' ? form.objective : null,
      assessment: form.note_type === 'soap' ? form.assessment : null,
      plan: form.note_type === 'soap' ? form.plan : null,
      narrative: form.note_type === 'narrative' ? form.narrative : null,
      recorded_by_user_id: currentUser.id,
    });
    setForm(emptyForm());
    setShowForm(false);
    reset();
  };

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
          By entering your name, you confirm you authored these progress notes.
        </p>
      </div>

      {/* New note button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openForm}
          className="flex items-center gap-2 bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Note
        </button>
      </div>

      {/* New note form */}
      {showForm && (
        <div className="border border-emerald-200 rounded-xl p-5 bg-emerald-50/30 space-y-4">
          {/* Note type toggle */}
          <div className="flex gap-2">
            {(['soap', 'narrative'] as NoteType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleField('note_type', t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  form.note_type === t
                    ? t === 'soap'
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Date, time, clinician */}
<div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input
                  type="date"
                  value={form.note_date}
                  onChange={(e) => handleField('note_date', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                <input
                  type="time"
                  value={form.note_time}
                  onChange={(e) => handleField('note_time', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* SOAP fields */}
          {form.note_type === 'soap' && (
            <div className="space-y-3">
              {(
                [
                  ['subjective', 'Subjective', "Client reports…"],
                  ['objective', 'Objective', "Observed behaviours, performance data, attendance…"],
                  ['assessment', 'Assessment', "Therapist interpretation of subjective/objective data…"],
                  ['plan', 'Plan', "Planned next steps, modifications, discharge criteria…"],
                ] as [keyof NoteFormState, string, string][]
              ).map(([field, label, placeholder]) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                    {label}
                  </label>
                  <textarea
                    rows={3}
                    value={form[field] as string}
                    onChange={(e) => handleField(field, e.target.value)}
                    placeholder={placeholder}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Narrative field */}
          {form.note_type === 'narrative' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                Narrative
              </label>
              <textarea
                rows={7}
                value={form.narrative}
                onChange={(e) => handleField('narrative', e.target.value)}
                placeholder="Write a narrative description of the TR session, client participation, responses, and outcomes…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {(error as Error).message}
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setForm(emptyForm());
                reset();
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
              Save Note
            </button>
          </div>
        </div>
      )}

      {/* Notes list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
        </div>
      ) : notes.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-gray-300 rounded-xl bg-gray-50">
          <PenLine className="mx-auto h-8 w-8 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">No progress notes yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "New Note" to write your first note</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note, idx) => (
            <NoteCard key={note.id} note={note} idx={idx} />
          ))}
        </div>
      )}
    </div>
  );
};
