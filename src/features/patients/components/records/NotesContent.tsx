import React, { useState } from 'react';
import { Edit, Trash2, Clock } from 'lucide-react';
import { PatientNote } from '../../../../types';
import { PatientNoteForm } from '../forms/PatientNoteForm';
import { fetchPatientNotes, deletePatientNote, createPatientNote, updatePatientNote } from '../../../../services/patient/patientService';
import { useAuth } from '../../../../hooks/useAuth';
import { format, parseISO, isValid } from 'date-fns';

interface NotesContentProps {
  patientId: string;
  patientName: string;
  notes: PatientNote[];
  onNotesUpdated: (notes: PatientNote[]) => void;
}

export const NotesContent: React.FC<NotesContentProps> = ({
  patientId,
  patientName,
  notes,
  onNotesUpdated
}) => {
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [editingNote, setEditingNote] = useState<PatientNote | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { hasRole, user, profile } = useAuth();
  
  // Format date safely
  const formatDate = (dateString: string) => {
    try {
      // Handle both createdAt and created_at field names
      const date = parseISO(dateString || '');
      return isValid(date) ? format(date, 'MMM dd, yyyy HH:mm') : 'Unknown date';
    } catch (error) {
      return 'Invalid date';
    }
  };

  const handleNoteAdded = async (note: PatientNote) => {
    if (!patientId) return;
    try {
      if (!user || !profile) {
        console.error('User not authenticated');
        return;
      }
      
      if (editingNote) {
        // Update existing note
        const updatedNote = await updatePatientNote(editingNote.id, {
          type: note.type,
          content: note.content,
          priority: note.priority
        });
        
        if (!updatedNote) {
          console.error('Note not found or could not be updated');
          alert('Error: Note not found or could not be updated. It may have been deleted.');
          return;
        }
      } else {
        // Create new note
        await createPatientNote({
          patient_id: patientId,
          nurse_id: user.id,
          nurse_name: `${profile.first_name} ${profile.last_name}`,
          type: note.type,
          content: note.content,
          priority: note.priority
        });
      }
      
      // Refresh notes
      const notesData = await fetchPatientNotes(patientId);
      onNotesUpdated(notesData);
      setShowNoteForm(false);
      setEditingNote(null);
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const handleEditNote = (note: PatientNote) => {
    console.log('Editing note:', note);
    setEditingNote(note);
    setShowNoteForm(true);
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    
    console.log('Deleting note with ID:', noteId);
    try {
      setDeleting(true);
      
      // Call the delete function
      try {
        await deletePatientNote(noteId);
        console.log('Note deleted successfully');
      } catch (deleteError) {
        console.error('Error during note deletion:', deleteError);
        alert('Failed to delete note. It may have already been deleted.');
      }
      
      // Refresh notes after deletion
      const notesData = await fetchPatientNotes(patientId);
      onNotesUpdated(notesData);
    } catch (error) {
      console.error('Error deleting note:', error);
      alert('Failed to refresh notes after deletion.');
    } finally {
      setDeleting(false);
    }
  };

  const handleRefreshNotes = async () => {
    if (!patientId) return;
    try {
      setRefreshing(true);
      const notesData = await fetchPatientNotes(patientId);
      onNotesUpdated(notesData);
    } catch (error) {
      console.error('Error refreshing notes:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDeleteAllNotes = async () => {
    if (!window.confirm('Are you sure you want to delete ALL notes for this patient?')) return;
    
    try {
      setDeleting(true);
      
      // Delete each note one by one
      for (const note of notes) {
        try {
          await deletePatientNote(note.id);
          console.log(`Note ${note.id} deleted successfully`);
        } catch (deleteError) {
          console.error(`Error deleting note ${note.id}:`, deleteError);
        }
      }
      
      // Refresh notes after deletion
      await handleRefreshNotes();
    } catch (error) {
      console.error('Error deleting all notes:', error);
      alert('Failed to delete all notes.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Patient Notes</h3>
        <div className="flex space-x-2">
          {notes.length > 0 && hasRole(['admin', 'super_admin']) && (
            <button
              onClick={handleDeleteAllNotes}
              disabled={deleting || refreshing}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleting ? 'Deleting...' : 'Delete All Notes'}
            </button>
          )}
          <button
            onClick={() => setShowNoteForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Edit className="h-4 w-4 mr-2" />
            Add Note
          </button>
        </div>
      </div>

      {showNoteForm && (
        <PatientNoteForm
          note={editingNote}
          patientId={patientId}
          patientName={patientName}
          onSave={handleNoteAdded}
          onCancel={() => {
            setShowNoteForm(false);
            setEditingNote(null);
          }}
          onClose={() => {
            setShowNoteForm(false);
            setEditingNote(null);
          }}
        />
      )}

      <div className="space-y-4">
        {notes.map((note) => (
          <div key={note.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900">{note.nurse_name || 'Unknown'}</span>
                <span className="mx-2 text-gray-300">•</span>
                <span className="text-sm text-gray-500">{note.type}</span>
                {note.priority && (
                  <>
                    <span className="mx-2 text-gray-300">•</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      note.priority === 'High' || note.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                      note.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {note.priority}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center">
                <span className="text-xs text-gray-500 flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatDate(note.created_at ?? note.createdAt ?? '')}
                </span>
                
                {/* Edit/Delete buttons for super users */}
                {hasRole(['admin', 'super_admin']) && (
                  <div className="ml-3 flex space-x-2">
                    <button 
                      onClick={() => handleEditNote(note)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                    <button 
                      onClick={() => handleDeleteNote(note.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-700">{note.content}</p>
          </div>
        ))}

        {notes.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Notes Recorded</h3>
            <p className="text-gray-600 mb-6">Start adding notes to track patient progress.</p>
          </div>
        )}
      </div>
    </div>
  );
};