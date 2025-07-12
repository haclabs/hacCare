import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, Pill, Trash2, X, Activity, RefreshCw, Calendar, CalendarDays, AlertTriangle, Plus, FileText } from 'lucide-react';
import { Medication, MedicationAdministration as MedAdmin } from '../../types';
import { isValid, parseISO } from 'date-fns';
import { formatLocalTime } from '../../utils/dateUtils';
import { MedicationAdministrationForm } from './MedicationAdministrationForm';
import { MedicationAdministrationHistory } from './MedicationAdministrationHistory';
import { MedicationForm } from './MedicationForm';
import { MedicationBarcode } from './MedicationBarcode';
import { useAuth } from '../../hooks/useAuth'; 
import { supabase } from '../../lib/supabase';
import { fetchPatientMedications, deleteMedication } from '../../lib/medicationService';
import { runAlertChecks } from '../../lib/alertService';
import { usePatients } from '../../hooks/usePatients';

interface MedicationAdministrationProps {
  patientId: string;
  patientName?: string;
  title?: string;
  medications: Medication[];
  initialCategory?: string;
  onRefresh: () => void;
}

// Helper function to count medications by category
const countMedicationsByCategory = (medications: Medication[]) => {
  return {
    scheduled: medications.filter(med => med.category === 'scheduled' && med.status === 'Active').length,
    prn: medications.filter(med => med.category === 'prn' && med.status === 'Active').length,
    continuous: medications.filter(med => med.category === 'continuous' && med.status === 'Active').length
  };
};

