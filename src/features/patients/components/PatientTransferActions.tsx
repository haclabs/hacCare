// Example integration for existing patient management components

import React, { useState } from 'react';
import { Copy, Move, MoreHorizontal } from 'lucide-react';
import PatientTransferModal from './PatientTransferModal';
import { usePatientTransfer } from '../hooks/usePatientTransfer';
import { Patient } from '../../../types';

// Add these buttons to your existing patient list/card components

interface PatientTransferButtonsProps {
  patient: Patient;
  onTransferComplete?: () => void;
}

export const PatientTransferButtons: React.FC<PatientTransferButtonsProps> = ({ 
  patient, 
  onTransferComplete 
}) => {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { transferring } = usePatientTransfer();

  const handleTransferComplete = (success: boolean, message: string) => {
    if (success) {
      onTransferComplete?.();
    }
    // You can also show a toast notification here
    console.log(success ? '✅' : '❌', message);
  };

  return (
    <>
      {/* Dropdown Menu Button */}
      <div className="relative">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          disabled={transferring}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
            <button
              onClick={() => {
                setShowTransferModal(true);
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
            >
              <Copy className="h-4 w-4 mr-2" />
              Transfer/Duplicate Patient
            </button>
          </div>
        )}
      </div>

      {/* Transfer Modal */}
      <PatientTransferModal
        patient={patient}
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onTransferComplete={handleTransferComplete}
      />
    </>
  );
};

// Alternative: Standalone transfer buttons
export const PatientTransferActions: React.FC<PatientTransferButtonsProps> = ({ 
  patient, 
  onTransferComplete 
}) => {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const { transferring } = usePatientTransfer();

  const handleTransferComplete = (success: boolean, message: string) => {
    if (success) {
      onTransferComplete?.();
    }
    console.log(success ? '✅' : '❌', message);
  };

  return (
    <div className="flex space-x-2">
      <button
        onClick={() => setShowTransferModal(true)}
        disabled={transferring}
        className="flex items-center px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50"
      >
        <Copy className="h-4 w-4 mr-1" />
        Duplicate
      </button>

      <button
        onClick={() => setShowTransferModal(true)}
        disabled={transferring}
        className="flex items-center px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50"
      >
        <Move className="h-4 w-4 mr-1" />
        Move
      </button>

      <PatientTransferModal
        patient={patient}
        isOpen={showTransferModal}
        onClose={() => setShowTransferModal(false)}
        onTransferComplete={handleTransferComplete}
      />
    </div>
  );
};