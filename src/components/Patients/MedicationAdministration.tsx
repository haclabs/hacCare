import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, Pill, Trash2, X, Activity, RefreshCw, Calendar, CalendarDays, AlertTriangle, Plus } from 'lucide-react';
import { Medication, MedicationAdministration as MedAdmin } from '../../types';
import { format, isValid, parseISO } from 'date-fns';
import { MedicationAdministrationForm } from './MedicationAdministrationForm';
import { MedicationAdministrationHistory } from './MedicationAdministrationHistory';
import { MedicationForm } from './MedicationForm';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { fetchPatientMedications, deleteMedication } from '../../lib/medicationService';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'scheduled' | 'prn' | 'continuous'>('overview');
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allMedications, setAllMedications] = useState<Medication[]>(medications);
  const [error, setError] = useState<string | null>(null);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [medicationToEdit, setMedicationToEdit] = useState<Medication | null>(null);

  useEffect(() => {
    setAllMedications(medications);
  }, [medications]);

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const updatedMedications = await fetchPatientMedications(patientId);
      setAllMedications(updatedMedications);
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

  const filterMedicationsByCategory = (category: string) => {
    return allMedications.filter(med => med.category === category);
  };

  const getDueMedications = () => {
    const now = new Date();
    return allMedications.filter(med => {
      if (!med.next_due) return false;
      const dueTime = parseISO(med.next_due);
      return isValid(dueTime) && dueTime <= now && med.status === 'Active';
    });
  };

  const getOverdueMedications = () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    return allMedications.filter(med => {
      if (!med.next_due) return false;
      const dueTime = parseISO(med.next_due);
      return isValid(dueTime) && dueTime <= oneHourAgo && med.status === 'Active';
    });
  };

  const renderMedicationCard = (medication: Medication) => {
    const isDue = getDueMedications().includes(medication);
    const isOverdue = getOverdueMedications().includes(medication);
    
    return (
      <div
        key={medication.id}
        className={`bg-white rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${
          isOverdue ? 'border-red-300 bg-red-50' : 
          isDue ? 'border-yellow-300 bg-yellow-50' : 
          'border-gray-200'
        }`}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Pill className={`w-5 h-5 ${
                isOverdue ? 'text-red-600' : 
                isDue ? 'text-yellow-600' : 
                'text-blue-600'
              }`} />
              <h3 className="font-semibold text-gray-900">{medication.name}</h3>
              {(isDue || isOverdue) && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isOverdue ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {isOverdue ? 'Overdue' : 'Due'}
                </span>
              )}
            </div>
            
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Dosage:</span> {medication.dosage}</p>
              <p><span className="font-medium">Route:</span> {medication.route}</p>
              <p><span className="font-medium">Frequency:</span> {medication.frequency}</p>
              {medication.next_due && (
                <p><span className="font-medium">Next Due:</span> {format(parseISO(medication.next_due), 'MMM dd, yyyy HH:mm')}</p>
              )}
              {medication.last_administered && (
                <p><span className="font-medium">Last Given:</span> {format(parseISO(medication.last_administered), 'MMM dd, yyyy HH:mm')}</p>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-2 ml-4">
            <button
              onClick={() => {
                setSelectedMedication(medication);
                setShowAdminForm(true);
              }}
              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm flex items-center gap-1"
            >
              <CheckCircle className="w-4 h-4" />
              Give
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
        
        return (
          <div className="space-y-6">
            {overdueMeds.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-red-600 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Overdue Medications ({overdueMeds.length})
                </h3>
                <div className="space-y-3">
                  {overdueMeds.map(renderMedicationCard)}
                </div>
              </div>
            )}
            
            {dueMeds.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-yellow-600 mb-3 flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Due Now ({dueMeds.length})
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
          <div className="space-y-3">
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
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Pill className="w-6 h-6 text-blue-600" />
          Medication Administration - {patientName}
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
      <div className="flex space-x-1 mb-6 bg-gray-200 p-1 rounded-lg">
        {[
          { key: 'overview', label: 'Overview', icon: Activity },
          { key: 'scheduled', label: 'Scheduled', icon: Calendar },
          { key: 'prn', label: 'PRN', icon: CalendarDays },
          { key: 'continuous', label: 'Continuous', icon: Activity }
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-colors ${
              activeTab === key
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
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
          patientName={patientName}
          onClose={() => {
            setShowAdminForm(false);
            setSelectedMedication(null);
          }}
          onSuccess={() => {
            setShowAdminForm(false);
            setSelectedMedication(null);
            handleRefresh();
          }}
        />
      )}

      {showHistory && selectedMedication && (
        <MedicationAdministrationHistory
          medicationId={selectedMedication.id}
          medicationName={selectedMedication.name}
          patientName={patientName}
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
    </div>
  );
};