export const MedicationAdministration: React.FC<MedicationAdministrationProps> = ({
  patientId,
  patientName,
  title = "Medication Administration",
  medications,
  initialCategory = 'overview',
  onRefresh
}) => {
  const { hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'scheduled' | 'prn' | 'continuous'>(
    initialCategory === 'scheduled' || initialCategory === 'prn' || initialCategory === 'continuous' 
      ? initialCategory 
      : 'overview'
  );
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allMedications, setAllMedications] = useState<Medication[]>(medications);
  const [error, setError] = useState<string | null>(null);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [medicationToEdit, setMedicationToEdit] = useState<Medication | null>(null);
  const [showMedicationLabels, setShowMedicationLabels] = useState(false);
  const { getPatient } = usePatients();

  useEffect(() => {
    setAllMedications(medications);
  }, [medications]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const now = new Date();
      console.log('Refreshing medications for patient:', patientId, now.toISOString());
      const updatedMedications = await fetchPatientMedications(patientId);
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
    
    return (
      <div
        key={medication.id}
        className={`bg-white dark:bg-gray-800 rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${
          isOverdue ? 'border-purple-300 bg-purple-50 dark:border-purple-700 dark:bg-purple-900/20' : 
          isDue ? 'border-yellow-300 bg-yellow-50' : 
          'border-gray-200 dark:border-gray-700'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Pill className={`w-5 h-5 ${
                isOverdue ? 'text-purple-600 dark:text-purple-400' : 
                isDue ? 'text-yellow-600' : 
                'text-blue-600 dark:text-blue-400'
              }`} />
              <h3 className="font-semibold text-gray-900 dark:text-white">{medication.name}</h3>
              {(isDue || isOverdue) && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isOverdue ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                }`}>
                  {isOverdue ? 'Overdue' : 'Due'}
                </span>
              )}
            </div>
            
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-300">
              <p><span className="font-medium dark:text-gray-200">Dosage:</span> {medication.dosage}</p>
              <p><span className="font-medium dark:text-gray-200">Route:</span> {medication.route}</p>
              <p><span className="font-medium dark:text-gray-200">Frequency:</span> {medication.frequency}</p>
              {medication.next_due && (
                <p><span className="font-medium dark:text-gray-200">Next Due:</span> {formatLocalTime(parseISO(medication.next_due), 'MMM dd, yyyy HH:mm')}</p>
              )}
              {medication.last_administered && (
                <p><span className="font-medium dark:text-gray-200">Last Given:</span> {formatLocalTime(parseISO(medication.last_administered), 'MMM dd, yyyy HH:mm')}</p>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-2 ml-4">
            <button
              onClick={() => {
                setSelectedMedication(medication);
                console.log('Opening administration form for medication:', medication.id); 
                setShowAdminForm(true);
              }}
              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm flex items-center gap-1 relative"
            >
              <CheckCircle className="w-4 h-4" />
              Give
            </button>

            <button
              onClick={() => {
                setSelectedMedication(medication);
                setShowMedicationLabels(true);
              }}
              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
            >
              <FileText className="w-4 h-4" />
              Print Labels
            </button>
            
            <button
              onClick={() => {
                setSelectedMedication(medication);
                setShowHistory(true);
              }}
              className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm flex items-center gap-1"
            >
              <Clock className="w-4 h-4" />
              History
            </button>
            
            {hasRole(['admin', 'super_admin']) && (
              <>
                <button
                  onClick={() => {
                    setMedicationToEdit(medication);
                    setShowMedicationForm(true);
                  }}
                  className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
                >
                  Edit
                </button>
                
                <button
                  onClick={() => handleDeleteMedication(medication.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm flex items-center gap-1"
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
        const totalDueMeds = dueMeds.length + overdueMeds.length;
        
        return (
          <div className="space-y-6">
            {overdueMeds.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2 relative">
                  <AlertTriangle className="w-5 h-5" />
                  Overdue Medications ({overdueMeds.length})
                  <span className="absolute -top-1 -right-1 flex items-center justify-center bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5">
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
                <h3 className="text-lg font-semibold text-yellow-600 mb-3 flex items-center gap-2 relative">
                  <Clock className="w-5 h-5" />
                  Due Now ({dueMeds.length})
                  <span className="absolute -top-1 -right-1 flex items-center justify-center bg-yellow-600 text-white text-xs font-bold rounded-full w-5 h-5">
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
            {prnMeds.length > 0 && (
              <div className="absolute top-0 right-0">
                <span className="flex items-center justify-center bg-red-600 text-white font-bold rounded-full w-6 h-6">
                  {prnMeds.length}
                </span>
              </div>
            )}
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
          <div className="space-y-3">
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
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Pill className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          {title} - {patientName}
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

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg">
        {[
          { key: 'overview', label: 'Overview', icon: Activity },
          { key: 'scheduled', label: 'Scheduled', icon: Calendar, count: medCounts.scheduled },
          { key: 'prn', label: 'PRN', icon: CalendarDays, count: medCounts.prn },
          { key: 'continuous', label: 'IV', icon: Activity, count: medCounts.continuous }
        ].map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-colors ${
              activeTab === key
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Icon className="w-4 h-4 mr-1" />
            <span>{label}</span>
            {key !== 'overview' && count > 0 && (
              <span className="ml-1.5 bg-red-600 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderTabContent()}

      {/* Modals */}
      {showAdminForm && selectedMedication && (
        <MedicationAdministrationForm
          medication={selectedMedication}
          patientId={patientId}
          patientName={patientName || 'Unknown Patient'}
          onClose={() => {
            setShowAdminForm(false);
            setSelectedMedication(null);
          }} 
          onSuccess={() => {
            console.log('Medication administration successful, refreshing data');
            setShowAdminForm(false);
            setSelectedMedication(null);
            // Refresh immediately
            handleRefresh();
          }}
        />
      )}

      {showHistory && selectedMedication && (
        <MedicationAdministrationHistory
          medicationId={selectedMedication.id}
          patientId={patientId}
          medicationName={selectedMedication.name}
          patientName={patientName || 'Unknown Patient'}
          onClose={() => {
            setShowHistory(false);
            setSelectedMedication(null);
          }}
        />
      )}

      {showMedicationForm && (
        <MedicationForm
          patientId={patientId}
          medication={medicationToEdit}
          onClose={() => {
            setShowMedicationForm(false); 
            setMedicationToEdit(null);
          }} 
          onSuccess={(medication) => {
            setShowMedicationForm(false);
            setMedicationToEdit(null);
            handleRefresh();
          }}
        />
      )}
      
      {showMedicationLabels && selectedMedication && (
        <MedicationBarcode
          patient={{ 
            id: patientId, 
            first_name: patientName ? patientName.split(' ')[0] : 'Unknown', 
            last_name: patientName ? patientName.split(' ')[1] || '' : 'Patient', 
            patient_id: getPatient(patientId)?.patient_id || 'Unknown'
          }}
          medications={selectedMedication ? [selectedMedication] : allMedications}
          onClose={() => {
            setShowMedicationLabels(false);
            setSelectedMedication(null);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
};