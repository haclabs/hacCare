import React, { useState } from 'react';
import {
  Pill,
  Clock,
  CheckCircle,
  Plus,
  Syringe,
  Calendar,
  QrCode,
  Edit3,
  Trash2,
} from 'lucide-react';

import type { Patient, Medication } from '../../../../types';
import { deleteMedication } from '../../../../services/clinical/medicationService';
import { formatLocalTime } from '../../../../utils/time';
import { secureLogger } from '../../../../lib/security/secureLogger';

interface MedicationAdministrationGridProps {
  patient: Patient;
  medications: Medication[];
  currentUser?: { id: string; name: string; role: string };
  onMedicationUpdate: (medications: Medication[]) => void | Promise<void>;
  onAddClick: () => void;
  onEditClick: (medication: Medication) => void;
  onBCMAStart: (patient: Patient, medication: Medication) => void;
}

type CategoryFilter = 'All' | 'prn' | 'scheduled' | 'scheduled_diabetic' | 'continuous' | 'stat';

const categoryInfo = {
  prn: {
    title: 'PRN (As Needed)',
    icon: Clock,
    color: 'blue',
    description: 'No alerts - administer as needed',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  scheduled: {
    title: 'Scheduled Medications',
    icon: Calendar,
    color: 'green',
    description: 'Time-based alerts enabled',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  continuous: {
    title: 'IV/Continuous',
    icon: Syringe,
    color: 'blue',
    description: 'Running continuously until discontinued',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  diabetic: {
    title: 'Diabetic Medications',
    icon: Syringe,
    color: 'orange',
    description: 'Blood glucose management - time-based alerts enabled',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
  },
  stat: {
    title: 'STAT Medications',
    icon: Clock,
    color: 'red',
    description: 'One-time administration - no alerts',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
} as const;

export const MedicationAdministrationGrid: React.FC<MedicationAdministrationGridProps> = ({
  patient,
  medications,
  currentUser,
  onMedicationUpdate,
  onAddClick,
  onEditClick,
  onBCMAStart,
}) => {
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<CategoryFilter>('All');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isAdmin =
    currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin');

  const handleDelete = async (medicationId: string) => {
    if (!isAdmin) {
      alert('You do not have permission to delete medications');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this medication?')) return;

    setIsLoading(true);
    try {
      await deleteMedication(medicationId);
      const updated = medications.filter((m) => m.id !== medicationId);
      onMedicationUpdate(updated);
      setSuccessMessage('Medication deleted successfully');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      secureLogger.error('Error deleting medication:', error);
      alert('Failed to delete medication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const activeMedications = medications.filter((m) => m.status === 'Active');

  const filteredMedications =
    activeCategoryFilter === 'All'
      ? activeMedications
      : activeCategoryFilter === 'scheduled_diabetic'
      ? activeMedications.filter((m) => m.category === 'diabetic')
      : activeMedications.filter((m) => m.category === activeCategoryFilter);

  const grouped = {
    prn: activeMedications.filter((m) => m.category === 'prn'),
    scheduled: activeMedications.filter((m) => m.category === 'scheduled'),
    diabetic: activeMedications.filter((m) => m.category === 'diabetic'),
    continuous: activeMedications.filter((m) => m.category === 'continuous'),
    stat: activeMedications.filter((m) => m.category === 'stat'),
  };

  const renderMedicationItem = (medication: Medication, category: string) => {
    const isDue = medication.next_due && new Date(medication.next_due) <= new Date();
    const shouldAlert =
      category === 'scheduled' || category === 'continuous' || category === 'diabetic';

    return (
      <div key={medication.id} className="p-6 hover:bg-gray-50 transition-colors">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h4 className="text-lg font-medium text-gray-900">{medication.name}</h4>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  category === 'prn'
                    ? 'bg-blue-100 text-blue-800'
                    : category === 'scheduled'
                    ? 'bg-green-100 text-green-800'
                    : medication.category === 'diabetic'
                    ? 'bg-orange-100 text-orange-800'
                    : category === 'continuous'
                    ? 'bg-purple-100 text-purple-800'
                    : category === 'stat'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {category === 'prn'
                  ? 'PRN'
                  : category === 'scheduled'
                  ? 'Scheduled'
                  : medication.category === 'diabetic'
                  ? '💉 Diabetic'
                  : category === 'continuous'
                  ? 'IV/Continuous'
                  : category === 'stat'
                  ? 'STAT'
                  : category}
              </span>
              {shouldAlert && isDue && (
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${
                    category === 'continuous'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  <Clock className="h-3 w-3" />
                  <span>{category === 'continuous' ? 'RUNNING' : 'DUE'}</span>
                </span>
              )}
              {medication.last_administered && (
                <span className="px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 bg-blue-100 text-blue-800">
                  <CheckCircle className="h-3 w-3" />
                  <span>
                    Last Given:{' '}
                    {formatLocalTime(new Date(medication.last_administered), 'HH:mm')}
                  </span>
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">
              {medication.dosage} • {medication.route} • {medication.frequency}
            </p>
            {medication.next_due && category !== 'prn' && category !== 'stat' && (
              <p className="text-sm text-gray-500 mt-1">
                {category === 'continuous'
                  ? 'Continuous infusion'
                  : `Due at: ${formatLocalTime(new Date(medication.next_due), 'HH:mm')}`}
              </p>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                Prescribed by: {medication.prescribed_by}
              </p>
              <p className="text-sm text-gray-500">
                {new Date(medication.start_date).toLocaleDateString()} -{' '}
                {medication.end_date
                  ? new Date(medication.end_date).toLocaleDateString()
                  : 'Ongoing'}
              </p>
            </div>

            <div className="flex space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBCMAStart(patient, medication);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-1 ${
                  shouldAlert && isDue
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : category === 'prn'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                title="BCMA - Barcode Administration"
              >
                <QrCode className="h-4 w-4" />
                <span>{category === 'prn' ? 'Give PRN' : 'Administer'}</span>
              </button>

              {isAdmin && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditClick(medication);
                    }}
                    className="px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-1"
                    title="Edit Medication"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(medication.id);
                    }}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-1"
                    title="Delete Medication"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (medications.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <Pill className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Medications</h3>
        <p className="text-gray-600">Patient has no medications on record.</p>
        <button
          onClick={onAddClick}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Add First Medication</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap space-x-1 bg-gray-100 rounded-lg p-1">
          {(['All', 'prn', 'scheduled', 'scheduled_diabetic', 'continuous', 'stat'] as const).map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategoryFilter(cat)}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center space-x-2 ${
                  activeCategoryFilter === cat
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {cat === 'prn' && <Clock className="h-4 w-4" />}
                {cat === 'scheduled' && <Calendar className="h-4 w-4" />}
                {cat === 'scheduled_diabetic' && <span className="text-orange-500">💉</span>}
                {cat === 'continuous' && <Syringe className="h-4 w-4" />}
                {cat === 'stat' && <span className="text-red-500">⚡</span>}
                <span>
                  {cat === 'All'
                    ? 'All'
                    : cat === 'prn'
                    ? 'PRN (As Needed)'
                    : cat === 'scheduled'
                    ? 'Scheduled'
                    : cat === 'scheduled_diabetic'
                    ? 'Diabetic'
                    : cat === 'continuous'
                    ? 'IV/Continuous'
                    : 'STAT'}
                </span>
                <span className="bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 text-xs">
                  {cat === 'All'
                    ? activeMedications.length
                    : cat === 'scheduled_diabetic'
                    ? grouped.diabetic.length
                    : grouped[cat as keyof typeof grouped]?.length || 0}
                </span>
              </button>
            )
          )}
        </div>

        <button
          onClick={onAddClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Medication</span>
        </button>
      </div>

      {/* Success / loading feedback */}
      {showSuccessMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-green-800">Success!</p>
            <p className="text-sm text-green-700 mt-1">{successMessage}</p>
          </div>
          <button
            onClick={() => setShowSuccessMessage(false)}
            className="flex-shrink-0 text-green-400 hover:text-green-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mr-3" />
          <span className="text-gray-600 text-sm">Processing...</span>
        </div>
      )}

      {/* Medication list */}
      {activeCategoryFilter === 'All' ? (
        <div className="space-y-6">
          {(Object.entries(grouped) as [keyof typeof grouped, Medication[]][]).map(
            ([key, meds]) => {
              if (meds.length === 0) return null;
              const info = categoryInfo[key];
              const IconComponent = info.icon;
              return (
                <div
                  key={key}
                  className={`${info.bgColor} ${info.borderColor} border rounded-lg`}
                >
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <IconComponent className={`h-5 w-5 text-${info.color}-600`} />
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{info.title}</h3>
                          <p className="text-sm text-gray-600">{info.description}</p>
                        </div>
                      </div>
                      <span
                        className={`bg-${info.color}-100 text-${info.color}-800 px-3 py-1 rounded-full text-sm font-medium`}
                      >
                        {meds.length}
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {meds.map((med) => renderMedicationItem(med, med.category || 'scheduled'))}
                  </div>
                </div>
              );
            }
          )}
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">
              {activeCategoryFilter === 'prn'
                ? 'PRN (As Needed)'
                : activeCategoryFilter === 'scheduled'
                ? 'Scheduled Medications'
                : activeCategoryFilter === 'scheduled_diabetic'
                ? 'Diabetic Medications'
                : activeCategoryFilter === 'continuous'
                ? 'IV/Continuous Medications'
                : activeCategoryFilter === 'stat'
                ? 'STAT Medications'
                : 'All Medications'}
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {filteredMedications.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-gray-500">No medications in this category</p>
              </div>
            ) : (
              filteredMedications.map((med) =>
                renderMedicationItem(med, med.category || 'scheduled')
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
