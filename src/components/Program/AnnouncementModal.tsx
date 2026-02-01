import React, { useState, useEffect } from 'react';
import { X, Bell, FileText, Users, BookOpen, AlertTriangle, Calendar as CalendarIcon, Pin } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTenant } from '../../contexts/TenantContext';

interface AnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (announcementData: AnnouncementData) => Promise<void>;
  existingAnnouncement?: AnnouncementData | null;
}

export interface AnnouncementData {
  id?: string;
  program_id: string;
  title: string;
  content: string;
  category: 'General' | 'Templates' | 'Training' | 'Students' | 'Important' | 'Reminder';
  is_pinned: boolean;
  author_id: string;
  author_name?: string | null;
  expires_at?: string | null;
}

const categoryOptions = [
  { value: 'General', label: 'General', icon: Bell, color: 'gray' },
  { value: 'Templates', label: 'Templates', icon: FileText, color: 'blue' },
  { value: 'Training', label: 'Training', icon: BookOpen, color: 'purple' },
  { value: 'Students', label: 'Students', icon: Users, color: 'green' },
  { value: 'Important', label: 'Important', icon: AlertTriangle, color: 'red' },
  { value: 'Reminder', label: 'Reminder', icon: CalendarIcon, color: 'amber' },
] as const;

/**
 * Announcement Modal
 * Modal for creating/editing program announcements
 */
export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingAnnouncement
}) => {
  const { user, profile } = useAuth();
  const { programTenants, currentTenant } = useTenant();
  const currentProgram = programTenants.find(pt => pt.tenant_id === currentTenant?.id);

  const [formData, setFormData] = useState<Partial<AnnouncementData>>({
    title: '',
    content: '',
    category: 'General',
    is_pinned: false,
    program_id: currentProgram?.program_id || '',
    author_id: user?.id || '',
    expires_at: null
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load existing announcement data when editing
  useEffect(() => {
    if (existingAnnouncement) {
      setFormData(existingAnnouncement);
    } else {
      setFormData({
        title: '',
        content: '',
        category: 'General',
        is_pinned: false,
        program_id: currentProgram?.program_id || '',
        author_id: user?.id || '',
        expires_at: null
      });
    }
  }, [existingAnnouncement, currentProgram, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.title?.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.content?.trim()) {
      setError('Content is required');
      return;
    }

    setSaving(true);
    try {
      const authorName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email : null;
      
      await onSave({
        ...formData,
        program_id: formData.program_id || currentProgram?.program_id || '',
        author_id: formData.author_id || user?.id || '',
        author_name: authorName
      } as AnnouncementData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const selectedCategory = categoryOptions.find(opt => opt.value === formData.category);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-800 dark:to-pink-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-white" />
            <h2 className="text-2xl font-bold text-white">
              {existingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., New Template Available"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <div className="grid grid-cols-3 gap-3">
              {categoryOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = formData.category === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: option.value })}
                    className={`flex items-center gap-2 p-3 border-2 rounded-lg transition-all ${
                      isSelected
                        ? option.color === 'blue'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : option.color === 'purple'
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30'
                          : option.color === 'green'
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/30'
                          : option.color === 'red'
                          ? 'border-red-500 bg-red-50 dark:bg-red-900/30'
                          : option.color === 'amber'
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30'
                          : 'border-gray-500 bg-gray-50 dark:bg-gray-900/30'
                        : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${
                      isSelected
                        ? option.color === 'blue'
                          ? 'text-blue-600 dark:text-blue-400'
                          : option.color === 'purple'
                          ? 'text-purple-600 dark:text-purple-400'
                          : option.color === 'green'
                          ? 'text-green-600 dark:text-green-400'
                          : option.color === 'red'
                          ? 'text-red-600 dark:text-red-400'
                          : option.color === 'amber'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-gray-600 dark:text-gray-400'
                        : 'text-gray-400'
                    }`} />
                    <span className={`text-sm font-medium ${
                      isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.content || ''}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write your announcement here..."
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formData.content?.length || 0} characters
            </p>
          </div>

          {/* Pin to Top */}
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <input
              type="checkbox"
              id="is_pinned"
              checked={formData.is_pinned || false}
              onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
              className="h-5 w-5 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
            />
            <label htmlFor="is_pinned" className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
              <Pin className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              Pin to top of announcements
            </label>
          </div>

          {/* Expiration Date (Optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Expiration Date (Optional)
            </label>
            <input
              type="date"
              value={formData.expires_at ? formData.expires_at.split('T')[0] : ''}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Announcement will be automatically hidden after this date
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : existingAnnouncement ? 'Update' : 'Post Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AnnouncementModal;
