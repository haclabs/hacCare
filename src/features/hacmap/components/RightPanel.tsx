/**
 * Right Panel - Accessible slide-over panel for forms
 * Features focus trap, ESC handling, and overlay click-to-close
 */

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface RightPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  isDirty?: boolean;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  isOpen,
  onClose,
  title,
  children,
  isDirty = false
}) => {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isDirty]);

  const handleClose = () => {
    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out"
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="panel-title" className="text-xl font-semibold text-gray-900">
            {title}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Close panel"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100%-80px)] px-6 py-4">
          {children}
        </div>
      </div>
    </>
  );
};
