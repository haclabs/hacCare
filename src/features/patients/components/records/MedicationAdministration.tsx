import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, Pill, Trash2, X, Activity, RefreshCw, Calendar, CalendarDays, AlertTriangle, Plus, FileText } from 'lucide-react';
import { isValid, parseISO } from 'date-fns';
import { formatLocalTime } from '../../../../utils/dateUtils';
// import { MedicationBarcode } from '../visuals/MedicationBarcode'; // Component not found
// import { MedicationAdministrationHistory } from './MedicationAdministrationHistory'; // Component not found
import { MedicationForm } from '../forms/MedicationForm';
import { useAuth } from '../../../../hooks/useAuth';
import { useTenant } from '../../../../contexts/TenantContext';
import { fetchPatientMedications, deleteMedication } from '../../../../services/clinical/medicationService';
import { runAlertChecks } from '../../../../lib/alertService';
// import { usePatients } from '../../hooks/usePatients'; // Commented out as not currently used
import { Medication } from '../../../../types';

interface MedicationAdministrationProps {
  patientId: string;
  patientName?: string;
  medications: Medication[];
  initialCategory?: string;
  onRefresh: () => void;
}

// Helper function to count medications by category
const countMedicationsByCategory = (medications: Medication[]) => {
  return {
    scheduled: medications.filter(med => med.category === 'scheduled' && med.status === 'Active').length,
    prn: medications.filter(med => med.category === 'prn' && med.status === 'Active').length,
    continuous: medications.filter(med => med.category === 'continuous' && med.status === 'Active').length,
    overview: medications.length,
  };
};

export const MedicationAdministration: React.FC<MedicationAdministrationProps> = ({
  patientId,
  patientName,
  medications,
  initialCategory = 'overview',
  onRefresh
}) => {
  const { hasRole } = useAuth();
  const { currentTenant } = useTenant();
  const [activeTab, setActiveTab] = useState<'overview' | 'scheduled' | 'prn' | 'continuous'>(
    initialCategory === 'scheduled' || initialCategory === 'prn' || initialCategory === 'continuous' 
      ? initialCategory 
      : 'overview'
  );
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allMedications, setAllMedications] = useState<Medication[]>(medications);
  const [error, setError] = useState<string | null>(null);
  const [showMedicationLabels, setShowMedicationLabels] = useState(false);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [medicationToEdit, setMedicationToEdit] = useState<Medication | null>(null);
  // const { getPatient } = usePatients(); // Commented out as not currently used

  useEffect(() => {
    setAllMedications(medications);
  }, [medications]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
        const now = new Date();
        console.log('Refreshing medications for patient:', patientId, now.toISOString());
        const simulationId = currentTenant?.simulation_id;
        const updatedMedications = await fetchPatientMedications(patientId, simulationId);
        console.log(`Fetched ${updatedMedications.length} medications`);
        setAllMedications(updatedMedications);
        try {
            console.log('Running alert checks after medication refresh');
            await runAlertChecks();
        } catch (error) {
            console.error('Error refreshing alerts:', error);
        }
        onRefresh();
    } catch (error) {
        console.error('Error refreshing medications:', error);
        setError('Failed to refresh medications');
    } finally {
        setLoading(false);
    }
};

const handleDeleteMedication = async (medicationId: string) => {
    if (!hasRole(['admin', 'super_admin'])) {
        setError('You do not have permission to delete medications');
        return;
    }

    if (window.confirm('Are you sure you want to delete this medication?')) {
        try {
            await deleteMedication(medicationId);
            await handleRefresh();
        } catch (error) {
            console.error('Error deleting medication:', error);
            setError('Failed to delete medication');
        }
    }
};

// const getPatientDetails = () => {
//     const patientDetails = getPatient(patientId);
//     console.log('Fetched patient details:', patientDetails);
//     return patientDetails;
// };

// const supabaseClientCheck = () => {
//     console.log('Supabase client initialized:', supabase);
// };

