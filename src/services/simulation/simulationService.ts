/**
 * Simulation Service — barrel re-export.
 *
 * Imports to this file continue to work unchanged.
 * Internals have been split into focused modules:
 *   - templateService.ts          (template CRUD, snapshots, versioning, comparison)
 *   - simulationLifecycleService.ts (launch, reset, complete, participants, assignments)
 *   - simulationHistoryService.ts  (history, debrief, activity log, archiving)
 */

export * from './templateService';
export * from './simulationLifecycleService';
export * from './simulationHistoryService';
