import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

/**
 * Shown instead of a patient chart that belongs to a different tenant than the current workspace
 * (e.g. reached with the back button or a bookmark after leaving a template). Charting there would
 * stamp new records with the workspace's tenant, not the patient's.
 */
export const PatientWorkspaceMismatch: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6 mx-auto">
          <ShieldAlert className="h-10 w-10 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Patient not in this workspace</h2>
        <p className="text-gray-600 mb-6">
          This patient belongs to a different template or simulation. Open it from that template or
          simulation to view or chart on it.
        </p>
        <button
          onClick={() => navigate('/app')}
          className="px-6 py-3 bg-haccare-teal hover:bg-haccare-teal-dark text-white rounded-xl transition-colors font-medium"
        >
          Back to workspace
        </button>
      </div>
    </div>
  );
};
