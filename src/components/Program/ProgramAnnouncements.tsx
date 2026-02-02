import React, { useState } from 'react';
import { Bell, Pin, Calendar, AlertCircle, BookOpen, Users, FileText, Plus, Edit2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../hooks/useAuth';
import {
  getProgramAnnouncements,
  createProgramAnnouncement,
  updateProgramAnnouncement,
  deleteProgramAnnouncement,
  type ProgramAnnouncement
} from '../../services/admin/programService';
import AnnouncementModal, { type AnnouncementData } from './AnnouncementModal';

/**
 * Program Announcements Component
 * Displays program-wide announcements feed with CRUD operations
 */
export const ProgramAnnouncements: React.FC = () => {
  const { currentTenant, programTenants } = useTenant();
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const currentProgram = programTenants.find(pt => pt.tenant_id === currentTenant?.id);

  // Get program_id from either programTenants array OR directly from tenant's program_id field
  const programId = currentProgram?.program_id || currentTenant?.program_id;

  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<ProgramAnnouncement | null>(null);

  // Check if user can manage announcements (instructors, coordinators, admins)
  const canManage = hasRole(['instructor', 'coordinator', 'admin', 'super_admin']);

  // Load announcements
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['programAnnouncements', programId],
    queryFn: async () => {
      if (!programId) return [];
      const { data, error } = await getProgramAnnouncements(programId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!programId
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: createProgramAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programAnnouncements'] });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ProgramAnnouncement> }) =>
      updateProgramAnnouncement(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programAnnouncements'] });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteProgramAnnouncement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programAnnouncements'] });
    }
  });

  const handleSaveAnnouncement = async (announcementData: AnnouncementData) => {
    if (editingAnnouncement) {
      // Update existing
      await updateMutation.mutateAsync({
        id: editingAnnouncement.id,
        updates: announcementData
      });
    } else {
      // Create new
      await createMutation.mutateAsync(announcementData);
    }
    setShowModal(false);
    setEditingAnnouncement(null);
  };

  const handleEditAnnouncement = (announcement: ProgramAnnouncement) => {
    setEditingAnnouncement(announcement);
    setShowModal(true);
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (confirm('Are you sure you want to delete this announcement?')) {
      await deleteMutation.mutateAsync(announcementId);
    }
  };

  const handleNewAnnouncement = () => {
    setEditingAnnouncement(null);
    setShowModal(true);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Templates':
        return FileText;
      case 'Training':
        return BookOpen;
      case 'Students':
        return Users;
      case 'Important':
        return AlertCircle;
      case 'Reminder':
        return Calendar;
      default:
        return Bell;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Templates':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Training':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'Students':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'Important':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'Reminder':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  // Filter out expired announcements
  const visibleAnnouncements = announcements.filter(announcement => {
    if (!announcement.expires_at) return true;
    return new Date(announcement.expires_at) > new Date();
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-800 dark:to-pink-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Bell className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Announcements</h3>
              <p className="text-sm text-purple-100">
                {visibleAnnouncements.length} active announcement{visibleAnnouncements.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {canManage && (
            <button
              onClick={handleNewAnnouncement}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors text-white font-medium text-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New</span>
            </button>
          )}
        </div>
      </div>

      {/* Announcements List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          </div>
        ) : visibleAnnouncements.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No announcements yet</p>
            {canManage && (
              <button
                onClick={handleNewAnnouncement}
                className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Create First Announcement
              </button>
            )}
          </div>
        ) : (
          visibleAnnouncements.map((announcement) => {
            const CategoryIcon = getCategoryIcon(announcement.category);
            const categoryColor = getCategoryColor(announcement.category);

            return (
              <div
                key={announcement.id}
                className={`group relative p-4 rounded-lg border transition-all ${
                  announcement.is_pinned
                    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 hover:shadow-md'
                }`}
              >
                {/* Edit/Delete Actions - Visible on Hover */}
                {canManage && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditAnnouncement(announcement)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      title="Edit announcement"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteAnnouncement(announcement.id)}
                      className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      title="Delete announcement"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className={`p-2 rounded-lg ${categoryColor} flex-shrink-0`}>
                    <CategoryIcon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      {announcement.is_pinned && (
                        <Pin className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                      )}
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {announcement.title}
                      </h4>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 whitespace-pre-wrap">
                      {announcement.content}
                    </p>

                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <CategoryIcon className="h-3 w-3" />
                        {announcement.category}
                      </span>
                      <span>•</span>
                      <span>{announcement.author_name || 'Unknown'}</span>
                      <span>•</span>
                      <span>{formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}</span>
                      {announcement.expires_at && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                            <Calendar className="h-3 w-3" />
                            Expires {formatDistanceToNow(new Date(announcement.expires_at), { addSuffix: true })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      <AnnouncementModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingAnnouncement(null);
        }}
        onSave={handleSaveAnnouncement}
        existingAnnouncement={editingAnnouncement}
      />
    </div>
  );
};

export default ProgramAnnouncements;
