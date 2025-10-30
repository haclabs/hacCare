import { Router, Request, Response } from 'express';
import { SimulationEngine } from '../engine/SimulationEngine';
import { 
  CreateTemplateRequest, 
  CreateSnapshotRequest, 
  LaunchSimulationRequest,
  RecordVitalRequest,
  AdministerMedicationRequest,
  AcknowledgeAlertRequest
} from '../types';

export class SimulationController {
  private router: Router;

  constructor(private simulationEngine: SimulationEngine) {
    this.router = Router();
    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Template Management
    this.router.post('/templates', this.createTemplate.bind(this));
    this.router.put('/templates/:id', this.updateTemplate.bind(this));
    this.router.delete('/templates/:id', this.deleteTemplate.bind(this));
    this.router.get('/templates', this.getTemplates.bind(this));

    // Snapshot Management
    this.router.post('/templates/:templateId/snapshots', this.createSnapshot.bind(this));
    this.router.get('/snapshots/:id', this.getSnapshot.bind(this));

    // Simulation Instance Management
    this.router.post('/instances', this.launchSimulation.bind(this));
    this.router.post('/instances/:id/reset', this.resetSimulation.bind(this));
    this.router.post('/instances/:id/pause', this.pauseSimulation.bind(this));
    this.router.post('/instances/:id/resume', this.resumeSimulation.bind(this));
    this.router.post('/instances/:id/complete', this.completeSimulation.bind(this));
    this.router.get('/instances/:id/state', this.getSimulationState.bind(this));

    // Student Actions
    this.router.post('/instances/:id/vitals', this.recordVitals.bind(this));
    this.router.post('/instances/:id/medications/:medId/administer', this.administerMedication.bind(this));
    this.router.post('/instances/:id/alerts/:alertId/acknowledge', this.acknowledgeAlert.bind(this));

    // Student Session Management
    this.router.post('/instances/:id/join', this.joinSimulation.bind(this));
    this.router.post('/instances/:id/leave', this.leaveSimulation.bind(this));

    // Analytics and Reporting
    this.router.get('/instances/:id/activities', this.getSimulationActivities.bind(this));
    this.router.get('/instances/:id/report', this.getSimulationReport.bind(this));
  }

  // ===============================================
  // Template Management
  // ===============================================

  private async createTemplate(req: Request, res: Response): Promise<void> {
    try {
      const request: CreateTemplateRequest = req.body;
      const userId = req.user?.id;
      const tenantId = req.user?.tenantId;

      if (!userId || !tenantId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const template = await this.simulationEngine.createTemplate(request, userId, tenantId);
      res.json(template);
    } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({ error: 'Failed to create template' });
    }
  }

  private async updateTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updates = req.body;

