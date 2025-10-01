/**
 * Modular MAR (Medication Administration Record) Module
 * 
 * This module provides a self-contained medication administration system with:
 * - Dynamic form generation for medication administration
 * - Safety checks and allergy validation
 * - Drug interaction checking
 * - Integration with existing medication data
 */

import React, { useState, useEffect } from 'react';
import { Pill, Clock, AlertTriangle, CheckCircle, Plus, Syringe, Calendar, QrCode, Droplets, Edit3, Trash2 } from 'lucide-react';
import { DynamicForm } from '../../components/forms/DynamicForm';
import { schemaEngine } from '../../lib/schemaEngine';
import { medicationAdministrationSchema } from '../../schemas/medicationSchemas';
import { Patient, Medication } from '../../types';
import { ValidationResult, FormGenerationContext } from '../../types/schema';
import { createMedication, recordMedicationAdministration, updateMedication, deleteMedication } from '../../lib/medicationService';
import { formatLocalTime } from '../../utils/time';
import { BCMAAdministration } from '../../components/bcma/BCMAAdministration';
import { BarcodeGenerator } from '../../components/bcma/BarcodeGenerator';
import { useBCMA } from '../../hooks/useBCMA';
import DiabeticRecordModule from '../../components/DiabeticRecordModule';
import { MedicationHistoryView } from './components/MedicationHistoryView';

type MedicationCategory = 'prn' | 'scheduled' | 'continuous';

interface MARModuleProps {
  patient: Patient;
  medications: Medication[];
  onMedicationUpdate: (medications: Medication[]) => void | Promise<void>;
  currentUser?: {
    id: string;
    name: string;
    role: string;
  };
}

type MARView = 'administration' | 'history' | 'diabetic-record' | 'add-medication';

