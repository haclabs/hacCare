// Database Interface Types for Simulation Engine

export interface DatabaseInterface {
  simulationTemplates: {
    create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
    update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
    delete: (id: string) => Promise<void>;
    findById: (id: string) => Promise<Record<string, unknown> | null>;
    count: (filters: Record<string, unknown>) => Promise<number>;
  };
  simulationSnapshots: {
    create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
    findById: (id: string) => Promise<Record<string, unknown> | null>;
  };
  simulationInstances: {
    create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
    update: (id: string, data: Record<string, unknown>) => Promise<Record<string, unknown>>;
    findById: (id: string) => Promise<Record<string, unknown> | null>;
    count: (filters: Record<string, unknown>) => Promise<number>;
  };
  simulationActivities: {
    create: (data: Record<string, unknown>) => Promise<Record<string, unknown>>;
  };
  query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
}