      const template = await this.simulationEngine.updateTemplate(id, updates);
      res.json(template);
    } catch (error) {
      console.error('Error updating template:', error);
      res.status(500).json({ error: 'Failed to update template' });
    }
  }

  private async deleteTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await this.simulationEngine.deleteTemplate(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({ error: 'Failed to delete template' });
    }
  }

  private async getTemplates(req: Request, res: Response): Promise<void> {
    try {
      // This would need to be implemented in the engine
      res.json({ message: 'Get templates endpoint - to be implemented' });
    } catch (error) {
      console.error('Error getting templates:', error);
      res.status(500).json({ error: 'Failed to get templates' });
    }
  }

  // ===============================================
  // Snapshot Management
  // ===============================================

  private async createSnapshot(req: Request, res: Response): Promise<void> {
    try {
      const { templateId } = req.params;
      const { name, description } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const request: CreateSnapshotRequest = { templateId, name, description };
      const snapshot = await this.simulationEngine.createSnapshot(request, userId);
      res.json(snapshot);
    } catch (error) {
      console.error('Error creating snapshot:', error);
      res.status(500).json({ error: 'Failed to create snapshot' });
    }
  }

  private async getSnapshot(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const snapshot = await this.simulationEngine.getSnapshot(id);
      res.json(snapshot);
    } catch (error) {
      console.error('Error getting snapshot:', error);
      res.status(500).json({ error: 'Failed to get snapshot' });
    }
  }

  // ===============================================
  // Simulation Instance Management
  // ===============================================

  private async launchSimulation(req: Request, res: Response): Promise<void> {
    try {
      const request: LaunchSimulationRequest = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const instance = await this.simulationEngine.launchSimulation(request, userId);
      res.json(instance);
    } catch (error) {
      console.error('Error launching simulation:', error);
      res.status(500).json({ error: 'Failed to launch simulation' });
    }
  }

  private async resetSimulation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.simulationEngine.resetSimulation(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error resetting simulation:', error);
      res.status(500).json({ error: 'Failed to reset simulation' });
    }
  }

  private async pauseSimulation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.simulationEngine.pauseSimulation(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error pausing simulation:', error);
      res.status(500).json({ error: 'Failed to pause simulation' });
    }
  }

  private async resumeSimulation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.simulationEngine.resumeSimulation(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error resuming simulation:', error);
      res.status(500).json({ error: 'Failed to resume simulation' });
    }
  }

  private async completeSimulation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.simulationEngine.completeSimulation(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error completing simulation:', error);
      res.status(500).json({ error: 'Failed to complete simulation' });
    }
  }

  private async getSimulationState(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // This would need to be implemented in the engine
      res.json({ message: 'Get simulation state endpoint - to be implemented' });
    } catch (error) {
      console.error('Error getting simulation state:', error);
      res.status(500).json({ error: 'Failed to get simulation state' });
    }
  }

  // ===============================================
  // Student Actions
  // ===============================================

  private async recordVitals(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const studentId = req.user?.id;

      if (!studentId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const request: RecordVitalRequest = req.body;
      await this.simulationEngine.recordVitals(id, studentId, request);
      res.json({ success: true });
    } catch (error) {
      console.error('Error recording vitals:', error);
      res.status(500).json({ error: 'Failed to record vitals' });
    }
  }

  private async administerMedication(req: Request, res: Response): Promise<void> {
    try {
      const { id, medId } = req.params;
      const studentId = req.user?.id;

      if (!studentId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const request: AdministerMedicationRequest = {
        ...req.body,
        medicationId: medId
      };
      
      await this.simulationEngine.administerMedication(id, studentId, request);
      res.json({ success: true });
    } catch (error) {
      console.error('Error administering medication:', error);
      res.status(500).json({ error: 'Failed to administer medication' });
    }
  }

  private async acknowledgeAlert(req: Request, res: Response): Promise<void> {
    try {
      const { id, alertId } = req.params;
      const studentId = req.user?.id;

      if (!studentId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const request: AcknowledgeAlertRequest = {
        ...req.body,
        alertId
      };

      await this.simulationEngine.acknowledgeAlert(id, studentId, request);
      res.json({ success: true });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      res.status(500).json({ error: 'Failed to acknowledge alert' });
    }
  }

  // ===============================================
  // Student Session Management
  // ===============================================

  private async joinSimulation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const studentId = req.user?.id;

      if (!studentId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // This would need to be implemented in the engine
      res.json({ message: 'Join simulation endpoint - to be implemented' });
    } catch (error) {
      console.error('Error joining simulation:', error);
      res.status(500).json({ error: 'Failed to join simulation' });
    }
  }

  private async leaveSimulation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const studentId = req.user?.id;

      if (!studentId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // This would need to be implemented in the engine
      res.json({ message: 'Leave simulation endpoint - to be implemented' });
    } catch (error) {
      console.error('Error leaving simulation:', error);
      res.status(500).json({ error: 'Failed to leave simulation' });
    }
  }

  // ===============================================
  // Analytics and Reporting
  // ===============================================

  private async getSimulationActivities(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // This would need to be implemented in the engine
      res.json({ message: 'Get simulation activities endpoint - to be implemented' });
    } catch (error) {
      console.error('Error getting simulation activities:', error);
      res.status(500).json({ error: 'Failed to get simulation activities' });
    }
  }

  private async getSimulationReport(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // This would need to be implemented in the engine
      res.json({ message: 'Get simulation report endpoint - to be implemented' });
    } catch (error) {
      console.error('Error getting simulation report:', error);
      res.status(500).json({ error: 'Failed to get simulation report' });
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        tenantId: string;
        role: string;
      };
    }
  }
}