import { EventEmitter } from 'events';
import { 
  SimulationTemplate, 
  SimulationSnapshot, 
  SimulationInstance, 
  CreateTemplateRequest,
  CreateSnapshotRequest,
  LaunchSimulationRequest,
  RecordVitalRequest,
  AdministerMedicationRequest,
  AcknowledgeAlertRequest,
  SimulationEngineConfig,
  SnapshotData
} from '../types';
import { DatabaseInterface } from '../types/database';

/**
 * Core Simulation Engine
 * Handles all simulation lifecycle management with proper state isolation
 */
export class SimulationEngine extends EventEmitter {
  private config: SimulationEngineConfig;
  private activeSimulations = new Map<string, SimulationInstance>();
  
  constructor(
    private db: DatabaseInterface,
    config: Partial<SimulationEngineConfig> = {}
  ) {
    super();
    
    this.config = {
      autoSaveInterval: 30,
      maxConcurrentSimulations: 10,
      enableRealTimeSync: true,
      logAllActivities: true,
      ...config
    };
    
    // Start auto-save if enabled
    if (this.config.autoSaveInterval > 0) {
      this.startAutoSave();
    }
  }

  // ===============================================
  // Template Management
  // ===============================================
  
  async createTemplate(request: CreateTemplateRequest, userId: string, tenantId: string): Promise<SimulationTemplate> {
    const template = await this.db.simulationTemplates.create({
      name: request.name,
      description: request.description,
      specialty: request.specialty,
      difficultyLevel: request.difficultyLevel,
      estimatedDuration: request.estimatedDuration,
      learningObjectives: request.learningObjectives,
      createdBy: userId,
      tenantId
    });

    // If copying from live system, handle that
    if (request.copyFromLive && request.livePatientIds?.length) {
      await this.copyLiveDataToTemplate(template.id, request.livePatientIds, tenantId);
    }

    this.emit('template.created', { templateId: template.id, tenantId });
    return template;
  }

  async updateTemplate(templateId: string, updates: Partial<CreateTemplateRequest>): Promise<SimulationTemplate> {
    const template = await this.db.simulationTemplates.update(templateId, {
      ...updates,
      updatedAt: new Date()
    });

    this.emit('template.updated', { templateId, updates });
    return template;
  }

  async deleteTemplate(templateId: string): Promise<void> {
    // Check if template has active simulations
    const activeCount = await this.db.simulationInstances.count({
      templateId,
      status: 'active'
    });

    if (activeCount > 0) {
      throw new Error(`Cannot delete template with ${activeCount} active simulations`);
    }

    await this.db.simulationTemplates.delete(templateId);
    this.emit('template.deleted', { templateId });
  }

  // ===============================================
  // Snapshot Management
  // ===============================================
  
  async createSnapshot(request: CreateSnapshotRequest, userId: string): Promise<SimulationSnapshot> {
    // Use database function to create snapshot with all template data
    const snapshotId = await this.db.query(
      'SELECT create_simulation_snapshot($1, $2, $3, $4) as id',
      [request.templateId, request.name, request.description, userId]
    );

    const snapshot = await this.db.simulationSnapshots.findById(snapshotId.rows[0].id);
    
    this.emit('snapshot.created', { 
      snapshotId: snapshot.id, 
      templateId: request.templateId 
    });
    
    return snapshot;
  }