// useEffect(() => {
//     supabaseClientCheck();
// }, []);

  // Get medication counts by category
  const medCounts = countMedicationsByCategory(allMedications);

  const filterMedicationsByCategory = (category: string) => {
    return allMedications.filter(med => med.category === category);
  };

  const getDueMedications = () => {
    const now = new Date();
    console.log('Checking for due medications at:', now.toISOString());
    
    // Get medications due within the next hour
    const dueMeds = allMedications.filter(med => {
      try { 
        if (!med.next_due) return false;
        
        // PRN medications are never "due" since they're given only as needed, not on schedule
        if (med.category === 'prn') return false;
        
        const dueTime = parseISO(med.next_due); 
        // Due medications are those due within the next hour but not overdue
        const timeDiff = dueTime.getTime() - now.getTime();
        const isDue = isValid(dueTime) && timeDiff <= 60 * 60 * 1000 && timeDiff > 0 && med.status === 'Active';
        
        if (isDue) {
          console.log(`Medication ${med.name} is due soon: ${med.next_due}`);
          console.log(`- Current time: ${now.toISOString()}`);
          console.log(`- Due time: ${dueTime.toISOString()}`);
          console.log(`- Time diff: ${timeDiff}ms (${Math.round(timeDiff/60000)} minutes)`);
        }
        return isDue;
      } catch (error) {
        console.error('Error checking due medication:', error, med);
        return false;
      }
    });
    
    console.log(`Found ${dueMeds.length} medications due soon`);
    return dueMeds;
  };

  const getOverdueMedications = () => {
    const now = new Date();
    console.log('Checking for overdue medications at:', now.toISOString());
    
    // Get medications that are overdue
    const overdueMeds = allMedications.filter(med => {
      try {
        if (!med.next_due) return false;
        
        // PRN medications are never overdue since they're given only as needed
        if (med.category === 'prn') return false;
        
        const dueTime = parseISO(med.next_due); 
        // Overdue medications are those whose due time has passed
        const isOverdue = isValid(dueTime) && dueTime.getTime() <= now.getTime() && med.status === 'Active';
        
        if (isOverdue) {
          console.log(`Medication ${med.name} is OVERDUE: ${med.next_due}`);
          console.log(`- Current time: ${now.toISOString()}`);
          console.log(`- Due time: ${dueTime.toISOString()}`);
          console.log(`- Time diff: ${dueTime.getTime() - now.getTime()}ms (${Math.round((dueTime.getTime() - now.getTime())/60000)} minutes)`);
        }
        return isOverdue;
      } catch (error) {
        console.error('Error checking overdue medication:', error, med);
        return false;
      }
    });
    
    console.log(`Found ${overdueMeds.length} medications overdue`);
    return overdueMeds;
  };

  const renderMedicationCard = (medication: Medication) => {
    const isDue = getDueMedications().includes(medication);
    const isOverdue = getOverdueMedications().includes(medication);
    const medicationBarcodeId = `MED${medication.id.slice(-6).toUpperCase()}`;
    
    return (
      <div
        key={medication.id}
        className={`group relative bg-white dark:bg-gray-800 rounded-xl border-2 p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] transform ${
          isOverdue ? 'border-red-400 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/30 shadow-red-100' : 
          isDue ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/30 shadow-yellow-100' : 
          'border-gray-200 dark:border-gray-600 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 hover:border-blue-300 dark:hover:border-blue-500'
        }`}
      >
        {/* Priority indicator stripe */}
        {(isDue || isOverdue) && (
          <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl ${
            isOverdue ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-yellow-500 to-yellow-600'
          }`}></div>
        )}
        
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-lg ${
                isOverdue ? 'bg-red-100 dark:bg-red-900/30' : 
                isDue ? 'bg-yellow-100 dark:bg-yellow-900/30' : 
                'bg-blue-100 dark:bg-blue-900/30'
              }`}>
                <Pill className={`w-6 h-6 ${
                  isOverdue ? 'text-red-600 dark:text-red-400' : 
                  isDue ? 'text-yellow-600 dark:text-yellow-400' : 
                  'text-blue-600 dark:text-blue-400'
                }`} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {medication.name}
                </h3>
                {(isDue || isOverdue) && (
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                    isOverdue ? 'bg-red-600 text-white shadow-lg font-bold border border-red-700' : 'bg-yellow-500 text-white shadow-sm'
                  }`}>
                    <span className={isOverdue ? 'font-extrabold' : ''}>{isOverdue ? '🚨 OVERDUE' : '⏰ DUE NOW'}</span>
                  </span>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 min-w-16">ID:</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded text-xs">
                    {medicationBarcodeId}
                  </span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 min-w-16">Dose:</span>
                  <span className="text-gray-900 dark:text-gray-100 font-medium">{medication.dosage}</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 min-w-16">Route:</span>
                  <span className="text-gray-900 dark:text-gray-100">{medication.route}</span>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="font-semibold text-gray-700 dark:text-gray-300 min-w-16">Freq:</span>
                  <span className="text-gray-900 dark:text-gray-100">{medication.frequency}</span>
                </div>
                {medication.next_due && (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 min-w-16">Next:</span>
                    <span className="text-gray-900 dark:text-gray-100 text-xs">
                      {medication.category === 'continuous' 
                        ? 'Running' 
                        : formatLocalTime(parseISO(medication.next_due), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                )}
                {medication.last_administered && (
                  <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <span className="font-semibold text-gray-700 dark:text-gray-300 min-w-16">Last:</span>
                    <span className="text-gray-900 dark:text-gray-100 text-xs">
                      {formatLocalTime(parseISO(medication.last_administered), 'MMM dd, HH:mm')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col gap-2 ml-6">
            <button
              onClick={() => {
                setSelectedMedication(medication);
                console.log('Opening administration form for medication:', medication.id);
                alert('Medication administration form not yet implemented');
              }}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <CheckCircle className="w-4 h-4" />
              Give Med
            </button>

            <button
              onClick={() => {
                setSelectedMedication(medication);
                alert('Medication labels feature not yet implemented');
              }}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all duration-200 text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <FileText className="w-4 h-4" />
              Labels
            </button>
            
            <button
              onClick={() => {
                setSelectedMedication(medication);
                setShowHistory(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Clock className="w-4 h-4" />
              History
            </button>
            
            {/* Debug: Show current user role */}
            <div className="text-xs text-red-600 mt-2 bg-yellow-100 p-2 rounded">
              Debug Info:<br/>
              • hasRole(['admin', 'super_admin']): {hasRole(['admin', 'super_admin']) ? '✅ TRUE' : '❌ FALSE'}<br/>
              • hasRole(['admin']): {hasRole(['admin']) ? '✅ TRUE' : '❌ FALSE'}<br/>
              • hasRole(['super_admin']): {hasRole(['super_admin']) ? '✅ TRUE' : '❌ FALSE'}<br/>
              • hasRole(['tenant_admin']): {hasRole(['tenant_admin']) ? '✅ TRUE' : '❌ FALSE'}
            </div>
            
            {/* Temporarily show buttons for all users - REMOVE IN PRODUCTION */}
            {(hasRole(['admin', 'super_admin']) || true) && (
              <>
                <button
                  onClick={() => {
                    setMedicationToEdit(medication);
                    setShowMedicationForm(true);
                  }}
                  className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Edit
                </button>
                
                <button
                  onClick={() => handleDeleteMedication(medication.id)}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 text-sm flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
        case 'overview':
            const dueMeds = getDueMedications();
            const overdueMeds = getOverdueMedications();
            return (
                <div className="space-y-6">
                    {overdueMeds.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2 relative bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-lg px-4 py-3 shadow-sm">
                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                Overdue Medications ({overdueMeds.length})
                                <span className="absolute -top-1 -right-1 flex items-center justify-center bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full w-6 h-6 shadow-md">
                                    {overdueMeds.length}
                                </span>
                            </h3>
                            <div className="space-y-3">
                                {overdueMeds.map(renderMedicationCard)}
                            </div>
                        </div>
                    )}
                    {dueMeds.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-yellow-600 mb-3 flex items-center gap-2 relative bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg px-4 py-3 shadow-sm">
                                <Clock className="w-5 h-5 text-yellow-500" />
                                Due Now ({dueMeds.length})
                                <span className="absolute -top-1 -right-1 flex items-center justify-center bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs font-bold rounded-full w-6 h-6 shadow-md">
                                    {dueMeds.length}
                                </span>
                            </h3>
                            <div className="space-y-3">
                                {dueMeds.map(renderMedicationCard)}
                            </div>
                        </div>
                    )}
                    {dueMeds.length === 0 && overdueMeds.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No medications due at this time</p>
                        </div>
                    )}
                </div>
            );
        case 'scheduled':
            const scheduledMeds = filterMedicationsByCategory('scheduled');
            return (
                <div className="space-y-3">
                    {scheduledMeds.length > 0 ? (
                        scheduledMeds.map(renderMedicationCard)
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No scheduled medications</p>
                        </div>
                    )}
                </div>
            );
        case 'prn':
            const prnMeds = filterMedicationsByCategory('prn');
            return (
                <div className="space-y-3 relative">
                    {prnMeds.length > 0 ? (
                        prnMeds.map(renderMedicationCard)
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No PRN medications</p>
                        </div>
                    )}
                </div>
            );
        case 'continuous':
            const continuousMeds = filterMedicationsByCategory('continuous');
            return (
                <div className="space-y-3 relative">
                    {continuousMeds.length > 0 ? (
                        continuousMeds.map(renderMedicationCard)
                    ) : (
                        <div className="text-center py-8 text-gray-500">
                            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No continuous medications</p>
                        </div>
                    )}
                </div>
            );
        default:
            return null;
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Pill className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          MAR
        </h2>
        
        <div className="flex gap-2">
          {hasRole(['admin', 'super_admin']) && (
            <button
              onClick={() => {
                setMedicationToEdit(null);
                setShowMedicationForm(true);
              }} 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Medication
            </button>
          )}
          
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            <X className="w-4 h-4 inline" />
          </button>
        </div>
      )}

      {/* Enhanced Tab Navigation */}
      <div className="relative mb-8">
        {/* Background with gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl"></div>
        
        <div className="relative flex space-x-2 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-xl border border-gray-200 dark:border-gray-600 shadow-lg">
          {[
            { key: 'overview', label: 'Overview', icon: Activity, gradient: 'from-purple-500 to-purple-600' },
            { key: 'scheduled', label: 'Scheduled', icon: Calendar, count: medCounts.scheduled, gradient: 'from-blue-500 to-blue-600' },
            { key: 'prn', label: 'PRN', icon: CalendarDays, count: medCounts.prn, gradient: 'from-green-500 to-green-600' },
            { key: 'continuous', label: 'IV/Continuous', icon: Activity, count: medCounts.continuous, gradient: 'from-orange-500 to-orange-600' }
          ].map(({ key, label, icon: Icon, count, gradient }) => {
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 ${
                  isActive
                    ? `bg-gradient-to-r ${gradient} text-white shadow-lg border-2 border-white/20`
                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-gray-200 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-500'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-current'}`} />
                <span className="font-semibold text-sm">{label}</span>
                {key !== 'overview' && count !== undefined && count > 0 && (
                  <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                    isActive 
                      ? 'bg-white/20 text-white border border-white/30' 
                      : 'bg-red-500 text-white shadow-sm'
                  }`}>
                    {count}
                  </span>
                )}
                
                {/* Active indicator dot */}
                {isActive && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full shadow-lg border-2 border-current animate-pulse"></div>
                )}
              </button>
            );
          })}
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-200 dark:bg-blue-600 rounded-full opacity-60"></div>
        <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-purple-200 dark:bg-purple-600 rounded-full opacity-40"></div>
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Modals */}

      {/* Medication History */}
      {showHistory && selectedMedication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Medication History</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              History for {selectedMedication.name} - Feature coming soon
            </p>
            <button
              onClick={() => {
                setShowHistory(false);
                setSelectedMedication(null);
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showMedicationForm && (
        <MedicationForm
          medication={medicationToEdit}
          patientId={patientId}
          patientName={patientName || 'Unknown Patient'}
          onClose={() => {
            setShowMedicationForm(false);
            setMedicationToEdit(null);
          }}
          onSuccess={() => {
            setShowMedicationForm(false);
            setMedicationToEdit(null);
            handleRefresh();
          }}
        />
      </div>
      
      {/* Medication Labels/Barcode */}
      {showMedicationLabels && selectedMedication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Medication Labels</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Labels for {selectedMedication.name} - Feature coming soon
            </p>
            <button
              onClick={() => {
                setShowMedicationLabels(false);
                setSelectedMedication(null);
                handleRefresh();
              }}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};