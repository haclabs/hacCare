import React, { useState, useEffect, useCallback } from 'react';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { supabase } from '../../../lib/api/supabase';
import { useAuth } from '../../../hooks/useAuth';
import { secureLogger } from '../../../lib/security/secureLogger';
import LoadingSpinner from '../../../components/UI/LoadingSpinner';
import type { CatalogEntry } from '../../patients/components/mar/CatalogMedicationPicker';

const ROUTES = [
  { value: 'oral',         label: 'Oral' },
  { value: 'intravenous',  label: 'Intravenous (IV)' },
  { value: 'intramuscular',label: 'Intramuscular (IM)' },
  { value: 'subcutaneous', label: 'Subcutaneous (SC)' },
  { value: 'topical',      label: 'Topical' },
  { value: 'inhalation',   label: 'Inhalation' },
  { value: 'rectal',       label: 'Rectal' },
  { value: 'sublingual',   label: 'Sublingual' },
  { value: 'nasal',        label: 'Nasal' },
  { value: 'transdermal',  label: 'Transdermal' },
];

const CATEGORIES = [
  { value: 'scheduled',   label: 'Scheduled' },
  { value: 'prn',         label: 'PRN (As Needed)' },
  { value: 'continuous',  label: 'Continuous' },
  { value: 'diabetic',    label: '🩸 Diabetic' },
  { value: 'stat',        label: 'STAT' },
  { value: 'unscheduled', label: 'Unscheduled' },
];

const FORMULATIONS = ['tablet', 'capsule', 'injection', 'IV solution', 'cream', 'patch', 'inhaler', 'drops', 'suppository', 'spray'];

interface FormState {
  barcode: string;
  name: string;
  generic_name: string;
  formulation: string;
  strength: string;
  route: string;
  category: string;
  notes: string;
}

const emptyForm = (): FormState => ({
  barcode: '',
  name: '',
  generic_name: '',
  formulation: 'tablet',
  strength: '',
  route: 'oral',
  category: 'scheduled',
  notes: '',
});

const CATEGORY_COLORS: Record<string, string> = {
  scheduled:   'bg-blue-100 text-blue-700',
  prn:         'bg-amber-100 text-amber-700',
  continuous:  'bg-purple-100 text-purple-700',
  diabetic:    'bg-red-100 text-red-700',
  stat:        'bg-orange-100 text-orange-700',
  unscheduled: 'bg-gray-100 text-gray-700',
};

const ROUTE_COLORS: Record<string, string> = {
  oral:          'bg-green-100 text-green-700',
  intravenous:   'bg-blue-100 text-blue-700',
  intramuscular: 'bg-indigo-100 text-indigo-700',
  subcutaneous:  'bg-teal-100 text-teal-700',
  topical:       'bg-yellow-100 text-yellow-700',
  inhalation:    'bg-sky-100 text-sky-700',
  rectal:        'bg-pink-100 text-pink-700',
  sublingual:    'bg-lime-100 text-lime-700',
  nasal:         'bg-cyan-100 text-cyan-700',
  transdermal:   'bg-violet-100 text-violet-700',
};