export const MARModule: React.FC<MARModuleProps> = ({
  patient,
  medications,
  onMedicationUpdate,
  currentUser
}) => {
  const [activeView, setActiveView] = useState<MARView>('administration');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [showAddMedication, setShowAddMedication] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showBarcodeLabels, setShowBarcodeLabels] = useState(false);
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  // Form state for adding medications
  const [newMedicationForm, setNewMedicationForm] = useState({
    name: '',
    category: '',
    dosage: '',
    route: '',
    frequency: '1 time daily',
    admin_time: '08:00',
    admin_times: ['08:00'],
    prescribed_by: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: ''
  });

  // Form state for editing medications
  const [editMedicationForm, setEditMedicationForm] = useState({
    name: '',
    category: '',
    dosage: '',
    route: '',
    frequency: '',
    admin_time: '08:00',
    admin_times: ['08:00'],
    prescribed_by: '',
    start_date: '',
    end_date: ''
  });

  // BCMA Integration
  const bcma = useBCMA();

  // Register schemas on component mount
  useEffect(() => {
    schemaEngine.registerSchema(medicationAdministrationSchema);
  }, []);

  // Generate form context with patient and medication data
  const generateFormContext = (): FormGenerationContext => {
    return {
      patient: {
        id: patient.id,
        age: calculateAge(patient.date_of_birth),
        gender: patient.gender,
        allergies: patient.allergies,
        currentMedications: medications.map(m => m.name),
        condition: patient.condition
      },
      user: currentUser ? {
        id: currentUser.id,
        role: currentUser.role,
        department: 'nursing',
        permissions: ['medication_administration']
      } : undefined,
      clinical: {
        currentVitals: patient.vitals[0] || null,
        recentAssessments: [],
        activeMedications: medications.filter(m => m.status === 'Active')
      },
      form: {
        mode: 'create',
        autoSave: false
      }
    };
  };

  // Handle BCMA administration completion
  const handleBCMAComplete = async (success: boolean, log?: any) => {
    if (success && log && selectedMedication) {
      // Update medication with new administration record
      const updatedMedications = medications.map(med => {
        if (med.id === selectedMedication.id) {
          return {
            ...med,
            last_administered: log.timestamp,
            next_due: log.next_due || med.next_due,
            administrations: [...(med.administrations || []), log]
          };
        }
        return med;
      });

      onMedicationUpdate(updatedMedications);
      setSelectedMedication(null);
      bcma.cancelBCMAProcess();

      // Show success message
      setSuccessMessage(`${selectedMedication.name} administered successfully via BCMA`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);

      console.log('BCMA administration completed:', log);
    } else {
      bcma.cancelBCMAProcess();
      setSelectedMedication(null);
    }
  };

  // Handle barcode scanning integration
  useEffect(() => {
    const handleGlobalBarcodeScanned = (event: CustomEvent) => {
      if (bcma.state.isActive) {
        bcma.handleBarcodeScanned(event.detail.barcode);
      }
    };

    // Listen for barcode events from your existing scanning infrastructure
    document.addEventListener('barcodescanned', handleGlobalBarcodeScanned as EventListener);

    return () => {
      document.removeEventListener('barcodescanned', handleGlobalBarcodeScanned as EventListener);
    };
  }, [bcma]);

  // Handle medication administration form submission
  const handleMedicationAdministration = async (data: any, validation: ValidationResult) => {
    if (!validation.valid) {
      console.error('Form validation failed:', validation.errors);
      return;
    }

    setIsLoading(true);
    try {
      // Save administration record to database
      const administrationData = {
        medication_id: data.medicationId,
        patient_id: patient.id,
        administered_by: currentUser?.name || data.administeredBy,
        administered_by_id: currentUser?.id,
        timestamp: data.administrationTime,
        notes: data.notes,
        status: 'completed' as const
      };

      console.log('Recording manual medication administration:', administrationData);
      const savedRecord = await recordMedicationAdministration(administrationData);
      console.log('Manual administration record saved to database:', savedRecord);

      // Create local administration record for state update
      const administrationRecord = {
        id: savedRecord?.id || `admin-${Date.now()}`,
        medication_id: data.medicationId,
        patient_id: patient.id,
        administered_by: currentUser?.name || data.administeredBy,
        administered_by_id: currentUser?.id,
        timestamp: data.administrationTime,
        notes: data.notes
      };

      // Update medication with administration record
      const updatedMedications = medications.map(med => {
        if (med.id === data.medicationId) {
          return {
            ...med,
            last_administered: data.administrationTime,
            administrations: [...(med.administrations || []), administrationRecord]
          };
        }
        return med;
      });

      onMedicationUpdate(updatedMedications);

      // Check for clinical alerts
      if (validation.clinicalAlerts && validation.clinicalAlerts.length > 0) {
        console.log('Clinical alerts detected:', validation.clinicalAlerts);
      }
      console.log('Medication administration recorded successfully');
      setSuccessMessage(`${medications.find(m => m.id === data.medicationId)?.name} administered successfully`);
    } catch (error) {
      console.error('Error recording medication administration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle deleting medication
  const handleDeleteMedication = async (medicationId: string) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
      alert('You do not have permission to delete medications');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this medication?')) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteMedication(medicationId);
      
      // Update local state by filtering out the deleted medication
      const updatedMedications = medications.filter(med => med.id !== medicationId);
      onMedicationUpdate(updatedMedications);
      
      setSuccessMessage('Medication deleted successfully');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error deleting medication:', error);
      alert('Failed to delete medication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle editing medication
  const handleEditMedication = (medication: Medication) => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
      alert('You do not have permission to edit medications');
      return;
    }

    // Initialize edit form with existing medication data
    let adminTimes = medication.admin_times || [medication.admin_time || '08:00'];
    
    // If admin_times is missing or incorrect for the frequency, generate proper times
    const expectedTimesCount = medication.frequency.includes('Four times') || medication.frequency.includes('QID') ? 4 :
                              medication.frequency.includes('Three times') || medication.frequency.includes('TID') ? 3 :
                              medication.frequency.includes('Twice') || medication.frequency.includes('BID') ? 2 : 1;
    
    if (!medication.admin_times || adminTimes.length !== expectedTimesCount) {
      const defaultTimes = ['08:00', '14:00', '20:00', '02:00'];
      
      // Generate times based on frequency
      if (expectedTimesCount > 1) {
        adminTimes = defaultTimes.slice(0, expectedTimesCount);
        // Use the existing admin_time as the first time if it exists
        if (medication.admin_time) {
          adminTimes[0] = medication.admin_time;
        }
      }
    }
    
    setEditMedicationForm({
      name: medication.name,
      category: medication.category || 'scheduled',
      dosage: medication.dosage,
      route: medication.route,
      frequency: medication.frequency,
      admin_time: medication.admin_time || '08:00',
      admin_times: adminTimes,
      prescribed_by: medication.prescribed_by,
      start_date: medication.start_date.split('T')[0],
      end_date: medication.end_date ? medication.end_date.split('T')[0] : ''
    });

    setEditingMedication(medication);
    setShowEditForm(true);
  };

  // Handle updating medication
  const handleUpdateMedication = async (data: any, validation: ValidationResult) => {
    if (!validation.valid) {
      console.error('Form validation failed:', validation.errors);
      return;
    }

    if (!editingMedication) return;

    setIsLoading(true);
    try {
      const updates: Partial<Medication> = {
        name: data.name,
        dosage: data.dosage,
        route: data.route,
        frequency: data.frequency,
        category: data.category as MedicationCategory,
        prescribed_by: data.prescribed_by,
        start_date: data.start_date,
        end_date: data.end_date || undefined,
        admin_time: data.admin_time,
        admin_times: data.admin_times
      };

      const updatedMedication = await updateMedication(editingMedication.id, updates);
      
      // Update local state
      const updatedMedications = medications.map(med => 
        med.id === editingMedication.id ? updatedMedication : med
      );
      onMedicationUpdate(updatedMedications);
      
      setSuccessMessage(`Medication "${data.name}" updated successfully`);
      setShowSuccessMessage(true);
      setShowEditForm(false);
      setEditingMedication(null);
      
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Error updating medication:', error);
      alert('Failed to update medication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to update admin times based on frequency
  const updateAdminTimesFromFrequency = (frequency: string) => {
    let timesNeeded = 1;
    
    if (frequency.includes('time daily') || frequency.includes('times daily')) {
      const match = frequency.match(/(\d+) times?/);
      timesNeeded = match ? parseInt(match[1]) : 1;
    }
    
    const defaultTimes = ['08:00', '14:00', '20:00', '02:00'];
    const newTimes = defaultTimes.slice(0, timesNeeded);
    
    setNewMedicationForm(prev => ({
      ...prev,
      frequency,
      admin_times: newTimes,
      admin_time: newTimes[0]
    }));
  };

  // Helper function to update form field
  const updateFormField = (field: string, value: string) => {
    if (field === 'frequency') {
      updateAdminTimesFromFrequency(value);
    } else {
      setNewMedicationForm(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Helper function for edit form to update admin times based on frequency
  const updateEditAdminTimesFromFrequency = (frequency: string) => {
    let timesNeeded = 1;
    
    if (frequency.includes('time daily') || frequency.includes('times daily')) {
      const match = frequency.match(/(\d+) times?/);
      timesNeeded = match ? parseInt(match[1]) : 1;
    }
    
    const defaultTimes = ['08:00', '14:00', '20:00', '02:00'];
    const newTimes = defaultTimes.slice(0, timesNeeded);
    
    setEditMedicationForm(prev => ({
      ...prev,
      frequency,
      admin_times: newTimes,
      admin_time: newTimes[0]
    }));
  };

  // Helper function to update edit form field
  const updateEditFormField = (field: string, value: string) => {
    if (field === 'frequency') {
      updateEditAdminTimesFromFrequency(value);
    } else {
      setEditMedicationForm(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Helper function to update specific edit admin time
  const updateEditAdminTime = (index: number, time: string) => {
    const newTimes = [...editMedicationForm.admin_times];
    newTimes[index] = time;
    setEditMedicationForm(prev => ({
      ...prev,
      admin_times: newTimes,
      admin_time: newTimes[0]
    }));
  };

  // Helper function to update specific admin time
  const updateAdminTime = (index: number, time: string) => {
    const newTimes = [...newMedicationForm.admin_times];
    newTimes[index] = time;
    setNewMedicationForm(prev => ({
      ...prev,
      admin_times: newTimes,
      admin_time: newTimes[0] // Keep first time for compatibility
    }));
  };

  // Handle adding new medication
  const handleAddMedication = async () => {
    // Validation
    if (!newMedicationForm.name || !newMedicationForm.category || !newMedicationForm.dosage || 
        !newMedicationForm.route || !newMedicationForm.prescribed_by || !newMedicationForm.start_date) {
      alert('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      // Create medication data object for database
      const medicationData: Omit<Medication, 'id'> = {
        patient_id: patient.id,
        name: newMedicationForm.name,
        dosage: newMedicationForm.dosage,
        route: newMedicationForm.route,
        frequency: newMedicationForm.frequency,
        category: newMedicationForm.category as any,
        status: 'Active',
        prescribed_by: newMedicationForm.prescribed_by,
        start_date: newMedicationForm.start_date,
        end_date: newMedicationForm.end_date || undefined,
        next_due: newMedicationForm.category === 'prn' ? new Date().toISOString() : calculateNextDue(newMedicationForm.frequency, newMedicationForm.start_date, newMedicationForm.admin_time, newMedicationForm.admin_times),
        last_administered: undefined,
        admin_time: newMedicationForm.admin_time,
        admin_times: newMedicationForm.admin_times.length > 1 ? newMedicationForm.admin_times : null
      };

      console.log('Creating medication in database:', medicationData);
      
      // Save to database using the medication service
      const savedMedication = await createMedication(medicationData);
      
      console.log('Medication saved to database successfully:', savedMedication);

      // Update local state with the saved medication (which now has a real database ID)
      const updatedMedications = [...medications, savedMedication];
      onMedicationUpdate(updatedMedications);

      // Show success message
      setSuccessMessage(`${newMedicationForm.category} medication "${newMedicationForm.name}" added successfully`);
      setShowSuccessMessage(true);
      setShowAddMedication(false);

      // Reset form
      setNewMedicationForm({
        name: '',
        category: '',
        dosage: '',
        route: '',
        frequency: '1 time daily',
        admin_time: '08:00',
        admin_times: ['08:00'],
        prescribed_by: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: ''
      });
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);

      console.log('New medication added and persisted successfully');
    } catch (error) {
      console.error('Error adding medication:', error);
      
      // Show error message to user
      setSuccessMessage(`Error adding medication: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setShowSuccessMessage(true);
      
      // Hide error message after 5 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate next due time based on frequency and admin time
  const calculateNextDue = (frequency: string, startDate: string, adminTime: string, adminTimes?: string[]): string => {
    if (!adminTime) {
      return new Date().toISOString(); // Fallback if no admin time
    }

    console.log('MAR - Calculating next due time:');
    console.log('- Frequency:', frequency);
    console.log('- Start date:', startDate);
    console.log('- Admin time:', adminTime);
    console.log('- Admin times:', adminTimes);

    const now = new Date();

    // Handle multiple admin times for "X times daily" frequencies
    if ((frequency.includes('time daily') || frequency.includes('times daily')) && !frequency.includes('PRN') && adminTimes && adminTimes.length > 0) {
      const today = new Date(now);
      const todayTimes = adminTimes.map(time => {
        const [h, m] = time.split(':').map(Number);
        const timeToday = new Date(today);
        timeToday.setHours(h, m, 0, 0);
        return timeToday;
      }).sort((a, b) => a.getTime() - b.getTime());

      // Find next upcoming time today
      for (const time of todayTimes) {
        if (time > now) {
          return time.toISOString();
        }
      }

      // All times today have passed, use first time tomorrow
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const [firstHours, firstMinutes] = adminTimes[0].split(':').map(Number);
      tomorrow.setHours(firstHours, firstMinutes, 0, 0);
      return tomorrow.toISOString();
    }

    const [hours, minutes] = adminTime.split(':').map(Number);

    console.log('- Parsed admin time: hours =', hours, ', minutes =', minutes);

    // For different frequencies, calculate next appropriate time
    switch (frequency) {
      case 'Once daily':
        const today = new Date(now);
        const todayAdmin = new Date(today);
        todayAdmin.setHours(hours, minutes, 0, 0);
        
        console.log('- Today admin time:', todayAdmin.toISOString());
        console.log('- Current time vs today admin:', now < todayAdmin ? 'before' : 'after');
        
        // If today's admin time hasn't passed, use it; otherwise, use tomorrow
        if (todayAdmin > now) {
          console.log('- Using today admin time');
          return todayAdmin.toISOString();
        } else {
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(hours, minutes, 0, 0);
          console.log('- Using tomorrow admin time:', tomorrow.toISOString());
          return tomorrow.toISOString();
        }

      case 'Twice daily':
        // 8 AM and 8 PM typically, but use admin time as base
        const firstDose = new Date(now);
        firstDose.setHours(hours, minutes, 0, 0);
        const secondDose = new Date(firstDose);
        secondDose.setHours(hours + 12, minutes, 0, 0);
        
        // If second dose time is past midnight, adjust
        if (secondDose.getDate() !== firstDose.getDate()) {
          secondDose.setDate(secondDose.getDate() - 1);
          secondDose.setHours(secondDose.getHours() - 12);
        }

        if (now < firstDose) {
          return firstDose.toISOString();
        } else if (now < secondDose) {
          return secondDose.toISOString();
        } else {
          // Next day first dose
          const nextFirstDose = new Date(firstDose);
          nextFirstDose.setDate(nextFirstDose.getDate() + 1);
          return nextFirstDose.toISOString();
        }

      case 'Three times daily':
        // Every 8 hours starting from admin time
        const times = [];
        for (let i = 0; i < 3; i++) {
          const time = new Date(now);
          time.setHours(hours + (i * 8), minutes, 0, 0);
          if (time.getDate() !== now.getDate() && i > 0) {
            time.setDate(time.getDate() - 1);
            time.setHours(time.getHours() - 24);
          }
          times.push(time);
        }
        
        // Find next dose
        const nextTime = times.find(time => time > now);
        if (nextTime) {
          return nextTime.toISOString();
        } else {
          // Next day first dose
          const nextDay = new Date(times[0]);
          nextDay.setDate(nextDay.getDate() + 1);
          return nextDay.toISOString();
        }

      case 'Four times daily':
        // Every 6 hours starting from admin time
        const fourTimes = [];
        for (let i = 0; i < 4; i++) {
          const time = new Date(now);
          time.setHours(hours + (i * 6), minutes, 0, 0);
          if (time.getDate() !== now.getDate() && i > 0) {
            time.setDate(time.getDate() - 1);
            time.setHours(time.getHours() - 24);
          }
          fourTimes.push(time);
        }
        
        const nextFourTime = fourTimes.find(time => time > now);
        if (nextFourTime) {
          return nextFourTime.toISOString();
        } else {
          const nextDay = new Date(fourTimes[0]);
          nextDay.setDate(nextDay.getDate() + 1);
          return nextDay.toISOString();
        }

      case 'Every 4 hours':
      case 'Every 6 hours':
      case 'Every 8 hours':
      case 'Every 12 hours':
        const intervalHours = parseInt(frequency.match(/\d+/)?.[0] || '24');
        const nextDose = new Date(now);
        nextDose.setHours(hours, minutes, 0, 0);
        
        // If the time for today has passed, start from next interval
        if (nextDose <= now) {
          nextDose.setTime(nextDose.getTime() + (intervalHours * 60 * 60 * 1000));
        }
        
        return nextDose.toISOString();

      default:
        // Default to next day at admin time
        const nextDefault = new Date(now);
        nextDefault.setDate(nextDefault.getDate() + 1);
        nextDefault.setHours(hours, minutes, 0, 0);
        return nextDefault.toISOString();
    }
  };

  // Calculate age from birth date
  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // Render medication list with category filtering
  const renderMedicationList = () => {
    const activeMedications = medications.filter(med => med.status === 'Active');
    
    // Filter by category
    const filteredMedications = activeCategoryFilter === 'All' 
      ? activeMedications
      : activeCategoryFilter === 'scheduled_diabetic'
      ? activeMedications.filter(med => med.category === 'diabetic')
      : activeMedications.filter(med => med.category === activeCategoryFilter);

    if (medications.length === 0) {
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
          <Pill className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Medications</h3>
          <p className="text-gray-600">Patient has no medications on record.</p>
          <button
            onClick={() => setShowAddMedication(true)}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 mx-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Add First Medication</span>
          </button>
        </div>
      );
    }

    // Group medications by category
    const groupedMedications = {
      prn: filteredMedications.filter(med => med.category === 'prn'),
      scheduled: filteredMedications.filter(med => med.category === 'scheduled'),
      diabetic: filteredMedications.filter(med => med.category === 'diabetic'),
      continuous: filteredMedications.filter(med => med.category === 'continuous')
    };

    return (
      <div className="space-y-6">
        {/* Category Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between">
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            {(['All', 'prn', 'scheduled', 'scheduled_diabetic', 'continuous'] as const).map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategoryFilter(category as any)}
                className={`px-4 py-2 rounded-md font-medium text-sm transition-colors flex items-center space-x-2 ${
                  activeCategoryFilter === category
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {category === 'prn' && <Clock className="h-4 w-4" />}
                {category === 'scheduled' && <Calendar className="h-4 w-4" />}
                {category === 'scheduled_diabetic' && <span className="text-orange-500">💉</span>}
                {category === 'continuous' && <Syringe className="h-4 w-4" />}
                <span>
                  {category === 'All' ? 'All' : 
                   category === 'prn' ? 'PRN (As Needed)' :
                   category === 'scheduled' ? 'Scheduled' :
                   category === 'scheduled_diabetic' ? 'Diabetic' :
                   'IV/Continuous'}
                </span>
                <span className="bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 text-xs">
                  {category === 'All' ? activeMedications.length : 
                   category === 'scheduled_diabetic' ? (groupedMedications.diabetic?.length || 0) :
                   groupedMedications[category as keyof typeof groupedMedications]?.length || 0}
                </span>
              </button>
            ))}
          </div>
          
          <button
            onClick={() => setShowAddMedication(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Medication</span>
          </button>
        </div>

        {/* Success Message */}
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Medication Categories */}
        {activeCategoryFilter === 'All' ? (
          // Show all categories
          <div className="space-y-6">
            {Object.entries(groupedMedications).map(([categoryKey, categoryMeds]) => {
              if (categoryMeds.length === 0) return null;
              
              const categoryInfo = {
                prn: { 
                  title: 'PRN (As Needed)', 
                  icon: Clock, 
                  color: 'blue',
                  description: 'No alerts - administer as needed',
                  bgColor: 'bg-blue-50',
                  borderColor: 'border-blue-200'
                },
                scheduled: { 
                  title: 'Scheduled Medications', 
                  icon: Calendar, 
                  color: 'green',
                  description: 'Time-based alerts enabled',
                  bgColor: 'bg-green-50',
                  borderColor: 'border-green-200'
                },
                continuous: { 
                  title: 'IV/Continuous', 
                  icon: Syringe, 
                  color: 'red',
                  description: 'Critical alerts enabled',
                  bgColor: 'bg-red-50',
                  borderColor: 'border-red-200'
                },
                diabetic: { 
                  title: 'Diabetic Medications', 
                  icon: Syringe, 
                  color: 'orange',
                  description: 'Blood glucose management - time-based alerts enabled',
                  bgColor: 'bg-orange-50',
                  borderColor: 'border-orange-200'
                }
              };
              
              const info = categoryInfo[categoryKey as keyof typeof categoryInfo];
              const IconComponent = info.icon;
              
              return (
                <div key={categoryKey} className={`${info.bgColor} ${info.borderColor} border rounded-lg`}>
                  <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <IconComponent className={`h-5 w-5 text-${info.color}-600`} />
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{info.title}</h3>
                          <p className="text-sm text-gray-600">{info.description}</p>
                        </div>
                      </div>
                      <span className={`bg-${info.color}-100 text-${info.color}-800 px-3 py-1 rounded-full text-sm font-medium`}>
                        {categoryMeds.length}
                      </span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {categoryMeds.map((medication) => renderMedicationItem(medication, medication.category || 'scheduled'))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Show filtered category
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {activeCategoryFilter === 'prn' ? 'PRN (As Needed)' :
                 activeCategoryFilter === 'scheduled' ? 'Scheduled Medications' :
                 activeCategoryFilter === 'scheduled_diabetic' ? 'Diabetic Medications' :
                 activeCategoryFilter === 'continuous' ? 'IV/Continuous Medications' :
                 'All Medications'}
              </h3>
            </div>
            <div className="divide-y divide-gray-200">
              {filteredMedications.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-gray-500">No medications in this category</p>
                </div>
              ) : (
                filteredMedications.map((medication) => renderMedicationItem(medication, medication.category || 'scheduled'))
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render individual medication item
  const renderMedicationItem = (medication: Medication, category: string) => {
    const isDue = medication.next_due && new Date(medication.next_due) <= new Date();
    const isOverdue = medication.next_due && new Date(medication.next_due) < new Date(Date.now() - 30 * 60 * 1000); // 30 min overdue
    
    // Determine alert level based on category
    const shouldAlert = category === 'scheduled' || category === 'continuous' || category === 'diabetic';
    const alertLevel = category === 'continuous' ? 'critical' : 'standard';
    
    return (
      <div
        key={medication.id}
        className={`p-6 hover:bg-gray-50 cursor-pointer transition-colors ${
          selectedMedication?.id === medication.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
        }`}
        onClick={() => setSelectedMedication(medication)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <h4 className="text-lg font-medium text-gray-900">
                {medication.name}
              </h4>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                category === 'prn' ? 'bg-blue-100 text-blue-800' :
                category === 'scheduled' ? 'bg-green-100 text-green-800' :
                medication.category === 'diabetic' ? 'bg-orange-100 text-orange-800' :
                category === 'continuous' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {category === 'prn' ? 'PRN' : 
                 category === 'scheduled' ? 'Scheduled' : 
                 medication.category === 'diabetic' ? '💉 Diabetic' :
                 category === 'continuous' ? 'IV/Continuous' :
                 category}
              </span>
              {shouldAlert && isDue && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${
                  isOverdue && alertLevel === 'critical' 
                    ? 'bg-red-100 text-red-800' 
                    : isOverdue 
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  <AlertTriangle className="h-3 w-3" />
                  <span>{isOverdue ? 'OVERDUE' : 'DUE'}</span>
                </span>
              )}
            </div>
            <p className="text-gray-600 mt-1">
              {medication.dosage} • {medication.route} • {medication.frequency}
            </p>
            {medication.next_due && category !== 'prn' && (
              <p className="text-sm text-gray-500 mt-1">
                Next due: {formatLocalTime(new Date(medication.next_due), 'dd MMM yyyy - HH:mm')}
              </p>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                Prescribed by: {medication.prescribed_by}
              </p>
              <p className="text-sm text-gray-500">
                {new Date(medication.start_date).toLocaleDateString()} - {
                  medication.end_date ? new Date(medication.end_date).toLocaleDateString() : 'Ongoing'
                }
              </p>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  console.log('🔵 BCMA Button clicked for medication:', medication.name);
                  console.log('🔵 Medication category:', medication.category);
                  console.log('🔵 Full medication object:', medication);
                  console.log('🔵 Current user:', currentUser);
                  console.log('🔵 BCMA state before:', bcma.state);
                  bcma.startBCMAProcess(patient, medication);
                  console.log('🔵 BCMA state after:', bcma.state);
                }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-1 ${
                  shouldAlert && isDue 
                    ? (isOverdue && alertLevel === 'critical' 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-orange-500 text-white hover:bg-orange-600')
                    : category === 'prn'
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
                title="BCMA - Barcode Administration"
              >
                <QrCode className="h-4 w-4" />
                <span>{category === 'prn' ? 'Give PRN' : 'Administer'}</span>
              </button>
              
              {/* Edit and Delete buttons - Only for admin/super_admin users */}
              {currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin') && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditMedication(medication);
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
                      handleDeleteMedication(medication.id);
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

  // Render clinical alerts - placeholder for future implementation
  const renderAlerts = () => {
    return null; // No alerts system implemented yet
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Medication Administration Record</h2>
          <p className="text-gray-600">Patient: {patient.first_name} {patient.last_name} ({patient.patient_id})</p>
        </div>
        
        {/* View Toggle */}
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('administration')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'administration'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Pill className="h-4 w-4 inline mr-2" />
            Administration
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'history'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Clock className="h-4 w-4 inline mr-2" />
            History
          </button>
          <button
            onClick={() => setActiveView('diabetic-record')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeView === 'diabetic-record'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Droplets className="h-4 w-4 inline mr-2" />
            Diabetic Record
          </button>
          
          <button
            onClick={() => setShowBarcodeLabels(!showBarcodeLabels)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
            title="Show/Hide Barcode Labels"
          >
            <QrCode className="h-4 w-4" />
            <span>Labels</span>
          </button>
        </div>
      </div>

      {/* Clinical Alerts */}
      {renderAlerts()}

      {/* Barcode Labels Section */}
      {showBarcodeLabels && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Printable Barcode Labels</h3>
            <button
              onClick={() => setShowBarcodeLabels(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Patient Barcode */}
            <BarcodeGenerator
              data={bcma.generatePatientBarcode(patient)}
              type="patient"
              label={`${patient.first_name} ${patient.last_name} - ${patient.patient_id}`}
            />
            
            {/* Medication Barcodes */}
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Active Medications</h4>
              {medications.filter(med => med.status === 'Active').slice(0, 3).map(medication => (
                <BarcodeGenerator
                  key={medication.id}
                  data={bcma.generateMedicationBarcode(medication)}
                  type="medication"
                  label={`${medication.name} - ${medication.dosage}`}
                />
              ))}
              {medications.filter(med => med.status === 'Active').length > 3 && (
                <p className="text-sm text-gray-500">
                  ... and {medications.filter(med => med.status === 'Active').length - 3} more medications
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Current View Content */}
      {activeView === 'administration' && (
        <div className="space-y-6">
          {renderMedicationList()}
          
          {selectedMedication && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">
                Administer: {selectedMedication.name}
              </h3>
              <DynamicForm
                schemaId="medication-administration-v1"
                initialData={{
                  patientId: patient.patient_id,
                  medicationId: selectedMedication.id,
                  dosage: selectedMedication.dosage,
                  route: selectedMedication.route,
                  administeredBy: currentUser?.name || '',
                  administrationTime: new Date().toISOString().slice(0, 16)
                }}
                context={generateFormContext()}
                onSubmit={(data, validation) => {
                  handleMedicationAdministration(data, validation);
                }}
                autoSave={false}
                className="max-w-none"
              />
            </div>
          )}
        </div>
      )}

      {activeView === 'history' && (
        <MedicationHistoryView 
          patientId={patient.patient_id}
          patientName={`${patient.first_name} ${patient.last_name}`}
        />
      )}

      {activeView === 'diabetic-record' && (
        <DiabeticRecordModule 
          patientId={patient.patient_id} 
          patientName={`${patient.first_name} ${patient.last_name}`}
        />
      )}

      {/* Add Medication Modal */}
      {showAddMedication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Add New Medication</h3>
                <button
                  onClick={() => setShowAddMedication(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                handleAddMedication();
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Medication Name *
                  </label>
                  <input
                    type="text"
                    value={newMedicationForm.name}
                    onChange={(e) => updateFormField('name', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter medication name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={newMedicationForm.category}
                    onChange={(e) => updateFormField('category', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select category</option>
                    <option value="prn">PRN (As Needed) - No alerts</option>
                    <option value="scheduled">Scheduled - Time-based alerts</option>
                    <option value="continuous">IV/Continuous - Critical alerts</option>
                    <option value="diabetic" className="text-orange-600">🩸 Diabetic - Glucose monitoring</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dosage *
                  </label>
                  <input
                    type="text"
                    value={newMedicationForm.dosage}
                    onChange={(e) => updateFormField('dosage', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., 10mg, 5ml"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Route *
                  </label>
                  <select
                    value={newMedicationForm.route}
                    onChange={(e) => updateFormField('route', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select route</option>
                    <option value="Oral">Oral</option>
                    <option value="IV">Intravenous (IV)</option>
                    <option value="IM">Intramuscular (IM)</option>
                    <option value="SC">Subcutaneous (SC)</option>
                    <option value="Topical">Topical</option>
                    <option value="Inhalation">Inhalation</option>
                    <option value="Rectal">Rectal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Frequency *
                  </label>
                  <select
                    value={newMedicationForm.frequency}
                    onChange={(e) => updateFormField('frequency', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select frequency</option>
                    <option value="1 time daily">1 time daily</option>
                    <option value="2 times daily">2 times daily</option>
                    <option value="3 times daily">3 times daily</option>
                    <option value="4 times daily">4 times daily</option>
                    <option value="Every 4 hours">Every 4 hours</option>
                    <option value="As needed (PRN)">As needed (PRN)</option>
                    <option value="Continuous">Continuous infusion</option>
                  </select>
                </div>

                {/* Administration Times - Dynamic based on frequency */}
                {((newMedicationForm.frequency.includes('time daily') || newMedicationForm.frequency.includes('times daily')) && !newMedicationForm.frequency.includes('PRN')) ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-blue-700 mb-3">
                      ⏰ Administration Times *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {newMedicationForm.admin_times.map((time, index) => (
                        <div key={index} className="flex flex-col space-y-2">
                          <label className="text-xs text-blue-600 font-medium">
                            Time {index + 1} <span className="text-gray-500">(24h)</span>
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={time}
                              onChange={(e) => {
                                let value = e.target.value.replace(/[^\d:]/g, '');
                                
                                // Auto-format as user types
                                if (value.length === 2 && !value.includes(':')) {
                                  value = value + ':';
                                }
                                
                                // Validate and constrain values
                                const parts = value.split(':');
                                if (parts[0] && parseInt(parts[0]) > 23) {
                                  parts[0] = '23';
                                }
                                if (parts[1] && parseInt(parts[1]) > 59) {
                                  parts[1] = '59';
                                }
                                
                                const finalValue = parts.join(':');
                                updateAdminTime(index, finalValue);
                              }}
                              onBlur={(e) => {
                                // Ensure proper format on blur
                                const value = e.target.value;
                                const match = value.match(/^(\d{1,2}):?(\d{0,2})$/);
                                if (match) {
                                  const hours = match[1].padStart(2, '0');
                                  const minutes = (match[2] || '00').padStart(2, '0');
                                  const formatted = `${Math.min(parseInt(hours), 23).toString().padStart(2, '0')}:${Math.min(parseInt(minutes), 59).toString().padStart(2, '0')}`;
                                  updateAdminTime(index, formatted);
                                }
                              }}
                              placeholder="HH:MM"
                              maxLength={5}
                              required
                              className="w-full px-3 py-2.5 pr-8 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-mono"
                            />
                            <select
                              value={time}
                              onChange={(e) => updateAdminTime(index, e.target.value)}
                              className="absolute right-0 top-0 h-full w-8 opacity-0 cursor-pointer"
                            >
                              <option value="">Select</option>
                              {Array.from({ length: 24 }, (_, hour) => 
                                ['00', '15', '30', '45'].map(minute => {
                                  const timeValue = `${hour.toString().padStart(2, '0')}:${minute}`;
                                  return (
                                    <option key={timeValue} value={timeValue}>
                                      {timeValue}
                                    </option>
                                  );
                                })
                              ).flat()}
                            </select>
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-blue-600 mt-3 font-medium">
                      🔔 Enter times in 24-hour format (e.g., 08:00, 14:30) • Used for alerts and BCMA validation
                    </p>
                  </div>
                ) : (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <label className="block text-sm font-medium text-blue-700 mb-3">
                      ⏰ Administration Time * <span className="text-gray-500 font-normal">(24-hour format)</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={newMedicationForm.admin_time}
                        onChange={(e) => {
                          let value = e.target.value.replace(/[^\d:]/g, '');
                          
                          // Auto-format as user types
                          if (value.length === 2 && !value.includes(':')) {
                            value = value + ':';
                          }
                          
                          // Validate and constrain values
                          const parts = value.split(':');
                          if (parts[0] && parseInt(parts[0]) > 23) {
                            parts[0] = '23';
                          }
                          if (parts[1] && parseInt(parts[1]) > 59) {
                            parts[1] = '59';
                          }
                          
                          const finalValue = parts.join(':');
                          updateFormField('admin_time', finalValue);
                        }}
                        onBlur={(e) => {
                          // Ensure proper format on blur
                          const value = e.target.value;
                          const match = value.match(/^(\d{1,2}):?(\d{0,2})$/);
                          if (match) {
                            const hours = match[1].padStart(2, '0');
                            const minutes = (match[2] || '00').padStart(2, '0');
                            const formatted = `${Math.min(parseInt(hours), 23).toString().padStart(2, '0')}:${Math.min(parseInt(minutes), 59).toString().padStart(2, '0')}`;
                            updateFormField('admin_time', formatted);
                          }
                        }}
                        placeholder="HH:MM (24-hour format)"
                        maxLength={5}
                        required
                        className="w-full px-3 py-2.5 pr-8 text-sm border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white font-mono"
                      />
                      <select
                        value={newMedicationForm.admin_time}
                        onChange={(e) => updateFormField('admin_time', e.target.value)}
                        className="absolute right-0 top-0 h-full w-8 opacity-0 cursor-pointer"
                      >
                        <option value="">Select</option>
                        {Array.from({ length: 24 }, (_, hour) => 
                          ['00', '15', '30', '45'].map(minute => {
                            const timeValue = `${hour.toString().padStart(2, '0')}:${minute}`;
                            return (
                              <option key={timeValue} value={timeValue}>
                                {timeValue}
                              </option>
                            );
                          })
                        ).flat()}
                      </select>
                      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mt-3 font-medium">
                      🔔 Enter time in 24-hour format (e.g., 08:00, 14:30) • Used for alerts and BCMA validation
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prescribed By *
                  </label>
                  <input
                    type="text"
                    value={newMedicationForm.prescribed_by}
                    onChange={(e) => updateFormField('prescribed_by', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Dr. Smith"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={newMedicationForm.start_date}
                    onChange={(e) => updateFormField('start_date', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={newMedicationForm.end_date}
                    onChange={(e) => updateFormField('end_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddMedication(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Medication
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Medication Modal */}
      {showEditForm && editingMedication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Edit Medication</h3>
                <button
                  onClick={() => {
                    setShowEditForm(false);
                    setEditingMedication(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault();
                handleUpdateMedication(editMedicationForm, { valid: true, errors: [], warnings: [] });
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Medication Name *
                    </label>
                    <input
                      type="text"
                      value={editMedicationForm.name}
                      onChange={(e) => updateEditFormField('name', e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dosage *
                    </label>
                    <input
                      type="text"
                      value={editMedicationForm.dosage}
                      onChange={(e) => updateEditFormField('dosage', e.target.value)}
                      required
                      placeholder="e.g., 10mg, 2 tablets"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Route *
                    </label>
                    <select
                      value={editMedicationForm.route}
                      onChange={(e) => updateEditFormField('route', e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select route...</option>
                      <option value="PO">PO (Oral)</option>
                      <option value="IV">IV (Intravenous)</option>
                      <option value="IM">IM (Intramuscular)</option>
                      <option value="SC">SC (Subcutaneous)</option>
                      <option value="SL">SL (Sublingual)</option>
                      <option value="TOP">Topical</option>
                      <option value="INH">Inhaled</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      💊 Frequency *
                    </label>
                    <select
                      value={editMedicationForm.frequency}
                      onChange={(e) => updateEditFormField('frequency', e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select frequency...</option>
                      <option value="Once daily">Once daily</option>
                      <option value="BID (Twice daily)">BID (Twice daily)</option>
                      <option value="TID (Three times daily)">TID (Three times daily)</option>
                      <option value="QID (Four times daily)">QID (Four times daily)</option>
                      <option value="PRN (As needed)">PRN (As needed)</option>
                      <option value="Continuous">Continuous</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      🏷️ Category *
                    </label>
                    <select
                      value={editMedicationForm.category}
                      onChange={(e) => updateEditFormField('category', e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select category...</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="prn">PRN (As Needed)</option>
                      <option value="diabetic">💉 Diabetic</option>
                      <option value="continuous">Continuous</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Prescribed By *
                    </label>
                    <input
                      type="text"
                      value={editMedicationForm.prescribed_by}
                      onChange={(e) => updateEditFormField('prescribed_by', e.target.value)}
                      required
                      placeholder="Dr. Prescriber Name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Multiple Administration Times for daily frequencies */}
                  {(editMedicationForm.frequency.includes('time') || editMedicationForm.frequency.includes('daily')) && !editMedicationForm.frequency.includes('PRN') && !editMedicationForm.frequency.includes('Once daily') && !editMedicationForm.frequency.includes('Continuous') && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                      <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                        ⏰ Administration Times *
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {editMedicationForm.admin_times.map((time, index) => (
                          <div key={index} className="space-y-1">
                            <label className="block text-xs font-medium text-blue-600 dark:text-blue-400">
                              Time {index + 1}
                            </label>
                            <div className="relative">
                              <input
                                type="text"
                                value={time}
                                onChange={(e) => {
                                  let value = e.target.value.replace(/[^\d:]/g, '');
                                  
                                  // Auto-format as user types
                                  if (value.length === 2 && !value.includes(':')) {
                                    value = value + ':';
                                  }
                                  
                                  // Validate and constrain values
                                  const parts = value.split(':');
                                  if (parts[0] && parseInt(parts[0]) > 23) {
                                    parts[0] = '23';
                                  }
                                  if (parts[1] && parseInt(parts[1]) > 59) {
                                    parts[1] = '59';
                                  }
                                  
                                  const finalValue = parts.join(':');
                                  updateEditAdminTime(index, finalValue);
                                }}
                                onBlur={(e) => {
                                  // Ensure proper format on blur
                                  const value = e.target.value;
                                  const match = value.match(/^(\d{1,2}):?(\d{0,2})$/);
                                  if (match) {
                                    const hours = match[1].padStart(2, '0');
                                    const minutes = (match[2] || '00').padStart(2, '0');
                                    const formatted = `${Math.min(parseInt(hours), 23).toString().padStart(2, '0')}:${Math.min(parseInt(minutes), 59).toString().padStart(2, '0')}`;
                                    updateEditAdminTime(index, formatted);
                                  }
                                }}
                                placeholder="HH:MM"
                                maxLength={5}
                                className="px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border-blue-300 dark:border-blue-600 font-mono"
                                required
                              />
                              <select
                                value={time}
                                onChange={(e) => updateEditAdminTime(index, e.target.value)}
                                className="absolute right-0 top-0 h-full w-8 opacity-0 cursor-pointer"
                              >
                                <option value="">Select</option>
                                {Array.from({ length: 24 }, (_, hour) => 
                                  ['00', '15', '30', '45'].map(minute => {
                                    const timeValue = `${hour.toString().padStart(2, '0')}:${minute}`;
                                    return (
                                      <option key={timeValue} value={timeValue}>
                                        {timeValue}
                                      </option>
                                    );
                                  })
                                ).flat()}
                              </select>
                              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 font-medium">
                        🔔 Scheduled alerts and BCMA will use these times for administration checks
                      </p>
                    </div>
                  )}

                  {/* Single Administration Time for other frequencies */}
                  {((!editMedicationForm.frequency.includes('time') && !editMedicationForm.frequency.includes('daily')) || editMedicationForm.frequency.includes('PRN') || editMedicationForm.frequency.includes('Once daily') || editMedicationForm.frequency.includes('Continuous')) && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
                      <label className="block text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">
                        ⏰ Administration Time *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={editMedicationForm.admin_time}
                          onChange={(e) => {
                            let value = e.target.value.replace(/[^\d:]/g, '');
                            
                            // Auto-format as user types
                            if (value.length === 2 && !value.includes(':')) {
                              value = value + ':';
                            }
                            
                            // Validate and constrain values
                            const parts = value.split(':');
                            if (parts[0] && parseInt(parts[0]) > 23) {
                              parts[0] = '23';
                            }
                            if (parts[1] && parseInt(parts[1]) > 59) {
                              parts[1] = '59';
                            }
                            
                            const finalValue = parts.join(':');
                            updateEditFormField('admin_time', finalValue);
                          }}
                          onBlur={(e) => {
                            // Ensure proper format on blur
                            const value = e.target.value;
                            const match = value.match(/^(\d{1,2}):?(\d{0,2})$/);
                            if (match) {
                              const hours = match[1].padStart(2, '0');
                              const minutes = (match[2] || '00').padStart(2, '0');
                              const formatted = `${Math.min(parseInt(hours), 23).toString().padStart(2, '0')}:${Math.min(parseInt(minutes), 59).toString().padStart(2, '0')}`;
                              updateEditFormField('admin_time', formatted);
                            }
                          }}
                          placeholder="HH:MM (24-hour)"
                          maxLength={5}
                          className="w-full px-3 py-2 pr-8 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono border-blue-300 dark:border-blue-600"
                          required
                        />
                        <select
                          value={editMedicationForm.admin_time}
                          onChange={(e) => updateEditFormField('admin_time', e.target.value)}
                          className="absolute right-0 top-0 h-full w-8 opacity-0 cursor-pointer"
                        >
                          <option value="">Select</option>
                          {Array.from({ length: 24 }, (_, hour) => 
                            ['00', '15', '30', '45'].map(minute => {
                              const timeValue = `${hour.toString().padStart(2, '0')}:${minute}`;
                              return (
                                <option key={timeValue} value={timeValue}>
                                  {timeValue}
                                </option>
                              );
                            })
                          ).flat()}
                        </select>
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">
                        🔔 Scheduled alerts and BCMA will use this time for administration checks
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={editMedicationForm.start_date}
                      onChange={(e) => updateEditFormField('start_date', e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={editMedicationForm.end_date}
                      onChange={(e) => updateEditFormField('end_date', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditForm(false);
                        setEditingMedication(null);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Update Medication
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 flex items-center space-x-3">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span className="text-gray-900">Processing medication administration...</span>
          </div>
        </div>
      )}

      {/* BCMA Administration Modal */}
      {bcma.state.isActive && bcma.state.currentMedication && (
        <BCMAAdministration
          patient={patient}
          medication={bcma.state.currentMedication}
          currentUser={currentUser || { id: 'system', name: 'System User', role: 'nurse' }}
          onAdministrationComplete={handleBCMAComplete}
          onCancel={() => bcma.cancelBCMAProcess()}
        />
      )}
    </div>
  );
};
