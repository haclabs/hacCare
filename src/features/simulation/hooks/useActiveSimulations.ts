import { useState, useEffect } from 'react';
import { getActiveSimulations, updateSimulationStatus, resetSimulationForNextSession, resetSimulationWithTemplateUpdates, compareSimulationTemplatePatients, completeSimulation, deleteSimulation } from '../../../services/simulation/simulationService';
import type { SimulationActiveWithDetails } from '../types/simulation';
import { supabase } from '../../../lib/api/supabase';
import { useUserProgramAccess } from '../../../hooks/useUserProgramAccess';
import type { PatientListComparison } from '../types/simulation';
import { secureLogger } from '../../../lib/security/secureLogger';
import { getStudentActivitiesBySimulation } from '../../../services/simulation/studentActivityService';
import type { StudentActivity } from '../../../services/simulation/studentActivityService';

export function useActiveSimulations() {
  const [simulations, setSimulations] = useState<SimulationActiveWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [printLabelsSimulation, setPrintLabelsSimulation] = useState<SimulationActiveWithDetails | null>(null);
  const [resetModalOpen, setResetModalOpen] = useState<string | null>(null);
  const [selectedPrimaryCategories, setSelectedPrimaryCategories] = useState<string[]>([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState<string[]>([]);
  const [editCategoriesModal, setEditCategoriesModal] = useState<{ sim: SimulationActiveWithDetails; primary: string[]; sub: string[] } | null>(null);
  const [completingSimulation, setCompletingSimulation] = useState<SimulationActiveWithDetails | null>(null);
  const [pendingCompletion, setPendingCompletion] = useState<{
    simulationId: string;
    tenantId: string;
    instructorName: string;
    unnamedCount: number;
    simulationName: string;
  } | null>(null);
  const [versionComparisonModal, setVersionComparisonModal] = useState<{
    simulation: SimulationActiveWithDetails;
    patientComparison: PatientListComparison | undefined;
  } | null>(null);
  const [completionSummary, setCompletionSummary] = useState<{
    simulationName: string;
    instructorName: string;
    activities: StudentActivity[];
    warnings: string[];
    completed: boolean;
  } | null>(null);

  const { canSeeAllPrograms, programCodes } = useUserProgramAccess();

  const loadSimulations = async () => {
    try {
      const data = await getActiveSimulations({
        status: ['pending', 'running', 'paused', 'completed']
      });
      setSimulations(data);
    } catch (error) {
      secureLogger.error('Error loading active simulations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSimulations();
    const interval = setInterval(loadSimulations, 30000);
    return () => clearInterval(interval);
  }, []);

  const handlePause = async (id: string) => {
    setActionLoading(id);
    try {
      await updateSimulationStatus(id, 'paused');
      await loadSimulations();
    } catch (error) {
      secureLogger.error('Error pausing simulation:', error);
      alert('Failed to pause simulation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async (id: string, isCompleted: boolean = false) => {
    secureLogger.debug('🎯 handleResume called:', { id, isCompleted });
    setActionLoading(id);
    try {
      if (isCompleted) {
        const result = await resetSimulationForNextSession(id);
        secureLogger.debug('✅ Simulation reset and restarted:', result);
        alert('Simulation restarted with fresh timer! Reloading data...');
        await loadSimulations();
      } else {
        const sim = simulations.find(s => s.id === id);

        if (sim?.status === 'pending') {
          secureLogger.debug('▶️ Starting pending simulation with timer...');
          const now = new Date();
          const endsAt = new Date(now.getTime() + (sim.duration_minutes * 60000));

          const { error } = await supabase
            .from('simulation_active')
            .update({
              status: 'running',
              starts_at: now.toISOString(),
              ends_at: endsAt.toISOString()
            })
            .eq('id', id);

          if (error) throw error;
        } else {
          secureLogger.debug('▶️ Resuming paused simulation...');
          await updateSimulationStatus(id, 'running');
        }

        await loadSimulations();
      }
    } catch (error) {
      secureLogger.error('❌ Error resuming simulation:', error);
      alert('Failed to resume simulation: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setActionLoading(null);
    }
  };

  const handleReset = async (id: string) => {
    setResetModalOpen(id);
  };

  const confirmReset = async () => {
    if (!resetModalOpen) return;

    const id = resetModalOpen;
    setResetModalOpen(null);
    setActionLoading(id);

    try {
      const result = await resetSimulationForNextSession(id);
      secureLogger.debug('✅ Simulation reset successfully:', result);

      if (result.restore_details) {
        secureLogger.debug('📊 Restore Details:', result.restore_details);
        const details = result.restore_details;
        if (details.restored_counts) {
          secureLogger.debug('📈 Records Restored:', details.restored_counts);
        }
      }

      alert('Simulation reset successfully! Status set to "Ready to Start". Click Play when ready to begin. Patient and medication IDs have been preserved.');
      await loadSimulations();
    } catch (error) {
      secureLogger.error('Error resetting simulation:', error);
      alert('Failed to reset simulation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewTemplateChanges = async (sim: SimulationActiveWithDetails) => {
    try {
      setActionLoading(sim.id);
      const patientComparison = await compareSimulationTemplatePatients(sim.id);
      setVersionComparisonModal({ simulation: sim, patientComparison });
    } catch (error) {
      secureLogger.error('Error comparing patient lists:', error);
      alert('Failed to load template comparison');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSyncWithTemplateUpdates = async () => {
    if (!versionComparisonModal) return;

    const sim = versionComparisonModal.simulation;
    setVersionComparisonModal(null);
    setActionLoading(sim.id);

    try {
      secureLogger.debug('🚀 Starting sync for simulation:', sim.id);
      const result = await resetSimulationWithTemplateUpdates(sim.id);
      secureLogger.debug('✅ Simulation synced with template:', result);

      const medsAddedText = (result.medications_added ?? 0) > 0
        ? `${result.medications_added} new medication(s) added.`
        : 'No new medications to add.';

      alert(`Simulation synced to template v${result.template_version_synced ?? 'unknown'}!\n\n${medsAddedText}\nStatus set to "Ready to Start".\nAll barcodes preserved.`);
      await loadSimulations();
    } catch (error: any) {
      secureLogger.error('❌ Error syncing simulation:', error);
      if (error.message?.includes('PATIENT_LIST_CHANGED') || error.message?.includes('patient list')) {
        alert('Cannot sync - patient list has changed in template. You must delete this simulation and launch a new one with fresh barcodes.');
      } else {
        alert('Failed to sync simulation: ' + error.message);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleRelaunchRequired = () => {
    setVersionComparisonModal(null);
    alert('To update this simulation with the new patient list, you must:\n\n1. Delete this simulation\n2. Launch a new simulation from the updated template\n3. Print new barcode labels for all patients and medications');
  };

  const handleComplete = async (sim: SimulationActiveWithDetails) => {
    setCompletingSimulation(sim);
  };

  const handleCompleteWithInstructor = async (instructorName: string) => {
    if (!completingSimulation) return;

    const id = completingSimulation.id;
    const simTenantId = completingSimulation.tenant_id;
    const capturedSimName = completingSimulation.name;
    secureLogger.debug('🎯 handleComplete called for:', id, 'Instructor:', instructorName);
    setActionLoading(id);
    setCompletingSimulation(null);

    try {
      // Ensure this user has RLS read access to the simulation's tenant so that
      // getStudentActivitiesBySimulation can query clinical tables. Instructors
      // are not added to tenant_users at launch time (only participants are), so
      // without this upsert all clinical queries return empty arrays for non-super_admin users.
      const { data: { user } } = await supabase.auth.getUser();
      if (user && simTenantId) {
        const { error: accessError } = await supabase
          .from('tenant_users')
          .upsert({
            user_id: user.id,
            tenant_id: simTenantId,
            is_active: true,
            role: 'admin'
          }, { onConflict: 'user_id,tenant_id' });

        if (accessError) {
          secureLogger.warn('⚠️ Could not grant simulation tenant access:', accessError);
          // Continue anyway — super_admin bypasses RLS regardless
        } else {
          secureLogger.debug('✅ Instructor granted read access to simulation tenant for debrief');
        }
      }

      secureLogger.debug('📊 Generating student activity report...');
      const activities = await getStudentActivitiesBySimulation(id);
      secureLogger.debug('✅ Student activities captured:', activities.length, 'students');

      // If zero named activities, check for unnamed clinical records
      if (activities.length === 0 && simTenantId) {
        const { count } = await supabase
          .from('patient_vitals')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', simTenantId)
          .is('student_name', null);

        if (count && count > 0) {
          secureLogger.debug('⚠️ Found', count, 'unnamed clinical records — prompting instructor for student name');
          setPendingCompletion({
            simulationId: id,
            tenantId: simTenantId,
            instructorName,
            unnamedCount: count,
            simulationName: completingSimulation?.name ?? 'this simulation',
          });
          setActionLoading(null);
          return;
        }
      }

      const result = await completeSimulation(id, activities, instructorName);
      secureLogger.debug('✅ Complete simulation result:', result);

      setCompletionSummary({
        simulationName: capturedSimName,
        instructorName,
        activities,
        warnings: [],
        completed: true,
      });

      await loadSimulations();
    } catch (error) {
      secureLogger.error('❌ Error completing simulation:', error);
      setCompletionSummary({
        simulationName: capturedSimName,
        instructorName,
        activities: [],
        warnings: [error instanceof Error ? error.message : String(error)],
        completed: false,
      });
    } finally {
      setActionLoading(null);
    }
  };

  /** Backfill student_name on unnamed records then finalise completion. */
  const handleCompleteWithStudentName = async (studentName: string) => {
    if (!pendingCompletion) return;
    const { simulationId, tenantId, instructorName } = pendingCompletion;
    setActionLoading(simulationId);
    setPendingCompletion(null);
    try {
      // Re-establish admin access to the simulation tenant so writes are permitted
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('tenant_users')
          .upsert({ user_id: user.id, tenant_id: tenantId, is_active: true, role: 'admin' },
            { onConflict: 'user_id,tenant_id' });
      }

      // Backfill all clinical tables that store student_name AND are scoped by tenant_id.
      // Excluded: doctors_orders (uses acknowledged_by_student, not student_name)
      //           handover_notes (scoped by patient_id, not tenant_id)
      const tables = [
        'patient_vitals',
        'medication_administrations',
        'lab_orders',
        'lab_ack_events',
        'patient_notes',
        'bowel_records',
        'device_assessments',
        'wound_assessments',
        'patient_intake_output_events',
        'patient_advanced_directives',
        'patient_neuro_assessments',
        'patient_bbit_entries',
        'patient_newborn_assessments',
      ] as const;

      const results = await Promise.all(
        tables.map(async (table) => ({
          table,
          result: await supabase
            .from(table)
            .update({ student_name: studentName })
            .eq('tenant_id', tenantId)
            .is('student_name', null),
        }))
      );

      const failures = results.filter(r => r.result.error);
      if (failures.length > 0) {
        secureLogger.warn(`⚠️ Backfill partial — ${failures.length} table(s) failed`);
      }

      // Verify the backfill landed before querying activities
      const { count: namedCount } = await supabase
        .from('patient_vitals')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .not('student_name', 'is', null);

      secureLogger.debug(`✅ Backfill complete — ${namedCount ?? 0} named vitals now visible`);

      // Use early startTimeOverride to bypass starts_at = null time filter
      const activities = await getStudentActivitiesBySimulation(simulationId, '1970-01-01T00:00:00Z');
      const result = await completeSimulation(simulationId, activities, instructorName);
      secureLogger.debug('✅ Complete simulation result after backfill:', result);

      const backfillWarnings = failures.map(
        f => `Table write partially failed (${f.table}): ${f.result.error?.message ?? 'unknown error'}`
      );

      setCompletionSummary({
        simulationName: pendingCompletion?.simulationName ?? 'Unknown simulation',
        instructorName,
        activities,
        warnings: backfillWarnings,
        completed: true,
      });

      await loadSimulations();
    } catch (error) {
      secureLogger.error('❌ Error completing simulation after student name backfill:', error);
      setCompletionSummary({
        simulationName: pendingCompletion?.simulationName ?? 'Unknown simulation',
        instructorName: pendingCompletion?.instructorName ?? 'Unknown',
        activities: [],
        warnings: [error instanceof Error ? error.message : String(error)],
        completed: false,
      });
    } finally {
      setActionLoading(null);
    }
  };

  /** Complete without attributing unnamed records to any student. */
  const handleCompleteSkipStudent = async () => {
    if (!pendingCompletion) return;
    const { simulationId, instructorName } = pendingCompletion;
    setActionLoading(simulationId);
    setPendingCompletion(null);
    try {
      const result = await completeSimulation(simulationId, [], instructorName);
      secureLogger.debug('✅ Complete simulation (no student data):', result);
      setCompletionSummary({
        simulationName: pendingCompletion?.simulationName ?? 'Unknown simulation',
        instructorName,
        activities: [],
        warnings: [],
        completed: true,
      });
      await loadSimulations();
    } catch (error) {
      secureLogger.error('❌ Error completing simulation:', error);
      setCompletionSummary({
        simulationName: pendingCompletion?.simulationName ?? 'Unknown simulation',
        instructorName: pendingCompletion?.instructorName ?? 'Unknown',
        activities: [],
        warnings: [error instanceof Error ? error.message : String(error)],
        completed: false,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this simulation? This action cannot be undone.')) {
      return;
    }
    setActionLoading(id);
    try {
      await deleteSimulation(id);
      await loadSimulations();
    } catch (error) {
      secureLogger.error('Error deleting simulation:', error);
      alert('Failed to delete simulation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditCategories = (sim: SimulationActiveWithDetails) => {
    setEditCategoriesModal({
      sim,
      primary: sim.primary_categories || [],
      sub: sim.sub_categories || []
    });
  };

  const handleSaveCategories = async () => {
    if (!editCategoriesModal) return;

    setActionLoading(editCategoriesModal.sim.id);
    try {
      const { error } = await supabase
        .from('simulation_active')
        .update({
          primary_categories: editCategoriesModal.primary,
          sub_categories: editCategoriesModal.sub,
          updated_at: new Date().toISOString()
        })
        .eq('id', editCategoriesModal.sim.id);

      if (error) throw error;

      setEditCategoriesModal(null);
      await loadSimulations();
      alert('Categories updated successfully!');
    } catch (error) {
      secureLogger.error('Error updating categories:', error);
      alert('Failed to update categories');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredSimulations = simulations.filter(sim => {
    if (!canSeeAllPrograms) {
      if (!sim.primary_categories || sim.primary_categories.length === 0) {
        return true;
      }
      const hasAccess = sim.primary_categories.some(cat => programCodes.includes(cat));
      if (!hasAccess) return false;
    }

    const matchesPrimary = selectedPrimaryCategories.length === 0 ||
      (sim.primary_categories && sim.primary_categories.some(cat => selectedPrimaryCategories.includes(cat)));
    const matchesSub = selectedSubCategories.length === 0 ||
      (sim.sub_categories && sim.sub_categories.some(cat => selectedSubCategories.includes(cat)));
    return matchesPrimary && matchesSub;
  });

  secureLogger.debug('📊 Simulation filtering results:', {
    totalSimulations: simulations.length,
    filteredSimulations: filteredSimulations.length,
    userProgramCodes: programCodes,
    canSeeAllPrograms
  });

  return {
    simulations,
    filteredSimulations,
    loading,
    actionLoading,
    printLabelsSimulation, setPrintLabelsSimulation,
    resetModalOpen, setResetModalOpen,
    selectedPrimaryCategories, setSelectedPrimaryCategories,
    selectedSubCategories, setSelectedSubCategories,
    editCategoriesModal, setEditCategoriesModal,
    completingSimulation, setCompletingSimulation,
    pendingCompletion, setPendingCompletion,
    versionComparisonModal, setVersionComparisonModal,
    completionSummary, setCompletionSummary,
    handlePause,
    handleResume,
    handleReset,
    confirmReset,
    handleViewTemplateChanges,
    handleSyncWithTemplateUpdates,
    handleRelaunchRequired,
    handleComplete,
    handleCompleteWithInstructor,
    handleCompleteWithStudentName,
    handleCompleteSkipStudent,
    handleDelete,
    handleEditCategories,
    handleSaveCategories,
  };
}
