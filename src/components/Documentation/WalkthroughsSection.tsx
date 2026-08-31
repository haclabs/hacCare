/**
 * Walkthroughs Section — Knowledge Base
 * Displays embedded Scribe (scribehow.com) walkthroughs. Everyone can watch;
 * only super_admin can add/edit/delete entries (enforced by RLS + UI gating).
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlayCircle, Plus, Pencil, Trash2, X, ExternalLink } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import {
  getWalkthroughs,
  createWalkthrough,
  updateWalkthrough,
  deleteWalkthrough,
  type KBWalkthrough,
  type KBWalkthroughInput,
} from '../../services/admin/walkthroughService';

const emptyForm: KBWalkthroughInput = { title: '', scribe_url: '', description: '', category: '' };

const WalkthroughModal: React.FC<{
  initial: KBWalkthrough | null;
  onClose: () => void;
  onSave: (input: KBWalkthroughInput) => Promise<void>;
}> = ({ initial, onClose, onSave }) => {
  const [form, setForm] = useState<KBWalkthroughInput>(
    initial
      ? { title: initial.title, scribe_url: initial.scribe_url, description: initial.description || '', category: initial.category || '' }
      : emptyForm
  );
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.scribe_url.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">{initial ? 'Edit Walkthrough' : 'Add Walkthrough'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Launching a Simulation"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Scribe Embed URL</label>
            <input
              type="url"
              value={form.scribe_url}
              onChange={(e) => setForm((f) => ({ ...f, scribe_url: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://scribehow.com/embed/..."
              required
            />
            <p className="text-xs text-gray-400 mt-1">From Scribe: Share → Embed → copy the iframe src URL.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description (optional)</label>
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Category (optional)</label>
            <input
              type="text"
              value={form.category || ''}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Simulations"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const WalkthroughsSection: React.FC = () => {
  const { hasRole } = useAuth();
  const canManage = hasRole(['super_admin']);
  const queryClient = useQueryClient();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<KBWalkthrough | null>(null);
  const [playing, setPlaying] = useState<KBWalkthrough | null>(null);

  const { data: walkthroughs = [], isLoading } = useQuery({
    queryKey: ['kbWalkthroughs'],
    queryFn: getWalkthroughs,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['kbWalkthroughs'] });

  const createMutation = useMutation({ mutationFn: createWalkthrough, onSuccess: invalidate });
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: KBWalkthroughInput }) => updateWalkthrough(id, updates),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({ mutationFn: deleteWalkthrough, onSuccess: invalidate });

  const handleSave = async (input: KBWalkthroughInput) => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, updates: input });
    } else {
      await createMutation.mutateAsync(input);
    }
  };

  const handleDelete = (walkthrough: KBWalkthrough) => {
    if (!confirm(`Delete walkthrough "${walkthrough.title}"?`)) return;
    deleteMutation.mutate(walkthrough.id);
  };

  if (!isLoading && walkthroughs.length === 0 && !canManage) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5 text-green-600" />
          <h2 className="font-semibold text-gray-900">Walkthroughs</h2>
        </div>
        {canManage && (
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Walkthrough
          </button>
        )}
      </div>

      {walkthroughs.length === 0 ? (
        <p className="text-sm text-gray-400">No walkthroughs yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {walkthroughs.map((w) => (
            <div key={w.id} className="group relative border border-gray-200 rounded-lg p-4 hover:border-green-300 hover:shadow-sm transition-all">
              <button onClick={() => setPlaying(w)} className="text-left w-full">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-green-50 rounded-lg flex-shrink-0">
                    <PlayCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{w.title}</p>
                    {w.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{w.description}</p>}
                  </div>
                </div>
              </button>
              {canManage && (
                <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => { setEditing(w); setShowModal(true); }}
                    className="p-1.5 bg-gray-100 text-gray-500 hover:bg-gray-200 rounded-md"
                    title="Edit"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleDelete(w)}
                    className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-md"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <WalkthroughModal initial={editing} onClose={() => setShowModal(false)} onSave={handleSave} />
      )}

      {playing && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">{playing.title}</h3>
              <div className="flex items-center gap-2">
                <a
                  href={playing.scribe_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-gray-400 hover:text-gray-600"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
                <button onClick={() => setPlaying(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="aspect-video w-full">
              <iframe
                src={playing.scribe_url}
                title={playing.title}
                className="w-full h-full rounded-b-lg"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalkthroughsSection;
