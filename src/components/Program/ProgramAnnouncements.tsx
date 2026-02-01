import React, { useMemo } from 'react';
import { Bell, Plus, Pin, Calendar, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/**
 * Program Announcements Component
 * Displays recent announcements and updates for the program
 * TODO: Connect to announcements table when created
 */

// Fixed timestamp for mock data (avoids Date.now() in render)
const MOCK_NOW = new Date('2025-01-27T14:00:00Z').getTime();

export const ProgramAnnouncements: React.FC = () => {
  // Mock data - will be replaced with real data from database
  const mockAnnouncements = useMemo(() => [
    {
      id: '1',
      title: 'New Simulation Template Available',
      content: 'A new cardiac emergency simulation template has been added to the library. Check it out in the Templates section!',
      author: 'Dr. Sarah Johnson',
      createdAt: new Date(MOCK_NOW - 2 * 60 * 60 * 1000), // 2 hours ago
      isPinned: true,
      category: 'Templates'
    },
    {
      id: '2',
      title: 'Upcoming Training Session',
      content: 'Join us for a hands-on training session on advanced BCMA workflows next Tuesday at 2 PM in the Simulation Lab.',
      author: 'Melissa Schalk',
      createdAt: new Date(MOCK_NOW - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      isPinned: false,
      category: 'Training'
    },
    {
      id: '3',
      title: 'Student Roster Updated',
      content: '15 new students have been added to the program. Please review the student roster and verify cohort assignments.',
      author: 'Admin Team',
      createdAt: new Date(MOCK_NOW - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      isPinned: false,
      category: 'Students'
    },
  ], []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-800 dark:to-pink-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6 text-white" />
            <h2 className="text-xl font-bold text-white">Announcements</h2>
          </div>
          <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
            <Plus className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>

      {/* Announcements Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {mockAnnouncements.map((announcement) => (
          <div
            key={announcement.id}
            className={`relative group rounded-lg border transition-all hover:shadow-md ${
              announcement.isPinned
                ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800'
                : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
            }`}
          >
            {/* Pinned Indicator */}
            {announcement.isPinned && (
              <div className="absolute -top-2 -right-2 p-1.5 bg-amber-500 rounded-full shadow-lg">
                <Pin className="h-3 w-3 text-white" />
              </div>
            )}

            <div className="p-4">
              {/* Category Badge */}
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  announcement.category === 'Templates' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : announcement.category === 'Training'
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                    : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                }`}>
                  {announcement.category}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDistanceToNow(announcement.createdAt, { addSuffix: true })}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-bold text-gray-900 dark:text-white mb-2">
                {announcement.title}
              </h3>

              {/* Content */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                {announcement.content}
              </p>

              {/* Author */}
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <User className="h-3 w-3" />
                <span>Posted by <strong>{announcement.author}</strong></span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-lg transition-all shadow-md text-sm font-medium">
          <Plus className="h-4 w-4" />
          Post Announcement
        </button>
      </div>

      {/* Coming Soon Note */}
      <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-purple-50 dark:bg-purple-900/20">
        <p className="text-xs text-purple-800 dark:text-purple-200 text-center">
          📢 <strong>Coming Soon:</strong> Rich text editor, file attachments, @mentions, and email notifications
        </p>
      </div>
    </div>
  );
};

export default ProgramAnnouncements;
