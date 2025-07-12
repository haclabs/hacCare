import React, { useState } from 'react';
import { Edit } from 'lucide-react';
import { PatientNote } from '../../types';
import { PatientNoteForm } from './PatientNoteForm';
import { fetchPatientNotes } from '../../lib/patientService';

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

  const handleNoteAdded = async () => {
    if (!patientId) return;
    try {
      const notesData = await fetchPatientNotes(patientId);
      onNotesUpdated(notesData);
      setShowNoteForm(false);
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Patient Notes</h3>
        <button
          onClick={() => setShowNoteForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Edit className="h-4 w-4 mr-2" />
          Add Note
        </button>
      </div>

      {showNoteForm && (
        <PatientNoteForm
          patientId={patientId}
          patientName={patientName}
          onSave={handleNoteAdded}
          onCancel={() => setShowNoteForm(false)}
        />
      )}

      <div className="space-y-4">
        {notes.map((note) => (
          <div key={note.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-900">{note.nurse_name}</span>
                <span className="mx-2 text-gray-300">•</span>
                <span className="text-sm text-gray-500">{note.type}</span>
                <span className="mx-2 text-gray-300">•</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  note.priority === 'High' ? 'bg-red-100 text-red-800' :
                  note.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {note.priority}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(note.created_at).toLocaleString()}
              </span>
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