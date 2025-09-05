/**
 * Handover Notes Component
 * 
 * Main component that manages SBAR (Situation, Background, Assessment, Recommendations) 
 * handover notes with create and display functionality.
 */

import React, { useState } from 'react';
import { MessageSquare, Plus, RefreshCw } from 'lucide-react';
import { HandoverNotesForm } from './HandoverNotesForm';
import { HandoverNotesList } from './HandoverNotesList';
import { createHandoverNote, CreateHandoverNoteData } from '../../../lib/handoverService';

interface HandoverNotesProps {
  patientId: string;
  patientName: string;
  currentUser: {
    id: string;
    name: string;
    role: string;
  };
}

export const HandoverNotes: React.FC<HandoverNotesProps> = ({
  patientId,
  patientName,
  currentUser
}) => {
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSaveNote = async (noteData: CreateHandoverNoteData) => {
    try {
      await createHandoverNote(noteData);
      setRefreshKey(prev => prev + 1); // Trigger refresh
      console.log('✅ Handover note created successfully');
    } catch (error) {
      console.error('Error creating handover note:', error);
      throw error; // Re-throw to let form handle the error
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <MessageSquare className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Handover Notes</h2>
            <p className="text-sm text-gray-600">SBAR communication framework for care transitions</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Handover Note</span>
          </button>
        </div>
      </div>

      {/* SBAR Framework Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">SBAR Communication Framework</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white/60 p-3 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-1">Situation</h4>
            <p className="text-gray-700">Current status and purpose of communication</p>
          </div>
          <div className="bg-white/60 p-3 rounded-lg">
            <h4 className="font-semibold text-green-800 mb-1">Background</h4>
            <p className="text-gray-700">Relevant context and patient history</p>
          </div>
          <div className="bg-white/60 p-3 rounded-lg">
            <h4 className="font-semibold text-yellow-800 mb-1">Assessment</h4>
            <p className="text-gray-700">Professional clinical judgment</p>
          </div>
          <div className="bg-white/60 p-3 rounded-lg">
            <h4 className="font-semibold text-purple-800 mb-1">Recommendations</h4>
            <p className="text-gray-700">Proposed actions and next steps</p>
          </div>
        </div>
      </div>

      {/* Notes List */}
      <HandoverNotesList
        key={refreshKey}
        patientId={patientId}
        patientName={patientName}
        currentUser={currentUser}
        onRefresh={handleRefresh}
      />

      {/* Create Form Modal */}
      <HandoverNotesForm
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleSaveNote}
        patientId={patientId}
        patientName={patientName}
        currentUser={currentUser}
      />
    </div>
  );
};
