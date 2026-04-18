import React from 'react';
import { Tag, X } from 'lucide-react';
import type { SimulationActiveWithDetails } from '../types/simulation';
import { PRIMARY_CATEGORIES, SUB_CATEGORIES } from '../types/simulation';

interface EditCategoriesModalProps {
  editCategoriesModal: { sim: SimulationActiveWithDetails; primary: string[]; sub: string[] };
  setEditCategoriesModal: (v: { sim: SimulationActiveWithDetails; primary: string[]; sub: string[] } | null) => void;
  actionLoading: string | null;
  onSave: () => void;
}

export const EditCategoriesModal: React.FC<EditCategoriesModalProps> = ({
  editCategoriesModal,
  setEditCategoriesModal,
  actionLoading,
  onSave,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Tag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Edit Category Tags</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">{editCategoriesModal.sim.name}</p>
            </div>
          </div>
          <button
            onClick={() => setEditCategoriesModal(null)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Primary Categories */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Primary Category (Program)
            </label>
            <div className="grid grid-cols-2 gap-3">
              {PRIMARY_CATEGORIES.map((category) => {
                const isSelected = editCategoriesModal.primary.includes(category.value);
                return (
                  <label
                    key={category.value}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditCategoriesModal({ ...editCategoriesModal, primary: [...editCategoriesModal.primary, category.value] });
                        } else {
                          setEditCategoriesModal({ ...editCategoriesModal, primary: editCategoriesModal.primary.filter(c => c !== category.value) });
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className={`px-2 py-1 rounded text-xs font-medium ${category.color}`}>{category.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Sub Categories */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Sub-Category (Type)
            </label>
            <div className="grid grid-cols-3 gap-3">
              {SUB_CATEGORIES.map((category) => {
                const isSelected = editCategoriesModal.sub.includes(category.value);
                return (
                  <label
                    key={category.value}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-slate-300 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-500'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditCategoriesModal({ ...editCategoriesModal, sub: [...editCategoriesModal.sub, category.value] });
                        } else {
                          setEditCategoriesModal({ ...editCategoriesModal, sub: editCategoriesModal.sub.filter(c => c !== category.value) });
                        }
                      }}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className={`px-2 py-1 rounded text-xs font-medium ${category.color}`}>{category.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              💡 You can update categories on active simulations without disrupting them. Changes take effect immediately.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-6 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => setEditCategoriesModal(null)}
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={actionLoading === editCategoriesModal.sim.id}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
          >
            {actionLoading === editCategoriesModal.sim.id ? 'Saving...' : 'Save Categories'}
          </button>
        </div>
      </div>
    </div>
  );
};