export const MedicationCatalogAdmin: React.FC = () => {
  const { hasRole } = useAuth();
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CatalogEntry | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');

  const isSuperAdmin = hasRole('super_admin');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase
      .from('medications_catalog')
      .select('id, barcode, name, generic_name, formulation, strength, route, category, display_order')
      .eq('is_active', true)
      .order('display_order', { ascending: true, nullsFirst: false });

    if (err) {
      secureLogger.error('Failed to load medication catalog', err);
      setError('Failed to load catalog');
    } else {
      setEntries((data as CatalogEntry[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    // Auto-suggest the next MZ barcode based on the highest existing one
    const nextBarcode = (() => {
      const mzNums = entries
        .map((e) => e.barcode.match(/^MZ(\d+)$/i))
        .filter(Boolean)
        .map((m) => parseInt(m![1], 10));
      const max = mzNums.length > 0 ? Math.max(...mzNums) : 0;
      return `MZ${String(max + 1).padStart(3, '0')}`;
    })();
    setForm({ ...emptyForm(), barcode: nextBarcode });
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const openEdit = (entry: CatalogEntry) => {
    setEditing(entry);
    setForm({
      barcode:      entry.barcode,
      name:         entry.name,
      generic_name: entry.generic_name ?? '',
      formulation:  entry.formulation,
      strength:     entry.strength,
      route:        entry.route,
      category:     entry.category,
      notes:        '',
    });
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.barcode.trim() || !form.name.trim() || !form.strength.trim()) {
      setError('Barcode, name, and strength are required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      if (editing) {
        const { error: err } = await supabase
          .from('medications_catalog')
          .update({
            barcode:      form.barcode.trim().toUpperCase(),
            name:         form.name.trim(),
            generic_name: form.generic_name.trim() || null,
            formulation:  form.formulation,
            strength:     form.strength.trim(),
            route:        form.route,
            category:     form.category,
            notes:        form.notes.trim() || null,
          })
          .eq('id', editing.id);

        if (err) throw err;
        setSuccess(`"${form.name}" updated successfully`);
      } else {
        const { error: err } = await supabase
          .from('medications_catalog')
          .insert({
            barcode:       form.barcode.trim().toUpperCase(),
            name:          form.name.trim(),
            generic_name:  form.generic_name.trim() || null,
            formulation:   form.formulation,
            strength:      form.strength.trim(),
            route:         form.route,
            category:      form.category,
            notes:         form.notes.trim() || null,
            tenant_id:     null, // global entry
            is_active:     true,
          });

        if (err) throw err;
        setSuccess(`"${form.name}" added to catalog`);
      }

      await load();
      setTimeout(() => { setShowModal(false); setSuccess(''); }, 1200);
    } catch (err: any) {
      secureLogger.error('Catalog save error', err);
      if (err?.code === '23505') {
        setError(`Barcode "${form.barcode.toUpperCase()}" is already in use`);
      } else {
        setError(err?.message || 'Save failed');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirm(null);
    try {
      const { error: err } = await supabase
        .from('medications_catalog')
        .update({ is_active: false })
        .eq('id', id);

      if (err) throw err;
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      secureLogger.error('Catalog delete error', err);
      setError('Failed to remove entry');
    }
  };

  const filtered = filterText.trim()
    ? entries.filter((e) =>
        e.name.toLowerCase().includes(filterText.toLowerCase()) ||
        e.barcode.toLowerCase().includes(filterText.toLowerCase()) ||
        (e.generic_name?.toLowerCase().includes(filterText.toLowerCase()) ?? false)
      )
    : entries;

  if (!isSuperAdmin) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-800">Access Denied</h2>
        <p className="text-gray-500 mt-2">Medication catalog management requires super_admin privileges.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Medication Catalog</h1>
            <p className="text-sm text-gray-500">Global QR-barcode medication reference · {entries.length} entries</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Add Entry
        </button>
      </div>

      {/* Global feedback */}
      {error && !showModal && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Filter */}
      <div className="mb-4">
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Filter by name, barcode, or generic name…"
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><LoadingSpinner /></div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Barcode</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden md:table-cell">Strength · Form</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600 hidden sm:table-cell">Route</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Category</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                    {filterText ? 'No matches found' : 'No catalog entries yet'}
                  </td>
                </tr>
              )}
              {filtered.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded font-semibold">
                      {entry.barcode}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{entry.name}</p>
                    {entry.generic_name && (
                      <p className="text-xs text-gray-400">{entry.generic_name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                    {entry.strength} · <span className="text-gray-400">{entry.formulation}</span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROUTE_COLORS[entry.route] ?? 'bg-gray-100 text-gray-600'}`}>
                      {entry.route}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[entry.category] ?? 'bg-gray-100 text-gray-600'}`}>
                      {entry.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(entry)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {deleteConfirm === entry.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-xs px-2 py-1 border border-gray-300 text-gray-600 rounded hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(entry.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Deactivate"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-blue-600" />
                <h2 className="text-base font-semibold text-gray-900">
                  {editing ? 'Edit Catalog Entry' : 'Add Catalog Entry'}
                </h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  {success}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Barcode * <span className="text-xs text-gray-400 font-normal">(e.g. MZ021)</span>
                  </label>
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={(e) => setForm((p) => ({ ...p, barcode: e.target.value }))}
                    required
                    placeholder="MZ021"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Strength *</label>
                  <input
                    type="text"
                    value={form.strength}
                    onChange={(e) => setForm((p) => ({ ...p, strength: e.target.value }))}
                    required
                    placeholder="e.g. 25 mg"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  placeholder="e.g. Metoprolol Tartrate"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Generic Name <span className="text-xs text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.generic_name}
                  onChange={(e) => setForm((p) => ({ ...p, generic_name: e.target.value }))}
                  placeholder="e.g. Metoprolol"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Formulation *</label>
                  <select
                    value={form.formulation}
                    onChange={(e) => setForm((p) => ({ ...p, formulation: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {FORMULATIONS.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Route *</label>
                  <select
                    value={form.route}
                    onChange={(e) => setForm((p) => ({ ...p, route: e.target.value }))}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ROUTES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes <span className="text-xs text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Clinical notes or special instructions…"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {submitting ? 'Saving…' : editing ? 'Save Changes' : 'Add to Catalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicationCatalogAdmin;
