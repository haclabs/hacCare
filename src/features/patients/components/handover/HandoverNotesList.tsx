/**
 * Handover Notes List Component
 * 
 * Displays a list of SBAR handover notes for a patient with filtering,
 * acknowledgment features, and modern healthcare UI design.
 */

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  User, 
  Clock, 
  Check, 
  Eye,
  Filter,
  FileText,
  Activity,
  Target,
  Info
} from 'lucide-react';
import { HandoverNote, getPatientHandoverNotes, acknowledgeHandoverNote } from '../../../../services/patient/handoverService';
import { format } from 'date-fns';

interface HandoverNotesListProps {
  patientId: string;
  patientName: string;
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
  onRefresh?: () => void;
}

export const HandoverNotesList: React.FC<HandoverNotesListProps> = ({
  patientId,
  patientName,
  currentUser,
  onRefresh
}) => {
  const [notes, setNotes] = useState<HandoverNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'acknowledged' | 'pending'>('all');
  const [selectedNote, setSelectedNote] = useState<HandoverNote | null>(null);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const data = await getPatientHandoverNotes(patientId);
      setNotes(data);
    } catch (error) {
      console.error('Error loading handover notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [patientId]);

  const handleAcknowledge = async (noteId: string) => {
    try {
      setAcknowledging(noteId);
      await acknowledgeHandoverNote(noteId, currentUser.id);
      await loadNotes(); // Refresh the list
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Error acknowledging note:', error);
      alert('Failed to acknowledge note. Please try again.');
    } finally {
      setAcknowledging(null);
    }
  };

  const filteredNotes = notes.filter(note => {
    if (filter === 'acknowledged') return note.acknowledged_by;
    if (filter === 'pending') return !note.acknowledged_by;
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getShiftIcon = (shift: string) => {
    switch (shift) {
      case 'day': return '☀️';
      case 'evening': return '🌅';
      case 'night': return '🌙';
      default: return '⏰';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <MessageSquare className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Handover Notes</h3>
            <p className="text-sm text-gray-600">SBAR communication records for {patientName}</p>
          </div>
        </div>
        
        {/* Filter Controls */}
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Notes ({notes.length})</option>
            <option value="pending">Pending ({notes.filter(n => !n.acknowledged_by).length})</option>
            <option value="acknowledged">Acknowledged ({notes.filter(n => n.acknowledged_by).length})</option>
          </select>
        </div>
      </div>

      {/* Notes List */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Handover Notes</h4>
          <p className="text-gray-600">
            {filter === 'all' 
              ? 'No handover notes have been created for this patient yet.'
              : `No ${filter} handover notes found.`
            }
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className={`bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow ${
                !note.acknowledged_by ? 'ring-2 ring-blue-100' : ''
              }`}
            >
              {/* Note Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{getShiftIcon(note.shift)}</span>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-gray-900 capitalize">{note.shift} Shift</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(note.priority)}`}>
                          {note.priority.toUpperCase()}
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{note.created_by_name} ({note.created_by_role})</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="h-3 w-3" />
                          <span>{format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {!note.acknowledged_by ? (
                    <button
                      onClick={() => handleAcknowledge(note.id)}
                      disabled={acknowledging === note.id}
                      className="flex items-center space-x-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {acknowledging === note.id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      <span>Acknowledge</span>
                    </button>
                  ) : (
                    <div className="flex items-center space-x-1 px-3 py-1.5 bg-green-100 text-green-800 text-sm rounded-lg">
                      <Check className="h-3 w-3" />
                      <span>Acknowledged</span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => setSelectedNote(selectedNote?.id === note.id ? null : note)}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-blue-100 text-blue-800 text-sm rounded-lg hover:bg-blue-200 transition-colors"
                  >
                    <Eye className="h-3 w-3" />
                    <span>{selectedNote?.id === note.id ? 'Hide' : 'View'} Details</span>
                  </button>
                </div>
              </div>

              {/* Quick Preview */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Info className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Situation</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{note.situation}</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <Target className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">Recommendations</span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-2">{note.recommendations}</p>
                </div>
              </div>

              {/* Acknowledgment Status */}
              {note.acknowledged_by && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2 text-sm text-green-800">
                    <Check className="h-4 w-4" />
                    <span>
                      Acknowledged on {format(new Date(note.acknowledged_at!), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </div>
              )}

              {/* Detailed View */}
              {selectedNote?.id === note.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                  {[
                    { key: 'situation', title: 'Situation', icon: Info, color: 'blue' },
                    { key: 'background', title: 'Background', icon: FileText, color: 'green' },
                    { key: 'assessment', title: 'Assessment', icon: Activity, color: 'yellow' },
                    { key: 'recommendations', title: 'Recommendations', icon: Target, color: 'purple' }
                  ].map((section) => {
                    const IconComponent = section.icon;
                    return (
                      <div key={section.key} className={`p-4 rounded-lg ${
                        section.color === 'blue' ? 'bg-blue-50 border border-blue-200' :
                        section.color === 'green' ? 'bg-green-50 border border-green-200' :
                        section.color === 'yellow' ? 'bg-yellow-50 border border-yellow-200' :
                        'bg-purple-50 border border-purple-200'
                      }`}>
                        <div className="flex items-center space-x-2 mb-2">
                          <IconComponent className={`h-4 w-4 ${
                            section.color === 'blue' ? 'text-blue-600' :
                            section.color === 'green' ? 'text-green-600' :
                            section.color === 'yellow' ? 'text-yellow-600' :
                            'text-purple-600'
                          }`} />
                          <span className={`font-medium ${
                            section.color === 'blue' ? 'text-blue-800' :
                            section.color === 'green' ? 'text-green-800' :
                            section.color === 'yellow' ? 'text-yellow-800' :
                            'text-purple-800'
                          }`}>
                            {section.title}
                          </span>
                        </div>
                        <p className="text-gray-700 whitespace-pre-wrap">
                          {note[section.key as keyof HandoverNote] as string}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
