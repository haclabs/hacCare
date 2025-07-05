import React, { useState } from 'react';
import { Clock, CheckCircle, Pill, Trash2 } from 'lucide-react';
import { Medication, MedicationAdministration as MedAdmin } from '../../types';
import { format, isValid } from 'date-fns';
import { MedicationAdministrationForm } from './MedicationAdministrationForm';
import { MedicationAdministrationHistory } from './MedicationAdministrationHistory';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface MedicationAdministrationProps {
  patientId: string;
  patientName: string;
  medications: Medication[];
  onRefresh: () => void;
}

export const MedicationAdministration: React.FC<MedicationAdministrationProps> = ({
  patientId,
  patientName,
  medications,
  onRefresh
}) => {
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'scheduled' | 'prn' | 'continuous'>('scheduled');
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);

  // Filter medications by category
  const scheduledMeds = medications.filter(med => 
    med.category === 'scheduled' || !med.category // Default to scheduled if no category
  );
  
  const prnMeds = medications.filter(med => 
    med.category === 'prn'
  );
  
  const continuousMeds = medications.filter(med => 
    med.category === 'continuous'
  );

  // Safe date formatting
  const safeFormatDate = (dateValue: string | Date | null | undefined, formatString: string): string => {
    if (!dateValue) return 'N/A';
    
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    
    if (!isValid(date)) return 'N/A';
    
    return format(date, formatString);
  };

  // Get medication status color
  const getMedicationStatusColor = (medication: Medication) => {
    if (medication.status !== 'Active') return 'bg-gray-100 text-gray-800';
    
    // Check if it's due soon (within 1 hour)
    const nextDue = new Date(medication.next_due);
    const now = new Date();
    const diffMs = nextDue.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 0) return 'bg-red-100 text-red-800'; // Overdue
    if (diffHours < 1) return 'bg-yellow-100 text-yellow-800'; // Due soon
    return 'bg-green-100 text-green-800'; // Not due soon
  };

  // Handle medication administration
  const handleAdminister = (medication: Medication) => {
    setSelectedMedication(medication);
    setShowAdminForm(true);
  };

  // Handle viewing administration history
  const handleViewHistory = (medication: Medication) => {
    setSelectedMedication(medication);
    setShowHistory(true);
  };

  // Handle medication deletion (for super admins only)
  const handleDeleteMedication = async (medicationId: string) => {
    if (!confirm('Are you sure you want to delete this medication? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('patient_medications')
        .delete()
        .eq('id', medicationId);
      
      if (error) {
        throw error;
      }
      
      // Refresh medications list
      onRefresh();
      
    } catch (error: any) {
      console.error('Error deleting medication:', error);
      alert(`Failed to delete medication: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Medication Administration Record</h2>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('scheduled')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
              activeTab === 'scheduled'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Scheduled ({scheduledMeds.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('prn')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
              activeTab === 'prn'
                ? 'border-green-500 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>PRN ({prnMeds.length})</span>
          </button>
          
          <button
            onClick={() => setActiveTab('continuous')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
              activeTab === 'continuous'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Continuous ({continuousMeds.length})</span>
          </button>
        </nav>
      </div>

      {/* Medication Lists */}
      <div className="space-y-4">
        {activeTab === 'scheduled' && (
          <>
            {scheduledMeds.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No scheduled medications</p>
              </div>
            ) : (
              <div className="space-y-4">
                {scheduledMeds.map((medication) => (
                  <div key={medication.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-gray-900">{medication.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMedicationStatusColor(medication)}`}>
                            {medication.status}
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1">{medication.dosage} - {medication.route}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          Frequency: {medication.frequency} | Prescribed by: {medication.prescribed_by}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Next due:</p>
                        <p className="font-medium text-blue-600">
                          {safeFormatDate(medication.next_due, 'MMM dd, HH:mm')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAdminister(medication)}
                          className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center space-x-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Administer</span>
                        </button>
                        <button
                          onClick={() => handleViewHistory(medication)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                        >
                          View History
                        </button>
                      </div>
                      
                      {hasRole('super_admin') && (
                        <button
                          onClick={() => handleDeleteMedication(medication.id)}
                          disabled={loading}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          title="Delete medication"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'prn' && (
          <>
            {prnMeds.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No PRN medications</p>
              </div>
            ) : (
              <div className="space-y-4">
                {prnMeds.map((medication) => (
                  <div key={medication.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-gray-900">{medication.name}</h3>
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                            PRN
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1">{medication.dosage} - {medication.route}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          {medication.frequency} | Prescribed by: {medication.prescribed_by}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Status:</p>
                        <p className="font-medium">
                          {medication.status}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAdminister(medication)}
                          className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center space-x-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Administer</span>
                        </button>
                        <button
                          onClick={() => handleViewHistory(medication)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                        >
                          View History
                        </button>
                      </div>
                      
                      {hasRole('super_admin') && (
                        <button
                          onClick={() => handleDeleteMedication(medication.id)}
                          disabled={loading}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          title="Delete medication"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'continuous' && (
          <>
            {continuousMeds.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg">
                <Pill className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No continuous medications</p>
              </div>
            ) : (
              <div className="space-y-4">
                {continuousMeds.map((medication) => (
                  <div key={medication.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-semibold text-gray-900">{medication.name}</h3>
                          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                            Continuous
                          </span>
                        </div>
                        <p className="text-gray-600 mt-1">{medication.dosage} - {medication.route}</p>
                        <p className="text-sm text-gray-500 mt-2">
                          {medication.frequency} | Prescribed by: {medication.prescribed_by}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Started:</p>
                        <p className="font-medium">
                          {safeFormatDate(medication.start_date, 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between items-center">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleAdminister(medication)}
                          className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center space-x-1"
                        >
                          <CheckCircle className="w-3 h-3" />
                          <span>Record Check</span>
                        </button>
                        <button
                          onClick={() => handleViewHistory(medication)}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                        >
                          View History
                        </button>
                      </div>
                      
                      {hasRole('super_admin') && (
                        <button
                          onClick={() => handleDeleteMedication(medication.id)}
                          disabled={loading}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          title="Delete medication"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Administration Form Modal */}
      {showAdminForm && selectedMedication && (
        <MedicationAdministrationForm
          medication={selectedMedication}
          patientId={patientId}
          patientName={patientName}
          onClose={() => setShowAdminForm(false)}
          onSave={() => {
            setShowAdminForm(false);
            onRefresh();
          }}
        />
      )}

      {/* Administration History Modal */}
      {showHistory && selectedMedication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Administration History: {selectedMedication.name}
              </h2>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <MedicationAdministrationHistory
                medicationId={selectedMedication.id}
                patientId={patientId}
              />
            </div>
            
            <div className="flex justify-end p-6 border-t border-gray-200">
              <button
                onClick={() => setShowHistory(false)}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// X icon component for the modal
const X = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

// Activity icon component for continuous medications
const Activity = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
);