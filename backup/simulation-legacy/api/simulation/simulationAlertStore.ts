/**
 * Simulation Alert Store
 * 
 * In-memory alert storage for simulation tenants.
 * Simulations are temporary and don't need persistent alert storage.
 * This bypasses RLS issues and provides better performance.
 */

import { Alert } from '../../types';

class SimulationAlertStore {
  private alerts: Map<string, Alert> = new Map();
  private tenantAlerts: Map<string, Set<string>> = new Map();

  /**
   * Add an alert to the simulation store
   */
  addAlert(alert: Alert): void {
    this.alerts.set(alert.id, alert);
    
    // Track by tenant
    if (alert.tenant_id) {
      if (!this.tenantAlerts.has(alert.tenant_id)) {
        this.tenantAlerts.set(alert.tenant_id, new Set());
      }
      this.tenantAlerts.get(alert.tenant_id)!.add(alert.id);
    }
    
    console.log(`📝 Simulation alert added to memory: ${alert.patientName} - ${alert.message}`);
  }

  /**
   * Get all alerts for a specific tenant
   */
  getAlertsByTenant(tenantId: string): Alert[] {
    const alertIds = this.tenantAlerts.get(tenantId) || new Set();
    return Array.from(alertIds)
      .map(id => this.alerts.get(id))
      .filter((alert): alert is Alert => alert !== undefined)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get all alerts (for debugging)
   */
  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      console.log(`✅ Simulation alert acknowledged: ${alertId}`);
      return true;
    }
    return false;
  }

  /**
   * Remove an alert
   */
  removeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert && alert.tenant_id) {
      this.tenantAlerts.get(alert.tenant_id)?.delete(alertId);
    }
    return this.alerts.delete(alertId);
  }

  /**
   * Clear all alerts for a tenant (called when simulation ends)
   */
  clearTenant(tenantId: string): void {
    const alertIds = this.tenantAlerts.get(tenantId) || new Set();
    alertIds.forEach(id => this.alerts.delete(id));
    this.tenantAlerts.delete(tenantId);
    console.log(`🧹 Cleared all simulation alerts for tenant: ${tenantId}`);
  }

  /**
   * Clear all alerts (for cleanup)
   */
  clearAll(): void {
    this.alerts.clear();
    this.tenantAlerts.clear();
    console.log('🧹 Cleared all simulation alerts from memory');
  }

  /**
   * Get alert count for a tenant
   */
  getAlertCount(tenantId: string): number {
    return (this.tenantAlerts.get(tenantId) || new Set()).size;
  }

  /**
   * Check if an alert exists
   */
  hasAlert(alertId: string): boolean {
    return this.alerts.has(alertId);
  }
}

// Singleton instance
export const simulationAlertStore = new SimulationAlertStore();