  async getSnapshot(snapshotId: string): Promise<SimulationSnapshot> {
    const snapshot = await this.db.simulationSnapshots.findById(snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot not found: ${snapshotId}`);
    }
    return snapshot;
  }

  // ===============================================
  // Simulation Instance Management
  // ===============================================
  
  async launchSimulation(request: LaunchSimulationRequest, userId: string): Promise<SimulationInstance> {
    // Check concurrent simulation limit
    const activeCount = await this.getActiveSimulationCount();
    if (activeCount >= this.config.maxConcurrentSimulations) {
      throw new Error(`Maximum concurrent simulations (${this.config.maxConcurrentSimulations}) reached`);
    }

    // Use database function to launch simulation
    const instanceId = await this.db.query(
      'SELECT launch_simulation_instance($1, $2, $3, $4) as id',
      [request.templateId, request.snapshotId, request.name, userId]
    );

    const instance = await this.db.simulationInstances.findById(instanceId.rows[0].id);
    
    // Cache the active simulation
    this.activeSimulations.set(instance.id, instance);
    
    this.emit('simulation.launched', { 
      instanceId: instance.id, 
      templateId: request.templateId,
      userId 
    });
    
    return instance;
  }

  async resetSimulation(instanceId: string, userId: string): Promise<void> {
    // Use database function to reset simulation
    await this.db.query(
      'SELECT reset_simulation_instance($1, $2)',
      [instanceId, userId]
    );

    // Refresh cached instance
    const instance = await this.db.simulationInstances.findById(instanceId);
    this.activeSimulations.set(instanceId, instance);

    this.emit('simulation.reset', { instanceId, userId });
  }

  async pauseSimulation(instanceId: string, userId: string): Promise<void> {
    await this.db.simulationInstances.update(instanceId, {
      status: 'paused',
      updatedAt: new Date()
    });

    await this.recordActivity(instanceId, userId, 'simulation_paused', {});
    this.emit('simulation.paused', { instanceId, userId });
  }

  async resumeSimulation(instanceId: string, userId: string): Promise<void> {
    await this.db.simulationInstances.update(instanceId, {
      status: 'active',
      updatedAt: new Date()
    });

    await this.recordActivity(instanceId, userId, 'simulation_resumed', {});
    this.emit('simulation.resumed', { instanceId, userId });
  }

  async completeSimulation(instanceId: string, userId: string): Promise<void> {
    await this.db.simulationInstances.update(instanceId, {
      status: 'completed',
      endedAt: new Date(),
      updatedAt: new Date()
    });

    // Remove from active cache
    this.activeSimulations.delete(instanceId);

    await this.recordActivity(instanceId, userId, 'simulation_completed', {});
    this.emit('simulation.completed', { instanceId, userId });
  }

  // ===============================================
  // Student Actions
  // ===============================================
  
  async recordVitals(instanceId: string, studentId: string, request: RecordVitalRequest): Promise<void> {
    const instance = await this.getSimulationInstance(instanceId);
    
    // Update current state with new vitals
    const currentState = instance.currentState as SnapshotData;
    const newVital = {
      id: this.generateId(),
      patientId: request.patientId,
      ...request.vitals,
      recordedAt: new Date(),
      recordedBy: studentId
    };

    // Add to current state
    currentState.vitals.push(newVital);

    // Update in database
    await this.updateSimulationState(instanceId, currentState);
    
    // Log activity
    await this.recordActivity(instanceId, studentId, 'vital_recorded', {
      patientId: request.patientId,
      vitals: request.vitals
    });

    this.emit('vitals.recorded', { 
      instanceId, 
      studentId, 
      patientId: request.patientId,
      vitals: newVital 
    });
  }

  async administerMedication(instanceId: string, studentId: string, request: AdministerMedicationRequest): Promise<void> {
    const instance = await this.getSimulationInstance(instanceId);
    
    // Verify medication exists for patient
    const currentState = instance.currentState as SnapshotData;
    const medication = currentState.medications.find(med => 
      med.id === request.medicationId && med.patientId === request.patientId
    );

    if (!medication) {
      throw new Error('Medication not found for patient');
    }

    // Log the administration
    await this.recordActivity(instanceId, studentId, 'medication_administered', {
      medicationId: request.medicationId,
      patientId: request.patientId,
      dosageGiven: request.dosageGiven,
      administeredAt: request.administeredAt,
      notes: request.notes
    });

    this.emit('medication.administered', { 
      instanceId, 
      studentId, 
      medicationId: request.medicationId,
      patientId: request.patientId 
    });
  }

  async acknowledgeAlert(instanceId: string, studentId: string, request: AcknowledgeAlertRequest): Promise<void> {
    const instance = await this.getSimulationInstance(instanceId);
    const currentState = instance.currentState as SnapshotData;

    // Find and acknowledge the alert
    const alert = currentState.alerts.find(a => a.id === request.alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.acknowledged = true;

    // Update state
    await this.updateSimulationState(instanceId, currentState);

    // Log activity
    await this.recordActivity(instanceId, studentId, 'alert_acknowledged', {
      alertId: request.alertId,
      notes: request.notes
    });

    this.emit('alert.acknowledged', { 
      instanceId, 
      studentId, 
      alertId: request.alertId 
    });
  }

  // ===============================================
  // Utility Methods
  // ===============================================
  
  private async copyLiveDataToTemplate(_templateId: string, patientIds: string[], tenantId: string): Promise<void> {
    // Mark specified patients as template patients
    await this.db.query(
      'UPDATE patients SET is_template_patient = true WHERE id = ANY($1) AND tenant_id = $2',
      [patientIds, tenantId]
    );
  }

  private async getSimulationInstance(instanceId: string): Promise<SimulationInstance> {
    // Check cache first
    let instance = this.activeSimulations.get(instanceId);
    
    if (!instance) {
      instance = await this.db.simulationInstances.findById(instanceId);
      if (!instance) {
        throw new Error(`Simulation instance not found: ${instanceId}`);
      }
      this.activeSimulations.set(instanceId, instance);
    }
    
    return instance;
  }

  private async updateSimulationState(instanceId: string, newState: SnapshotData): Promise<void> {
    await this.db.simulationInstances.update(instanceId, {
      currentState: newState,
      updatedAt: new Date()
    });

    // Update cache
    const instance = this.activeSimulations.get(instanceId);
    if (instance) {
      instance.currentState = newState;
      instance.updatedAt = new Date();
    }
  }

  private async recordActivity(instanceId: string, studentId: string, actionType: string, actionData: Record<string, unknown>): Promise<void> {
    if (!this.config.logAllActivities) return;

    await this.db.query(
      'SELECT record_simulation_activity($1, $2, $3, $4)',
      [instanceId, studentId, actionType, JSON.stringify(actionData)]
    );
  }

  private async getActiveSimulationCount(): Promise<number> {
    const result = await this.db.simulationInstances.count({
      status: 'active'
    });
    return result;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2)}`;
  }

  private startAutoSave(): void {
    setInterval(async () => {
      try {
        // Auto-save all active simulations
        for (const [instanceId, instance] of this.activeSimulations) {
          await this.updateSimulationState(instanceId, instance.currentState);
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, this.config.autoSaveInterval * 1000);
  }
}